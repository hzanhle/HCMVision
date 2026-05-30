import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { CameraDetailScreen } from '../features/home/screens/CameraDetailScreen';
import { HomeTabNavigator } from './HomeTabNavigator';
import { useAuth } from '../hooks/useAuth';
import { AuthNavigator } from './AuthNavigator';
import { EntryNavigator } from './EntryNavigator';
import {
  getOnboardingCompleted,
  setOnboardingCompleted as persistOnboardingCompleted,
} from '../utils/storage';
import { HomeStackParamList, RootStackParamList } from './types';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen component={HomeTabNavigator} name="Tabs" />
      <HomeStack.Screen component={CameraDetailScreen} name="CameraDetail" />
    </HomeStack.Navigator>
  );
}

export function AppNavigator() {
  const { isAuthenticated } = useAuth();
  const [entryReady, setEntryReady] = React.useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = React.useState(false);

  React.useEffect(() => {
    getOnboardingCompleted()
      .then((done) => {
        setOnboardingCompleted(done);
      })
      .finally(() => {
        setEntryReady(true);
      });
  }, []);

  const completeEntryToAuth = React.useCallback(() => {
    persistOnboardingCompleted(true).catch(() => undefined);
    setOnboardingCompleted(true);
  }, []);

  if (!entryReady) {
    return null;
  }

  const renderRootScreen = () => {
    if (!onboardingCompleted) {
      return (
        <RootStack.Screen name="Entry">
          {() => <EntryNavigator onFinishAuth={completeEntryToAuth} />}
        </RootStack.Screen>
      );
    }

    if (isAuthenticated) {
      return <RootStack.Screen component={HomeStackNavigator} name="Home" />;
    }

    return <RootStack.Screen component={AuthNavigator} name="Auth" />;
  };

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>{renderRootScreen()}</RootStack.Navigator>
    </NavigationContainer>
  );
}
