import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { AuthBackground } from '../components/AuthUI';
import { RegisterForm } from '../components/RegisterForm';
import { authStyles } from '../design';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Readonly<Props>) {
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
                <Ionicons color="#A6D9EB" name="person-add-outline" size={22} />
              </View>
              <Text style={authStyles.brandName}>HCMRainVision</Text>
              <Text style={authStyles.authSubtitleSerif}>Nhanh chóng tạo tài khoản để bắt đầu.</Text>
            </View>

            <RegisterForm onGoLogin={() => navigation.replace('Login')} />

            <View style={authStyles.authScreenFooter}>
              <Text style={authStyles.authScreenFooterTitle}>Đăng nhập hoặc đăng ký</Text>
              <View style={authStyles.authScreenFooterLinks}>
                <Pressable onPress={() => navigation.goBack()}>
                  <Text style={authStyles.authScreenFooterLinkText}>Quay lại</Text>
                </Pressable>
                <Pressable onPress={() => navigation.replace('Login')}>
                  <Text style={authStyles.authScreenFooterLinkText}>Đăng nhập</Text>
                </Pressable>
                <Pressable>
                  <Text style={authStyles.authScreenFooterLinkText}>Đăng ký</Text>
                </Pressable>
              </View>
              <Text style={authStyles.authScreenFooterMeta}>Bằng cách tiếp tục, bạn đồng ý với điều khoản sử dụng.</Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
