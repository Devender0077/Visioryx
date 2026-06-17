import { useCallback, useEffect, useState } from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { Stitch, FontFamily } from '@/constants/stitchTheme';
import { useStitchTheme } from '@/hooks/useStitchTheme';
import { useRealtimeTick } from '@/contexts/RealtimeContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';

type Item = {
  id: number;
  camera_name: string | null;
  user_name: string | null;
  status: string;
  confidence: number;
  timestamp: string;
};

type ListRes = { items: Item[]; total: number };

export default function DetectionsScreen() {
  const realtimeTick = useRealtimeTick();
  const router = useRouter();
  const T = useStitchTheme();
  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50', offset: '0' });
      if (q.trim()) params.set('q', q.trim());
      const r = await api<ListRes>(`/api/v1/detections?${params.toString()}`);
      setItems(r.items);
      setTotal(r.total);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    const delay = q ? 350 : 0;
    const t = setTimeout(() => void load(), delay);
    return () => clearTimeout(t);
  }, [q, load, realtimeTick]);

  const knownCount = items.filter((i) => i.status === 'known').length;
  const unknownCount = items.filter((i) => i.status === 'unknown').length;

  const header = (
    <View style={styles.hero}>
      <Text style={[styles.eyebrow, { color: Stitch.primary }]}>Forensics</Text>
      <Text style={[styles.title, { color: T.text }]}>Detection Intelligence</Text>
      <Text style={[styles.subtitle, { color: T.textMuted }]}>
        Face detections across your grid — search by camera, name, or id.
      </Text>

      <View style={[styles.searchContainer, { backgroundColor: Stitch.surfaceContainerLowest }]}>
        <MaterialCommunityIcons name="magnify" size={20} color={Stitch.outline} />
        <TextInput
          style={[styles.searchInput, { color: T.text }]}
          placeholder="Search camera, name, id…"
          placeholderTextColor={Stitch.outline}
          value={q}
          onChangeText={setQ}
        />
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statChip, { backgroundColor: `${Stitch.secondary}22` }]}>
          <View style={[styles.statDot, { backgroundColor: Stitch.secondary }]} />
          <Text style={[styles.statText, { color: Stitch.secondary }]}>Known: {knownCount}</Text>
        </View>
        <View style={[styles.statChip, { backgroundColor: `${Stitch.error}22` }]}>
          <View style={[styles.statDot, { backgroundColor: Stitch.error }]} />
          <Text style={[styles.statText, { color: Stitch.error }]}>Unknown: {unknownCount}</Text>
        </View>
      </View>
    </View>
  );

  const renderItem = ({ item }: { item: Item }) => {
    const isKnown = item.status === 'known';
    const highConfidence = item.confidence > 0.8;

    return (
      <Pressable style={[styles.card, { backgroundColor: T.card }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardLeft}>
            <View style={[
              styles.avatarIcon,
              { backgroundColor: isKnown ? `${Stitch.secondary}22` : `${Stitch.tertiary}22` }
            ]}>
              <MaterialCommunityIcons
                name={isKnown ? 'face-recognition' : 'account-question'}
                size={24}
                color={isKnown ? Stitch.secondary : Stitch.tertiary}
              />
            </View>
            <View style={styles.cardInfo}>
              <Text style={[styles.cardName, { color: T.text }]} numberOfLines={1}>
                {item.user_name || 'Unknown Signal'}
              </Text>
              <View style={styles.cardMeta}>
                <MaterialCommunityIcons name="cctv" size={12} color={Stitch.outline} />
                <Text style={[styles.cardCam, { color: Stitch.outline }]} numberOfLines={1}>
                  {item.camera_name || 'Unknown Node'}
                </Text>
              </View>
            </View>
          </View>
          <View style={[
            styles.confBadge,
            { backgroundColor: highConfidence ? `${Stitch.secondary}22` : `${Stitch.tertiary}22` }
          ]}>
            <Text style={[styles.confText, { color: highConfidence ? Stitch.secondary : Stitch.tertiary }]}>
              {(item.confidence * 100).toFixed(0)}%
            </Text>
          </View>
        </View>
        <View style={[styles.cardFooter, { borderTopColor: 'rgba(255,255,255,0.05)' }]}>
          <MaterialCommunityIcons name="clock-outline" size={12} color={Stitch.outline} />
          <Text style={[styles.timestamp, { color: Stitch.outline }]}>
            {new Date(item.timestamp).toLocaleString()}
          </Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: isKnown ? `${Stitch.secondary}15` : `${Stitch.error}15` }
          ]}>
            <Text style={[styles.statusText, { color: isKnown ? Stitch.secondary : Stitch.error }]}>
              {item.status?.toUpperCase() || 'Unknown'}
            </Text>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: T.bg }]}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={() => void load()} />}
        contentContainerStyle={[styles.listPad, { paddingBottom: 32 }]}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: T.textMuted }]}>
            {loading ? 'Loading…' : 'No detections found.'}
          </Text>
        }
        ListFooterComponent={
          total > 0 ? (
            <Text style={[styles.footer, { color: T.textMuted }]}>
              Showing {items.length} of {total} detections
            </Text>
          ) : null
        }
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  hero: { marginBottom: 8 },
  eyebrow: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 12,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    fontFamily: FontFamily.headlineBlack,
    fontSize: 28,
    marginTop: 4,
  },
  subtitle: {
    fontFamily: FontFamily.body,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(175, 198, 255, 0.1)',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: FontFamily.body,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statDot: { width: 6, height: 6, borderRadius: 3 },
  statText: {
    fontFamily: FontFamily.labelMedium,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  listPad: { padding: 16, gap: 12 },
  card: {
    borderRadius: 14,
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  avatarIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  cardName: {
    fontFamily: FontFamily.headline,
    fontSize: 16,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  cardCam: {
    fontFamily: FontFamily.body,
    fontSize: 12,
    flex: 1,
  },
  confBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  confText: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 13,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  timestamp: {
    flex: 1,
    fontFamily: FontFamily.body,
    fontSize: 11,
    fontVariant: ['tabular-nums'],
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: FontFamily.labelSemibold,
    fontSize: 9,
    letterSpacing: 1,
  },
  empty: { textAlign: 'center', marginTop: 40 },
  footer: {
    textAlign: 'center',
    marginTop: 16,
    fontFamily: FontFamily.labelMedium,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
});
