import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { forgotPasswordRequest } from '../../../services/auth';
import { validateEmail } from '../../../utils/validation';
import { BottomAuthSwitch, FieldInput, PrimaryButton } from './AuthUI';
import { authStyles } from '../design';

type ForgotPasswordFormProps = {
  onGoLogin: () => void;
  onGoReset: () => void;
};

export function ForgotPasswordForm({ onGoLogin, onGoReset }: Readonly<ForgotPasswordFormProps>) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const onSubmit = async () => {
    const emailError = validateEmail(email);
    if (emailError) {
      setErrorMessage(emailError);
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');

    try {
      setLoading(true);
      await forgotPasswordRequest({ email: email.trim() });
      setSuccessMessage('Yêu cầu đặt lại mật khẩu đã được gửi. Kiểm tra email để lấy token.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Không gửi được yêu cầu';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[authStyles.authCard, authStyles.authCardGlow, authStyles.authCardCentered, authStyles.authCardLarge]}>
      <View style={authStyles.authCardHeader}>
        <Text style={authStyles.authCardTitle}>Quên mật khẩu</Text>
        <Text style={authStyles.authCardSubtitle}>Nhập email để nhận hướng dẫn đặt lại mật khẩu</Text>
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
        icon="mail-outline"
        large
        keyboardType="email-address"
        label="Email"
        onChangeText={setEmail}
        placeholder="Nhập địa chỉ email..."
        value={email}
      />

      <PrimaryButton
        disabled={loading}
        label={loading ? 'Đang gửi...' : 'Gửi liên kết đặt lại'}
        onPress={onSubmit}
      />

      <BottomAuthSwitch actionLabel="Đặt lại mật khẩu" onPress={onGoReset} text="Đã có token?" />
      <BottomAuthSwitch actionLabel="Quay lại đăng nhập" onPress={onGoLogin} text="" />
    </View>
  );
}
