/** 1240 → "1.240" (es-ES con agrupación siempre; Intl en Hermes no agrupa 4 cifras). */
export function formatThousands(n: number): string {
  return Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
