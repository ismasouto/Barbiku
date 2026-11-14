// Fallback web: Web Share API con texto; si no existe, copia el texto al portapapeles.
import type { ComponentRef, RefObject } from 'react';
import type { View } from 'react-native';

export type ShareOutcome = 'shared' | 'copied' | 'unavailable';

export async function shareCardImage(
  _ref: RefObject<ComponentRef<typeof View> | null>,
  opts: { message: string; dialogTitle: string },
): Promise<ShareOutcome> {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  if (nav?.share) {
    try {
      await nav.share({ title: opts.dialogTitle, text: opts.message });
      return 'shared';
    } catch {
      return 'unavailable';
    }
  }
  if (nav?.clipboard) {
    try {
      await nav.clipboard.writeText(opts.message);
      return 'copied';
    } catch {
      return 'unavailable';
    }
  }
  return 'unavailable';
}
