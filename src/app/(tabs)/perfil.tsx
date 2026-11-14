import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, formatDate, formatEuros, speciesEmoji } from '@/components/seguro/ui';
import { PLANS } from '@/data/mock';
import { usePets } from '@/store/pets';
import { useUser } from '@/store/user';
import { colors, fonts, spacing, type } from '@/theme';

export default function PerfilScreen() {
  const profile = useUser((s) => s.profile);
  const logout = useUser((s) => s.logout);
  const pets = usePets((s) => s.pets);
  const policies = usePets((s) => s.policies);
  const { address } = profile;

  const onLogout = () => {
    logout();
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.flex} edges={['top']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={type.h1}>Perfil</Text>

        <Card style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.initial}>{profile.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={type.h2}>{profile.name}</Text>
            <Text style={type.small}>{profile.email}</Text>
          </View>
        </Card>

        <Text style={styles.section}>Dirección de envío</Text>
        <Card>
          <Text style={type.body}>{address.name}</Text>
          <Text style={type.body}>{address.street}</Text>
          <Text style={type.body}>
            {address.postalCode} {address.city} ({address.province})
          </Text>
        </Card>

        <Text style={styles.section}>Mis pólizas</Text>
        {policies.length === 0 && <Text style={type.small}>Aún no tienes pólizas.</Text>}
        {policies.map((policy) => {
          const pet = pets.find((p) => p.id === policy.petId);
          const plan = PLANS.find((p) => p.id === policy.planId);
          return (
            <Card key={policy.id} style={styles.policy}>
              <Text style={{ fontSize: 28 }}>{pet ? speciesEmoji(pet.species) : '🐾'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.policyTitle}>
                  {pet?.name ?? 'Mascota'} · {plan?.name ?? policy.planId}
                </Text>
                <Text style={type.small}>{plan?.description}</Text>
                <Text style={type.small}>
                  Desde el {formatDate(policy.createdAt)} · Nº {policy.id.slice(0, 8).toUpperCase()}
                </Text>
              </View>
              {plan && <Text style={styles.price}>{formatEuros(plan.monthlyPrice)}/mes</Text>}
            </Card>
          );
        })}

        <Button label="Cerrar sesión" variant="secondary" onPress={onLogout} style={{ marginTop: spacing.md }} />
        <Text style={[type.small, { textAlign: 'center' }]}>
          Barbiku es una aseguradora ficticia creada para esta demo.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.crema },
  container: { padding: spacing.lg, gap: spacing.md, maxWidth: 640, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.bosque,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: { fontFamily: fonts.black, fontSize: 26, color: colors.blanco },
  section: { fontFamily: fonts.bold, fontSize: 17, color: colors.texto, marginTop: spacing.sm },
  policy: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  policyTitle: { fontFamily: fonts.bold, fontSize: 16, color: colors.texto },
  price: { fontFamily: fonts.bold, fontSize: 14, color: colors.bosque },
});
