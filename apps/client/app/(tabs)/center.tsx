import { View, Text, StyleSheet } from 'react-native';

export default function CenterScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Быстрая запись</Text>
      <Text style={styles.sub}>В разработке</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F5FF' },
  text: { fontSize: 20, fontWeight: '700', color: '#1A1628' },
  sub: { fontSize: 14, color: '#7A7286', marginTop: 8 },
});
