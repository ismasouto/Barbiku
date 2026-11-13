import type { Pet, Plan, Policy, UserProfile } from '@/types';

export const PLANS: Plan[] = [
  {
    id: 'barbiku80',
    name: 'Barbiku 80',
    description: 'Reembolso del 80 %, hasta 3.000 €/año',
    monthlyPrice: 29.9,
  },
  {
    id: 'ilimitado',
    name: 'Barbiku Ilimitado',
    description: 'Reembolso del 80 % sin límite anual',
    monthlyPrice: 39.9,
  },
];

export const MOCK_USER: UserProfile = {
  name: 'Lucía',
  email: 'lucia@example.com',
  address: {
    name: 'Lucía Martín',
    street: 'Calle del Olmo 12, 3º B',
    postalCode: '28012',
    city: 'Madrid',
    province: 'Madrid',
  },
};

/** Toby: ya asegurado, sin árbol (para enseñar el banner de recuerdo). */
export const MOCK_PET_TOBY: Pet = {
  id: 'pet-toby',
  name: 'Toby',
  species: 'perro',
  breed: 'Mestizo',
  birthDate: '2021-04-10',
  createdAt: '2026-10-01T10:00:00.000Z',
};

export const MOCK_POLICY_TOBY: Policy = {
  id: 'pol-toby',
  petId: MOCK_PET_TOBY.id,
  planId: 'barbiku80',
  createdAt: MOCK_PET_TOBY.createdAt,
};

/** Fecha en la que Toby dijo "Ahora no" → hace que el banner salga en la demo. */
export const MOCK_TOBY_DISMISSED_DAYS_AGO = 1;
