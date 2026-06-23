/**
 * RAG — Knowledge base upload + query.
 */
import { useEffect, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AiRepository, type RagDocModel } from '@/viewmodels/repositories/aiRepository';
import { CommandBackground } from '@/components/CommandBackground';
import { GlassCard, GlowOrb } from '@/components/glass';
import { SectionEyebrow, ScreenTitle, ScreenSub, VxButton, ErrorBanner } from '@/components/vx';
import { PaletteDark as C, FontFamily as F, Radius, Space, TextStyles } from '@/constants/visionTheme';

export default function RagScreen() {
  const [docs, setDocs] = useState<RagDocModel[]>([]);
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState<string>('');
  const [hits, setHits] = useState<Array<{ text: string; rank: number; meta: Record<string, unknown> }>>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => AiRepository.listDocs().then(setDocs).catch((e) => setError(e.message));
  useEffect(() => { void load(); }, []);

  const upload = () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Web only (for now)', 'Document upload is wired for web in this build. Native picker pending.');
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.md,.pdf,.json,.csv';
    input.onchange = async (e) => {
      const f = (e.target as HTMLInputElement).files?.[0];
      if (!f) return;
      setBusy(true);
      try {
        await AiRepository.uploadDoc(f, f.name);
        await load();
      } catch (err) { setError(err instanceof Error ? err.message : 'Upload failed'); }
      finally { setBusy(false); }
    };
    input.click();
  };

  const run = async () => {
    if (!query.trim()) return;
    setBusy(true);
    setAnswer(''); setHits([]); setError(null);
    try {
      const r = await AiRepository.queryRag(query.trim(), 4);
      setHits(r.items); setAnswer(r.answer);
    } catch (e) { setError(e instanceof Error ? e.message : 'Query failed'); }
    finally { setBusy(false); }
  };

  return (
    <View style={styles.root} testID="ai-rag-screen">
      <CommandBackground />
      <GlowOrb size={380} color={C.cyan} opacity={0.16} top={-100} left={-80} />
      <GlowOrb size={300} color={C.electricViolet} opacity={0.14} bottom={-80} right={-80} />

      <ScrollView contentContainerStyle={styles.pad}>
        <SectionEyebrow>AI · RAG</SectionEyebrow>
        <ScreenTitle>Knowledge base</ScreenTitle>
        <ScreenSub>
          Drop TXT/MD/JSON docs into the Chroma vector store. Embedding via the Emergent key, then ask anything — answers are grounded in the docs.
        </ScreenSub>

        <ErrorBanner message={error} />

        <View style={styles.cols}>
          {/* Upload + docs list */}
          <GlassCard pad="lg" style={styles.colDocs}>
            <View style={styles.colHead}>
              <Text style={styles.colTitle}>Documents ({docs.length})</Text>
              <VxButton
                label="Upload"
                onPress={upload}
                busy={busy}
                size="md"
                icon={<MaterialCommunityIcons name="upload" size={14} color="#fff" />}
                testID="rag-upload-btn"
              />
            </View>
            {docs.length === 0 ? (
              <Text style={styles.empty}>No documents yet. Upload your first TXT or MD.</Text>
            ) : (
              <View style={{ marginTop: Space.md, gap: Space.sm }}>
                {docs.map((d) => (
                  <View key={d.id} style={styles.docRow} testID={`rag-doc-${d.id}`}>
                    <MaterialCommunityIcons name="file-document-outline" size={16} color={C.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.docName}>{d.name}</Text>
                      <Text style={styles.docMeta}>{d.chunks} chunks · {(d.size / 1024).toFixed(1)} KB</Text>
                    </View>
                    <Pressable
                      onPress={() => AiRepository.deleteDoc(d.id).then(load)}
                      hitSlop={6}
                      testID={`rag-del-${d.id}`}
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={14} color={C.danger} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </GlassCard>

          {/* Query panel */}
          <GlassCard pad="lg" style={styles.colQuery}>
            <Text style={styles.colTitle}>Ask the knowledge base</Text>
            <View style={styles.queryRow}>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="What does the policy say about…"
                placeholderTextColor={C.textFaint}
                style={styles.queryInput}
                onSubmitEditing={run}
                testID="rag-query-input"
              />
              <VxButton label="Ask" onPress={run} busy={busy} testID="rag-ask-btn" />
            </View>

            {answer ? (
              <View style={styles.answer}>
                <Text style={styles.answerLabel}>SYNTHESIZED ANSWER</Text>
                <Text style={styles.answerText} selectable>{answer}</Text>
              </View>
            ) : null}

            {hits.length > 0 ? (
              <View style={{ marginTop: Space.lg, gap: Space.sm }}>
                <Text style={styles.answerLabel}>TOP-{hits.length} CONTEXT</Text>
                {hits.map((h) => (
                  <View key={h.rank} style={styles.hit}>
                    <Text style={styles.hitRank}>#{h.rank}</Text>
                    <Text style={styles.hitText} numberOfLines={4}>{h.text}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </GlassCard>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  pad: { padding: Space.lg, paddingBottom: 100, maxWidth: 1280, width: '100%', alignSelf: 'center' },
  cols: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.md, marginTop: Space.lg },
  colDocs: { flexGrow: 1, flexBasis: 320, minWidth: 280 },
  colQuery: { flexGrow: 2, flexBasis: 460, minWidth: 320 },
  colHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  colTitle: { ...TextStyles.h4, color: C.text },
  empty: { ...TextStyles.bodySmall, color: C.textMuted, marginTop: Space.md },
  docRow: {
    flexDirection: 'row', alignItems: 'center', gap: Space.sm,
    backgroundColor: C.surface2, borderRadius: Radius.sm, padding: Space.sm,
  },
  docName: { ...TextStyles.bodySmall, color: C.text },
  docMeta: { ...TextStyles.caption, color: C.textMuted, fontFamily: F.mono },

  queryRow: { flexDirection: 'row', gap: Space.sm, alignItems: 'center', marginTop: Space.md },
  queryInput: {
    flex: 1, backgroundColor: C.surface2, color: C.text, fontFamily: F.body,
    borderRadius: Radius.sm, paddingHorizontal: Space.md, paddingVertical: 12,
    borderWidth: 1, borderColor: C.border, fontSize: 14,
  },

  answer: { marginTop: Space.lg, padding: Space.md, backgroundColor: C.primaryFaint, borderRadius: Radius.md, borderWidth: 1, borderColor: 'rgba(208,188,255,0.25)' },
  answerLabel: { ...TextStyles.label, color: C.primary, fontSize: 10 },
  answerText: { ...TextStyles.body, color: C.text, marginTop: Space.sm, lineHeight: 22 },
  hit: { flexDirection: 'row', gap: Space.sm, padding: Space.sm, backgroundColor: C.surface2, borderRadius: Radius.sm },
  hitRank: { ...TextStyles.label, color: C.cyan, fontFamily: F.monoSemibold, width: 24 },
  hitText: { ...TextStyles.bodySmall, color: C.textMuted, flex: 1 },
});
