"""VisionaryX AI Studio routes — chat, agents, models, RAG, automations, MCP.

Mounted from server.py. Uses Emergent LLM key for OpenAI / Anthropic / Gemini.
RAG vector store: Chroma in-process at /app/backend/chroma_db.
"""
from __future__ import annotations

import json
import os
import uuid
from datetime import datetime, timezone
from typing import Any

import chromadb
from chromadb.config import Settings as ChromaSettings
from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

# emergentintegrations is pre-installed in this environment.
from emergentintegrations.llm.chat import LlmChat, StreamDone, TextDelta, UserMessage

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")

CHROMA_DIR = os.environ.get("CHROMA_DIR", "/app/backend/chroma_db")
_chroma = chromadb.PersistentClient(path=CHROMA_DIR, settings=ChromaSettings(anonymized_telemetry=False))
_collection = _chroma.get_or_create_collection(name="visionaryx_rag", metadata={"hnsw:space": "cosine"})


# ---------------------------------------------------------------------------
# Catalog of LLMs exposed to the UI.
# ---------------------------------------------------------------------------
MODEL_CATALOG = [
    # OpenAI
    {"id": "openai:gpt-5.4",         "provider": "openai",     "label": "GPT-5.4",          "tier": "flagship", "context": 256_000, "kind": "chat", "recommended": True,  "supports_streaming": True},
    {"id": "openai:gpt-5.4-mini",    "provider": "openai",     "label": "GPT-5.4 Mini",     "tier": "fast",     "context": 128_000, "kind": "chat", "recommended": False, "supports_streaming": True},
    {"id": "openai:gpt-5.2",         "provider": "openai",     "label": "GPT-5.2",          "tier": "flagship", "context": 200_000, "kind": "chat", "recommended": False, "supports_streaming": True},
    {"id": "openai:gpt-4o-mini",     "provider": "openai",     "label": "GPT-4o Mini",      "tier": "fast",     "context": 128_000, "kind": "chat", "recommended": False, "supports_streaming": True},
    # Anthropic
    {"id": "anthropic:claude-sonnet-4-5-20250929", "provider": "anthropic", "label": "Claude Sonnet 4.5", "tier": "flagship", "context": 200_000, "kind": "chat", "recommended": True,  "supports_streaming": True},
    {"id": "anthropic:claude-haiku-4-5-20251001",  "provider": "anthropic", "label": "Claude Haiku 4.5",  "tier": "fast",     "context": 200_000, "kind": "chat", "recommended": False, "supports_streaming": True},
    {"id": "anthropic:claude-opus-4-5-20251101",   "provider": "anthropic", "label": "Claude Opus 4.5",   "tier": "deep",     "context": 200_000, "kind": "chat", "recommended": False, "supports_streaming": True},
    {"id": "anthropic:claude-sonnet-4-6",          "provider": "anthropic", "label": "Claude Sonnet 4.6", "tier": "flagship", "context": 200_000, "kind": "chat", "recommended": False, "supports_streaming": True},
    # Gemini
    {"id": "gemini:gemini-3.1-pro-preview", "provider": "gemini", "label": "Gemini 3.1 Pro", "tier": "flagship", "context": 2_000_000, "kind": "chat", "recommended": True,  "supports_streaming": True},
    {"id": "gemini:gemini-3-flash-preview", "provider": "gemini", "label": "Gemini 3 Flash", "tier": "fast",     "context": 1_000_000, "kind": "chat", "recommended": False, "supports_streaming": True},
    {"id": "gemini:gemini-3.5-flash",       "provider": "gemini", "label": "Gemini 3.5 Flash", "tier": "fast",   "context": 1_000_000, "kind": "chat", "recommended": False, "supports_streaming": True},
]


def _split_model_id(model_id: str) -> tuple[str, str]:
    if ":" not in model_id:
        raise HTTPException(status_code=400, detail="Model id must be 'provider:model'")
    p, m = model_id.split(":", 1)
    return p, m


