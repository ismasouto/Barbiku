/// <reference types="node" />
// Ejecutar: npx tsx src/lib/engraving.test.ts
import assert from 'node:assert/strict';

import { formatEuro, grossPrice, paymentFee, priceBreakdown } from '../config/pricing';
import { ENGRAVING_ERRORS, MAX_ENGRAVING, normalizeEngraving, validateEngraving } from './engraving';

let n = 0;
function test(name: string, fn: () => void) {
  fn();
  n++;
  console.log(`✓ ${name}`);
}

test('normaliza a mayúsculas y colapsa espacios', () => {
  assert.equal(normalizeEngraving('  luna  del   bosque '), 'LUNA DEL BOSQUE');
  assert.equal(normalizeEngraving('ñoño'), 'ÑOÑO');
});

test('acepta nombres válidos con Ñ, tildes, números, espacio y guion', () => {
  for (const [input, out] of [
    ['Luna', 'LUNA'],
    ['toño', 'TOÑO'],
    ['Ramón', 'RAMÓN'],
    ['Pingüino', 'PINGÜINO'],
    ['Max-2', 'MAX-2'],
    ['Coco Chanel', 'COCO CHANEL'],
    ['Moro', 'MORO'],
  ] as const) {
    assert.deepEqual(validateEngraving(input), { ok: true, value: out });
  }
});

test('vacío → error', () => {
  assert.deepEqual(validateEngraving('   '), { ok: false, error: ENGRAVING_ERRORS.empty });
});

test(`máximo ${MAX_ENGRAVING} caracteres`, () => {
  assert.equal(validateEngraving('A'.repeat(12)).ok, true);
  assert.deepEqual(validateEngraving('A'.repeat(13)), { ok: false, error: ENGRAVING_ERRORS.tooLong });
});

test('caracteres no permitidos', () => {
  for (const bad of ['Luna!', 'luna_1', 'Lú@', 'Toby 🐶', "O'Neil"]) {
    assert.deepEqual(validateEngraving(bad), { ok: false, error: ENGRAVING_ERRORS.invalidChars }, bad);
  }
});

test('palabras ofensivas (con y sin tildes, separadas o juntas)', () => {
  for (const bad of ['mierda', 'Cabrón', 'CABRON', 'gili pollas', 'hijo-puta', 'imbécil', 'coño', 'cono']) {
    assert.deepEqual(validateEngraving(bad), { ok: false, error: ENGRAVING_ERRORS.offensive }, bad);
  }
  assert.equal(ENGRAVING_ERRORS.offensive, 'Ese nombre no se puede grabar, prueba con otro');
});

test('precio: grossPrice() === 20.56 y deja 20 € netos', () => {
  assert.equal(grossPrice(), 20.56);
  assert.equal(paymentFee(), 0.56);
  assert.equal(formatEuro(grossPrice()), '20,56 €');
  assert.equal(priceBreakdown(), '20 € para Refloresta + 0,56 € de gestión del pago');
  const net = grossPrice() - (grossPrice() * 0.015 + 0.25);
  assert.ok(Math.abs(net - 20) < 0.005, `neto ${net}`);
});

console.log(`\n${n} tests OK`);
