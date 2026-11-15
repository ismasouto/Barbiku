import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { MOCK_PET_TOBY, MOCK_POLICY_TOBY, MOCK_TOBY_DISMISSED_DAYS_AGO } from '@/data/mock';
import type { Pet, PetRefloresta, PlanId, Policy } from '@/types';

const DAY = 24 * 60 * 60 * 1000;
export const REMINDER_DAYS = 7;

function initialState() {
  return {
    pets: [MOCK_PET_TOBY] as Pet[],
    policies: [MOCK_POLICY_TOBY] as Policy[],
    refloresta: {
      [MOCK_PET_TOBY.id]: {
        guardian: false,
        offerDismissedAt: new Date(Date.now() - MOCK_TOBY_DISMISSED_DAYS_AGO * DAY).toISOString(),
      },
    } as Record<string, PetRefloresta>,
  };
}

interface PetsState extends ReturnType<typeof initialState> {
  /** Alta del seguro (§7.2): crea mascota + póliza en local. Devuelve la mascota. */
  addPetWithPolicy: (pet: Omit<Pet, 'id' | 'createdAt'>, planId: PlanId) => Pet;
  getPet: (id: string) => Pet | undefined;
  getPolicy: (petId: string) => Policy | undefined;
  getRefloresta: (petId: string) => PetRefloresta;
  updateRefloresta: (petId: string, patch: Partial<PetRefloresta>) => void;
  /** "Ahora no" en la oferta. */
  dismissOffer: (petId: string) => void;
  /** X del banner de recuerdo. */
  closeBanner: (petId: string) => void;
  /** Banner visible: sin árbol, no lo cerró y han pasado < 7 días desde "Ahora no" (o desde el alta). */
  shouldShowReminder: (petId: string) => boolean;
  reset: () => void;
}

export const usePets = create<PetsState>()(
  persist(
    (set, get) => ({
      ...initialState(),
      addPetWithPolicy: (input, planId) => {
        const now = new Date().toISOString();
        const pet: Pet = { ...input, id: randomUUID(), createdAt: now };
        const policy: Policy = { id: randomUUID(), petId: pet.id, planId, createdAt: now };
        set((s) => ({
          pets: [...s.pets, pet],
          policies: [...s.policies, policy],
          refloresta: { ...s.refloresta, [pet.id]: { guardian: false } },
        }));
        return pet;
      },
      getPet: (id) => get().pets.find((p) => p.id === id),
      getPolicy: (petId) => get().policies.find((p) => p.petId === petId),
      getRefloresta: (petId) => get().refloresta[petId] ?? { guardian: false },
      updateRefloresta: (petId, patch) =>
        set((s) => ({
          refloresta: {
            ...s.refloresta,
            [petId]: { ...(s.refloresta[petId] ?? { guardian: false }), ...patch },
          },
        })),
      dismissOffer: (petId) =>
        get().updateRefloresta(petId, { offerDismissedAt: new Date().toISOString() }),
      closeBanner: (petId) => get().updateRefloresta(petId, { bannerClosed: true }),
      shouldShowReminder: (petId) => {
        const r = get().getRefloresta(petId);
        if (r.guardian || r.bannerClosed) return false;
        // Desde "Ahora no" o, si la oferta se cerró de otra forma (deslizando, volviendo del pago
        // sin pagar…), desde el alta de la mascota.
        const since = r.offerDismissedAt ?? get().getPet(petId)?.createdAt;
        if (!since) return false;
        return Date.now() - new Date(since).getTime() < REMINDER_DAYS * DAY;
      },
      reset: () => set(initialState()),
    }),
    {
      name: 'barbiku-pets',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ pets: s.pets, policies: s.policies, refloresta: s.refloresta }),
    },
  ),
);
