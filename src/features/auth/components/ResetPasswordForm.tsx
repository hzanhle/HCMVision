import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { resetPasswordRequest } from '../../../services/auth';
import { validatePasswordStrength, validateRequired } from '../../../utils/validation';
import { BottomAuthSwitch, FieldInput, PrimaryButton } from './AuthUI';
import { authStyles } from '../design';

type ResetPasswordFormProps = {
  onGoLogin: () => void;
};

export function ResetPasswordForm({ onGoLogin }: Readonly<ResetPasswordFormProps>) {
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const onReset = async () => {
    const tokenError = validateRequired(token, 'Token');
    if (tokenError) {
      setErrorMessage(tokenError);
      return;
    }

    const passwordError = validatePasswordStrength(newPassword);
    if (passwordError) {
      setErrorMessage(passwordError);
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');

    try {
      setLoading(true);
      await resetPasswordRequest({
        token: token.trim(),
        newPassword,
      });
      setSuccessMessage('Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Đặt lại mật khẩu thất bại';
      setErrorMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[authStyles.authCard, authStyles.authCardGlow, authStyles.authCardCentered, authStyles.authCardLarge]}>
      <View style={authStyles.authCardHeader}>
        <Text style={authStyles.authCardTitle}>Đặt lại mật khẩu</Text>
        <Text style={authStyles.authCardSubtitle}>Vui lòng nhập mật khẩu mới cho tài khoản của bạn.</Text>
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
        icon="key-outline"
        large
        keyboardType="default"
        label="Token"
        onChangeText={setToken}
        placeholder="Nhập token reset"
        value={token}
      />

      <FieldInput
        icon="lock-closed-outline"
        large
        label="Mật khẩu mới"
        onChangeText={setNewPassword}
        placeholder="Nhập mật khẩu mới"
        secureTextEntry
        value={newPassword}
      />
      <Text style={authStyles.subtleHint}>Ít nhất 8 ký tự, bao gồm chữ và số.</Text>

      <PrimaryButton
        disabled={loading}
        label={loading ? 'Đang cập nhật...' : 'Đặt lại mật khẩu'}
        onPress={onReset}
      />

      <BottomAuthSwitch actionLabel="Đăng nhập" onPress={onGoLogin} text="Hoàn tất" />
    </View>
  );
}
