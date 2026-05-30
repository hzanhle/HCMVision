import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { registerRequest } from '../../../services/auth';
import {
  validateConfirmPassword,
  validateEmail,
  validatePasswordStrength,
  validateRequired,
} from '../../../utils/validation';
import { BottomAuthSwitch, FieldInput, PrimaryButton } from './AuthUI';
import { authStyles } from '../design';

type RegisterFormProps = {
  onGoLogin: () => void;
};

export function RegisterForm({ onGoLogin }: Readonly<RegisterFormProps>) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const onRegister = async () => {
    const usernameError = validateRequired(username, 'Tên đăng nhập');
    if (usernameError) {
      setErrorMessage(usernameError);
      return;
    }

    const emailError = validateEmail(email);
    if (emailError) {
      setErrorMessage(emailError);
      return;
    }

    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      setErrorMessage(passwordError);
      return;
    }

    const confirmError = validateConfirmPassword(password, confirmPassword);
    if (confirmError) {
      setErrorMessage(confirmError);
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');

    try {
      setLoading(true);
      await registerRequest({
        username: username.trim(),
        email: email.trim(),
        password,
      });
      setSuccessMessage('Tạo tài khoản thành công. Bạn có thể đăng nhập ngay.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Đăng ký thất bại';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[authStyles.authCard, authStyles.authCardGlow, authStyles.authCardLarge]}>
      <View style={authStyles.authCardHeader}>
        <Text style={authStyles.authCardTitle}>Tạo tài khoản mới</Text>
        <Text style={authStyles.authCardSubtitle}>Tạo tài khoản mới để sử dụng hệ thống</Text>
      </View>

      {errorMessage ? (
        <View style={authStyles.errorBanner}>
          <Text style={authStyles.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      {successMessage ? (
        <View style={authStyles.successBanner}>
          <Text style={authStyles.successText}>{successMessage}</Text>
        </View>
      ) : null}

      <FieldInput
        icon="person-outline"
        large
        keyboardType="default"
        label="Tên đăng nhập"
        onChangeText={setUsername}
        placeholder="Nhập tên đăng nhập"
        value={username}
      />

      <FieldInput
        icon="mail-outline"
        large
        keyboardType="email-address"
        label="Email"
        onChangeText={(value) => setEmail(value.toLowerCase())}
        placeholder="example@email.com"
        value={email}
      />

      <FieldInput
        icon="lock-closed-outline"
        large
        label="Mật khẩu"
        onChangeText={setPassword}
        placeholder="Nhập mật khẩu"
        secureTextEntry
        value={password}
      />
      <Text style={authStyles.subtleHint}>Mật khẩu tối thiểu 6 ký tự</Text>

      <FieldInput
        icon="shield-checkmark-outline"
        large
        label="Nhập lại mật khẩu"
        onChangeText={setConfirmPassword}
        placeholder="Nhập lại mật khẩu"
        secureTextEntry
        value={confirmPassword}
      />

      <PrimaryButton
        disabled={loading}
        label={loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
        onPress={onRegister}
      />

      <BottomAuthSwitch actionLabel="Đăng nhập" onPress={onGoLogin} text="Đã có tài khoản?" />
    </View>
  );
}
