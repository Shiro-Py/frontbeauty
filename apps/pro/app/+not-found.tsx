import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Страница не найдена' }} />
      <View style={styles.container}>
        <Text style={styles.title}>Такой страницы не существует</Text>
        <Link href="/(tabs)/masters" style={styles.link}>
          <Text style={styles.linkText}>Вернуться на главную</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: '#F8F7FF' },
  title: { fontSize: 20, fontWeight: '600', color: '#1A1628', marginBottom: 16 },
  link: { marginTop: 8 },
  linkText: { color: '#4A3DB0', fontSize: 16, textDecorationLine: 'underline' },
});
