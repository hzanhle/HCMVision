import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import * as Location from "expo-location";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, TouchableOpacity, View } from "react-native";
import MapView, { Marker, PROVIDER_DEFAULT, UrlTile } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import FilterButton from "../../components/map/FilterButton";
import FilterSheet from "../../components/map/FilterSheet";
import LocateButton from "../../components/map/LocateButton";
import { useFavorites } from "../../context/FavoritesContext";
import { cameraService } from "../../services/cameras";
import { startRainHub } from "../../services/rainHub";
import { weatherService } from "../../services/weather";
import useAppStore from "../../store/useAppStore";
import { Camera } from "../../types/camera";

const HCMC_REGION = {
  latitude: 10.7769,
  longitude: 106.7009,
  latitudeDelta: 0.08,
  longitudeDelta: 0.08,
};

type RainStatusFilter = "HEAVY" | "MEDIUM" | "LIGHT" | "NONE" | null;

interface FilterState {
  rainStatus: RainStatusFilter;
  onlineOnly: boolean;
  favoritesOnly: boolean;
}

const normalizeRainLevel = (
  value: unknown,
): "none" | "light" | "medium" | "heavy" => {
  const raw = String(value || "").toLowerCase();
  if (["heavy", "high", "storm", "severe"].some((item) => raw.includes(item))) {
    return "heavy";
  }
  if (["medium", "moderate"].some((item) => raw.includes(item))) {
    return "medium";
  }
  if (["light", "drizzle", "low"].some((item) => raw.includes(item))) {
    return "light";
  }
  return "none";
};

const rainMarkerStyle = (level: string) => {
  switch (level) {
    case "heavy":
      return { label: "H", color: "#dc2626", textColor: "white" };
    case "medium":
      return { label: "M", color: "#f97316", textColor: "white" };
    case "light":
      return { label: "L", color: "#38bdf8", textColor: "#0f172a" };
    default:
      return { label: "CAM", color: "white", textColor: "#111827" };
  }
};

const formatConfidence = (value: unknown): string => {
  return typeof value === "number" ? `${Math.round(value * 100)} %` : "";
};

