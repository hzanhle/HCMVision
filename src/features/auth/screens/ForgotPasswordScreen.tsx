import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AuthBackground } from '../components/AuthUI';
import { ForgotPasswordForm } from '../components/ForgotPasswordForm';
import { authStyles } from '../design';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Readonly<Props>) {
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
                <Ionicons color="#A6D9EB" name="help-buoy-outline" size={22} />
              </View>
              <Text style={authStyles.brandName}>HCMRainVision</Text>
              <Text style={authStyles.authSubtitleSerif}>Khôi phục mật khẩu chỉ trong vài bước.</Text>
            </View>

            <ForgotPasswordForm
              onGoLogin={() => navigation.replace('Login')}
              onGoReset={() => navigation.navigate('ResetPassword')}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
