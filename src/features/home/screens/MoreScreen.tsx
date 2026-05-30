import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../hooks/useAuth';
import { getCameraList } from '../../../services/camera';
import { getFavorites } from '../../../services/favorite';
import { palette } from '../../auth/design';

type MenuItem = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  subtitle?: string;
};

const MAIN_MENU: MenuItem[] = [
  { icon: 'heart-outline', label: 'Yêu thích', subtitle: 'Các camera đã lưu' },
  { icon: 'notifications-outline', label: 'Cài đặt thông báo', subtitle: 'Mưa, kẹt xe, cảnh báo' },
  { icon: 'time-outline', label: 'Lịch sử tra cứu', subtitle: 'Xem lại các tra cứu gần đây' },
  { icon: 'help-circle-outline', label: 'Hướng dẫn sử dụng', subtitle: 'Câu hỏi thường gặp & hỗ trợ' },
];

function MenuRow({ item }: { item: MenuItem }) {
  return (
    <Pressable style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}>
      <View style={styles.menuIconWrap}>
        <Ionicons color="#00F2EA" name={item.icon} size={20} />
      </View>
      <View style={styles.menuTextWrap}>
        <Text style={styles.menuLabel}>{item.label}</Text>
        {item.subtitle ? <Text style={styles.menuSubtitle}>{item.subtitle}</Text> : null}
      </View>
      <Ionicons color="#1D4D77" name="chevron-forward" size={16} />
    </Pressable>
  );
}

