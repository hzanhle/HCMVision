import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../components/Button';
import { theme } from '../../../constants/theme';

type HomeHeaderProps = {
  title: string;
  onLogout: () => void;
};

export function HomeHeader({ title, onLogout }: Readonly<HomeHeaderProps>) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Button onPress={onLogout} title="Logout" variant="secondary" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: theme.colors.textPrimary,
    fontSize: theme.typography.subtitle,
    fontWeight: '700',
  },
});
