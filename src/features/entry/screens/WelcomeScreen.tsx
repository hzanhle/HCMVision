import Ionicons from '@expo/vector-icons/Ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EntryStackParamList } from '../../../navigation/types';
import { entryStyles } from '../design';

type Props = NativeStackScreenProps<EntryStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Readonly<Props>) {
  return (
    <SafeAreaView style={entryStyles.safeArea}>
      <View style={entryStyles.background}>
        <View style={entryStyles.grid} />
        <View style={entryStyles.glowLeft} />
        <View style={entryStyles.glowRight} />
      </View>
      <ScrollView contentContainerStyle={entryStyles.content} showsVerticalScrollIndicator={false}>
        <View style={entryStyles.centerWrap}>
          <View style={entryStyles.haloOuter}>
            <View style={entryStyles.haloInner}>
              <Ionicons color="#00F2EA" name="location-outline" size={34} />
            </View>
          </View>
          <Text style={entryStyles.brandName}>HCMRainVision</Text>
          <Text style={entryStyles.brandSubtitle}>Mở bản đồ, tránh ngập và di chuyển an toàn.</Text>

          <Pressable
            onPress={() => navigation.navigate('Onboarding')}
            style={entryStyles.buttonPrimary}
          >
            <Text style={entryStyles.buttonPrimaryText}>Bắt đầu</Text>
          </Pressable>

          <Text style={entryStyles.helperText}>Nguồn ảnh: Cổng thông tin giao thông TP.HCM</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
