import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReminderBanner } from '@/components/seguro/ReminderBanner';
import { Button, Card, GuardianBadge, ageLabel, planName, speciesEmoji } from '@/components/seguro/ui';
import { usePets } from '@/store/pets';
import { useUser } from '@/store/user';
import { colors, fonts, radius, spacing, type } from '@/theme';

export default function HomeScreen() {
  const name = useUser((s) => s.profile.name);
  const pets = usePets((s) => s.pets);
  const policies = usePets((s) => s.policies);
  // Suscripción a `refloresta` para re-renderizar cuando cambian banner/insignia.
  const refloresta = usePets((s) => s.refloresta);
  const shouldShowReminder = usePets((s) => s.shouldShowReminder);

  const reminderPets = pets.filter((p) => shouldShowReminder(p.id));

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.hello}>Hola, {name} 👋</Text>
        <Text style={type.h1}>Mis mascotas</Text>

        {reminderPets.map((pet) => (
          <ReminderBanner key={pet.id} pet={pet} />
        ))}

        {pets.map((pet) => {
          const policy = policies.find((p) => p.petId === pet.id);
          const guardian = refloresta[pet.id]?.guardian ?? false;
          return (
            <Pressable
              key={pet.id}
              onPress={() => router.push({ pathname: '/mascota/[id]', params: { id: pet.id } })}
              accessibilityRole="button"
              accessibilityLabel={`Ver ficha de ${pet.name}${guardian ? ', Guardiana del Bosque' : ''}`}
              style={({ pressed }) => pressed && { transform: [{ scale: 0.98 }] }}>
              <Card style={styles.petCard}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarEmoji}>{speciesEmoji(pet.species)}</Text>
                  {guardian && <Text style={styles.avatarTree}>🌳</Text>}
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={type.h2}>{pet.name}</Text>
                  <Text style={type.small}>
                    {pet.breed} · {ageLabel(pet.birthDate)}
                  </Text>
                  {policy && (
                    <View style={styles.policyPill}>
                      <Text style={styles.policyText}>🛡️ {planName(policy.planId)} · Activa</Text>
                    </View>
                  )}
                  {guardian && <GuardianBadge compact />}
                </View>
                <Text style={styles.chevron}>›</Text>
              </Card>
            </Pressable>
          );
        })}

        <Button
          label="➕ Asegurar otra mascota"
          variant="secondary"
          onPress={() => router.push('/alta')}
          style={{ marginTop: spacing.sm }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.crema },
  container: { padding: spacing.lg, gap: spacing.md, maxWidth: 640, width: '100%', alignSelf: 'center' },
  hello: { fontFamily: fonts.semibold, fontSize: 16, color: colors.textoSuave },
  petCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.crema,
    borderWidth: 2,
    borderColor: colors.brote,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 34 },
  avatarTree: { position: 'absolute', right: -6, bottom: -6, fontSize: 22 },
  policyPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.crema,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 4,
  },
  policyText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.tierra },
  chevron: { fontSize: 30, color: colors.textoSuave, fontFamily: fonts.bold },
});
