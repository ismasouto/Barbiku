import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_900Black,
  useFonts,
} from '@expo-google-fonts/nunito';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

// Rutas fijadas por la orquestadora. Las sesiones no deben tocar este archivo:
// si necesitan opciones de pantalla nuevas, que lo pidan.
export default function RootLayout() {
  const [loaded] = useFonts({ Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_900Black });

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync().catch(() => {});
  }, [loaded]);

  if (!loaded) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.crema },
        }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="alta/index" options={{ headerShown: true, title: 'Nuevo seguro' }} />
        <Stack.Screen name="alta/confirmado" options={{ gestureEnabled: false }} />
        <Stack.Screen
          name="refloresta/oferta"
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="refloresta/envio" options={{ headerShown: true, title: 'Tu chapa' }} />
        <Stack.Screen name="refloresta/procesando" options={{ gestureEnabled: false }} />
        <Stack.Screen name="refloresta/gracias" options={{ gestureEnabled: false }} />
        <Stack.Screen name="mascota/[id]" options={{ headerShown: true, title: '' }} />
        <Stack.Screen name="admin/index" options={{ headerShown: true, title: 'Panel interno' }} />
      </Stack>
    </>
  );
}
