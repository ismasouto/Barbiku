import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { MOCK_USER } from '@/data/mock';
import type { UserProfile } from '@/types';

interface UserState {
  /** appUserID estable para RevenueCat y Supabase (UUID). */
  appUserId: string | null;
  loggedIn: boolean;
  profile: UserProfile;
  /** Login falso: guarda email y genera/recupera appUserId. Devuelve el appUserId. */
  login: (email: string) => string;
  logout: () => void;
}

export const useUser = create<UserState>()(
  persist(
    (set, get) => ({
      appUserId: null,
      loggedIn: false,
      profile: MOCK_USER,
      login: (email) => {
        const appUserId = get().appUserId ?? randomUUID();
        set({
          appUserId,
          loggedIn: true,
          profile: { ...get().profile, email: email.trim() || MOCK_USER.email },
        });
        return appUserId;
      },
      logout: () => set({ loggedIn: false }),
    }),
    { name: 'barbiku-user', storage: createJSONStorage(() => AsyncStorage) },
  ),
);

/** "Reiniciar demo" (§7.1): borra AsyncStorage entero. Recargar la app después. */
export async function resetDemo(): Promise<void> {
  await AsyncStorage.clear();
  useUser.setState({ appUserId: null, loggedIn: false, profile: MOCK_USER });
  const { usePets } = await import('./pets');
  usePets.getState().reset();
}
