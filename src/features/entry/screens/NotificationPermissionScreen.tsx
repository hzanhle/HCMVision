import Ionicons from '@expo/vector-icons/Ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EntryStackParamList } from '../../../navigation/types';
import { entryStyles } from '../design';

type Props = NativeStackScreenProps<EntryStackParamList, 'NotificationPermission'>;

export function NotificationPermissionScreen({ navigation }: Readonly<Props>) {
  return (
    <SafeAreaView style={entryStyles.safeArea}>
      <View style={entryStyles.background}>
        <View style={entryStyles.grid} />
        <View style={entryStyles.glowLeft} />
        <View style={entryStyles.glowRight} />
      </View>
      <ScrollView contentContainerStyle={entryStyles.content} showsVerticalScrollIndicator={false}>
        <View style={entryStyles.centerWrap}>
          <View style={entryStyles.permissionCard}>
            <View style={entryStyles.haloOuter}>
              <View style={entryStyles.haloInner}>
                <Ionicons color="#00F2EA" name="notifications-outline" size={34} />
              </View>
            </View>
            <Text style={entryStyles.permissionTitle}>Nhận thông báo</Text>
            <Text style={entryStyles.permissionDesc}>
              Thông báo giúp bạn nhận cảnh báo mưa kịp thời tại các khu vực đã chọn.
            </Text>

            <View style={entryStyles.badge}>
              <Text style={entryStyles.badgeText}>Cảnh báo tức thời</Text>
            </View>

            <Pressable
              onPress={() => navigation.navigate('LocationPermission')}
              style={entryStyles.buttonPrimary}
            >
              <Text style={entryStyles.buttonPrimaryText}>Bật thông báo</Text>
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate('LocationPermission')}
              style={entryStyles.buttonSecondary}
            >
              <Text style={entryStyles.buttonSecondaryText}>Để sau</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
