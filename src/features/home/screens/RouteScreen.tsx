import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette } from '../../auth/design';

export function RouteScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.bg} />
      <View style={styles.center}>
        <Ionicons color="#1D4D77" name="git-branch-outline" size={64} />
        <Text style={styles.title}>Tuyến đường</Text>
        <Text style={styles.sub}>Tính năng đang phát triển</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.background },
  bg: { ...StyleSheet.absoluteFill, backgroundColor: palette.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 },
  title: { color: '#D0E3F5', fontSize: 20, fontWeight: '700' },
  sub: { color: '#4E6B88', fontSize: 14 },
});
