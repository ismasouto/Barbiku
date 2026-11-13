// Reglas del nombre grabado en la chapa (§7.5). Las firmas exportadas son contrato.
import type { EngravingResult } from '@/types';

export const MAX_ENGRAVING = 12;

export const ENGRAVING_ERRORS = {
  empty: 'Escribe un nombre para la chapa',
  tooLong: `Máximo ${MAX_ENGRAVING} caracteres`,
  invalidChars: 'Solo letras, números, espacios y guiones',
  offensive: 'Ese nombre no se puede grabar, prueba con otro',
} as const;

/** Letras (incluidas Ñ, tildes y diéresis), números, espacio y guion. Se evalúa tras pasar a mayúsculas. */
const ALLOWED = /^[A-ZÁÉÍÓÚÜÑ0-9 -]+$/;

/**
 * Lista local básica de palabras ofensivas en español (mayúsculas, sin tildes).
 * Se comparan como palabra completa. No pretende ser exhaustiva: es un filtro de cortesía.
 * Ojo con los falsos positivos: nombres de mascota habituales (MORO, COCA…) no deben estar aquí.
 */
const OFFENSIVE_WORDS = [
  'PUTA', 'PUTO', 'PUTAS', 'PUTOS', 'PUTITA', 'PUTON',
  'MIERDA', 'CABRON', 'CABRONA', 'CABRONES',
  'COÑO', 'JODER', 'JODIDO', 'JODIDA',
  'GILIPOLLAS', 'GILIPOLLA', 'CAPULLO', 'CAPULLA',
  'IMBECIL', 'IDIOTA', 'SUBNORMAL', 'RETRASADO', 'RETRASADA',
  'MARICON', 'MARICONA', 'BOLLERA', 'TORTILLERA',
  'ZORRA', 'ZORRON', 'GUARRA', 'FURCIA', 'RAMERA',
  'POLLA', 'POLLON', 'COJON', 'COJONES', 'CHOCHO', 'CULO', 'TETAS', 'PENE', 'VAGINA',
  'MAMON', 'MAMONA', 'PAJERO', 'PAJILLERO', 'FOLLAR', 'FOLLADOR',
  'HOSTIA', 'MALPARIDO', 'HIJOPUTA', 'HDP', 'SUDACA', 'NEGRATA', 'PANCHITO',
  'NAZI', 'HITLER', 'MATAR', 'VIOLADOR', 'PEDERASTA', 'PEDOFILO',
  'SEXO', 'PORNO', 'FARLOPA',
];

/** Las más graves también se buscan dentro del texto compactado (sin espacios ni guiones). */
const OFFENSIVE_SUBSTRINGS = [
  'PUTA', 'PUTO', 'MIERDA', 'CABRON', 'GILIPOLL', 'MARICON', 'HIJOPUTA', 'MALPARID',
  'FOLLA', 'POLLON', 'PEDERAST', 'PEDOFIL', 'NEGRATA', 'HITLER', 'VIOLADOR',
];

/** Quita tildes y diéresis conservando la Ñ. */
export function stripAccents(s: string): string {
  return s
    .replace(/Ñ/g, '\u0001')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\u0001/g, 'Ñ');
}

const OFFENSIVE_SET = new Set(
  OFFENSIVE_WORDS.flatMap((w) => [stripAccents(w), stripAccents(w).replace(/Ñ/g, 'N')]),
);

/** Recorta espacios y pasa a MAYÚSCULAS (es-ES). */
export function normalizeEngraving(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toLocaleUpperCase('es-ES');
}

/** True si el texto contiene alguna palabra ofensiva de la lista local (ignora tildes y mayúsculas). */
export function isOffensive(text: string): boolean {
  const plain = stripAccents(normalizeEngraving(text));
  // Variante con Ñ→N para cazar palabras escritas sin eñe (p. ej. "CONO").
  for (const v of [plain, plain.replace(/Ñ/g, 'N')]) {
    const words = v.split(/[ -]+/).filter(Boolean);
    const compact = words.join('');
    if (words.some((w) => OFFENSIVE_SET.has(w))) return true;
    if (OFFENSIVE_SET.has(compact)) return true;
    if (OFFENSIVE_SUBSTRINGS.some((bad) => compact.includes(bad))) return true;
  }
  return false;
}

/** Valida longitud, caracteres permitidos y palabras ofensivas. */
export function validateEngraving(raw: string): EngravingResult {
  const value = normalizeEngraving(raw);
  if (!value) return { ok: false, error: ENGRAVING_ERRORS.empty };
  if ([...value].length > MAX_ENGRAVING) return { ok: false, error: ENGRAVING_ERRORS.tooLong };
  if (!ALLOWED.test(value)) return { ok: false, error: ENGRAVING_ERRORS.invalidChars };
  if (isOffensive(value)) return { ok: false, error: ENGRAVING_ERRORS.offensive };
  return { ok: true, value };
}
