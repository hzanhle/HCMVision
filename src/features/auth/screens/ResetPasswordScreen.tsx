import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AuthBackground } from '../components/AuthUI';
import { ResetPasswordForm } from '../components/ResetPasswordForm';
import { authStyles } from '../design';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ResetPassword'>;

export function ResetPasswordScreen({ navigation }: Readonly<Props>) {
  return (
    <SafeAreaView style={authStyles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={authStyles.keyboardView}
      >
        <AuthBackground />
        <ScrollView
          contentContainerStyle={authStyles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={authStyles.pageWrap}>
            <View style={authStyles.authHeader}>
              <View style={authStyles.pinIconWrap}>
                <Ionicons color="#A6D9EB" name="refresh-circle-outline" size={22} />
              </View>
              <Text style={authStyles.brandName}>HCMRainVision</Text>
              <Text style={authStyles.authSubtitleSerif}>Đặt lại mật khẩu để tiếp tục sử dụng ứng dụng.</Text>
            </View>

            <ResetPasswordForm onGoLogin={() => navigation.replace('Login')} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