export default function MapHomeScreen({ navigation }: any) {
  const mapRef = useRef<MapView>(null);
  const [locating, setLocating] = useState(false);
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [cameraLoading, setCameraLoading] = useState(true);

  const { favoriteIds } = useFavorites();
  const aiByCameraId = useAppStore((s: any) => s.aiByCameraId);
  const setAiForCamera = useAppStore((s: any) => s.setAiForCamera);
  const syncWeatherData = useAppStore((s: any) => s.syncWeatherData);
  const token = useAppStore((s) => s.token);

  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<FilterState>({
    rainStatus: null,
    onlineOnly: false,
    favoritesOnly: false,
  });

  const applyWeatherUpdate = useCallback(
    (item: any) => {
      const cameraId = item?.cameraId || item?.camera?.id || item?.id;
      if (!cameraId) return;

      const rainLevel = normalizeRainLevel(
        item?.rainLevel || item?.rain_level || item?.weatherStatus,
      );
      const isRaining =
        typeof item?.isRaining === "boolean"
          ? item.isRaining
          : rainLevel !== "none";
      const trafficLevel = item?.trafficLevel || item?.traffic_level || "unknown";

      setAiForCamera(cameraId, {
        prediction: isRaining ? "CO MUA" : "KHONG MUA",
        confidenceScore: formatConfidence(item?.confidence),
        isRaining,
        rainLevel,
        trafficLevel,
        imageUrl: item?.imageUrl || null,
        timestamp: item?.timestamp,
      });

      setCameras((current) =>
        current.map((camera: any) =>
          String(camera.id) === String(cameraId)
            ? {
                ...camera,
                rainStatus: rainLevel,
                weatherStatus: rainLevel,
                trafficLevel,
              }
            : camera,
        ),
      );
    },
    [setAiForCamera],
  );

  const refreshLatestWeather = useCallback(async () => {
    const result = await weatherService.getLatest(token || undefined);
    if (!result.success) return;

    const payload: any = result.data;
    const items = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.items)
        ? payload.items
        : payload
          ? [payload]
          : [];

    items.forEach(applyWeatherUpdate);
    syncWeatherData();
  }, [applyWeatherUpdate, syncWeatherData, token]);

  const fetchCameras = useCallback(async () => {
    setCameraLoading(true);
    const result = await cameraService.getAllCameras();
    if (result.success && result.data) {
      setCameras(result.data);
    }
    setCameraLoading(false);
  }, []);

  useEffect(() => {
    fetchCameras();
  }, [fetchCameras]);

  useEffect(() => {
    refreshLatestWeather();
    const interval = setInterval(refreshLatestWeather, 60000);
    return () => clearInterval(interval);
  }, [refreshLatestWeather]);

  useEffect(() => {
    let disposed = false;
    let stop: (() => Promise<void>) | undefined;

    startRainHub({
      token,
      onRainAlert: applyWeatherUpdate,
    })
      .then((cleanup) => {
        if (disposed) {
          cleanup();
          return;
        }
        stop = cleanup;
      })
      .catch((error) => {
        console.warn("SignalR rain hub connection failed:", error?.message || error);
      });

    return () => {
      disposed = true;
      if (stop) {
        stop();
      }
    };
  }, [applyWeatherUpdate, token]);

  const filteredCameras = useMemo(() => {
    let filtered = [...cameras];

    if (appliedFilters.onlineOnly) {
      filtered = filtered.filter((cam) => cam.status === "Active");
    }

    if (appliedFilters.favoritesOnly) {
      filtered = filtered.filter((cam) => favoriteIds.has(cam.id));
    }

    if (appliedFilters.rainStatus) {
      filtered = filtered.filter((camera: any) => {
        const ai = aiByCameraId?.[String(camera.id)];
        const level = normalizeRainLevel(
          ai?.rainLevel || camera.rainStatus || camera.weatherStatus,
        );
        return level.toUpperCase() === appliedFilters.rainStatus;
      });
    }

    return filtered;
  }, [aiByCameraId, cameras, appliedFilters, favoriteIds]);

  const getMarkerColor = (status: string) => {
    return status === "Active" ? "#22c55e" : "#6b7280";
  };

  const handleLocateMe = async () => {
    try {
      setLocating(true);

      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Please enable location permission in your device settings to use this feature.",
          [{ text: "OK" }],
        );
        setLocating(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;

      if (mapRef.current) {
        mapRef.current.animateToRegion(
          {
            latitude,
            longitude,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          },
          1000,
        );
      }

      setLocating(false);
    } catch (error) {
      console.error("Location error:", error);
      Alert.alert("Error", "Cannot get current location. Please try again.", [
        { text: "OK" },
      ]);
      setLocating(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <StatusBar style="dark" />

      <MapView
        ref={mapRef}
        style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0 }}
        provider={PROVIDER_DEFAULT}
        initialRegion={HCMC_REGION}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
        toolbarEnabled={false}
        loadingEnabled={true}
        loadingIndicatorColor="#3b82f6"
        loadingBackgroundColor="#f9fafb"
      >
        <UrlTile
          urlTemplate="https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png"
          maximumZ={19}
        />

        {filteredCameras.map((camera: any) => {
          const ai = aiByCameraId?.[String(camera.id)];
          const rainLevel = normalizeRainLevel(
            ai?.rainLevel || camera.rainStatus || camera.weatherStatus,
          );
          const trafficLevel = ai?.trafficLevel || camera.trafficLevel || "unknown";
          const marker = rainMarkerStyle(rainLevel);

          return (
            <Marker
              key={camera.id}
              coordinate={{
                latitude: camera.latitude,
                longitude: camera.longitude,
              }}
              title={camera.name}
              description={`Rain: ${rainLevel} | Traffic: ${trafficLevel}`}
              pinColor={getMarkerColor(camera.status)}
              onCalloutPress={() =>
                navigation.navigate("CameraDetailMap", { camera })
              }
            >
              <View style={{ alignItems: "center", justifyContent: "center" }}>
                <View
                  style={{
                    backgroundColor: marker.color,
                    paddingHorizontal: 6,
                    paddingVertical: 3,
                    borderRadius: 10,
                    borderColor:
                      rainLevel === "none" ? getMarkerColor(camera.status) : marker.color,
                    borderWidth: 1,
                    minWidth: 28,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: "700", color: marker.textColor }}>
                    {marker.label}
                  </Text>
                </View>
              </View>
            </Marker>
          );
        })}
      </MapView>

      <View
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          right: 0,
          justifyContent: "space-between",
        }}
        pointerEvents="box-none"
      >
        <SafeAreaView edges={["top"]} pointerEvents="box-none">
          <View className="mx-2">
            <View className="bg-white/95 rounded-2xl px-4 py-3">
              <HStack className="items-center justify-between">
                <VStack>
                  <Heading size="lg" className="text-gray-900 font-bold">
                    Rain Map
                  </Heading>
                  <Text className="text-sm text-gray-600 mt-0.5">HCM City</Text>
                </VStack>
                <HStack className="items-center gap-3">
                  {cameraLoading && <Spinner size="small" />}
                  {!cameraLoading && (
                    <Text className="text-xs text-gray-500">
                      {filteredCameras.length} cameras
                    </Text>
                  )}
                  <TouchableOpacity
                    onPress={() => navigation.navigate("Settings")}
                    className="w-10 h-10 items-center justify-center"
                  >
                    <Text className="text-lg">SET</Text>
                  </TouchableOpacity>
                </HStack>
              </HStack>
            </View>
          </View>
        </SafeAreaView>

        <View
          className="absolute top-32 left-4"
          style={{ zIndex: 5 }}
          pointerEvents="box-none"
        >
          <FilterButton onPress={() => setFilterSheetVisible(true)} />
        </View>

        <View
          className="absolute bottom-24 right-4"
          style={{ zIndex: 5 }}
          pointerEvents="box-none"
        >
          <LocateButton onPress={handleLocateMe} loading={locating} />
        </View>

        <TouchableOpacity
          onPress={() => navigation.navigate("Chatbot")}
          style={{
            position: "absolute",
            bottom: 90,
            left: 16,
            zIndex: 6,
          }}
          className="w-12 h-12 rounded-2xl bg-white/95 items-center justify-center border border-gray-200"
        >
          <Text className="text-sm font-semibold">CHAT</Text>
        </TouchableOpacity>
      </View>

      <FilterSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        onApply={setAppliedFilters}
        initialFilters={appliedFilters}
      />
    </View>
  );
}
