import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../../hooks/useAuth';
import { AuthStackParamList } from '../../../navigation/types';
import {
  BottomAuthSwitch,
  FieldInput,
  PrimaryButton,
  SecondaryButton,
} from './AuthUI';
import { authStyles } from '../design';

export function LoginForm() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const onLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setErrorMessage('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    setErrorMessage('');

    try {
      setLoading(true);
      await login(username.trim(), password);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Đăng nhập thất bại';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  const onContinueAsGuest = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      await login('guest', 'guest');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không thể tiếp tục ở chế độ khách';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[authStyles.authCard, authStyles.authCardGlow, authStyles.authCardLarge]}>
      <View style={authStyles.authCardHeader}>
        <Text style={authStyles.authCardTitle}>Đăng nhập</Text>
        <Text style={authStyles.authCardSubtitle}>Nhập thông tin tài khoản để tiếp tục</Text>
      </View>

      {errorMessage ? (
        <View style={authStyles.errorBanner}>
          <Text style={authStyles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <FieldInput
        keyboardType="default"
        icon="person-outline"
        large
        label="Username"
        onChangeText={setUsername}
        placeholder="Nhập tên đăng nhập"
        value={username}
      />
      <FieldInput
        icon="lock-closed-outline"
        large
        rightIcon="eye-off-outline"
        label="Password"
        onChangeText={setPassword}
        placeholder="Nhập mật khẩu"
        secureTextEntry
        value={password}
      />

      <View style={authStyles.hintRow}>
        <Text style={authStyles.hintText}>Bảo mật kết nối SSL</Text>
        <View style={authStyles.authSmallAction}>
          <Text
            onPress={() => navigation.navigate('ForgotPassword')}
            style={authStyles.authSmallActionText}
          >
            Quên mật khẩu?
          </Text>
        </View>
      </View>

      <PrimaryButton
        disabled={loading}
        label={loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        onPress={onLogin}
      />

      <BottomAuthSwitch
        actionLabel="Tạo tài khoản"
        onPress={() => navigation.navigate('Register')}
        text="Chưa có tài khoản?"
      />

      <View style={authStyles.dividerRow}>
        <View style={authStyles.dividerLine} />
        <Text style={authStyles.dividerText}>HOẶC</Text>
        <View style={authStyles.dividerLine} />
      </View>

      <SecondaryButton label="Xem bản đồ không cần đăng nhập" onPress={onContinueAsGuest} />
    </View>
  );
}
