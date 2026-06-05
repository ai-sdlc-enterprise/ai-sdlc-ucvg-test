'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { add, subtract, multiply } = require('../src/calc.js');

test('add returns the sum of two numbers', () => {
  assert.strictEqual(add(2, 3), 5);
  assert.strictEqual(add(-1, 1), 0);
});

test('subtract returns the difference of two numbers', () => {
  assert.strictEqual(subtract(5, 3), 2);
  assert.strictEqual(subtract(0, 4), -4);
});

test('multiply returns the product of two positive numbers', () => {
  assert.strictEqual(multiply(3, 4), 12);
  assert.strictEqual(multiply(7, 6), 42);
});

test('multiply by zero returns zero', () => {
  assert.strictEqual(multiply(0, 5), 0);
  assert.strictEqual(multiply(5, 0), 0);
  assert.strictEqual(multiply(0, 0), 0);
});

test('multiply handles negative operands', () => {
  assert.strictEqual(multiply(-2, 5), -10);
  assert.strictEqual(multiply(5, -2), -10);
  assert.strictEqual(multiply(-2, -3), 6);
});

test('multiply respects the identity element', () => {
  assert.strictEqual(multiply(1, 7), 7);
  assert.strictEqual(multiply(7, 1), 7);
});

test('multiply handles floating-point operands', () => {
  assert.strictEqual(multiply(2.5, 4), 10);
  assert.strictEqual(multiply(0.5, 0.5), 0.25);
});
