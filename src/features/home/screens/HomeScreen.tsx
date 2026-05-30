import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../hooks/useAuth';
import { getCameraList } from '../../../services/camera';
import { addFavorite, getFavorites, removeFavorite } from '../../../services/favorite';
import { getLatestWeather, getRainingCameraCount, getWeatherLogs, WeatherLogItem } from '../../../services/weather';
import { homeStyles } from '../styles';

type DashboardStats = {
  cameraTotal: number;
  rainingCount: number;
  rainProbability: number;
};

const quickCards = [
  {
    title: 'Ban do thoi gian thuc',
    subtitle: 'Theo doi mua, ket xe va ngap ung ngay tu trang dau',
  },
  {
    title: 'Canh bao gan day',
    subtitle: 'Cap nhat cac diem nong o Nga tu Hang Xanh, Cau Sai Gon',
  },
  {
    title: 'Loi tat nhanh',
    subtitle: 'Mo camera, tra cuu tuyen duong hoac kiem tra khu vuc quan tam',
  },
];

export function HomeScreen() {
  const { logout, profile } = useAuth();
  const [stats, setStats] = React.useState<DashboardStats>({
    cameraTotal: 0,
    rainingCount: 0,
    rainProbability: 0,
  });
  const [loadingStats, setLoadingStats] = React.useState(false);
  const [cameraItems, setCameraItems] = React.useState<Array<{ id?: string; name?: string; districtName?: string | null; wardName?: string | null; status?: string | null }>>([]);
  const [favoriteIds, setFavoriteIds] = React.useState<Set<string>>(new Set());
  const [weatherLogs, setWeatherLogs] = React.useState<WeatherLogItem[]>([]);
  const [favoriteBusyId, setFavoriteBusyId] = React.useState<string | null>(null);

  const refreshDashboard = React.useCallback(async () => {
    try {
      setLoadingStats(true);

      const [cameraResult, rainingCount, weather, logs, favorites] = await Promise.all([
        getCameraList(1, 100),
        getRainingCameraCount(30),
        getLatestWeather(),
        getWeatherLogs(180, 5, false),
        getFavorites().catch(() => new Set<string>()),
      ]);

      let probability = 0;
      if (typeof weather.rainProbability === 'number') {
        probability = weather.rainProbability;
      } else if (typeof weather.probability === 'number') {
        probability = weather.probability;
      }

      setStats({
        cameraTotal: cameraResult.total,
        rainingCount,
        rainProbability: probability,
      });
      setCameraItems(cameraResult.items.slice(0, 6));
      setWeatherLogs(logs);
      setFavoriteIds(favorites);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const toggleFavorite = React.useCallback(
    async (cameraId: string) => {
      if (!cameraId) {
        return;
      }

      const currentlyFav = favoriteIds.has(cameraId);

      try {
        setFavoriteBusyId(cameraId);
        if (currentlyFav) {
          await removeFavorite(cameraId);
          setFavoriteIds((prev) => {
            const next = new Set(prev);
            next.delete(cameraId);
            return next;
          });
        } else {
          await addFavorite(cameraId);
          setFavoriteIds((prev) => {
            const next = new Set(prev);
            next.add(cameraId);
            return next;
          });
        }
      } finally {
        setFavoriteBusyId(null);
      }
    },
    [favoriteIds],
  );

  React.useEffect(() => {
    refreshDashboard().catch(() => undefined);
  }, [refreshDashboard]);

  const highlights = [
    { value: String(stats.cameraTotal), label: 'Camera tong cong' },
    { value: String(stats.rainingCount), label: 'Camera dang mua' },
    { value: `${Math.round(stats.rainProbability * 100)}%`, label: 'Xac suat mua' },
  ];

  return (
    <SafeAreaView style={homeStyles.safeArea}>
      <View style={homeStyles.background}>
        <View style={homeStyles.grid} />
        <View style={homeStyles.glowTop} />
      </View>

      <ScrollView contentContainerStyle={homeStyles.content} showsVerticalScrollIndicator={false}>
        <View style={homeStyles.topBar}>
          <Text style={homeStyles.brandTiny}>{profile?.username || 'HCMRainVision'}</Text>
          <Pressable onPress={() => refreshDashboard().catch(() => undefined)} style={homeStyles.logoutBtn}>
            <Text style={homeStyles.logoutText}>{loadingStats ? 'Dang tai...' : 'Lam moi'}</Text>
          </Pressable>
          <Pressable onPress={logout} style={homeStyles.logoutBtn}>
            <Text style={homeStyles.logoutText}>Dang xuat</Text>
          </Pressable>
        </View>

        <View style={homeStyles.homeHero}>
          <View style={homeStyles.homeHeroTop}>
            <Text style={homeStyles.homeHeroBrand}>HCMRainVision</Text>
            <Text style={homeStyles.homeHeroBrand}>TP.HCM</Text>
          </View>
          <Text style={homeStyles.homeHeroTitle}>Giam sat mua va giao thong</Text>
          <Text style={homeStyles.homeHeroDesc}>
            Trang chu trung tam de xem ban do, tinh trang camera va quan ly canh bao theo
            thoi gian gan thuc.
          </Text>
        </View>

        <View style={homeStyles.homeStatRow}>
          {highlights.map((item) => (
            <View key={item.label} style={homeStyles.homeStatCard}>
              <Text style={homeStyles.homeStatValue}>{item.value}</Text>
              <Text style={homeStyles.homeStatLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <Text style={homeStyles.homeSectionTitle}>Kham pha nhanh</Text>
        {quickCards.map((item) => (
          <View key={item.title} style={homeStyles.homeCard}>
            <Text style={homeStyles.homeCardTitle}>{item.title}</Text>
            <Text style={homeStyles.homeCardSubtitle}>{item.subtitle}</Text>
          </View>
        ))}

        <Text style={homeStyles.homeSectionTitle}>Ban do noi bat</Text>
        <View style={homeStyles.cameraCard}>
          <View style={homeStyles.cameraImage} />
          <View style={homeStyles.cameraMeta}>
            <Text style={homeStyles.cameraName}>Nga tu Hang Xanh</Text>
            <View style={homeStyles.statusRow}>
              <View
                style={[
                  homeStyles.pill,
                  {
                    borderColor: 'rgba(239,68,68,0.45)',
                    backgroundColor: 'rgba(127,29,29,0.32)',
                  },
                ]}
              >
                <Text style={[homeStyles.pillText, { color: '#FCA5A5' }]}>Mua lon</Text>
              </View>
              <View
                style={[
                  homeStyles.pill,
                  {
                    borderColor: 'rgba(16,185,129,0.45)',
                    backgroundColor: 'rgba(6,78,59,0.35)',
                  },
                ]}
              >
                <Text style={[homeStyles.pillText, { color: '#6EE7B7' }]}>Ket xe</Text>
              </View>
            </View>
            <View style={homeStyles.cameraFooter}>
              <Text style={homeStyles.cameraFooterText}>Cap nhat 2 phut truoc</Text>
              <Text style={homeStyles.cameraFooterText}>Binh Thanh</Text>
            </View>
          </View>
        </View>

        <Text style={homeStyles.homeSectionTitle}>Camera thực tế</Text>
        <View style={homeStyles.listCard}>
          {cameraItems.length === 0 ? (
            <Text style={homeStyles.homeCardSubtitle}>Chưa có dữ liệu camera.</Text>
          ) : (
            cameraItems.map((camera, index) => {
              const cameraId = camera.id || `${index}`;
              const isFavorite = favoriteIds.has(cameraId);
              let actionLabel = 'Yêu thích';
              if (favoriteBusyId === cameraId) {
                actionLabel = 'Đang lưu...';
              } else if (isFavorite) {
                actionLabel = 'Bỏ yêu thích';
              }

              return (
                <View key={cameraId} style={homeStyles.cameraListRow}>
                  <View style={homeStyles.cameraListMain}>
                    <Text style={homeStyles.cameraListName}>{camera.name || 'Camera chưa đặt tên'}</Text>
                    <Text style={homeStyles.cameraListMeta}>
                      {(camera.wardName || 'Chưa có phường')} - {(camera.districtName || 'Chưa có quận')}
                    </Text>
                    <Text style={homeStyles.cameraListMeta}>Trạng thái: {camera.status || 'Không rõ'}</Text>
                  </View>

                  <Pressable
                    onPress={() => toggleFavorite(cameraId).catch(() => undefined)}
                    style={homeStyles.actionBtn}
                  >
                    <Text style={homeStyles.actionBtnText}>{actionLabel}</Text>
                  </Pressable>
                </View>
              );
            })
          )}
        </View>

        <Text style={homeStyles.homeSectionTitle}>Nhật ký thời tiết gần đây</Text>
        <View style={homeStyles.listCard}>
          {weatherLogs.length === 0 ? (
            <Text style={homeStyles.homeCardSubtitle}>Chưa có nhật ký thời tiết.</Text>
          ) : (
            weatherLogs.map((log, index) => {
              const key = log.id || `${log.cameraId || 'cam'}-${index}`;
              return (
                <View key={key} style={homeStyles.weatherLogRow}>
                  <Text style={homeStyles.weatherLogName}>{log.cameraName || log.cameraId || 'Camera'}</Text>
                  <Text style={homeStyles.weatherLogMeta}>
                    {log.isRaining ? 'Đang mưa' : 'Không mưa'}
                    {typeof log.probability === 'number' ? ` - Xác suất ${Math.round(log.probability * 100)}%` : ''}
                  </Text>
                  <Text style={homeStyles.weatherLogMeta}>{log.createdAt || log.capturedAt || 'Không có thời gian'}</Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
