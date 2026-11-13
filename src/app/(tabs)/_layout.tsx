import { Tabs } from 'expo-router';

import { colors, fonts } from '@/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.bosque,
        tabBarLabelStyle: { fontFamily: fonts.semibold },
        sceneStyle: { backgroundColor: colors.crema },
      }}>
      <Tabs.Screen name="home" options={{ title: 'Mis mascotas', tabBarAccessibilityLabel: 'Mis mascotas' }} />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarAccessibilityLabel: 'Perfil' }} />
    </Tabs>
  );
}
