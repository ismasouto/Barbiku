import { router } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button, formatEuros } from '@/components/seguro/ui';
import { PLANS } from '@/data/mock';
import { usePets } from '@/store/pets';
import { colors, fonts, radius, spacing, type } from '@/theme';
import type { PlanId, Species } from '@/types';

type Errors = Partial<Record<'name' | 'breed' | 'birth', string>>;

const NAME_RE = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]+$/;

/** dd, mm, aaaa → yyyy-mm-dd si es una fecha real, pasada y razonable. */
function parseBirth(d: string, m: string, y: string): { iso?: string; error?: string } {
  if (!d || !m || y.length !== 4) return { error: 'Indica la fecha completa (DD/MM/AAAA).' };
  const day = Number(d);
  const month = Number(m);
  const year = Number(y);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return { error: 'Esa fecha no existe.' };
  }
  const now = new Date();
  if (date > now) return { error: 'La fecha no puede ser futura.' };
  if (now.getFullYear() - year > 30) return { error: 'Revisa el año de nacimiento.' };
  const pad = (n: number) => String(n).padStart(2, '0');
  return { iso: `${year}-${pad(month)}-${pad(day)}` };
}

function validate(f: { name: string; breed: string; day: string; month: string; year: string }) {
  const errors: Errors = {};
  const n = f.name.trim();
  if (!n) errors.name = 'Escribe el nombre de tu mascota.';
  else if (n.length > 20) errors.name = 'Máximo 20 caracteres.';
  else if (!NAME_RE.test(n)) errors.name = 'Usa solo letras, espacios o guiones.';
  if (!f.breed.trim()) errors.breed = 'Indica la raza (o "Mestizo").';
  const birth = parseBirth(f.day, f.month, f.year);
  if (birth.error) errors.birth = birth.error;
  return { errors, birthIso: birth.iso };
}

