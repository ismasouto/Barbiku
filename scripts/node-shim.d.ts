// Tipos mínimos de Node para scripts/*.ts (el proyecto no incluye @types/node).
declare module 'node:crypto' {
  export function randomUUID(): string;
}
declare module 'node:fs' {
  export function existsSync(path: string): boolean;
  export function readFileSync(path: string, encoding: 'utf8'): string;
}