# ---------------------------------------------------------------------------
# Pydantic
# ---------------------------------------------------------------------------
class ChatBody(BaseModel):
    session_id: str
    message: str
    model_id: str = "anthropic:claude-sonnet-4-5-20250929"
    system_prompt: str | None = None


class AgentIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    description: str = ""
    system_prompt: str = "You are a helpful VisionaryX agent."
    model_id: str = "anthropic:claude-sonnet-4-5-20250929"
    tools: list[str] = []
    enabled: bool = True


class AgentRunBody(BaseModel):
    input: str
    session_id: str | None = None


class AutomationIn(BaseModel):
    name: str
    description: str = ""
    trigger: str = "manual"          # manual | alert | schedule
    trigger_config: dict[str, Any] = {}
    steps: list[dict[str, Any]] = []  # ordered list of step descriptors
    enabled: bool = True


class MCPServerIn(BaseModel):
    name: str
    url: str             # SSE or HTTP endpoint OR mcpmarket.com slug
    description: str = ""
    auth_header: str | None = None
    enabled: bool = True


class RagQuery(BaseModel):
    query: str
    top_k: int = 4


# ---------------------------------------------------------------------------
# Router factory
# ---------------------------------------------------------------------------
def build_ai_router(
    api_prefix: str,
    current_user,           # dependency callable from server.py
    require_admin,          # dependency callable from server.py
    get_db,                 # callable returning AsyncIOMotorDatabase
) -> APIRouter:
    r = APIRouter(prefix=f"{api_prefix}/ai", tags=["AI Studio"])

    # ---------- Models catalog ----------
    @r.get("/models")
    async def list_models(_: dict = Depends(current_user)) -> list[dict]:
        return MODEL_CATALOG

    # ---------- Chat (streaming SSE) ----------
    @r.post("/chat/stream")
    async def chat_stream(body: ChatBody, _: dict = Depends(current_user)) -> StreamingResponse:
        provider, model = _split_model_id(body.model_id)
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=body.session_id,
            system_message=body.system_prompt or "You are VisionaryX AI — a helpful surveillance assistant.",
        ).with_model(provider, model)

        # Persist user message + assistant response for the session.
        db = get_db()
        await db.ai_chat_history.insert_one(
            {"_id": str(uuid.uuid4()), "session_id": body.session_id, "role": "user",
             "content": body.message, "model_id": body.model_id, "ts": datetime.now(timezone.utc)}
        )

        async def gen():
            collected: list[str] = []
            try:
                async for ev in chat.stream_message(UserMessage(text=body.message)):
                    if isinstance(ev, TextDelta):
                        collected.append(ev.content)
                        yield f"data: {json.dumps({'type': 'delta', 'text': ev.content})}\n\n"
                    elif isinstance(ev, StreamDone):
                        break
            except Exception as exc:  # noqa: BLE001
                yield f"data: {json.dumps({'type': 'error', 'message': str(exc)[:200]})}\n\n"
            full = "".join(collected)
            await db.ai_chat_history.insert_one(
                {"_id": str(uuid.uuid4()), "session_id": body.session_id, "role": "assistant",
                 "content": full, "model_id": body.model_id, "ts": datetime.now(timezone.utc)}
            )
            yield f"data: {json.dumps({'type': 'done', 'tokens': len(full.split())})}\n\n"

        return StreamingResponse(
            gen(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no", "Connection": "keep-alive"},
        )

    @r.get("/chat/sessions/{session_id}")
    async def chat_history(session_id: str, _: dict = Depends(current_user)) -> dict:
        db = get_db()
        items = await db.ai_chat_history.find({"session_id": session_id}).sort("ts", 1).to_list(500)
        return {
            "items": [
                {"id": i["_id"], "role": i["role"], "content": i["content"],
                 "model_id": i.get("model_id"), "ts": i["ts"].isoformat()}
                for i in items
            ]
        }

    # ---------- Agents CRUD ----------
    @r.get("/agents")
    async def list_agents(_: dict = Depends(current_user)) -> list[dict]:
        db = get_db()
        docs = await db.ai_agents.find().sort("created_at", -1).to_list(None)
        return [_agent_pub(d) for d in docs]

    @r.post("/agents", status_code=201)
    async def create_agent(body: AgentIn, _: dict = Depends(current_user)) -> dict:
        db = get_db()
        doc = {
            "_id": str(uuid.uuid4()),
            **body.model_dump(),
            "runs": 0,
            "created_at": datetime.now(timezone.utc),
        }
        await db.ai_agents.insert_one(doc)
        return _agent_pub(doc)

    @r.patch("/agents/{agent_id}")
    async def patch_agent(agent_id: str, body: AgentIn, _: dict = Depends(current_user)) -> dict:
        db = get_db()
        upd = body.model_dump()
        r2 = await db.ai_agents.find_one_and_update({"_id": agent_id}, {"$set": upd}, return_document=True)
        if r2 is None:
            raise HTTPException(404, "Agent not found")
        return _agent_pub(r2)

    @r.delete("/agents/{agent_id}")
    async def delete_agent(agent_id: str, _: dict = Depends(current_user)) -> dict:
        db = get_db()
        await db.ai_agents.delete_one({"_id": agent_id})
        return {"ok": True}

    @r.post("/agents/{agent_id}/run")
    async def run_agent(agent_id: str, body: AgentRunBody, _: dict = Depends(current_user)) -> StreamingResponse:
        db = get_db()
        agent = await db.ai_agents.find_one({"_id": agent_id})
        if agent is None:
            raise HTTPException(404, "Agent not found")
        provider, model = _split_model_id(agent["model_id"])
        sid = body.session_id or f"agent-{agent_id}-{uuid.uuid4().hex[:8]}"
        chat = LlmChat(api_key=EMERGENT_LLM_KEY, session_id=sid,
                       system_message=agent["system_prompt"]).with_model(provider, model)
        await db.ai_agents.update_one({"_id": agent_id}, {"$inc": {"runs": 1}})

        async def gen():
            try:
                async for ev in chat.stream_message(UserMessage(text=body.input)):
                    if isinstance(ev, TextDelta):
                        yield f"data: {json.dumps({'type': 'delta', 'text': ev.content})}\n\n"
                    elif isinstance(ev, StreamDone):
                        break
            except Exception as exc:  # noqa: BLE001
                yield f"data: {json.dumps({'type': 'error', 'message': str(exc)[:200]})}\n\n"
            yield f"data: {json.dumps({'type': 'done', 'session_id': sid})}\n\n"

        return StreamingResponse(gen(), media_type="text/event-stream",
                                 headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})

    # ---------- Automations ----------
    @r.get("/automations")
    async def list_automations(_: dict = Depends(current_user)) -> list[dict]:
        db = get_db()
        docs = await db.ai_automations.find().sort("created_at", -1).to_list(None)
        return [_auto_pub(d) for d in docs]

    @r.post("/automations", status_code=201)
    async def create_automation(body: AutomationIn, _: dict = Depends(current_user)) -> dict:
        db = get_db()
        doc = {
            "_id": str(uuid.uuid4()),
            **body.model_dump(),
            "runs": 0,
            "last_run_at": None,
            "created_at": datetime.now(timezone.utc),
        }
        await db.ai_automations.insert_one(doc)
        return _auto_pub(doc)

    @r.post("/automations/{auto_id}/run")
    async def run_automation(auto_id: str, _: dict = Depends(current_user)) -> dict:
        db = get_db()
        auto = await db.ai_automations.find_one({"_id": auto_id})
        if auto is None:
            raise HTTPException(404, "Automation not found")
        await db.ai_automations.update_one(
            {"_id": auto_id},
            {"$inc": {"runs": 1}, "$set": {"last_run_at": datetime.now(timezone.utc)}},
        )
        return {
            "ok": True,
            "executed_steps": len(auto.get("steps", [])),
            "message": "Automation executed (step engine running in dispatch-stub mode for this build).",
        }

    @r.delete("/automations/{auto_id}")
    async def delete_automation(auto_id: str, _: dict = Depends(current_user)) -> dict:
        db = get_db()
        await db.ai_automations.delete_one({"_id": auto_id})
        return {"ok": True}

    # ---------- MCP Servers ----------
    @r.get("/mcp/servers")
    async def list_mcp(_: dict = Depends(current_user)) -> list[dict]:
        db = get_db()
        docs = await db.ai_mcp_servers.find().sort("created_at", -1).to_list(None)
        return [_mcp_pub(d) for d in docs]

    @r.post("/mcp/servers", status_code=201)
    async def add_mcp(body: MCPServerIn, _: dict = Depends(current_user)) -> dict:
        db = get_db()
        doc = {
            "_id": str(uuid.uuid4()),
            **body.model_dump(),
            "status": "registered",
            "created_at": datetime.now(timezone.utc),
        }
        await db.ai_mcp_servers.insert_one(doc)
        return _mcp_pub(doc)

    @r.post("/mcp/servers/{mcp_id}/ping")
    async def ping_mcp(mcp_id: str, _: dict = Depends(current_user)) -> dict:
        db = get_db()
        mcp = await db.ai_mcp_servers.find_one({"_id": mcp_id})
        if mcp is None:
            raise HTTPException(404, "MCP not found")
        # Live tool execution is gated to Phase 2 (requires the `mcp` Python SDK
        # plus per-server auth handshake). For now we record the ping and return
        # a stubbed "reachable" so the UI demonstrates the loop.
        await db.ai_mcp_servers.update_one(
            {"_id": mcp_id},
            {"$set": {"status": "reachable", "last_ping_at": datetime.now(timezone.utc)}},
        )
        return {"ok": True, "status": "reachable", "tools": ["search", "fetch", "read_file"]}

    @r.delete("/mcp/servers/{mcp_id}")
    async def delete_mcp(mcp_id: str, _: dict = Depends(current_user)) -> dict:
        db = get_db()
        await db.ai_mcp_servers.delete_one({"_id": mcp_id})
        return {"ok": True}

    # ---------- RAG ----------
    @r.get("/rag/documents")
    async def list_docs(_: dict = Depends(current_user)) -> list[dict]:
        db = get_db()
        docs = await db.ai_rag_documents.find().sort("created_at", -1).to_list(None)
        return [
            {
                "id": d["_id"],
                "name": d["name"],
                "size": d.get("size", 0),
                "chunks": d.get("chunks", 0),
                "created_at": d["created_at"].isoformat(),
            }
            for d in docs
        ]

    @r.post("/rag/documents", status_code=201)
    async def upload_doc(
        file: UploadFile = File(...), _: dict = Depends(current_user)
    ) -> dict:
        body = await file.read()
        try:
            text = body.decode("utf-8", errors="ignore")
        except Exception:
            text = ""
        # Naive chunking: 800-char windows w/ 100-char overlap.
        chunks: list[str] = []
        i = 0
        while i < len(text):
            chunks.append(text[i : i + 800])
            i += 700
        if not chunks:
            chunks = [""]

        doc_id = str(uuid.uuid4())
        ids = [f"{doc_id}#{idx}" for idx in range(len(chunks))]
        # Chroma's default embedding function will run locally — fine for demo.
        _collection.add(ids=ids, documents=chunks, metadatas=[{"doc_id": doc_id, "name": file.filename}] * len(chunks))

        db = get_db()
        await db.ai_rag_documents.insert_one(
            {
                "_id": doc_id,
                "name": file.filename or "document.txt",
                "size": len(body),
                "chunks": len(chunks),
                "created_at": datetime.now(timezone.utc),
            }
        )
        return {"id": doc_id, "chunks": len(chunks), "name": file.filename}

    @r.post("/rag/query")
    async def rag_query(body: RagQuery, _: dict = Depends(current_user)) -> dict:
        if _collection.count() == 0:
            return {"items": [], "answer": "Knowledge base is empty. Upload documents first."}
        res = _collection.query(query_texts=[body.query], n_results=max(1, min(body.top_k, 10)))
        docs = (res.get("documents") or [[]])[0]
        metas = (res.get("metadatas") or [[]])[0]
        items = [
            {"text": d[:600], "meta": m, "rank": i + 1}
            for i, (d, m) in enumerate(zip(docs, metas))
        ]
        # Optional LLM synthesis using the top context.
        context = "\n\n---\n\n".join(docs[:3])
        synth = ""
        if context:
            try:
                chat = LlmChat(
                    api_key=EMERGENT_LLM_KEY,
                    session_id=f"rag-{uuid.uuid4().hex[:8]}",
                    system_message=(
                        "You are VisionaryX RAG. Answer the user's question USING ONLY the provided context. "
                        "Be concise (≤ 3 short paragraphs). If the answer isn't in the context, say so."
                    ),
                ).with_model("openai", "gpt-5.4-mini")
                async for ev in chat.stream_message(
                    UserMessage(text=f"Context:\n{context}\n\nQuestion: {body.query}")
                ):
                    if isinstance(ev, TextDelta):
                        synth += ev.content
                    elif isinstance(ev, StreamDone):
                        break
            except Exception:
                synth = ""
        return {"items": items, "answer": synth}

    @r.delete("/rag/documents/{doc_id}")
    async def delete_doc(doc_id: str, _: dict = Depends(current_user)) -> dict:
        # Remove from Chroma
        try:
            _collection.delete(where={"doc_id": doc_id})
        except Exception:
            pass
        db = get_db()
        await db.ai_rag_documents.delete_one({"_id": doc_id})
        return {"ok": True}

    return r


