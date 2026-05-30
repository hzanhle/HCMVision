import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, FONT, RADIUS, SPACING, glassBg, glassBorder } from '../../../design/ds';
import { getCameraList } from '../../../services/camera';
import type { CameraItem } from '../../../services/camera';
import { HomeStackParamList } from '../../../navigation/types';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Tabs'>;
type FilterTab = 'Tất cả' | 'Đang mưa' | 'Kẹt xe';

const RAIN_LABELS = ['Không mưa', 'Mưa nhẹ', 'Mưa vừa', 'Mưa lớn'];
const TRAFFIC_LABELS = ['Thông thoáng', 'Chậm', 'Kẹt xe', 'Không rõ'];

function mockCamera(item: CameraItem, idx: number): {
  id: string; name: string; district: string; ward: string;
  isRaining: boolean; isTrafficJam: boolean; rainLabel: string; trafficLabel: string; aiScore: number; ts: string;
} {
  const isRaining = idx % 3 !== 0;
  const isTrafficJam = idx % 4 === 0;
  return {
    id: item.id ?? String(idx),
    name: item.name ?? `Camera ${idx + 1}`,
    district: item.districtName ?? 'TP.HCM',
    ward: item.wardName ?? '—',
    isRaining,
    isTrafficJam,
    rainLabel: RAIN_LABELS[idx % RAIN_LABELS.length],
    trafficLabel: TRAFFIC_LABELS[idx % TRAFFIC_LABELS.length],
    aiScore: 55 + ((idx * 13) % 46),
    ts: `${(12 + idx) % 24}:${String(idx % 60).padStart(2, '0')}`,
  };
}

type CameraRow = ReturnType<typeof mockCamera>;

function StatusChip({ label, danger, warn }: { label: string; danger?: boolean; warn?: boolean }) {
  const bg = danger ? 'rgba(239,68,68,0.1)' : warn ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)';
  const border = danger ? 'rgba(239,68,68,0.3)' : warn ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)';
  const color = danger ? C.rain : warn ? C.rainMid : C.clear;
  return (
    <View style={[styles.chip, { backgroundColor: bg, borderColor: border }]}>
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </View>
  );
}

function CameraCard({ cam, onPress }: { cam: CameraRow; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      {/* Preview placeholder */}
      <View style={styles.cardPreview}>
        <Ionicons color="rgba(255,255,255,0.25)" name="videocam-outline" size={28} />
        <View style={[styles.statusDot, { backgroundColor: cam.isRaining || cam.isTrafficJam ? C.rain : C.clear }]} />
      </View>
      {/* Card body */}
      <View style={styles.cardBody}>
        <Text numberOfLines={1} style={styles.cardName}>{cam.name}</Text>
        <View style={styles.cardLocation}>
          <Ionicons color={C.onSurfaceVariant} name="location-outline" size={12} />
          <Text style={styles.cardDistrict}>{cam.ward}, {cam.district}</Text>
        </View>
        <View style={styles.chipRow}>
          <StatusChip danger={cam.isRaining && cam.rainLabel !== 'Mưa nhẹ'} label={cam.rainLabel} warn={cam.isRaining && cam.rainLabel === 'Mưa nhẹ'} />
          <StatusChip danger={cam.isTrafficJam} label={cam.trafficLabel} warn={cam.trafficLabel === 'Chậm'} />
        </View>
        <View style={styles.cardFooter}>
          <View style={styles.aiRow}>
            <Ionicons color={C.primaryFixedDim} name="analytics-outline" size={12} />
            <Text style={styles.aiText}>{cam.aiScore}%</Text>
          </View>
          <Text style={styles.tsText}>{cam.ts}</Text>
        </View>
      </View>
    </Pressable>
  );
}

