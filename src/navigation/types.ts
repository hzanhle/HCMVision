export type RootStackParamList = {
  Entry: undefined;
  Auth: undefined;
  Home: undefined;
};

export type EntryStackParamList = {
  Welcome: undefined;
  Onboarding: undefined;
  NotificationPermission: undefined;
  LocationPermission:
    | {
        onFinishAuth?: () => void;
      }
    | undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
};

export type HomeTabParamList = {
  MapTab: undefined;
  RouteTab: undefined;
  CameraStatusTab: undefined;
  AlertsTab: undefined;
  MoreTab: undefined;
};

export type HomeStackParamList = {
  Tabs: undefined;
  CameraDetail: {
    cameraId: string;
    cameraName: string;
    district: string;
    ward: string;
    isRaining: boolean;
    isTrafficJam: boolean;
    aiScore: number;
    rainLabel: string;
    trafficLabel: string;
  };
};
