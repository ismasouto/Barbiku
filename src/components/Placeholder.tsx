import { Text, View } from 'react-native';

import { colors, type } from '@/theme';

/** Pantalla provisional del esqueleto. Se elimina cuando todas las rutas estén hechas. */
export function Placeholder({ name }: { name: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.crema }}>
      <Text style={type.h2}>{name}</Text>
      <Text style={type.small}>Pendiente de implementar</Text>
    </View>
  );
}