export function CameraStatusScreen() {
  const navigation = useNavigation<Nav>();
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState<FilterTab>('Tất cả');
  const [cameras, setCameras] = React.useState<CameraRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [page, setPage] = React.useState(1);
  const [hasMore, setHasMore] = React.useState(true);
  const [loadingMore, setLoadingMore] = React.useState(false);

  const loadPage = React.useCallback(async (p: number, reset = false) => {
    try {
      if (p === 1) setLoading(true);
      else setLoadingMore(true);
      const res = await getCameraList(p, 20);
      const rows = res.items.map((item, idx) => mockCamera(item, (p - 1) * 20 + idx));
      setCameras((prev) => reset ? rows : [...prev, ...rows]);
      setHasMore(rows.length === 20);
    } catch {
      // silently ignore
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  React.useEffect(() => { loadPage(1, true); }, [loadPage]);

  const filtered = React.useMemo(() => {
    let list = cameras;
    if (filter === 'Đang mưa') list = list.filter((c) => c.isRaining);
    if (filter === 'Kẹt xe') list = list.filter((c) => c.isTrafficJam);
    if (search.trim()) list = list.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()) || c.district.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [cameras, filter, search]);

  const TABS: FilterTab[] = ['Tất cả', 'Đang mưa', 'Kẹt xe'];

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      {/* TopAppBar */}
      <View style={styles.topBar}>
        <Ionicons color={C.primaryContainer} name="location-outline" size={22} />
        <Text style={styles.topBarTitle}>HCMRainVision</Text>
        <Ionicons color={C.onSurfaceVariant} name="person-circle-outline" size={26} />
      </View>

      {/* Search + filter */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons color={C.onSurfaceVariant} name="search-outline" size={16} />
          <TextInput
            onChangeText={setSearch}
            placeholder="Tìm camera hoặc quận..."
            placeholderTextColor={C.onSurfaceVariant}
            style={styles.searchInput}
            value={search}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')}>
              <Ionicons color={C.onSurfaceVariant} name="close-circle-outline" size={16} />
            </Pressable>
          )}
        </View>
        <Pressable style={styles.filterIconBtn}>
          <Ionicons color={C.onSurface} name="options-outline" size={20} />
        </Pressable>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {TABS.map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setFilter(tab)}
            style={[styles.filterTab, filter === tab && styles.filterTabActive]}
          >
            <Text style={[styles.filterTabText, filter === tab && styles.filterTabTextActive]}>{tab}</Text>
          </Pressable>
        ))}
      </View>

      {/* Camera list */}
      {loading ? (
        <View style={styles.loader}><ActivityIndicator color={C.primaryContainer} size="large" /></View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={filtered}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={<Text style={styles.emptyText}>Không có camera nào.</Text>}
          ListFooterComponent={loadingMore ? <ActivityIndicator color={C.primaryContainer} style={{ marginVertical: 16 }} /> : null}
          onEndReached={() => { if (hasMore && !loadingMore) { const next = page + 1; setPage(next); loadPage(next); } }}
          onEndReachedThreshold={0.4}
          renderItem={({ item }) => (
            <CameraCard
              cam={item}
              onPress={() => navigation.navigate('CameraDetail', {
                cameraId: item.id,
                cameraName: item.name,
                district: item.district,
                ward: item.ward,
                isRaining: item.isRaining,
                isTrafficJam: item.isTrafficJam,
                aiScore: item.aiScore,
                rainLabel: item.rainLabel,
                trafficLabel: item.trafficLabel,
              })}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.containerMargin, paddingVertical: 14, gap: SPACING.sm, borderBottomWidth: 0.5, borderBottomColor: 'rgba(255,255,255,0.08)' },
  topBarTitle: { flex: 1, color: C.onSurface, ...FONT.headlineMd, textAlign: 'center' },
  searchRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.containerMargin, paddingTop: SPACING.md, gap: SPACING.sm },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: C.surfaceContainerHigh, borderRadius: RADIUS.lg, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: SPACING.md, paddingVertical: 12 },
  searchInput: { flex: 1, color: C.onSurface, ...FONT.bodySm, paddingVertical: 0 },
  filterIconBtn: { width: 44, height: 44, borderRadius: RADIUS.lg, backgroundColor: C.surfaceContainerHigh, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  filterRow: { flexDirection: 'row', paddingHorizontal: SPACING.containerMargin, paddingTop: SPACING.sm, gap: SPACING.sm },
  filterTab: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: C.surfaceContainerHigh, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.08)' },
  filterTabActive: { backgroundColor: C.primaryContainer, borderColor: C.primaryContainer },
  filterTabText: { color: C.onSurfaceVariant, ...FONT.labelLg },
  filterTabTextActive: { color: C.onPrimary },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { padding: SPACING.containerMargin, gap: SPACING.sm, paddingBottom: 32 },
  emptyText: { color: C.onSurfaceVariant, ...FONT.bodySm, textAlign: 'center', marginTop: SPACING.xl },
  card: { flexDirection: 'row', backgroundColor: glassBg, borderWidth: 0.5, borderColor: glassBorder, borderRadius: RADIUS.xl, overflow: 'hidden' },
  cardPreview: { width: 80, backgroundColor: '#0a1e35', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  statusDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4 },
  cardBody: { flex: 1, padding: SPACING.sm, gap: 4 },
  cardName: { color: C.onSurface, ...FONT.titleSm },
  cardLocation: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  cardDistrict: { color: C.onSurfaceVariant, ...FONT.labelSm },
  chipRow: { flexDirection: 'row', gap: SPACING.sm, marginTop: 2 },
  chip: { borderRadius: RADIUS.full, borderWidth: 0.5, paddingHorizontal: 8, paddingVertical: 3 },
  chipText: { ...FONT.labelSm },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 },
  aiRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  aiText: { color: C.primaryFixedDim, ...FONT.labelSm },
  tsText: { color: C.outlineVariant, ...FONT.labelSm },
});
