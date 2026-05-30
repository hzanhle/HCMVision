import Ionicons from '@expo/vector-icons/Ionicons';
import React, { ReactNode } from 'react';
import { Pressable, StyleProp, Text, TextInput, View, ViewStyle } from 'react-native';
import { authStyles } from '../design';

export function AuthBackground() {
  return (
    <View style={authStyles.backgroundLayer}>
      <View style={authStyles.grid} />
      <View style={authStyles.glowTop} />
      <View style={authStyles.glowMiddle} />
    </View>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled,
}: Readonly<{ label: string; onPress: () => void; disabled?: boolean }>) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        authStyles.primaryBtn,
        disabled && authStyles.primaryBtnDisabled,
        pressed && authStyles.pressed,
      ]}
    >
      <Text style={authStyles.primaryBtnText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({
  label,
  onPress,
  style,
}: Readonly<{ label: string; onPress: () => void; style?: StyleProp<ViewStyle> }>) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [authStyles.secondaryBtn, pressed && authStyles.pressed, style]}
    >
      <Text style={authStyles.secondaryBtnText}>{label}</Text>
    </Pressable>
  );
}

export function FieldInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType,
  icon,
  rightIcon,
  large,
}: Readonly<{
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  rightIcon?: React.ComponentProps<typeof Ionicons>['name'];
  large?: boolean;
}>) {
  return (
    <View style={authStyles.fieldGroup}>
      <Text style={authStyles.fieldLabel}>{label}</Text>
      <View style={[authStyles.inputWrap, large && authStyles.inputWrapLarge]}>
        <View style={authStyles.inputIconWrap}>
          <Ionicons color="#8EA9C3" name={icon || 'ellipse-outline'} size={20} />
        </View>
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          secureTextEntry={secureTextEntry}
          style={[authStyles.input, large && authStyles.inputLarge]}
          autoCapitalize="none"
          keyboardType={keyboardType ?? 'default'}
        />
        {rightIcon ? <Ionicons color="#8EA9C3" name={rightIcon} size={20} /> : null}
      </View>
    </View>
  );
}

export function BottomAuthSwitch({
  text,
  actionLabel,
  onPress,
}: Readonly<{ text: string; actionLabel: string; onPress: () => void }>) {
  return (
    <View style={authStyles.authSwitchRow}>
      {text ? <Text style={authStyles.authSwitchText}>{text} </Text> : null}
      <Pressable onPress={onPress}>
        <Text style={authStyles.authSwitchAction}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

export function AuthCard({ children }: Readonly<{ children: ReactNode }>) {
  return <View style={authStyles.authCard}>{children}</View>;
}
