// STUB — lo implementa la sesión refloresta-ui (§7.5). Las firmas son contrato.
import type { EngravingResult } from '@/types';

export const MAX_ENGRAVING = 12;

/** Recorta espacios y pasa a MAYÚSCULAS (es-ES). */
export function normalizeEngraving(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toLocaleUpperCase('es-ES');
}

/** Valida longitud, caracteres permitidos y palabras ofensivas. */
export function validateEngraving(raw: string): EngravingResult {
  const value = normalizeEngraving(raw);
  if (!value) return { ok: false, error: 'Escribe un nombre para la chapa' };
  return { ok: true, value };
}
