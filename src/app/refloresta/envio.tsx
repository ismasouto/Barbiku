import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { ChapaPreview } from '@/components/ChapaPreview';
import { CTAButton } from '@/components/CTAButton';
import { formatEuro, grossPrice, priceBreakdown } from '@/config/pricing';
import { ENGRAVING_ERRORS, MAX_ENGRAVING, normalizeEngraving, validateEngraving } from '@/lib/engraving';
import { openPurchaseLink } from '@/lib/revenuecat';
import { createPendingOrder } from '@/lib/supabase';
import { usePets } from '@/store/pets';
import { useUser } from '@/store/user';
import { colors, fonts, radius, spacing, type } from '@/theme';
import type { ShippingAddress } from '@/types';

type AddressErrors = Partial<Record<keyof ShippingAddress, string>>;

function validateAddress(a: ShippingAddress): AddressErrors {
  const e: AddressErrors = {};
  if (!a.name.trim()) e.name = 'Indica a quién enviamos la chapa';
  if (!a.street.trim()) e.street = 'Indica la calle y el número';
  if (!/^\d{5}$/.test(a.postalCode.trim())) e.postalCode = 'El código postal tiene 5 cifras';
  if (!a.city.trim()) e.city = 'Indica la ciudad';
  if (!a.province.trim()) e.province = 'Indica la provincia';
  return e;
}

