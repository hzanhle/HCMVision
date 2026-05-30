import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';
import { LocationPermissionScreen } from '../features/entry/screens/LocationPermissionScreen';
import { NotificationPermissionScreen } from '../features/entry/screens/NotificationPermissionScreen';
import { OnboardingScreen } from '../features/entry/screens/OnboardingScreen';
import { WelcomeScreen } from '../features/entry/screens/WelcomeScreen';
import { EntryStackParamList } from './types';

const Stack = createNativeStackNavigator<EntryStackParamList>();

type EntryNavigatorProps = {
  onFinishAuth: () => void;
};

export function EntryNavigator({ onFinishAuth }: Readonly<EntryNavigatorProps>) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen component={WelcomeScreen} name="Welcome" />
      <Stack.Screen component={OnboardingScreen} name="Onboarding" />
      <Stack.Screen component={NotificationPermissionScreen} name="NotificationPermission" />
      <Stack.Screen
        component={LocationPermissionScreen}
        initialParams={{ onFinishAuth }}
        name="LocationPermission"
      />
    </Stack.Navigator>
  );
}
