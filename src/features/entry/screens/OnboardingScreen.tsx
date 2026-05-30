import Ionicons from '@expo/vector-icons/Ionicons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EntryStackParamList } from '../../../navigation/types';
import { entryStyles } from '../design';

type Props = NativeStackScreenProps<EntryStackParamList, 'Onboarding'>;

type Slide = {
  key: string;
  title: string;
  accent: string;
  subtitle: string;
  chipA: { text: string; tone: 'danger' | 'warn' | 'safe' };
  chipB: { text: string; tone: 'danger' | 'warn' | 'safe' };
};

const slides: Slide[] = [
  {
    key: 'rain-ai',
    title: 'Theo dõi ',
    accent: 'mưa và giao thông',
    subtitle:
      'HCMRainVision sử dụng AI phân tích hình ảnh từ camera giao thông công cộng để cập nhật tình trạng ngập và kẹt xe.',
    chipA: { text: 'Mưa vừa', tone: 'warn' },
    chipB: { text: 'Mưa lớn', tone: 'danger' },
  },
  {
    key: 'route',
    title: 'Kiểm tra tuyến đường ',
    accent: 'trước khi đi',
    subtitle: 'Xem trước tình trạng ngập, kẹt xe và cảnh báo thời tiết để có chuyến đi an toàn hơn.',
    chipA: { text: 'Kẹt xe', tone: 'warn' },
    chipB: { text: 'Mưa lớn', tone: 'danger' },
  },
  {
    key: 'alert',
    title: 'Nhận cảnh báo theo ',
    accent: 'khu vực bạn quan tâm',
    subtitle: 'Theo dõi cảnh báo tại các phường, quận cụ thể. Lưu camera yêu thích để truy cập nhanh.',
    chipA: { text: 'An toàn', tone: 'safe' },
    chipB: { text: 'Mưa lớn', tone: 'danger' },
  },
];

function chipToneStyle(tone: Slide['chipA']['tone']) {
  if (tone === 'safe') {
    return entryStyles.chipSafe;
  }
  if (tone === 'warn') {
    return entryStyles.chipWarn;
  }
  return entryStyles.chipDanger;
}

export function OnboardingScreen({ navigation }: Readonly<Props>) {
  const [index, setIndex] = React.useState(0);
  const slide = slides[index];

  const onNext = () => {
    if (index < slides.length - 1) {
      setIndex((prev) => prev + 1);
      return;
    }
    navigation.navigate('NotificationPermission');
  };

  return (
    <SafeAreaView style={entryStyles.safeArea}>
      <View style={entryStyles.background}>
        <View style={entryStyles.grid} />
        <View style={entryStyles.glowLeft} />
        <View style={entryStyles.glowRight} />
      </View>
      <ScrollView contentContainerStyle={entryStyles.content} showsVerticalScrollIndicator={false}>
        <View style={entryStyles.onboardingImageWrap}>
          <View style={entryStyles.onboardingDash} />
          <View style={[entryStyles.chip, chipToneStyle(slide.chipA.tone), { left: 30, top: 168 }]}>
            <Text style={entryStyles.chipText}>{slide.chipA.text}</Text>
          </View>
          <View style={[entryStyles.chip, chipToneStyle(slide.chipB.tone), { right: 26, top: 106 }]}>
            <Text style={entryStyles.chipText}>{slide.chipB.text}</Text>
          </View>
          <Ionicons color="#00F2EA" name="map-outline" size={42} />
        </View>

        <Text style={entryStyles.slideTitle}>
          {slide.title}
          <Text style={entryStyles.slideAccent}>{slide.accent}</Text>
        </Text>
        <Text style={entryStyles.slideDesc}>{slide.subtitle}</Text>

        <View style={entryStyles.dotsRow}>
          {slides.map((item, dotIndex) => (
            <View key={item.key} style={[entryStyles.dot, dotIndex === index && entryStyles.dotActive]} />
          ))}
        </View>

        <Pressable onPress={onNext} style={entryStyles.buttonPrimary}>
          <Text style={entryStyles.buttonPrimaryText}>Tiếp theo</Text>
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate('NotificationPermission')}
          style={entryStyles.buttonSecondary}
        >
          <Text style={entryStyles.buttonSecondaryText}>Bỏ qua</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