// Alta del seguro (§7.2). Se crea en local y NUNCA depende del pago de Refloresta.
export default function AltaScreen() {
  const addPetWithPolicy = usePets((s) => s.addPetWithPolicy);

  const [name, setName] = useState('');
  const [species, setSpecies] = useState<Species>('perro');
  const [breed, setBreed] = useState('');
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [planId, setPlanId] = useState<PlanId>('barbiku80');
  const [submitted, setSubmitted] = useState(false);

  // Los errores se muestran (y se recalculan en vivo) tras el primer intento.
  const result = validate({ name, breed, day, month, year });
  const errors: Errors = submitted ? result.errors : {};

  const onSubmit = () => {
    setSubmitted(true);
    if (!result.birthIso || Object.keys(result.errors).length > 0) return;
    const trimmed = name.trim();
    const pet = addPetWithPolicy(
      {
        name: trimmed.charAt(0).toUpperCase() + trimmed.slice(1),
        species,
        breed: breed.trim(),
        birthDate: result.birthIso,
      },
      planId,
    );
    router.replace({ pathname: '/alta/confirmado', params: { petId: pet.id } });
  };

  const digits = (setter: (v: string) => void) => (v: string) => setter(v.replace(/\D/g, ''));

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={type.h1}>Protege a tu mascota</Text>
        <Text style={[type.body, { color: colors.textoSuave }]}>
          Dale de alta en menos de un minuto. La póliza se activa al momento.
        </Text>

        <Field label="Nombre" error={errors.name}>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Luna"
            placeholderTextColor={colors.textoSuave}
            style={[styles.input, errors.name && styles.inputError]}
            autoCapitalize="words"
            maxLength={20}
            accessibilityLabel="Nombre de la mascota"
          />
        </Field>

        <Field label="Especie">
          <View style={styles.segment} accessibilityRole="radiogroup">
            {(['perro', 'gato'] as Species[]).map((s) => {
              const selected = species === s;
              return (
                <Pressable
                  key={s}
                  onPress={() => setSpecies(s)}
                  style={[styles.segmentItem, selected && styles.segmentSelected]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={s === 'perro' ? 'Perro' : 'Gato'}>
                  <Text style={styles.segmentEmoji}>{s === 'perro' ? '🐶' : '🐱'}</Text>
                  <Text style={[styles.segmentText, selected && { color: colors.blanco }]}>
                    {s === 'perro' ? 'Perro' : 'Gato'}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Field>

        <Field label="Raza" error={errors.breed}>
          <TextInput
            value={breed}
            onChangeText={setBreed}
            placeholder={species === 'perro' ? 'Labrador, mestizo…' : 'Europeo común, siamés…'}
            placeholderTextColor={colors.textoSuave}
            style={[styles.input, errors.breed && styles.inputError]}
            autoCapitalize="sentences"
            maxLength={40}
            accessibilityLabel="Raza"
          />
        </Field>

        <Field label="Fecha de nacimiento" error={errors.birth}>
          <View style={styles.dateRow}>
            <TextInput
              value={day}
              onChangeText={digits(setDay)}
              placeholder="DD"
              placeholderTextColor={colors.textoSuave}
              keyboardType="number-pad"
              maxLength={2}
              style={[styles.input, styles.dateInput, errors.birth && styles.inputError]}
              accessibilityLabel="Día de nacimiento"
            />
            <Text style={styles.dateSep}>/</Text>
            <TextInput
              value={month}
              onChangeText={digits(setMonth)}
              placeholder="MM"
              placeholderTextColor={colors.textoSuave}
              keyboardType="number-pad"
              maxLength={2}
              style={[styles.input, styles.dateInput, errors.birth && styles.inputError]}
              accessibilityLabel="Mes de nacimiento"
            />
            <Text style={styles.dateSep}>/</Text>
            <TextInput
              value={year}
              onChangeText={digits(setYear)}
              placeholder="AAAA"
              placeholderTextColor={colors.textoSuave}
              keyboardType="number-pad"
              maxLength={4}
              style={[styles.input, styles.dateInput, { flex: 1.6 }, errors.birth && styles.inputError]}
              accessibilityLabel="Año de nacimiento"
            />
          </View>
        </Field>

        <Field label="Plan">
          <View style={{ gap: spacing.sm }} accessibilityRole="radiogroup">
            {PLANS.map((plan) => {
              const selected = planId === plan.id;
              return (
                <Pressable
                  key={plan.id}
                  onPress={() => setPlanId(plan.id)}
                  style={({ pressed }) => [
                    styles.plan,
                    selected && styles.planSelected,
                    pressed && { transform: [{ scale: 0.98 }] },
                  ]}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`${plan.name}. ${plan.description}. ${formatEuros(plan.monthlyPrice)} al mes`}>
                  <View style={[styles.radio, selected && styles.radioSelected]}>
                    {selected && <View style={styles.radioDot} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={type.small}>{plan.description}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.planPrice}>{formatEuros(plan.monthlyPrice)}</Text>
                    <Text style={type.small}>/mes</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </Field>

        <Button label="Contratar" onPress={onSubmit} style={{ marginTop: spacing.md }} />
        <Text style={[type.small, { textAlign: 'center' }]}>
          Precios y coberturas ficticios para la demo. Sin permanencia.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error && (
        <Text style={styles.error} accessibilityLiveRegion="polite" accessibilityRole="alert">
          {error}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.crema },
  container: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xl * 2,
    maxWidth: 640,
    width: '100%',
    alignSelf: 'center',
  },
  label: { fontFamily: fonts.bold, fontSize: 15, color: colors.texto },
  input: {
    minHeight: 52,
    backgroundColor: colors.blanco,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.borde,
    paddingHorizontal: spacing.md,
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.texto,
  },
  inputError: { borderColor: colors.error },
  error: { fontFamily: fonts.semibold, fontSize: 13, color: colors.error },
  segment: { flexDirection: 'row', gap: spacing.sm },
  segmentItem: {
    flex: 1,
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.borde,
    backgroundColor: colors.blanco,
  },
  segmentSelected: { backgroundColor: colors.bosque, borderColor: colors.bosque },
  segmentEmoji: { fontSize: 24 },
  segmentText: { fontFamily: fonts.bold, fontSize: 16, color: colors.texto },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  // minWidth/width 0: en web el <input> tiene un ancho intrínseco que desborda la fila.
  dateInput: { flex: 1, minWidth: 0, width: 0, paddingHorizontal: spacing.sm, textAlign: 'center' },
  dateSep: { fontFamily: fonts.bold, fontSize: 20, color: colors.textoSuave },
  plan: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.borde,
    backgroundColor: colors.blanco,
  },
  planSelected: { borderColor: colors.bosque, backgroundColor: '#F1F8EE' },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.textoSuave,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: colors.bosque },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.bosque },
  planName: { fontFamily: fonts.bold, fontSize: 17, color: colors.texto },
  planPrice: { fontFamily: fonts.black, fontSize: 18, color: colors.bosque },
});