export function MoreScreen() {
  const { isAuthenticated, profile, logout } = useAuth();
  const [cameraOnline, setCameraOnline] = React.useState(412);
  const [cameraTotal, setCameraTotal] = React.useState(428);
  const [favCount, setFavCount] = React.useState(0);

  React.useEffect(() => {
    getCameraList(1, 1)
      .then((r) => {
        if (r.total) setCameraTotal(r.total);
        setCameraOnline(Math.floor(r.total * 0.97));
      })
      .catch(() => undefined);

    getFavorites()
      .then((favs) => setFavCount(favs.size))
      .catch(() => undefined);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.background}>
        <View style={styles.bgGlow} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile header */}
        <View style={styles.profileCard}>
          <View style={styles.avatarWrap}>
            <Ionicons
              color={isAuthenticated ? '#00F2EA' : '#4E6B88'}
              name={isAuthenticated ? 'person-circle' : 'person-circle-outline'}
              size={48}
            />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {isAuthenticated && profile?.fullName
                ? profile.fullName
                : 'Khách (Guest)'}
            </Text>
            <Text style={styles.profileSub}>
              {isAuthenticated && profile?.email
                ? profile.email
                : 'Chưa đăng nhập'}
            </Text>
          </View>
          {isAuthenticated ? (
            <Pressable onPress={logout} style={styles.logoutBtn}>
              <Text style={styles.logoutText}>Đăng xuất</Text>
            </Pressable>
          ) : (
            <Pressable style={styles.loginBtn}>
              <Text style={styles.loginText}>Đăng nhập</Text>
            </Pressable>
          )}
        </View>

        {/* Stats row */}
        {isAuthenticated ? (
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{favCount}</Text>
              <Text style={styles.statLabel}>Yêu thích</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{cameraOnline}</Text>
              <Text style={styles.statLabel}>Camera online</Text>
            </View>
          </View>
        ) : null}

        {/* Menu chính */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>MENU CHÍNH</Text>
          <View style={styles.sectionCard}>
            {MAIN_MENU.map((item, i) => (
              <React.Fragment key={item.label}>
                <MenuRow item={item} />
                {i < MAIN_MENU.length - 1 ? <View style={styles.divider} /> : null}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* Admin panel */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>BẢNG ĐIỀU KHIỂN ADMIN</Text>
          <View style={styles.adminCard}>
            <View style={styles.adminStatsRow}>
              <View style={styles.adminStatItem}>
                <Ionicons color="#00F2EA" name="videocam-outline" size={22} />
                <View>
                  <Text style={styles.adminStatValue}>
                    {cameraOnline}
                    <Text style={styles.adminStatTotal}>/{cameraTotal}</Text>
                  </Text>
                  <Text style={styles.adminStatLabel}>Camera Online</Text>
                </View>
              </View>
              <View style={styles.badgeWrap}>
                <View style={styles.badgeOnline}>
                  <View style={styles.badgeDot} />
                  <Text style={styles.badgeText}>Đang chạy</Text>
                </View>
              </View>
            </View>
            <Pressable
              onPress={() => Linking.openURL('http://localhost:5057').catch(() => undefined)}
              style={styles.adminPortalBtn}
            >
              <Text style={styles.adminPortalText}>Truy cập Admin Portal</Text>
              <Ionicons color="#EAF6FF" name="open-outline" size={14} />
            </Pressable>
          </View>
        </View>

        {/* App info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>HCMRainVision v1.0.0</Text>
          <Text style={styles.appInfoText}>Cổng thông tin giao thông TP.HCM</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: palette.background },
  background: { ...StyleSheet.absoluteFill },
  bgGlow: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    top: -80,
    left: -80,
    backgroundColor: '#0A2A4A',
    opacity: 0.6,
  },
  scrollContent: {
    paddingBottom: 24,
    gap: 16,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#0C2444',
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,242,234,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#1D4D77',
  },
  profileInfo: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    color: '#EAF6FF',
    fontSize: 16,
    fontWeight: '700',
  },
  profileSub: {
    color: '#5A7A9A',
    fontSize: 12,
  },
  loginBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: '#00F2EA',
  },
  loginText: {
    color: '#03142A',
    fontSize: 12,
    fontWeight: '800',
  },
  logoutBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#3A6080',
  },
  logoutText: {
    color: '#8AB0CC',
    fontSize: 12,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1D4D77',
    backgroundColor: 'rgba(7,20,40,0.8)',
    paddingVertical: 14,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    color: '#00F2EA',
    fontSize: 22,
    fontWeight: '800',
  },
  statLabel: {
    color: '#5A7A9A',
    fontSize: 11,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#1D4D77',
  },
  section: {
    paddingHorizontal: 16,
    gap: 8,
  },
  sectionTitle: {
    color: '#3A6080',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1D4D77',
    backgroundColor: 'rgba(7,20,40,0.9)',
    overflow: 'hidden',
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  menuRowPressed: {
    backgroundColor: 'rgba(0,242,234,0.06)',
  },
  menuIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0,242,234,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1A4060',
  },
  menuTextWrap: {
    flex: 1,
    gap: 1,
  },
  menuLabel: {
    color: '#D0E3F5',
    fontSize: 14,
    fontWeight: '600',
  },
  menuSubtitle: {
    color: '#4E6B88',
    fontSize: 11,
  },
  divider: {
    height: 1,
    backgroundColor: '#0C2444',
    marginHorizontal: 14,
  },
  adminCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1D4D77',
    backgroundColor: 'rgba(7,20,40,0.9)',
    padding: 14,
    gap: 14,
  },
  adminStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adminStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  adminStatValue: {
    color: '#00F2EA',
    fontSize: 24,
    fontWeight: '800',
    lineHeight: 28,
  },
  adminStatTotal: {
    color: '#3A6080',
    fontSize: 16,
    fontWeight: '500',
  },
  adminStatLabel: {
    color: '#5A7A9A',
    fontSize: 11,
  },
  badgeWrap: {
    alignItems: 'flex-end',
  },
  badgeOnline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.35)',
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  badgeText: {
    color: '#6EE7B7',
    fontSize: 11,
    fontWeight: '700',
  },
  adminPortalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#3A6080',
    backgroundColor: 'rgba(0,242,234,0.06)',
  },
  adminPortalText: {
    color: '#EAF6FF',
    fontSize: 13,
    fontWeight: '700',
  },
  appInfo: {
    alignItems: 'center',
    gap: 2,
    marginTop: 8,
  },
  appInfoText: {
    color: '#2A4A6A',
    fontSize: 11,
  },
});
