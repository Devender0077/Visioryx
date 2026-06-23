/**
 * AI Studio — section landing. Lists the 6 AI sub-modules.
 */
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { PaletteDark as C, FontFamily as F, Radius, Space, TextStyles } from '@/constants/visionTheme';
import { CommandBackground } from '@/components/CommandBackground';
import { GlassCard, GlowOrb } from '@/components/glass';
import { SectionEyebrow, ScreenTitle, ScreenSub } from '@/components/vx';

type IconName = keyof typeof MaterialCommunityIcons.glyphMap;
const MODULES: { href: string; label: string; desc: string; icon: IconName; testID: string }[] = [
  { href: '/ai/chat', label: 'Bot Reply', desc: 'Multi-model chat. Pick GPT-5, Claude or Gemini.', icon: 'chat-processing', testID: 'ai-mod-chat' },
  { href: '/ai/agents', label: 'AI Agents', desc: 'Build agents with system prompts and tools.', icon: 'robot-happy', testID: 'ai-mod-agents' },
  { href: '/ai/automations', label: 'Automations', desc: 'Triggered, multi-step agentic workflows.', icon: 'workflow', testID: 'ai-mod-automations' },
  { href: '/ai/models', label: 'Models', desc: 'Catalog of LLMs reachable via Emergent key.', icon: 'shape', testID: 'ai-mod-models' },
  { href: '/ai/rag', label: 'RAG · Knowledge', desc: 'Upload docs, embed with Chroma, query.', icon: 'database-search', testID: 'ai-mod-rag' },
  { href: '/ai/mcp', label: 'MCP Servers', desc: 'Connect MCP tools from mcpmarket.com.', icon: 'connection', testID: 'ai-mod-mcp' },
];

export default function AiStudioIndex() {
  const router = useRouter();
  return (
    <View style={styles.root} testID="ai-studio-screen">
      <CommandBackground />
      <GlowOrb size={420} color={C.electricViolet} opacity={0.18} top={-100} right={-100} />
      <GlowOrb size={360} color={C.cyan} opacity={0.14} bottom={-100} left={-80} />
      <ScrollView contentContainerStyle={styles.pad}>
        <SectionEyebrow>AI · Studio</SectionEyebrow>
        <ScreenTitle>VisionaryX Intelligence Layer</ScreenTitle>
        <ScreenSub>
          Compose agents, wire RAG, attach MCP tools, and ship generative experiences powered by GPT, Claude, and Gemini.
        </ScreenSub>

        <View style={styles.grid}>
          {MODULES.map((m) => (
            <Pressable
              key={m.href}
              onPress={() => router.push(m.href as any)}
              style={styles.tileSlot}
              testID={m.testID}
            >
              <GlassCard pad="lg" style={styles.tile}>
                <View style={styles.tileIcon}>
                  <MaterialCommunityIcons name={m.icon} size={20} color={C.primary} />
                </View>
                <Text style={styles.tileLbl}>{m.label}</Text>
                <Text style={styles.tileDesc}>{m.desc}</Text>
                <View style={styles.tileFooter}>
                  <Text style={styles.tileFooterText}>OPEN</Text>
                  <MaterialCommunityIcons name="arrow-right" size={12} color={C.primary} />
                </View>
              </GlassCard>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  pad: { padding: Space.lg, paddingBottom: 100, maxWidth: 1280, width: '100%', alignSelf: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.md, marginTop: Space.xl },
  tileSlot: { flexBasis: 280, flexGrow: 1, minWidth: 260 },
  tile: { minHeight: 180, gap: Space.sm },
  tileIcon: {
    width: 44, height: 44, borderRadius: Radius.md,
    backgroundColor: C.primaryFaint, alignItems: 'center', justifyContent: 'center',
  },
  tileLbl: { ...TextStyles.h4, color: C.text, marginTop: Space.sm },
  tileDesc: { ...TextStyles.bodySmall, color: C.textMuted, flex: 1 },
  tileFooter: { flexDirection: 'row', alignItems: 'center', gap: Space.xs, marginTop: Space.sm },
  tileFooterText: { ...TextStyles.label, color: C.primary, fontSize: 10 },
});
