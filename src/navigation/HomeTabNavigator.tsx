import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { MapScreen } from '../features/home/screens/MapScreen';
import { CameraStatusScreen } from '../features/home/screens/CameraStatusScreen';
import { AlertsScreen } from '../features/home/screens/AlertsScreen';
import { MoreScreen } from '../features/home/screens/MoreScreen';
import { RouteScreen } from '../features/home/screens/RouteScreen';
import { HomeTabParamList } from './types';

const Tab = createBottomTabNavigator<HomeTabParamList>();

const tabBarStyle = {
  backgroundColor: '#071A30',
  borderTopColor: '#163A63',
  borderTopWidth: 1,
  height: 62,
  paddingBottom: 8,
  paddingTop: 6,
};

const tabBarLabelStyle = {
  fontSize: 10,
  fontWeight: '600' as const,
};

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(active: IconName, inactive: IconName) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons color={color} name={focused ? active : inactive} size={22} />
  );
}

export function HomeTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="MapTab"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#00F2EA',
        tabBarInactiveTintColor: '#4E6B88',
        tabBarStyle,
        tabBarLabelStyle,
      }}
    >
      <Tab.Screen
        component={MapScreen}
        name="MapTab"
        options={{
          tabBarLabel: 'Bản đồ',
          tabBarIcon: tabIcon('map', 'map-outline'),
        }}
      />
      <Tab.Screen
        component={RouteScreen}
        name="RouteTab"
        options={{
          tabBarLabel: 'Tuyến đường',
          tabBarIcon: tabIcon('git-branch', 'git-branch-outline'),
        }}
      />
      <Tab.Screen
        component={CameraStatusScreen}
        name="CameraStatusTab"
        options={{
          tabBarLabel: 'Tình trạng',
          tabBarIcon: tabIcon('videocam', 'videocam-outline'),
        }}
      />
      <Tab.Screen
        component={AlertsScreen}
        name="AlertsTab"
        options={{
          tabBarLabel: 'Cảnh báo',
          tabBarIcon: tabIcon('notifications', 'notifications-outline'),
        }}
      />
      <Tab.Screen
        component={MoreScreen}
        name="MoreTab"
        options={{
          tabBarLabel: 'Thêm',
          tabBarIcon: tabIcon('menu', 'menu-outline'),
        }}
      />
    </Tab.Navigator>
  );
}
