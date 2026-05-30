import Ionicons from '@expo/vector-icons/Ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { C, FONT, RADIUS, SPACING, glassBg, glassBorder } from '../../../design/ds';
import { addFavorite, getFavorites, removeFavorite } from '../../../services/favorite';
import { HomeStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<HomeStackParamList, 'CameraDetail'>;

const HISTORY = [
  { time: '14:32', label: 'Bắt đầu mưa vừa', icon: 'rainy-outline' as const },
  { time: '13:15', label: 'Giao thông chậm', icon: 'car-outline' as const },
  { time: '12:00', label: 'Thời tiết tốt', icon: 'sunny-outline' as const },
];

const AI_EXPLANATION = 'Camera ghi nhận hình ảnh phù hợp với mẫu mưa vừa theo dữ liệu học máy. Mật độ phương tiện tăng 40% so với giờ thấp điểm. Độ tin cậy cao do nhiều camera khu vực đồng bộ dữ liệu.';

export function CameraDetailScreen({ route, navigation }: Props) {
  const { cameraId, cameraName, district, ward, isRaining, isTrafficJam, aiScore, rainLabel, trafficLabel } =
    route.params;

  const [isFavorite, setIsFavorite] = React.useState(false);

  React.useEffect(() => {
    getFavorites()
      .then((favs) => setIsFavorite(favs.has(cameraId)))
      .catch(() => undefined);
  }, [cameraId]);

  const toggleFavorite = async () => {
    try {
      if (isFavorite) {
        await removeFavorite(cameraId);
      } else {
        await addFavorite(cameraId);
      }
      setIsFavorite((p) => !p);
    } catch {
      Alert.alert('Lỗi', 'Không thể cập nhật danh sách yêu thích.');
    }
  };

  const chipColor = (type: 'rain' | 'traffic') => {
    if (type === 'rain') {
      if (!isRaining) return { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', text: C.clear };
      return { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', text: C.rain };
    }
    if (!isTrafficJam) return { bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)', text: C.clear };
    return { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.3)', text: C.rain };
  };

  const rainStyle = chipColor('rain');
  const trafficStyle = chipColor('traffic');

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      {/* ── Hero section ── */}
      <View style={styles.hero}>
        <View style={styles.heroBg}>
          {/* Simulated blurred camera placeholder */}
          <View style={styles.heroBlur} />
          <View style={styles.heroGrid}>
            {Array.from({ length: 12 }).map((_, i) => (
              <View key={i} style={styles.heroGridCell} />
            ))}
          </View>
          <Ionicons color="rgba(255,255,255,0.15)" name="videocam-outline" size={60} style={styles.heroCamIcon} />
        </View>
        {/* Gradient overlay */}
        <View style={styles.heroOverlay} />
        {/* Blurred badge */}
        <View style={styles.blurredBadge}>
          <Ionicons color="rgba(255,255,255,0.6)" name="eye-off-outline" size={12} />
          <Text style={styles.blurredText}>Ảnh đã làm mờ thông tin nhạy cảm</Text>
        </View>
        {/* Back + Fav buttons */}
        <View style={styles.heroActions}>
          <Pressable onPress={() => navigation.goBack()} style={styles.heroBtn}>
            <Ionicons color={C.onSurface} name="arrow-back" size={20} />
          </Pressable>
          <Pressable onPress={toggleFavorite} style={styles.heroBtn}>
            <Ionicons
              color={isFavorite ? '#FFC107' : C.onSurface}
              name={isFavorite ? 'bookmark' : 'bookmark-outline'}
              size={20}
            />
          </Pressable>
        </View>
      </View>

      {/* ── Content sheet ── */}
      <ScrollView
        bounces={false}
        contentContainerStyle={styles.sheetContent}
        showsVerticalScrollIndicator={false}
        style={styles.sheet}
      >
        {/* Drag handle */}
        <View style={styles.dragHandle} />

        {/* Camera name + location */}
        <Text style={styles.cameraName}>{cameraName}</Text>
        <View style={styles.locationRow}>
          <Ionicons color={C.onSurfaceVariant} name="location-outline" size={14} />
          <Text style={styles.locationText}>
            {ward}, {district}
          </Text>
        </View>

        {/* HOẠT ĐỘNG badge */}
        <View style={styles.activeBadge}>
          <View style={styles.activeDot} />
          <Text style={styles.activeBadgeText}>HOẠT ĐỘNG</Text>
        </View>

        {/* Quick action row */}
        <View style={styles.quickRow}>
          <Pressable style={styles.quickBtn}>
            <Ionicons color={C.primaryContainer} name="map-outline" size={18} />
            <Text style={styles.quickBtnText}>Mở trên bản đồ</Text>
          </Pressable>
          <View style={styles.quickDivider} />
          <Pressable style={styles.quickBtn}>
            <Ionicons color={C.primaryContainer} name="share-outline" size={18} />
            <Text style={styles.quickBtnText}>Chia sẻ</Text>
          </Pressable>
        </View>

        {/* 3-col bento */}
        <View style={styles.bentoRow}>
          <View style={[styles.bentoCard, { backgroundColor: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.2)' }]}>
            <Ionicons color={C.rainMid} name="rainy-outline" size={20} />
            <Text style={styles.bentoLabel}>Mưa</Text>
            <Text style={[styles.bentoValue, { color: isRaining ? C.rain : C.clear }]}>{rainLabel}</Text>
          </View>
          <View style={[styles.bentoCard, { backgroundColor: 'rgba(5,102,217,0.08)', borderColor: 'rgba(5,102,217,0.2)' }]}>
            <Ionicons color={C.secondary} name="car-outline" size={20} />
            <Text style={styles.bentoLabel}>Giao thông</Text>
            <Text style={[styles.bentoValue, { color: isTrafficJam ? C.traffic : C.clear }]}>{trafficLabel}</Text>
          </View>
          <View style={[styles.bentoCard, { backgroundColor: 'rgba(0,242,234,0.08)', borderColor: 'rgba(0,242,234,0.2)' }]}>
            <Ionicons color={C.primaryContainer} name="analytics-outline" size={20} />
            <Text style={styles.bentoLabel}>Độ tin cậy AI</Text>
            <Text style={[styles.bentoValue, { color: aiScore >= 80 ? C.clear : aiScore >= 60 ? C.rainMid : C.rain }]}>{aiScore}%</Text>
          </View>
        </View>

        {/* AI explanation card */}
        <View style={[styles.aiCard, { backgroundColor: glassBg, borderColor: glassBorder }]}>
          <View style={styles.aiCardHeader}>
            <View style={styles.aiCardIcon}>
              <Ionicons color={C.primaryContainer} name="sparkles-outline" size={16} />
            </View>
            <Text style={styles.aiCardTitle}>Giải thích từ AI</Text>
          </View>
          <View style={styles.aiCardQuote}>
            <View style={styles.aiQuoteLine} />
            <Text style={styles.aiCardText}>{AI_EXPLANATION}</Text>
          </View>
        </View>

        {/* Status history timeline */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Lịch sử trạng thái</Text>
          {HISTORY.map((item, idx) => (
            <View key={idx} style={styles.timelineItem}>
              <View style={styles.timelineLeft}>
                <View style={styles.timelineDot} />
                {idx < HISTORY.length - 1 && <View style={styles.timelineLine} />}
              </View>
              <View style={styles.timelineContent}>
                <View style={styles.timelineRow}>
                  <Ionicons color={C.onSurfaceVariant} name={item.icon} size={14} />
                  <Text style={styles.timelineLabel}>{item.label}</Text>
                </View>
                <Text style={styles.timelineTime}>{item.time}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Report AI error ghost button */}
        <Pressable
          onPress={() => Alert.alert('Báo cáo', 'Đã gửi báo cáo AI nhận diện sai tới hệ thống.')}
          style={styles.ghostBtn}
        >
          <Ionicons color={C.onSurfaceVariant} name="flag-outline" size={16} />
          <Text style={styles.ghostBtnText}>Báo cáo AI nhận diện sai</Text>
        </Pressable>

        {/* Footer */}
        <Text style={styles.footer}>HCMRainVision · Cổng TTGT TP.HCM · v1.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.background },

  // Hero
  hero: { height: 280, position: 'relative', overflow: 'hidden' },
  heroBg: { ...StyleSheet.absoluteFill, backgroundColor: '#0a1e35', alignItems: 'center', justifyContent: 'center' },
  heroBlur: { ...StyleSheet.absoluteFill, backgroundColor: '#071524' },
  heroGrid: { ...StyleSheet.absoluteFill, flexDirection: 'row', flexWrap: 'wrap', opacity: 0.15 },
  heroGridCell: { width: '33.33%', height: '25%', borderWidth: 0.5, borderColor: '#1a3a5c' },
  heroCamIcon: { position: 'absolute' },
  heroOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(5,20,36,0.6)' },
  blurredBadge: {
    position: 'absolute',
    bottom: SPACING.md,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(22,37,41,0.8)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  blurredText: { color: 'rgba(255,255,255,0.6)', ...FONT.labelSm },
  heroActions: { position: 'absolute', top: SPACING.md, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: SPACING.md },
  heroBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(22,37,41,0.75)', borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

  // Sheet
  sheet: { flex: 1, backgroundColor: C.background, marginTop: -20, borderTopLeftRadius: RADIUS.xl2, borderTopRightRadius: RADIUS.xl2 },
  sheetContent: { padding: SPACING.md, gap: SPACING.md, paddingBottom: 40 },
  dragHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: C.outlineVariant, alignSelf: 'center', marginBottom: SPACING.xs },

  cameraName: { color: C.onSurface, ...FONT.displayLg },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  locationText: { color: C.onSurfaceVariant, ...FONT.bodySm },

  activeBadge: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(16,185,129,0.12)', borderRadius: RADIUS.full, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 0.5, borderColor: 'rgba(16,185,129,0.3)' },
  activeDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: C.clear },
  activeBadgeText: { color: C.clear, ...FONT.labelSm },

  quickRow: { flexDirection: 'row', backgroundColor: glassBg, borderWidth: 0.5, borderColor: glassBorder, borderRadius: RADIUS.xl, overflow: 'hidden' },
  quickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, paddingVertical: 16 },
  quickBtnText: { color: C.primaryContainer, ...FONT.titleSm },
  quickDivider: { width: 0.5, backgroundColor: glassBorder },

  bentoRow: { flexDirection: 'row', gap: SPACING.sm },
  bentoCard: { flex: 1, borderRadius: RADIUS.xl, borderWidth: 0.5, padding: SPACING.sm, alignItems: 'center', gap: 4 },
  bentoLabel: { color: C.onSurfaceVariant, ...FONT.labelSm },
  bentoValue: { ...FONT.titleSm, textAlign: 'center' },

  aiCard: { borderRadius: RADIUS.xl, borderWidth: 0.5, padding: SPACING.md, gap: SPACING.sm },
  aiCardHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  aiCardIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: 'rgba(0,242,234,0.1)', borderWidth: 0.5, borderColor: 'rgba(0,242,234,0.2)', alignItems: 'center', justifyContent: 'center' },
  aiCardTitle: { color: C.onSurface, ...FONT.titleSm },
  aiCardQuote: { flexDirection: 'row', gap: SPACING.sm },
  aiQuoteLine: { width: 3, borderRadius: 2, backgroundColor: C.primaryContainer },
  aiCardText: { flex: 1, color: C.onSurfaceVariant, ...FONT.bodySm, fontStyle: 'italic' },

  section: { gap: SPACING.sm },
  sectionTitle: { color: C.onSurface, ...FONT.titleSm },
  timelineItem: { flexDirection: 'row', gap: SPACING.md },
  timelineLeft: { alignItems: 'center', width: 16 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: C.outlineVariant, borderWidth: 2, borderColor: C.primaryContainer, marginTop: 3 },
  timelineLine: { flex: 1, width: 1.5, backgroundColor: C.outlineVariant, marginTop: 4 },
  timelineContent: { flex: 1, paddingBottom: SPACING.md },
  timelineRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timelineLabel: { color: C.onSurface, ...FONT.bodySm },
  timelineTime: { color: C.onSurfaceVariant, ...FONT.labelSm, marginTop: 2 },

  ghostBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm, borderRadius: RADIUS.full, borderWidth: 1, borderColor: C.outlineVariant, paddingVertical: 14 },
  ghostBtnText: { color: C.onSurfaceVariant, ...FONT.titleSm },

  footer: { color: C.outlineVariant, ...FONT.labelSm, textAlign: 'center', marginTop: SPACING.sm },
});
