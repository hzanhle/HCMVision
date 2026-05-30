import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  ViewStyle,
} from 'react-native';
import { theme } from '../constants/theme';

type ButtonVariant = 'primary' | 'secondary';

type ButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  title,
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  style,
}: Readonly<ButtonProps>) {
  const isPrimary = variant === 'primary';
  const backgroundColor = isPrimary ? theme.colors.primary : theme.colors.surface;
  const textColor = isPrimary ? '#FFFFFF' : theme.colors.primary;

  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor,
          opacity: pressed ? 0.9 : 1,
          borderWidth: isPrimary ? 0 : 1,
          borderColor: theme.colors.primary,
        },
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={textColor} />
      ) : (
        <Text style={[styles.text, { color: textColor }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    borderRadius: theme.radius.md,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: theme.spacing.lg,
  },
  text: {
    fontSize: theme.typography.button,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.5,
  },
});
