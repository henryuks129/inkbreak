import assert from 'node:assert/strict';
import test from 'node:test';
import { InkField, RoundRules, getInkSpeed, updateInk } from './simulation.ts';

test('painting transfers turf ownership and conserves total coverage', () => {
  const field = new InkField(8, 8);
  const cyan = field.paint(0, 0, 2, 1);
  assert.ok(cyan > 0);
  assert.equal(field.paint(0, 0, 2, 1), 0);
  assert.equal(field.paint(0, 0, 2, 2), cyan);
  const coverage = field.coverage();
  assert.equal(coverage.cyan, 0);
  assert.equal(coverage.coral, cyan);
  assert.equal(coverage.cyan + coverage.coral + coverage.neutral, coverage.total);
  assert.equal(field.at(0, 0), 2);
});

test('painting clips at world edges and ignores invalid coordinates', () => {
  const field = new InkField(8, 8);
  field.paint(-4, -4, 2, 1);
  assert.equal(field.at(-3.5, -3.5), 1);
  assert.equal(field.at(3.5, 3.5), 0);
  assert.equal(field.at(4, 0), 0);
  assert.equal(field.at(NaN, 0), 0);
  assert.equal(field.paint(NaN, 0, 2, 1), 0);
  assert.equal(field.paint(0, 0, -1, 1), 0);
  field.reset();
  assert.deepEqual(field.coverage(), { cyan: 0, coral: 0, neutral: 64, total: 64 });
});

test('round ends exactly once, stops splats, and resets cleanly', () => {
  const round = new RoundRules(3);
  round.tick(1);
  round.addSplat();
  assert.equal(round.remaining, 2);
  assert.equal(round.splats, 1);
  round.tick(5);
  assert.equal(round.remaining, 0);
  assert.equal(round.active, false);
  assert.equal(round.finished, true);
  round.addSplat();
  assert.equal(round.splats, 1);
  round.reset();
  assert.equal(round.remaining, 3);
  assert.equal(round.splats, 0);
  assert.equal(round.finished, false);
});

test('paused and invalid frame deltas cannot consume round time', () => {
  const round = new RoundRules(3);
  round.tick(-1);
  round.tick(NaN);
  round.active = false;
  round.tick(2);
  assert.equal(round.remaining, 3);
});

test('friendly swim refills faster, enemy ink slows, tank remains bounded', () => {
  assert.ok(getInkSpeed(1, true) > getInkSpeed(0, true));
  assert.ok(getInkSpeed(2, false) < getInkSpeed(0, false));
  assert.equal(getInkSpeed(2, true, 2), getInkSpeed(1, true));
  assert.ok(updateInk(50, 1, true, true, false) > updateInk(50, 1, false, false, false));
  assert.equal(updateInk(95, 1, true, true, false), 100);
  assert.equal(updateInk(2, 1, false, false, true), 0);
  assert.equal(updateInk(50, -1, false, false, true), 50);
});

test('friendly ink restores a dry tank quickly enough for continuous combat', () => {
  assert.equal(updateInk(0, 2.3, true, true, false), 100);
  assert.ok(updateInk(0, 2.3, false, false, false) < 40);
});
