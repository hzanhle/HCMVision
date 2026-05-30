import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, FONT, RADIUS, SPACING } from '../../../design/ds';
import { getCameraList } from '../../../services/camera';
import { getRainingCameraCount } from '../../../services/weather';
import { HomeStackParamList } from '../../../navigation/types';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Tabs'>;

type MapCamera = {
  id: string;
  name: string;
  district: string;
  ward: string;
  rainLabel: string;
  trafficLabel: string;
  isRaining: boolean;
  isTrafficJam: boolean;
  aiScore: number;
  top: number;
  left: number;
};

const PINS: MapCamera[] = [
  { id: '1', name: 'Ngã tư Hàng Xanh', district: 'Bình Thạnh', ward: 'P.21', rainLabel: 'Mưa vừa', trafficLabel: 'Chậm', isRaining: true, isTrafficJam: true, aiScore: 82, top: 0.38, left: 0.25 },
  { id: '2', name: 'Cầu Sài Gòn', district: 'Bình Thạnh', ward: 'P.25', rainLabel: 'Mưa nhẹ', trafficLabel: 'Chậm', isRaining: true, isTrafficJam: false, aiScore: 67, top: 0.28, left: 0.58 },
  { id: '3', name: 'Vòng xoay Điện Biên Phủ', district: 'Bình Thạnh', ward: 'P.22', rainLabel: 'Không mưa', trafficLabel: 'Thông thoáng', isRaining: false, isTrafficJam: false, aiScore: 91, top: 0.55, left: 0.44 },
  { id: '4', name: 'Ngã tư Bình Phước', district: 'Thủ Đức', ward: 'P.Bình Chiểu', rainLabel: 'Mưa lớn', trafficLabel: 'Kẹt xe', isRaining: true, isTrafficJam: true, aiScore: 74, top: 0.22, left: 0.75 },
  { id: '5', name: 'Hầm Thủ Thiêm', district: 'Quận 2', ward: 'P.An Khánh', rainLabel: 'Không mưa', trafficLabel: 'Kẹt xe', isRaining: false, isTrafficJam: true, aiScore: 58, top: 0.48, left: 0.7 },
];

type FilterMode = 'Mưa' | 'Giao thông' | 'Kết hợp';

function pinColor(cam: MapCamera): string {
  if (cam.isRaining && cam.isTrafficJam) return C.rain;
  if (cam.isRaining) return C.rainMid;
  if (cam.isTrafficJam) return '#F97316';
  return C.clear;
}

function FilterBottomSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [rainLevel, setRainLevel] = React.useState<string[]>(['Không mưa']);
  const [trafficLevel, setTrafficLevel] = React.useState<string[]>(['Thông thoáng']);
  const [onlyHighAI, setOnlyHighAI] = React.useState(true);

  const toggleArr = (arr: string[], set: (v: string[]) => void, val: string) => {
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const FilterChip = ({ label, active, onPress, danger }: { label: string; active: boolean; onPress: () => void; danger?: boolean }) => (
    <Pressable onPress={onPress} style={[styles.filterChip, active && (danger ? styles.filterChipDanger : styles.filterChipActive)]}>
      {active && <Ionicons color={danger ? '#FCA5A5' : C.primaryContainer} name="checkmark" size={12} />}
      <Text style={[styles.filterChipText, active && (danger ? styles.filterChipTextDanger : styles.filterChipTextActive)]}>{label}</Text>
    </Pressable>
  );

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <Pressable onPress={onClose} style={styles.modalOverlay} />
      <View style={styles.filterSheet}>
        <View style={styles.dragHandle} />
        <View style={styles.filterHeader}>
          <Text style={styles.filterTitle}>Bộ lọc bản đồ</Text>
          <Pressable onPress={onClose}><Ionicons color={C.onSurface} name="close" size={20} /></Pressable>
        </View>
        <View style={styles.filterSection}>
          <View style={styles.filterSectionTitle}>
            <Ionicons color={C.onSurfaceVariant} name="rainy-outline" size={16} />
            <Text style={styles.filterSectionLabel}>Mức độ mưa</Text>
          </View>
          <View style={styles.chipWrap}>
            {['Không mưa', 'Mưa nhẹ', 'Mưa vừa', 'Mưa lớn'].map((v) => (
              <FilterChip key={v} active={rainLevel.includes(v)} danger={v === 'Mưa lớn'} label={v} onPress={() => toggleArr(rainLevel, setRainLevel, v)} />
            ))}
          </View>
        </View>
        <View style={styles.filterSection}>
          <View style={styles.filterSectionTitle}>
            <Ionicons color={C.onSurfaceVariant} name="car-outline" size={16} />
            <Text style={styles.filterSectionLabel}>Mức độ giao thông</Text>
          </View>
          <View style={styles.chipWrap}>
            {['Thông thoáng', 'Chậm', 'Kẹt xe', 'Không rõ'].map((v) => (
              <FilterChip key={v} active={trafficLevel.includes(v)} danger={v === 'Kẹt xe'} label={v} onPress={() => toggleArr(trafficLevel, setTrafficLevel, v)} />
            ))}
          </View>
        </View>
        <View style={styles.filterAIRow}>
          <View style={styles.filterAILeft}>
            <Ionicons color={C.primaryFixedDim} name="sparkles-outline" size={16} />
            <View style={{ flex: 1 }}>
              <Text style={styles.filterAILabel}>Chỉ hiện dữ liệu AI tự tin cao</Text>
              <Text style={styles.filterAISub}>Lọc bỏ các cảnh báo có độ tin cậy thấp</Text>
            </View>
          </View>
          <Switch onValueChange={setOnlyHighAI} thumbColor={onlyHighAI ? C.primaryContainer : C.surfaceBright} trackColor={{ false: C.outlineVariant, true: C.onPrimaryContainer }} value={onlyHighAI} />
        </View>
        <Pressable onPress={onClose} style={styles.applyBtn}>
          <Text style={styles.applyBtnText}>Áp dụng bộ lọc</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

export function MapScreen() {
  const navigation = useNavigation<Nav>();
  const [search, setSearch] = React.useState('');
  const [filterMode, setFilterMode] = React.useState<FilterMode>('Mưa');
  const [filterVisible, setFilterVisible] = React.useState(false);
  const [rainingCount, setRainingCount] = React.useState(0);

  React.useEffect(() => {
    Promise.all([getCameraList(1, 1), getRainingCameraCount(30)])
      .then(([, rc]) => setRainingCount(rc))
      .catch(() => undefined);
  }, []);

  const pins = search.trim() ? PINS.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())) : PINS;
  const FILTER_MODES: FilterMode[] = ['Mưa', 'Giao thông', 'Kết hợp'];

  const goToDetail = (cam: MapCamera) => {
    navigation.navigate('CameraDetail', {
      cameraId: cam.id,
      cameraName: cam.name,
      district: cam.district,
      ward: cam.ward,
      isRaining: cam.isRaining,
      isTrafficJam: cam.isTrafficJam,
      aiScore: cam.aiScore,
      rainLabel: cam.rainLabel,
      trafficLabel: cam.trafficLabel,
    });
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <View style={styles.mapBg}>
        <View style={styles.mapLayer2} />
        <View style={[styles.road, { top: '22%', left: 0, right: 0, height: 3 }]} />
        <View style={[styles.road, { top: '50%', left: 0, right: 0, height: 2 }]} />
        <View style={[styles.road, { top: '70%', left: 0, right: 0, height: 3 }]} />
        <View style={[styles.road, { left: '20%', top: 0, bottom: 0, width: 2 }]} />
        <View style={[styles.road, { left: '55%', top: 0, bottom: 0, width: 3 }]} />
        <View style={[styles.road, { left: '80%', top: 0, bottom: 0, width: 2 }]} />
        <View style={styles.roadDiag} />
        {pins.map((cam) => (
          <Pressable key={cam.id} onPress={() => goToDetail(cam)} style={[styles.pin, { top: `${cam.top * 100}%` as unknown as number, left: `${cam.left * 100}%` as unknown as number }]}>
            <View style={[styles.pinDot, { backgroundColor: pinColor(cam), shadowColor: pinColor(cam) }]} />
            {(cam.isRaining || cam.isTrafficJam) && <View style={[styles.pinRing, { borderColor: pinColor(cam) }]} />}
          </Pressable>
        ))}
      </View>

      <View style={styles.topOverlay}>
        <View style={styles.searchBar}>
          <Ionicons color={C.onSurfaceVariant} name="search-outline" size={18} />
          <TextInput onChangeText={setSearch} placeholder="Tìm camera, phường hoặc khu vực" placeholderTextColor={C.onSurfaceVariant} style={styles.searchInput} value={search} />
          <Ionicons color={C.primaryContainer} name="mic-outline" size={18} />
        </View>
        {rainingCount > 0 ? (
          <View style={styles.rainingBadge}>
            <Text style={styles.rainingText}>Đang mưa: {rainingCount} camera</Text>
          </View>
        ) : null}
        <View style={styles.filterChipsRow}>
          {FILTER_MODES.map((m) => (
            <Pressable key={m} onPress={() => setFilterMode(m)} style={[styles.modeChip, filterMode === m && styles.modeChipActive]}>
              <Text style={[styles.modeChipText, filterMode === m && styles.modeChipTextActive]}>{m}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.fabCol}>
        <Pressable style={styles.fabSecondary}><Ionicons color={C.onSurface} name="map-outline" size={20} /></Pressable>
        <Pressable onPress={() => setFilterVisible(true)} style={styles.fabSecondary}><Ionicons color={C.onSurface} name="options-outline" size={20} /></Pressable>
        <Pressable style={styles.fabSecondary}><Ionicons color={C.onSurface} name="refresh-outline" size={20} /></Pressable>
        <Pressable style={styles.fabPrimary}><Ionicons color={C.onPrimary} name="locate-outline" size={22} /></Pressable>
      </View>

      <View style={styles.bottomBar}>
        <View style={styles.bottomBarDot} />
        <View>
          <Text style={styles.bottomBarTitle}>Cập nhật 5 phút trước</Text>
          <Text style={styles.bottomBarSub}>Nguồn: Cổng TTGT TP.HCM</Text>
        </View>
      </View>

      <FilterBottomSheet onClose={() => setFilterVisible(false)} visible={filterVisible} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },
  mapBg: { ...StyleSheet.absoluteFill, backgroundColor: '#071d35', overflow: 'hidden' },
  mapLayer2: { position: 'absolute', width: 500, height: 500, borderRadius: 250, top: -100, left: -80, backgroundColor: '#0A2A4A', opacity: 0.7 },
  road: { position: 'absolute', backgroundColor: '#1A3A5C' },
  roadDiag: { position: 'absolute', width: 2, height: 500, backgroundColor: '#122840', top: '15%', left: '42%', transform: [{ rotate: '25deg' }] },
  pin: { position: 'absolute', width: 24, height: 24, marginLeft: -12, marginTop: -12, alignItems: 'center', justifyContent: 'center' },
  pinDot: { width: 12, height: 12, borderRadius: 6, shadowOpacity: 0.7, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 4 },
  pinRing: { position: 'absolute', width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, opacity: 0.5 },
  topOverlay: { position: 'absolute', top: 0, left: 0, right: 0, paddingTop: SPACING.sm, paddingHorizontal: SPACING.containerMargin, gap: SPACING.sm },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: 'rgba(22,37,41,0.92)', borderRadius: RADIUS.full, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.12)', paddingHorizontal: SPACING.md, paddingVertical: 12 },
  searchInput: { flex: 1, color: C.onSurface, ...FONT.bodySm, paddingVertical: 0 },
  rainingBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(239,68,68,0.18)', borderWidth: 0.5, borderColor: 'rgba(239,68,68,0.4)', borderRadius: RADIUS.full, paddingHorizontal: 12, paddingVertical: 5 },
  rainingText: { color: '#FCA5A5', ...FONT.labelLg },
  filterChipsRow: { flexDirection: 'row', gap: SPACING.sm },
  modeChip: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: RADIUS.full, backgroundColor: 'rgba(22,37,41,0.85)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)' },
  modeChipActive: { backgroundColor: C.primaryContainer, borderColor: C.primaryContainer },
  modeChipText: { color: C.onSurfaceVariant, ...FONT.labelLg },
  modeChipTextActive: { color: C.onPrimary },
  fabCol: { position: 'absolute', right: SPACING.md, bottom: 90, gap: SPACING.sm, alignItems: 'center' },
  fabSecondary: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(22,37,41,0.9)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 6, elevation: 4 },
  fabPrimary: { width: 50, height: 50, borderRadius: 25, backgroundColor: C.primaryContainer, alignItems: 'center', justifyContent: 'center', shadowColor: C.primaryContainer, shadowOpacity: 0.4, shadowRadius: 10, elevation: 6 },
  bottomBar: { position: 'absolute', bottom: 16, left: SPACING.containerMargin, flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, backgroundColor: 'rgba(22,37,41,0.92)', borderRadius: RADIUS.lg, borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)', paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm },
  bottomBarDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.clear },
  bottomBarTitle: { color: C.onSurface, ...FONT.labelLg },
  bottomBarSub: { color: C.onSurfaceVariant, ...FONT.labelSm, marginTop: 1 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  filterSheet: { backgroundColor: C.surfaceContainerLow, borderTopLeftRadius: RADIUS.xl2, borderTopRightRadius: RADIUS.xl2, padding: SPACING.md, gap: SPACING.md, paddingBottom: 40 },
  dragHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.outlineVariant, alignSelf: 'center', marginBottom: SPACING.xs },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  filterTitle: { color: C.onSurface, ...FONT.headlineMd },
  filterSection: { gap: SPACING.sm },
  filterSectionTitle: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  filterSectionLabel: { color: C.onSurface, ...FONT.titleSm },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: RADIUS.full, borderWidth: 1, borderColor: C.outlineVariant, backgroundColor: C.surfaceContainerHigh },
  filterChipActive: { borderColor: C.primaryContainer, backgroundColor: 'rgba(0,242,234,0.12)' },
  filterChipDanger: { borderColor: C.rain, backgroundColor: 'rgba(239,68,68,0.12)' },
  filterChipText: { color: C.onSurfaceVariant, ...FONT.labelLg },
  filterChipTextActive: { color: C.primaryContainer },
  filterChipTextDanger: { color: '#FCA5A5' },
  filterAIRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.surfaceContainerHigh, borderRadius: RADIUS.lg, padding: SPACING.md, gap: SPACING.md },
  filterAILeft: { flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm, flex: 1 },
  filterAILabel: { color: C.onSurface, ...FONT.titleSm },
  filterAISub: { color: C.onSurfaceVariant, ...FONT.labelSm, marginTop: 2 },
  applyBtn: { backgroundColor: C.primaryContainer, borderRadius: RADIUS.full, paddingVertical: 16, alignItems: 'center', marginTop: SPACING.xs },
  applyBtnText: { color: C.onPrimary, ...FONT.titleSm },
});
