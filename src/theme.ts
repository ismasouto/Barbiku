// Tema visual (§11). Estilos: StyleSheet de React Native en toda la app.

export const colors = {
  bosque: '#1F6F43', // verde bosque (primario, CTA)
  brote: '#7BC96F', // verde brote
  crema: '#FFF8EC', // fondo
  tierra: '#8B5E3C',
  acento: '#FF7A45', // etiquetas de oferta
  texto: '#1E2A22',
  textoSuave: '#5B6B60',
  blanco: '#FFFFFF',
  borde: '#E8DFCF',
  error: '#C0392B',
  madera1: '#C89B6D',
  madera2: '#A9784A',
} as const;

/** Familias cargadas en src/app/_layout.tsx con @expo-google-fonts/nunito. */
export const fonts = {
  regular: 'Nunito_400Regular',
  semibold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
  black: 'Nunito_900Black',
} as const;

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 } as const;
export const radius = { sm: 8, md: 14, lg: 22, pill: 999 } as const;

export const type = {
  h1: { fontFamily: fonts.black, fontSize: 30, lineHeight: 36, color: colors.texto },
  h2: { fontFamily: fonts.bold, fontSize: 22, lineHeight: 28, color: colors.texto },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22, color: colors.texto },
  small: { fontFamily: fonts.regular, fontSize: 13, lineHeight: 18, color: colors.textoSuave },
  button: { fontFamily: fonts.bold, fontSize: 17, color: colors.blanco },
} as const;
