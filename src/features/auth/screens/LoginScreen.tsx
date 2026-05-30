import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LoginForm } from '../components/LoginForm';
import { AuthBackground } from '../components/AuthUI';
import { authStyles } from '../design';

export function LoginScreen() {
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
                <Ionicons color="#A6D9EB" name="location-outline" size={24} />
              </View>
              <Text style={authStyles.brandName}>HCMRainVision</Text>
              <Text style={authStyles.authSubtitleSerif}>Hệ thống dự báo mưa và camera giao thông thông minh.</Text>
              <Text style={authStyles.sourceText}>Nguồn dữ liệu: OpenWeatherMap | HCMC Traffic</Text>
            </View>
            <LoginForm />

            <View style={authStyles.bottomBlock}>
              <Text style={authStyles.tinyFooter}>Tiếp tục đồng nghĩa với việc đồng ý điều khoản và chính sách dữ liệu.</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
