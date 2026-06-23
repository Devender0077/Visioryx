import { Pressable, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AiRepository, type AgentModel } from '@/viewmodels/repositories/aiRepository';
import { AiCrudScreen, crudStyles } from '@/components/AiCrudScreen';
import { PaletteDark as C } from '@/constants/visionTheme';

export default function AgentsScreen() {
  return (
    <AiCrudScreen<AgentModel>
      eyebrow="AI · Agents"
      title="Autonomous agents"
      subtitle="Compose system-prompted agents, attach tools, and run them on demand. Each agent persists its own session in MongoDB."
      emptyCta="New agent"
      testID="ai-agents-screen"
      glowColor={C.electricViolet}
      fields={[
        { key: 'name', label: 'Agent name', placeholder: 'Perimeter Triage' },
        { key: 'description', label: 'Short description', placeholder: 'Triages unknown person alerts and recommends action' },
        { key: 'system_prompt', label: 'System prompt', placeholder: 'You are a calm, decisive security operator...', multiline: true },
      ]}
      fetcher={() => AiRepository.listAgents()}
      creator={(form) => AiRepository.createAgent({
        name: form.name || 'Untitled agent',
        description: form.description || '',
        system_prompt: form.system_prompt || 'You are a helpful VisionaryX agent.',
        model_id: 'anthropic:claude-sonnet-4-5-20250929',
        tools: [],
        enabled: true,
      })}
      deleter={(id) => AiRepository.deleteAgent(id)}
      renderRow={(item, { remove }) => (
        <View>
          <View style={crudStyles.rowHead}>
            <View style={crudStyles.rowIcon}>
              <MaterialCommunityIcons name="robot-happy" size={18} color={C.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={crudStyles.rowTitle}>{item.name}</Text>
              <Text style={crudStyles.rowSub}>{item.model_id}</Text>
            </View>
            <View style={crudStyles.rowActions}>
              <Pressable onPress={remove} style={crudStyles.iconBtn} hitSlop={6} testID={`agent-del-${item.id}`}>
                <MaterialCommunityIcons name="trash-can-outline" size={16} color={C.danger} />
              </Pressable>
            </View>
          </View>
          {item.description ? <Text style={[crudStyles.rowSub, { marginTop: 6, fontFamily: undefined }]}>{item.description}</Text> : null}
          <View style={crudStyles.rowMetaRow}>
            <View style={[crudStyles.badge, { borderColor: C.cyan, backgroundColor: C.cyanFaint }]}>
              <Text style={[crudStyles.badgeText, { color: C.cyan }]}>{item.enabled ? 'ENABLED' : 'DISABLED'}</Text>
            </View>
            <Text style={crudStyles.rowSub}>{item.runs} runs</Text>
          </View>
        </View>
      )}
    />
  );
}
