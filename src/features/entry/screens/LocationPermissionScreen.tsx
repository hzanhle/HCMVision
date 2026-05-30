import Ionicons from '@expo/vector-icons/Ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EntryStackParamList } from '../../../navigation/types';
import { entryStyles } from '../design';

type Props = NativeStackScreenProps<EntryStackParamList, 'LocationPermission'>;

export function LocationPermissionScreen({ route }: Readonly<Props>) {
  const onFinishAuth = route.params?.onFinishAuth;

  const finish = () => {
    onFinishAuth?.();
  };

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
                <Ionicons color="#00F2EA" name="navigate-outline" size={34} />
              </View>
            </View>
            <Text style={entryStyles.permissionTitle}>Quyền truy cập vị trí</Text>
            <Text style={entryStyles.permissionDesc}>
              Vị trí của bạn được dùng để kiểm tra an toàn tuyến đường và xác nhận các báo cáo AI chưa chính xác.
            </Text>

            <View style={entryStyles.badge}>
              <Text style={entryStyles.badgeText}>Nâng cao độ chính xác AI</Text>
            </View>

            <Pressable onPress={finish} style={entryStyles.buttonPrimary}>
              <Text style={entryStyles.buttonPrimaryText}>Cho phép định vị</Text>
            </Pressable>

            <Pressable onPress={finish} style={entryStyles.buttonSecondary}>
              <Text style={entryStyles.buttonSecondaryText}>Để sau</Text>
            </Pressable>

            <Text style={entryStyles.helperText}>Ứng dụng không theo dõi danh tính cá nhân.</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
