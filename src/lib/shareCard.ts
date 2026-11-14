// Captura de la ShareCard y hoja de compartir nativa (iOS/Android).
// En web se usa shareCard.web.ts (sin react-native-view-shot, que en web requiere html2canvas-pro).
import * as Sharing from 'expo-sharing';
import type { ComponentRef, RefObject } from 'react';
import type { View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

export type ShareOutcome = 'shared' | 'copied' | 'unavailable';

export async function shareCardImage(
  ref: RefObject<ComponentRef<typeof View> | null>,
  opts: { message: string; dialogTitle: string },
): Promise<ShareOutcome> {
  if (!ref.current) return 'unavailable';
  if (!(await Sharing.isAvailableAsync())) return 'unavailable';
  const uri = await captureRef(ref, { format: 'png', quality: 1, result: 'tmpfile' });
  await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: opts.dialogTitle, UTI: 'public.png' });
  return 'shared';
}