export default function EnvioScreen() {
  const params = useLocalSearchParams<{ petId?: string }>();
  const petId = params.petId ?? 'pet-toby';
  const pet = usePets((s) => s.pets.find((p) => p.id === petId));
  const refl = usePets((s) => s.refloresta[petId]);
  const profileAddress = useUser((s) => s.profile.address);

  const [engraving, setEngraving] = useState(refl?.engravingText ?? pet?.name ?? '');
  const [address, setAddress] = useState<ShippingAddress>(profileAddress);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  if (!pet) {
    return (
      <View style={[styles.flex, styles.center]}>
        <Text style={type.h2}>No encontramos esta mascota</Text>
        <CTAButton title="Volver" variant="secondary" onPress={() => router.back()} style={{ marginTop: spacing.lg, alignSelf: 'stretch' }} />
      </View>
    );
  }

  const engravingResult = validateEngraving(engraving);
  const addressErrors = validateAddress(address);
  const addressOk = Object.keys(addressErrors).length === 0;
  // La chapa nunca muestra un texto ofensivo, ni siquiera en la vista previa.
  const preview =
    !engravingResult.ok && engravingResult.error === ENGRAVING_ERRORS.offensive
      ? ' '
      : normalizeEngraving(engraving).slice(0, MAX_ENGRAVING) || ' ';
  const showEngravingError = !engravingResult.ok && (touched || engraving.length > 0);
  const counter = [...normalizeEngraving(engraving)].length;

  const setField = (k: keyof ShippingAddress) => (v: string) => setAddress((a) => ({ ...a, [k]: v }));

  const onContinue = async () => {
    setTouched(true);
    setSubmitError(null);
    if (!engravingResult.ok || !addressOk || submitting) return;
    if (refl?.guardian) return;

    setSubmitting(true);
    const user = useUser.getState();
    const appUserId = user.appUserId ?? user.login(user.profile.email);
    const cleanAddress: ShippingAddress = {
      name: address.name.trim(),
      street: address.street.trim(),
      postalCode: address.postalCode.trim(),
      city: address.city.trim(),
      province: address.province.trim(),
    };

    let orderId: string;
    try {
      orderId = await createPendingOrder({
        appUserId,
        pet: { id: pet.id, name: pet.name, species: pet.species },
        engravingText: engravingResult.value,
        address: cleanAddress,
      });
    } catch {
      setSubmitting(false);
      setSubmitError(
        `No hemos podido conectar. Revisa tu conexión e inténtalo de nuevo. El seguro de ${pet.name} sigue activo y no se ha cobrado nada.`,
      );
      return;
    }

    usePets.getState().updateRefloresta(petId, { orderId, engravingText: engravingResult.value });

    try {
      await openPurchaseLink(appUserId);
    } catch {
      setSubmitting(false);
      setSubmitError('No hemos podido abrir la página de pago. Inténtalo de nuevo en un momento.');
      return;
    }

    setSubmitting(false);
    router.replace({ pathname: '/refloresta/procesando', params: { petId } });
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.previewBox}>
          <ChapaPreview name={preview} size={132} />
        </View>

        <Text style={styles.section} accessibilityRole="header">
          Nombre a grabar
        </Text>
        <TextInput
          value={engraving}
          onChangeText={setEngraving}
          onBlur={() => setTouched(true)}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={24}
          style={[styles.input, styles.engravingInput, showEngravingError && styles.inputError]}
          accessibilityLabel="Nombre a grabar en la chapa"
          accessibilityHint={`Máximo ${MAX_ENGRAVING} caracteres. Letras, números, espacios y guiones`}
          placeholder={pet.name.toLocaleUpperCase('es-ES')}
          placeholderTextColor={colors.textoSuave}
        />
        <View style={styles.helperRow}>
          <Text style={[styles.helper, showEngravingError && styles.errorText]} accessibilityLiveRegion="polite">
            {showEngravingError && !engravingResult.ok
              ? engravingResult.error
              : 'Se grabará en mayúsculas. Letras, números, espacios y guiones.'}
          </Text>
          <Text style={[styles.helper, counter > MAX_ENGRAVING && styles.errorText]}>
            {counter}/{MAX_ENGRAVING}
          </Text>
        </View>

        <Text style={styles.section} accessibilityRole="header">
          Dirección de envío
        </Text>
        <Field label="Nombre y apellidos" value={address.name} onChangeText={setField('name')} error={touched ? addressErrors.name : undefined} autoComplete="name" />
        <Field label="Calle, número y piso" value={address.street} onChangeText={setField('street')} error={touched ? addressErrors.street : undefined} autoComplete="street-address" />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Field label="Código postal" value={address.postalCode} onChangeText={setField('postalCode')} error={touched ? addressErrors.postalCode : undefined} keyboardType="number-pad" maxLength={5} autoComplete="postal-code" />
          </View>
          <View style={{ flex: 1.6 }}>
            <Field label="Ciudad" value={address.city} onChangeText={setField('city')} error={touched ? addressErrors.city : undefined} />
          </View>
        </View>
        <Field label="Provincia" value={address.province} onChangeText={setField('province')} error={touched ? addressErrors.province : undefined} />

        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Árbol en honor a {pet.name} + chapa grabada</Text>
            <Text style={styles.summaryTotal}>{formatEuro(grossPrice())}</Text>
          </View>
          <Text style={type.small}>{priceBreakdown()} · pago único</Text>
          <Text style={[type.small, { marginTop: 4 }]}>Envío de la chapa incluido. Pagarás de forma segura con Stripe.</Text>
        </View>

        {submitError ? (
          <View style={styles.errorBox} accessibilityLiveRegion="assertive" accessibilityRole="alert">
            <Text style={styles.errorBoxText}>{submitError}</Text>
          </View>
        ) : null}

        {refl?.guardian ? (
          <CTAButton title={`${pet.name} ya tiene su árbol 💚`} disabled style={styles.cta} />
        ) : (
          <CTAButton
            title="Continuar al pago"
            loading={submitting}
            disabled={touched && (!engravingResult.ok || !addressOk)}
            accessibilityLabel={`Continuar al pago de ${formatEuro(grossPrice())}`}
            onPress={onContinue}
            style={styles.cta}
          />
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, error, ...input }: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...input}
        style={[styles.input, error && styles.inputError]}
        accessibilityLabel={label}
        placeholderTextColor={colors.textoSuave}
      />
      {error ? <Text style={[styles.helper, styles.errorText]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.crema },
  center: { alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  scroll: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  previewBox: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: '#F3EBDD',
    borderRadius: radius.lg,
  },
  section: { ...type.h2, fontSize: 19, marginTop: spacing.lg, marginBottom: spacing.sm },
  field: { marginBottom: spacing.sm + 4 },
  label: { fontFamily: fonts.semibold, fontSize: 14, color: colors.texto, marginBottom: 4 },
  input: {
    backgroundColor: colors.blanco,
    borderWidth: 1.5,
    borderColor: colors.borde,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontFamily: fonts.semibold,
    fontSize: 16,
    color: colors.texto,
  },
  engravingInput: { fontFamily: fonts.black, fontSize: 20, letterSpacing: 2, textTransform: 'uppercase' },
  inputError: { borderColor: colors.error },
  helperRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm, marginTop: 4 },
  helper: { ...type.small, flexShrink: 1 },
  errorText: { color: colors.error, fontFamily: fonts.bold },
  row: { flexDirection: 'row', gap: spacing.sm + 4 },
  summary: {
    marginTop: spacing.md,
    backgroundColor: colors.blanco,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borde,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, marginBottom: 4 },
  summaryLabel: { ...type.body, fontFamily: fonts.semibold, flex: 1 },
  summaryTotal: { fontFamily: fonts.black, fontSize: 22, color: colors.texto },
  errorBox: {
    marginTop: spacing.md,
    backgroundColor: '#FDECEA',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#F5C6C1',
  },
  errorBoxText: { ...type.body, color: colors.error, fontFamily: fonts.semibold },
  cta: { marginTop: spacing.lg },
});
