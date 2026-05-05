import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, View, StyleSheet } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1A1A1A',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarShowLabel: false,
        tabBarStyle: S.tabBar,
        headerShown: false,
      }}
    >
      {/* 1. Главная */}
      <Tabs.Screen
        name="masters"
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
        }}
      />
      {/* 2. Записи */}
      <Tabs.Screen
        name="booking"
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar-outline" size={size} color={color} />,
        }}
      />
      {/* 3. Питание — центральная FAB-кнопка */}
      <Tabs.Screen
        name="food"
        options={{
          tabBarButton: (props) => (
            <Pressable
              {...props}
              style={S.centerTabBtn}
              onPress={props.onPress ?? undefined}
            >
              <View style={S.centerCircle}>
                <Ionicons name="restaurant-outline" size={22} color="#fff" />
              </View>
            </Pressable>
          ),
        }}
      />
      {/* 4. Я (аватар) */}
      <Tabs.Screen
        name="me"
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="sparkles-outline" size={size} color={color} />,
        }}
      />
      {/* 5. Профиль */}
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ color, size }) => <Ionicons name="person-outline" size={size} color={color} />,
        }}
      />
      {/* Скрытые */}
      <Tabs.Screen name="favorites" options={{ href: null }} />
      <Tabs.Screen name="center" options={{ href: null }} />
      <Tabs.Screen name="search" options={{ href: null }} />
    </Tabs>
  );
}

const S = StyleSheet.create({
  tabBar: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    height: 64,
    paddingBottom: 8,
  },
  centerTabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
});