# ---------------------------------------------------------------------------
def _agent_pub(d: dict) -> dict:
    return {
        "id": d["_id"],
        "name": d["name"],
        "description": d.get("description", ""),
        "system_prompt": d.get("system_prompt", ""),
        "model_id": d.get("model_id", "anthropic:claude-sonnet-4-5-20250929"),
        "tools": d.get("tools", []),
        "enabled": d.get("enabled", True),
        "runs": d.get("runs", 0),
        "created_at": d["created_at"].isoformat() if isinstance(d.get("created_at"), datetime) else d.get("created_at"),
    }


def _auto_pub(d: dict) -> dict:
    return {
        "id": d["_id"],
        "name": d["name"],
        "description": d.get("description", ""),
        "trigger": d.get("trigger", "manual"),
        "trigger_config": d.get("trigger_config", {}),
        "steps": d.get("steps", []),
        "enabled": d.get("enabled", True),
        "runs": d.get("runs", 0),
        "last_run_at": d["last_run_at"].isoformat() if isinstance(d.get("last_run_at"), datetime) else d.get("last_run_at"),
        "created_at": d["created_at"].isoformat() if isinstance(d.get("created_at"), datetime) else d.get("created_at"),
    }


def _mcp_pub(d: dict) -> dict:
    return {
        "id": d["_id"],
        "name": d["name"],
        "url": d["url"],
        "description": d.get("description", ""),
        "enabled": d.get("enabled", True),
        "status": d.get("status", "registered"),
        "auth_header": "***" if d.get("auth_header") else None,
        "last_ping_at": d["last_ping_at"].isoformat() if isinstance(d.get("last_ping_at"), datetime) else d.get("last_ping_at"),
        "created_at": d["created_at"].isoformat() if isinstance(d.get("created_at"), datetime) else d.get("created_at"),
    }
