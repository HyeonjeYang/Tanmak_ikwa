'use strict';
// No packages required: exercise the real embedded game script in a minimal DOM.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const noop = () => {};
const gradient = { addColorStop: noop };
const context = new Proxy({ createLinearGradient: () => gradient, createRadialGradient: () => gradient, measureText: () => ({ width: 20 }) }, {
  get(target, key) { return key in target ? target[key] : noop; },
  set(target, key, value) { target[key] = value; return true; }
});
const elements = new Map();
const events = new Map();
const documentEvents = new Map();
const storage = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, { hidden: false, textContent: '', dataset: {}, getContext: () => context, focus: noop, addEventListener: noop });
  return elements.get(id);
}
const sandbox = {
  console, Math,
  document: { getElementById: element, createElement: () => element(Symbol()), addEventListener: (name, cb) => documentEvents.set(name, cb), hidden: false },
  window: { addEventListener: (name, cb) => events.set(name, cb) },
  localStorage: { getItem: key => storage.get(key), setItem: (key, value) => storage.set(key, value) },
  requestAnimationFrame: noop
};
vm.createContext(sandbox);
new vm.Script(source, { filename: 'index.html' });
const marker = '\n  render();requestAnimationFrame(frame);\n})();';
assert.ok(source.includes(marker), 'test instrumentation anchor exists');
const exported = 'game,player,boss,bullets,shots,particles,warnings,enemies,items,labels,fields,spells,difficulties,keys,start,beginField,beginPhase,finishField,finishPhase,hit,bomb,freezeBullets,switchWeapon,continueRun,pause,bullet,spawnItem,spawnFieldEnemy,damageEnemy,damageBoss,enemyText,updateItems,updateField,fireShots,weierstrass,update,updateBoss,updateBullets,updateShots,updateWarnings,render,frame,STEP,HOMING_COOLDOWN,OVERHEAT_LOCK,O,K,OPS,SPECS,loop,conc,poleXY,placePoles,closeLoop,fireCircle,stepConcentration,resize,canvas,GX,GY,CELL,GRID_TOP';
vm.runInContext(source.replace(marker, `\n  globalThis.testGame={${exported},scale:()=>scale};` + marker), sandbox);
const t = sandbox.testGame;
const { O, K } = t;
const near = (a, b, eps = 1e-7) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);
let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`PASS ${name}`); }
function reset() { t.game.difficulty = 'easy'; t.game.runMode = 'limited'; t.game.startChapter = 0; t.start(); t.beginPhase(0); t.game.transition = 0; t.player.invuln = 0; }
function fieldReset(stage = 0) { t.game.difficulty = 'easy'; t.game.startChapter = 0; t.start(); t.beginField(stage); t.game.transition = 0; t.player.invuln = 100; }
function bossReset(index) { reset(); t.beginPhase(index); t.game.transition = 0; t.player.invuln = 100; }
function tick(frames) { for (let i = 0; i < frames; i++) t.update(t.STEP); }
function key(code, type = 'keydown', repeat = false) { events.get(type)({ code, repeat, preventDefault: noop }); }
function liveShots(kind) { return t.shots.items.slice(0, t.shots.count).filter(s => kind === undefined || s.kind === kind); }
function noteSeen(text) { return t.labels.items.slice(0, t.labels.count).some(l => l.text === text); }
function placeEnemy(props) {
  const e = t.enemies.take();
  e.a.fill(0);
  Object.assign(e, { x: 300, y: 300, baseX: 300, baseY: 300, age: 0, fire: 99, seed: 0, type: t.game.phase, fn: 0, deg: 0, coef: 1, pd: 0, flash: 0, immune: 0, alive: true, id: 9000 + t.enemies.count, spec: '', phase: 0, p: 0, deck: 0, mark: 0, trial: 0, s: 1 }, props);
  if (props.hp !== undefined && props.max === undefined) e.max = props.hp;
  if (props.matrix) e.a.set(props.matrix);
  return e;
}
function placeShot(props) {
  const s = t.shots.take();
  Object.assign(s, { x: 300, y: 400, px: 300, py: 400, ox: 300, oy: 400, angle: -Math.PI / 2, speed: 900, kind: 0, damage: 3, age: 0, op: O.D, target: null, tid: 0, amp: 0, freq: 0, ph: 0, bent: 0 }, props);
  s.px = s.ox = s.x; s.py = s.oy = s.y;
  return s;
}
// A closed polygon around (cx, cy), handed straight to the ∮ evaluator.
function closeCircle(cx, cy, r, sides = 48) {
  for (let k = 0; k < sides; k++) { t.loop.fx[k] = cx + r * Math.cos(k / sides * 2 * Math.PI); t.loop.fy[k] = cy + r * Math.sin(k / sides * 2 * Math.PI); }
  t.loop.fn = sides;
  const area = sides / 2 * r * r * Math.sin(2 * Math.PI / sides);
  t.closeLoop(area);
  return area;
}
// Fly the pen once round a circle with ∮ held, so the real tracer has to notice the curve closing.
function traceCircle(cx, cy, r, steps = 90) {
  for (let k = 0; k <= steps + 16; k++) { const a = k / steps * 2 * Math.PI; t.player.x = cx + r * Math.cos(a); t.player.y = cy + r * Math.sin(a); t.fireShots(t.STEP); }
}

check('single self-contained document with an 800×700 logical canvas', () => {
  assert.match(html, /width="800" height="700"/);
  assert.doesNotMatch(html, /<(?:script|img|link)[^>]+(?:src|href)=/i);
  assert.doesNotMatch(html, /fetch\s*\(|XMLHttpRequest|TODO/);
});
check('canvas backing store follows CSS width × devicePixelRatio for sharp rendering', () => {
  const canvas = elements.get('game');
  canvas.clientWidth = 1000; sandbox.window.devicePixelRatio = 1.5; t.resize();
  const expected = Math.round(1000 / 800 * 1.5 * 20) / 20;
  near(t.scale(), expected); assert.equal(canvas.width, Math.round(800 * expected)); assert.equal(canvas.height, Math.round(700 * expected));
  canvas.clientWidth = 400; sandbox.window.devicePixelRatio = 1; t.resize(); assert.equal(canvas.width, 800, 'never below one device pixel per logical pixel');
  canvas.clientWidth = 800; t.resize(); assert.equal(t.scale(), 1);
});
check('title renders and starts from a real key event', () => {
  assert.equal(t.game.mode, 'title'); key('Enter'); assert.equal(t.game.mode, 'playing'); assert.equal(t.game.segment, 'field'); assert.equal(elements.get('overlay').hidden, true);
});
check('normal, focus and diagonal movement match 5 / 2 px per tick', () => {
  reset(); t.keys.add('ArrowRight'); t.update(t.STEP); near(t.player.x, 305);
  t.keys.add('ShiftLeft'); t.update(t.STEP); near(t.player.x, 307);
  reset(); t.keys.add('ArrowRight'); t.keys.add('ArrowUp'); t.update(t.STEP); near(Math.hypot(t.player.x - 300, t.player.y - 590), 5);
  tick(300); assert.ok(t.player.x <= 588 && t.player.y >= 62);
});
check('C cycles d/dx → ∂/∂y → ∇ and 1 / 2 / 3 pick directly', () => {
  reset(); assert.equal(t.player.weapon, 0);
  key('KeyC'); assert.equal(t.player.weapon, 1); key('KeyC'); assert.equal(t.player.weapon, 2); key('KeyC'); assert.equal(t.player.weapon, 0);
  key('Digit3'); assert.equal(t.player.weapon, 2); key('Digit1'); assert.equal(t.player.weapon, 0);
  key('KeyV'); assert.equal(t.game.freezeCooldown, 14);
});
check('chapters 4–7 each hand over one new operator; C only cycles unlocked ones', () => {
  reset(); assert.equal(t.spells.length, 7); assert.equal(t.fields.length, 7); assert.equal(t.OPS.length, 7);
  key('Digit4'); assert.equal(t.player.weapon, 0, '∮ is still locked in chapter 1');
  t.beginField(3); assert.equal(t.player.weapon, 3, 'the new ∮ is put in hand'); assert.equal(t.game.newTool, 3);
  key('KeyC'); assert.equal(t.player.weapon, 0, 'A⁻¹, ℱ and 𝔼 are skipped while locked');
  key('Digit5'); assert.equal(t.player.weapon, 0);
  t.beginField(4); assert.equal(t.player.weapon, 4); t.beginField(5); assert.equal(t.player.weapon, 5); t.beginField(6); assert.equal(t.player.weapon, 6);
  key('Digit4'); assert.equal(t.player.weapon, 3); for (let k = 0; k < 4; k++) key('KeyC'); assert.equal(t.player.weapon, 0);
});
check('d/dx fans five needles at speed and stacks three when focused', () => {
  reset(); t.keys.add('KeyZ'); t.fireShots(t.STEP);
  const fast = liveShots(0); assert.equal(fast.length, 5); assert.ok(new Set(fast.map(s => s.angle.toFixed(3))).size === 5);
  t.shots.clear(); t.player.fire = 0; t.player.focus = true; t.fireShots(t.STEP);
  const focus = liveShots(0); assert.equal(focus.length, 3); assert.ok(focus.every(s => s.angle === -Math.PI / 2 && s.op === 0));
});
check('d/dx lowers a monomial one degree per layer: x³ → 3x² → 6x → 6 → 0', () => {
  fieldReset(); const e = placeEnemy({ deg: 3, hp: 10 });
  const seen = [t.enemyText(e)];
  for (let i = 0; i < 3; i++) { t.damageEnemy(0, 10, 0); seen.push(t.enemyText(e)); }
  assert.deepEqual(seen, ['x³', '3x²', '6x', '6']); assert.equal(t.enemies.count, 1);
  t.damageEnemy(0, 10, 0); assert.equal(t.enemies.count, 0); assert.equal(e.alive, false);
  assert.ok(noteSeen('= 0'));
});
check('eˣ ignores d/dx and ∇ but the focused ∂/∂y laser annihilates it', () => {
  fieldReset(); const e = placeEnemy({ fn: 1, hp: 50 });
  assert.equal(t.damageEnemy(0, 30, 0), false); assert.equal(t.damageEnemy(0, 30, 2), false); assert.equal(e.hp, 50);
  assert.ok(noteSeen('d/dx eˣ = eˣ'));
  t.player.x = 300; t.player.y = 600; t.player.focus = true; t.player.weapon = 1; t.keys.add('KeyZ');
  let frames = 0; while (t.enemies.count && frames < 120) { t.fireShots(t.STEP); frames++; }
  assert.equal(t.enemies.count, 0); assert.ok(frames >= 29 && frames <= 31, `${frames} frames at 100 dps`);
  assert.ok(noteSeen('∂/∂y = 0'));
});
check('∂/∂y must cover the whole remainder of a polynomial, and d/dx shortens it', () => {
  fieldReset(); const e = placeEnemy({ deg: 2, hp: 10 });
  t.damageEnemy(0, 15, 1); assert.equal(t.enemies.count, 1); assert.equal(e.deg, 2);
  t.damageEnemy(0, 10, 0); assert.equal(e.deg, 1); assert.equal(t.enemies.count, 1);
  t.damageEnemy(0, 5, 0); assert.equal(t.enemies.count, 0, 'd/dx shrank the remainder under the ∂ ring');
});
check('∂/∂y overheats after 2.5 s of focused fire and stays locked for 1.5 s', () => {
  reset(); t.player.invuln = 1000; t.player.weapon = 1; t.keys.add('KeyZ'); t.keys.add('ShiftLeft');
  tick(140); assert.equal(t.player.beam, 1); assert.equal(t.player.overheat, 0);
  tick(20); assert.ok(t.player.overheat > 0); assert.equal(t.player.beam, 0);
  tick(80); assert.equal(t.player.beam, 0);
  tick(15); assert.equal(t.player.overheat, 0); assert.equal(t.player.beam, 1);
  t.keys.delete('ShiftLeft'); tick(1); assert.equal(t.player.beam, 2);
});
check('∇ homing beams fire eight at once, then wait four seconds', () => {
  reset(); t.player.invuln = 1000; t.player.weapon = 2; t.keys.add('KeyZ');
  t.update(t.STEP); assert.equal(liveShots(1).length, 8); near(t.player.homingCd, t.HOMING_COOLDOWN);
  const firstVolley = liveShots(1).length; tick(60); assert.ok(liveShots(1).length <= firstVolley); assert.ok(liveShots(0).length > 0, 'weak straight shots between volleys');
  // Count volleys over twelve more seconds: one every four seconds, never faster.
  let volleys = 0, last = t.player.homingCd;
  for (let i = 0; i < 720; i++) { t.update(t.STEP); if (t.player.homingCd > last) volleys++; last = t.player.homingCd; }
  assert.equal(volleys, 3);
});
check('homing beams ignore eˣ, Brownian motion and poles while choosing a target', () => {
  fieldReset(); const exp = placeEnemy({ fn: K.EXP, hp: 50, x: 300, y: 520 }); const brown = placeEnemy({ fn: K.BROWN, hp: 1, x: 260, y: 500 });
  const pole = placeEnemy({ fn: K.POLE, hp: 30, x: 340, y: 500 }); const poly = placeEnemy({ deg: 1, hp: 500, x: 120, y: 200 });
  t.player.weapon = 2; t.keys.add('KeyZ'); t.fireShots(t.STEP);
  const beam = liveShots(1)[0]; const before = Math.hypot(beam.x - poly.x, beam.y - poly.y);
  for (let i = 0; i < 20; i++) t.updateShots(t.STEP);
  assert.ok(Math.hypot(beam.x - poly.x, beam.y - poly.y) < before); assert.equal(exp.hp, 50); assert.ok(brown.alive && pole.alive);
});
check('focused ∇ paints a target with the laser and guides missiles onto it', () => {
  fieldReset(); const e = placeEnemy({ deg: 2, hp: 1000, x: 300, y: 250 });
  t.player.x = 300; t.player.y = 600; t.player.focus = true; t.player.weapon = 2; t.keys.add('KeyZ');
  t.fireShots(t.STEP); assert.equal(t.player.paint, true); assert.equal(t.player.lock, e); assert.equal(liveShots(3).length, 0);
  for (let i = 0; i < 16; i++) t.fireShots(t.STEP);
  const missiles = liveShots(3); assert.equal(missiles.length, 2); assert.ok(missiles.every(s => s.target === e && s.op === 2));
  for (let i = 0; i < 60; i++) t.updateShots(t.STEP);
  assert.ok(e.hp < 1000 || e.deg < 2, 'missiles reached the painted enemy');
});
check('∮ traced round a vortex kills it; a polynomial inside is a gradient field and stays', () => {
  fieldReset(3); assert.equal(t.player.weapon, 3);
  const vortex = placeEnemy({ fn: K.FIELD, spec: 'vor', hp: 40, matrix: [0, -1, 1, 0], x: 300, y: 300 });
  const poly = placeEnemy({ deg: 2, hp: 16, x: 320, y: 310 });
  const outside = placeEnemy({ fn: K.FIELD, spec: 'src', hp: 40, matrix: [1, 0, 0, 1], x: 100, y: 120 });
  t.keys.add('KeyZ'); traceCircle(300, 300, 75);
  assert.equal(vortex.alive, false, 'Stokes: the enclosed curl is nonzero');
  assert.ok(poly.alive && poly.hp === 16 && poly.deg === 2, 'a gradient field has no circulation');
  assert.ok(outside.alive, 'only what the curve encloses is integrated');
  assert.equal(t.loop.text, '∮F·dr = ∬(∇×F) dA\n∮∇f·dr = 0');
  assert.ok(t.loop.fn > 40 && t.loop.n < 16, 'the closed curve is kept for the flash and the pen starts a fresh one');
});
check('a too-small scribble does not count as a closed curve', () => {
  fieldReset(3); const vortex = placeEnemy({ fn: K.FIELD, hp: 40, matrix: [0, -1, 1, 0], x: 300, y: 300 });
  t.keys.add('KeyZ'); traceCircle(300, 300, 16);
  assert.ok(vortex.alive);
});
check('focused ∮ is a circle C around the pen that integrates what it holds', () => {
  fieldReset(3); const source = placeEnemy({ fn: K.FIELD, hp: 40, matrix: [1, 0, 0, 1], x: 300, y: 540 });
  t.player.x = 300; t.player.y = 590; t.player.focus = true; t.keys.add('KeyZ');
  let frames = 0; while (source.alive && frames < 120) { t.fireShots(t.STEP); frames++; }
  assert.equal(source.alive, false); assert.ok(frames > 20 && frames < 50, `${frames} frames`); assert.equal(t.player.ring, true);
});
check('vector fields take 40% from everything except ∮', () => {
  fieldReset(3); const e = placeEnemy({ fn: K.FIELD, hp: 40, matrix: [1, 0, 0, 1] });
  t.damageEnemy(0, 10, O.D); near(e.hp, 36); t.damageEnemy(0, 10, O.G); near(e.hp, 32);
});
check('boss 4: Gauss damage ignores the size of the surface, Stokes damage grows with the area', () => {
  bossReset(3); t.game.bodyIndex = 0;
  let hp = t.boss.hp; closeCircle(t.boss.x, t.boss.y, 50); const gaussSmall = hp - t.boss.hp;
  hp = t.boss.hp; closeCircle(t.boss.x, t.boss.y, 110); const gaussLarge = hp - t.boss.hp;
  near(gaussSmall, gaussLarge); assert.ok(gaussSmall > 0);
  t.game.bodyIndex = 1;
  hp = t.boss.hp; closeCircle(t.boss.x, t.boss.y, 45); const stokesSmall = hp - t.boss.hp;
  hp = t.boss.hp; closeCircle(t.boss.x, t.boss.y, 90); const stokesLarge = hp - t.boss.hp;
  assert.ok(stokesLarge > 2.5 * stokesSmall, `${stokesSmall} → ${stokesLarge}`);
  hp = t.boss.hp; closeCircle(t.boss.x + 300, t.boss.y, 50); assert.equal(t.boss.hp, hp, 'a curve that misses the boss does nothing');
  hp = t.boss.hp; t.damageBoss(100, O.D); near(hp - t.boss.hp, 50);
});
check('boss 4 Gauss bullets slow as 1/r and turn back when the charge flips', () => {
  bossReset(3); t.boss.x = 300; t.boss.y = 200; t.game.charge = 1;
  const nearB = t.bullet(340, 200, 0, 150, 5), farB = t.bullet(500, 200, 0, 150, 5);
  t.updateBullets(t.STEP);
  const vNear = (nearB.x - nearB.px) * 60, vFar = (farB.x - farB.px) * 60;
  near(vNear, 150 * t.difficulties.easy.speed * (40 / 40 + .18), 1e-6); assert.ok(vFar < vNear / 2.5);
  t.game.charge = -1; t.updateBullets(t.STEP); assert.ok(farB.x < farB.px, 'a sink pulls the shell back in');
});
check('field matrices bend passing shots by A, A⁻¹ shots fly straight through', () => {
  fieldReset(4); const m = placeEnemy({ fn: K.MATRIX, hp: 30, matrix: [0, -1, 1, 0] });
  const bent = placeShot({ x: 300, y: 380 });
  for (let i = 0; i < 12; i++) t.updateShots(t.STEP);
  assert.equal(m.hp, 30); assert.equal(bent.bent, m.id); near(Math.cos(bent.angle), 1, 1e-6);
  t.shots.clear(); placeShot({ x: 300, y: 380, op: O.INV });
  for (let i = 0; i < 12; i++) t.updateShots(t.STEP);
  near(m.hp, 30 - 3 * 1.5);
  // Along an eigenvector a diagonal matrix only rescales: the shot stays straight but loses half its damage.
  t.shots.clear(); m.a.set([2, 0, 0, .5]); m.hp = 30; placeShot({ x: 300, y: 380 });
  for (let i = 0; i < 12; i++) t.updateShots(t.STEP);
  near(m.hp, 30 - 1.5);
});
check('∮ follows the matrix: rotations and shears close, the symmetric traceless swap gives 0', () => {
  fieldReset(4);
  const rot = placeEnemy({ fn: K.MATRIX, hp: 30, matrix: [0, -1, 1, 0], x: 200, y: 300 });
  const shear = placeEnemy({ fn: K.MATRIX, hp: 30, matrix: [1, -1.5, 0, 1], x: 250, y: 300 });
  const swap = placeEnemy({ fn: K.MATRIX, hp: 30, matrix: [0, 1, 1, 0], x: 225, y: 340 });
  closeCircle(225, 315, 80);
  assert.equal(rot.alive, false); assert.equal(shear.alive, false); assert.equal(swap.alive, true);
  assert.equal(t.loop.text, '∮ 한 번에 2개 = 0\n∇×F = ∇·F = 0 → ∮ = 0');
  closeCircle(swap.x, swap.y, 30); assert.equal(t.loop.text, '∇×F = ∇·F = 0 → ∮ = 0');
});
check('projection P deletes straight drops (ker P) and lays slanted bullets flat', () => {
  reset(); t.game.maxPhase = 6; t.player.weapon = 4; t.player.focus = true; t.keys.add('KeyZ');
  const drop = t.bullet(t.player.x, t.player.y - 100, Math.PI / 2, 100);
  const slant = t.bullet(t.player.x + 20, t.player.y - 120, Math.PI / 2 - .9, 100);
  const speed = slant.speed;
  t.fireShots(t.STEP);
  assert.equal(t.bullets.count, 1); assert.equal(t.bullets.items[0], slant);
  assert.equal(slant.angle, 0); assert.equal(slant.kind, 1); near(slant.speed, speed * Math.cos(Math.PI / 2 - .9));
  assert.equal(t.player.proj, true);
  for (let i = 0; i < 180; i++) t.fireShots(t.STEP);
  assert.equal(t.player.plock, true, 'three seconds of P empties the gauge');
  t.keys.delete('KeyZ'); for (let i = 0; i < 100; i++) t.fireShots(t.STEP);
  assert.equal(t.player.plock, true, 'refilling to .35 takes 1.75 s');
  for (let i = 0; i < 10; i++) t.fireShots(t.STEP);
  assert.equal(t.player.plock, false); assert.ok(t.player.pgauge >= .35);
});
check('boss 5: rings obey dx/dt = A(x − x₀); shots bend near it unless A⁻¹, and det A = 0 bends nothing', () => {
  bossReset(4); t.game.bodyIndex = 0; t.boss.x = 300; t.boss.y = 150;
  const b = t.bullet(330, 200, 0, 100, 7); b.ox = 300; b.oy = 200;
  t.updateBullets(t.STEP);
  const k = t.difficulties.easy.speed / 60;
  near(b.x - 330, (.3 * 30) * k, 1e-6); near(b.y - 200, (1 * 30) * k, 1e-6);
  const hp = t.boss.hp; placeShot({ x: 300, y: 400 });
  for (let i = 0; i < 30; i++) t.updateShots(t.STEP);
  assert.equal(t.boss.hp, hp, 'the d/dx needle was turned by A');
  placeShot({ x: 300, y: 400, op: O.INV }); for (let i = 0; i < 30; i++) t.updateShots(t.STEP);
  near(hp - t.boss.hp, 3 * 1.4);
  t.game.bodyIndex = 3; const before = t.boss.hp; placeShot({ x: 300, y: 400 }); for (let i = 0; i < 30; i++) t.updateShots(t.STEP);
  near(before - t.boss.hp, 3, 1e-9);
  t.game.bodyIndex = 1; const saddle = t.boss.hp; closeCircle(300, 150, 60); assert.equal(t.boss.hp, saddle, 'the saddle is symmetric and traceless');
});
check('ℱ splits sin into two spectral lines; d/dx only turns sin → cos → −sin → −cos → sin', () => {
  fieldReset(5); const e = placeEnemy({ fn: K.SIN, hp: 10 });
  const seen = [];
  for (let i = 0; i < 4; i++) { t.damageEnemy(0, 10, O.D); seen.push(t.enemyText(e)); }
  assert.deepEqual(seen, ['cos x', '−sin x', '−cos x', 'sin x']); assert.ok(e.alive);
  assert.equal(t.damageEnemy(0, 1, O.FT), true); assert.equal(e.alive, false);
  const lines = t.enemies.items.slice(0, t.enemies.count);
  assert.equal(lines.length, 2); assert.ok(lines.every(d => d.fn === K.DELTA)); assert.ok(noteSeen('ℱ{sin x} → δ(ω ± 1)'));
  t.damageEnemy(0, 2, O.D); t.damageEnemy(0, 2, O.D); assert.equal(t.enemies.count, 0);
});
check('the Gaussian is a fixed point of ℱ and outlives derivatives; only ∂/∂y clears it', () => {
  fieldReset(5); const g = placeEnemy({ fn: K.GAUSS, hp: 60 });
  assert.equal(t.damageEnemy(0, 100, O.FT), false); assert.equal(t.damageEnemy(0, 100, O.D), false); assert.equal(g.hp, 60);
  t.damageEnemy(0, 61, O.P); assert.equal(g.alive, false);
});
check('a Laplace pole 1/(s − 1): derivatives bounce, ∮ takes its residue, ℒ⁻¹ turns it into eᵗ', () => {
  fieldReset(5); const p = placeEnemy({ fn: K.POLE, hp: 30, x: 200, y: 300 });
  assert.equal(t.damageEnemy(0, 99, O.D), false); assert.equal(t.damageEnemy(0, 99, O.P), false); assert.ok(p.alive);
  closeCircle(200, 300, 40); assert.equal(p.alive, false);
  const q = placeEnemy({ fn: K.POLE, hp: 30 });
  t.damageEnemy(0, 1, O.FT); assert.equal(q.fn, K.EXP); assert.equal(t.enemyText(q), 'eˣ');
  assert.equal(t.damageEnemy(0, 999, O.D), false, 'and now only ∂/∂y works');
});
check('boss 6: one pole gives 2πi·Res, the two poles of 1/(z² + 1) cancel, the core alone gives 0', () => {
  bossReset(5); t.game.bodyIndex = 0; t.game.phaseTime = 10; t.placePoles();
  const px = t.poleXY[0], py = t.poleXY[1], qx = t.poleXY[4], qy = t.poleXY[5];
  near(Math.hypot(px - t.boss.x, py - t.boss.y), 95, 1e-4);
  let hp = t.boss.hp; closeCircle(px, py, 30); near(hp - t.boss.hp, 2 * Math.PI * .5 * 110, 1e-6);
  hp = t.boss.hp; closeCircle(t.boss.x, t.boss.y, 140); assert.equal(t.boss.hp, hp); assert.match(t.loop.text, /상쇄/);
  hp = t.boss.hp; closeCircle(t.boss.x, t.boss.y, 40); assert.equal(t.boss.hp, hp); assert.match(t.loop.text, /코시/);
  t.game.bodyIndex = 1; t.placePoles(); hp = t.boss.hp; closeCircle(t.boss.x, t.boss.y, 140); near(hp - t.boss.hp, 900, 1e-6);
  assert.ok(qx !== px || qy !== py);
  hp = t.boss.hp; t.damageBoss(100, O.D); near(hp - t.boss.hp, 40);
});
check('boss 6: the circle C picks up the residue of the pole it holds', () => {
  bossReset(5); t.game.bodyIndex = 0; t.game.phaseTime = 0; t.placePoles();
  t.player.x = t.poleXY[0]; t.player.y = t.poleXY[1] + 20; t.player.focus = true; t.player.weapon = 3; t.game.maxPhase = 6; t.keys.add('KeyZ');
  const hp = t.boss.hp; for (let i = 0; i < 60; i++) t.fireShots(t.STEP);
  near(hp - t.boss.hp, 2 * Math.PI * .5 * 28, 1e-6);
});
check('𝔼: Brownian motion averages to 0, Sₜ becomes eˣ, a Poisson count becomes λx', () => {
  fieldReset(6); const w = placeEnemy({ fn: K.BROWN, hp: 1 });
  for (const op of [O.D, O.P, O.G, O.FT]) assert.equal(t.damageEnemy(0, 99, op), false);
  assert.ok(noteSeen('Wₜ는 어디서도 미분 불가능'));
  t.damageEnemy(0, 1, O.E); assert.equal(w.alive, false); assert.ok(noteSeen('𝔼[Wₜ] = 0'));
  const s = placeEnemy({ fn: K.GBM, hp: 1 }); t.damageEnemy(0, 1, O.E); assert.equal(s.fn, K.EXP);
  assert.equal(t.damageEnemy(0, 999, O.D), false); t.damageEnemy(0, 999, O.P); assert.equal(s.alive, false);
  const n = placeEnemy({ fn: K.POIS, hp: 1 }); t.damageEnemy(0, 1, O.E); assert.equal(t.enemyText(n), '4x');
  t.damageEnemy(0, n.max, O.D); assert.equal(t.enemyText(n), '4'); t.damageEnemy(0, n.max, O.D); assert.equal(n.alive, false);
});
check('geometric trials are memoryless coin flips; hypergeometric draws end by the last card', () => {
  const originalRandom = Math.random;
  try {
    fieldReset(6); const g = placeEnemy({ fn: K.GEOM, hp: 1 });
    Math.random = () => .99;
    for (let i = 0; i < 30; i++) { t.damageEnemy(0, 1, O.D); g.trial = 0; }
    assert.ok(g.alive); assert.equal(g.p, 30);
    t.damageEnemy(0, 1, O.D); t.damageEnemy(0, 1, O.D); assert.equal(g.p, 31, 'trials are throttled while touching');
    g.trial = 0; Math.random = () => .01; t.damageEnemy(0, 1, O.D); assert.equal(g.alive, false);
    const h = placeEnemy({ fn: K.HYPER, hp: 1, mark: 1 << 6 | 1 << 7 });
    Math.random = () => 0; let draws = 0;
    while (h.alive && draws < 20) { t.damageEnemy(0, 1, O.D); h.trial = 0; draws++; }
    assert.equal(draws, 8, 'the worst case draws every card once');
    const two = placeEnemy({ fn: K.HYPER, hp: 1, mark: 1 << 6 | 1 << 7 }); draws = 0;
    while (two.alive && draws < 20) { t.damageEnemy(0, 1, O.E); two.trial = 0; draws++; }
    assert.equal(draws, 4, '𝔼 draws two cards per trial');
  } finally { Math.random = originalRandom; }
});
check('reaction–diffusion: Fisher fronts spread, heat decays, shots and the bomb wipe u', () => {
  bossReset(6); t.boss.x = -500; t.game.bodyIndex = 1; t.conc.fill(0);
  const mid = 16 * t.GX + 15; t.conc[mid] = 1; t.conc[mid + 1] = 1; t.conc[mid + t.GX] = 1; t.conc[mid + t.GX + 1] = 1;
  const covered = () => t.conc.reduce((n, u) => n + (u > .5), 0), mass = () => t.conc.reduce((a, u) => a + u, 0);
  for (let i = 0; i < 600; i++) t.stepConcentration(t.STEP);
  assert.equal(covered(), 0, 'the seed first thins out by diffusion');
  for (let i = 0; i < 600; i++) t.stepConcentration(t.STEP);
  assert.ok(covered() > 300, `then logistic growth takes over: ${covered()} cells after 20 s`);
  t.game.bodyIndex = 0; const hot = mass(); for (let i = 0; i < 600; i++) t.stepConcentration(t.STEP); assert.ok(mass() < hot * .2);
  t.conc.fill(1); const s = placeShot({ x: 305, y: 400, speed: 0 }); t.updateShots(t.STEP);
  const cell = Math.floor((400 - t.GRID_TOP) / t.CELL) * t.GX + Math.floor(305 / t.CELL); near(t.conc[cell], 1 - .12, 1e-6); assert.ok(s);
  t.game.bomb = 2; for (let i = 0; i < 90; i++) t.stepConcentration(t.STEP); t.game.bomb = 0;
  assert.ok(mass() < 60, `bomb leaves ${mass().toFixed(1)}`);
});
check('reaction–diffusion boss: dense cells spawn bullets but never right on the pen', () => {
  bossReset(6); t.conc.fill(1); t.game.emit = 0; t.game.spawn = 99; t.game.aimed = 99; t.game.seed = 99; t.bullets.clear();
  for (let i = 0; i < 30; i++) t.updateBoss(t.STEP);
  assert.ok(t.bullets.count > 0);
  for (let i = 0; i < t.bullets.count; i++) { const b = t.bullets.items[i]; assert.ok(Math.hypot(b.ox - t.player.x, b.oy - t.player.y) >= 70 || b.age > 0); }
});
check('epsilon-delta slowdown matches formula and minimum speed', () => {
  for (const [distance, factor] of [[60, .25], [10, .15], [200, 1]]) {
    reset(); t.player.invuln = 10; t.bullet(t.player.x + distance, t.player.y, 0, 100);
    const b = t.bullets.items[0], before = b.x; t.updateBullets(t.STEP); near(b.x - before, 100 * t.difficulties.easy.speed * factor / 60);
  }
});
check('eˣ bullets accelerate as v₀·e^(1.25t), capped at five times', () => {
  reset(); t.player.invuln = 10; t.bullet(100, 100, 0, 40, 4); const b = t.bullets.items[0];
  for (let i = 0; i < 60; i++) t.updateBullets(t.STEP);
  const v = (b.x - b.px) * 60; near(v, 40 * t.difficulties.easy.speed * Math.exp(1.25 * b.age));
  for (let i = 0; i < 120; i++) t.updateBullets(t.STEP);
  near((b.x - b.px) * 60, 40 * t.difficulties.easy.speed * 5);
});
check('graze is counted once and produces sparks', () => {
  reset(); t.bullet(t.player.x + 15, t.player.y, 0, 0); t.updateBullets(t.STEP); t.updateBullets(t.STEP);
  assert.equal(t.game.graze, 1); assert.equal(t.game.lives, 3); assert.equal(t.game.score, 100); assert.equal(t.particles.count, 4);
});
check('swept collision catches high-speed lasers between frames', () => {
  reset(); t.bullet(t.player.x, t.player.y + 22, -Math.PI / 2, 3000, 2); t.updateBullets(t.STEP);
  assert.equal(t.game.lives, 2); assert.ok(t.player.invuln >= 2.5);
  t.bullet(t.player.x, t.player.y, 0, 0); t.updateBullets(t.STEP); assert.equal(t.game.lives, 2);
});
check('death cancellation keeps pool entries unique and counts valid', () => {
  reset(); for (let j = 0; j < 60; j++) t.bullet(t.player.x + j, t.player.y, 0, 0);
  t.updateBullets(t.STEP); assert.equal(t.game.lives, 2); assert.equal(t.bullets.count, 0);
  tick(20); assert.equal(new Set(t.bullets.items).size, 5000);
});
check('bomb consumes once, grants two seconds and converts bullets to score', () => {
  reset(); t.bullet(t.player.x + 60, t.player.y, 0, 0); t.bomb(); t.bomb();
  assert.equal(t.game.bombs, 3); near(t.player.invuln, 2); near(t.game.bomb, 2);
  tick(40); assert.equal(t.bullets.count, 0); assert.ok(t.game.score >= 25); assert.ok(t.player.invuln > 1.3);
  tick(82); assert.equal(t.game.bomb, 0);
});
check('boss 1 differentiates x³ − 3x as HP falls and its aimed fan loses two prongs each time', () => {
  const counts = [];
  for (const [fraction, body] of [[1, 'x³ − 3x'], [.7, '3x² − 3'], [.4, '6x'], [.1, '6']]) {
    reset(); t.boss.hp = t.boss.max * fraction; t.game.aimed = 0; t.updateBoss(t.STEP);
    assert.equal(t.spells[0].bodies[t.game.bodyIndex][0], body); counts.push(t.bullets.count);
  }
  assert.deepEqual(counts, [9, 7, 5, 3]);
});
check('rose pattern fires signed r=cos(kθ) geometry', () => {
  reset(); t.beginPhase(1); t.game.transition = 0; t.game.rose = 0; t.game.phaseTime = 2; t.updateBoss(t.STEP);
  assert.equal(t.bullets.count, Math.round(67 * t.difficulties.easy.density)); assert.equal(t.game.pattern, 'A');
  let rmax = 0; for (let i = 0; i < t.bullets.count; i++) rmax = Math.max(rmax, Math.hypot(t.bullets.items[i].x - t.boss.x, t.bullets.items[i].y - t.boss.y)); near(rmax, 80);
});
check('tangent derivative, 0.5s telegraph and orthogonal firing', () => {
  reset(); t.beginPhase(1); t.game.transition = 0; t.game.phaseTime = 9; t.game.tangent = 0; t.updateBoss(t.STEP);
  assert.equal(t.game.pattern, 'B'); assert.equal(t.warnings.count, 1);
  const w = t.warnings.items[0]; near(Math.tan(w.angle), 62 * .014 * Math.cos(.014 * (t.boss.x - 300)));
  t.updateWarnings(.49); assert.equal(t.bullets.count, 0); t.updateWarnings(.011); assert.equal(t.bullets.count, 4);
  near(t.bullets.items[1].angle - t.bullets.items[0].angle, Math.PI / 2);
});
check('opposite charges turn by q B Δt; magnetic field changes sign', () => {
  reset(); t.game.B = 1.15; t.player.invuln = 10;
  t.bullet(100, 200, 0, 100, 3, '#d23b2e', 4, 1); t.bullet(100, 200, 0, 100, 3, '#2a4fb4', 4, -1);
  t.updateBullets(t.STEP); near(t.bullets.items[0].angle, 1.15 / 60); near(t.bullets.items[1].angle, -1.15 / 60);
  t.beginPhase(2); t.game.transition = 0; t.game.phaseTime = 2; t.updateBoss(t.STEP); assert.ok(t.game.B > 0);
  t.game.phaseTime = 6; t.updateBoss(t.STEP); assert.ok(t.game.B < 0);
});
check('boss 3 turns into eˣ for 5 of every 12 s: d/dx and ∇ bounce, ∂/∂y hits harder', () => {
  reset(); t.beginPhase(2); t.game.transition = 0;
  t.game.phaseTime = 7; t.updateBoss(t.STEP); assert.equal(t.game.armor, false); assert.equal(t.game.bodyIndex, 0);
  t.game.phaseTime = 9; t.updateBoss(t.STEP); assert.equal(t.game.armor, true); assert.equal(t.spells[2].bodies[t.game.bodyIndex][0], 'eˣ');
  const hp = t.boss.hp;
  assert.equal(t.damageBoss(100, 0), false); assert.equal(t.damageBoss(100, 2), false); assert.equal(t.boss.hp, hp);
  assert.equal(t.damageBoss(100, 1), true); near(t.boss.hp, hp - 135);
  t.bomb(); t.game.phaseTime = 9; t.player.invuln = 100; t.update(t.STEP); near(t.boss.hp, hp - 135);
  t.game.phaseTime = 14; t.updateBoss(t.STEP); assert.equal(t.game.armor, false); t.game.bomb = 0; t.damageBoss(100, 0); near(t.boss.hp, hp - 235);
});
check('every operator damages the first boss through real shots', () => {
  for (const [weapon, focus] of [[0, false], [0, true], [1, true], [2, false], [2, true], [4, false], [5, false], [5, true], [6, false], [6, true]]) {
    reset(); t.game.maxPhase = 6; t.player.weapon = weapon; t.player.focus = focus; t.boss.x = t.player.x; t.boss.y = 150; t.keys.add('KeyZ');
    for (let i = 0; i < 120; i++) { t.fireShots(t.STEP); t.updateShots(t.STEP); }
    assert.ok(t.boss.hp < t.boss.max, `weapon ${weapon} focus ${focus}`);
  }
});
check('HP depletion clears bullets and advances all seven spells', () => {
  reset(); for (let i = 0; i < 7; i++) {
    t.beginPhase(i); t.game.transition = 0; t.bullet(20, 20, 0, 0); t.boss.hp = 0; t.update(t.STEP); assert.equal(t.bullets.count, 0);
    if (i < 6) { assert.equal(t.game.phase, i + 1); assert.equal(t.game.segment, 'field'); }
  }
  assert.equal(t.game.mode, 'clear'); assert.equal(t.game.captured, 7); assert.ok(t.game.high > 0);
  assert.equal(elements.get('overlay').dataset.state, 'clear');
});
check('starting from a later chapter is practice: tools up to it, no record written', () => {
  storage.clear(); t.game.high = 0; t.game.difficulty = 'easy'; t.game.runMode = 'limited'; t.game.startChapter = 4; t.start();
  assert.equal(t.game.phase, 4); assert.equal(t.game.segment, 'field'); assert.equal(t.game.practice, true); assert.equal(t.player.weapon, 4);
  key('Digit4'); assert.equal(t.player.weapon, 3); key('Digit6'); assert.equal(t.player.weapon, 3, 'ℱ belongs to chapter 6');
  t.game.score = 123456; t.game.lives = 1; t.player.invuln = 0; t.hit(); assert.equal(t.game.mode, 'over');
  assert.equal(storage.get('axiom-high'), undefined); assert.equal(t.game.high, 0);
  t.game.startChapter = 0;
});
check('timeout advances without awarding a spell capture', () => {
  reset(); t.game.phaseTime = 66.3; t.update(t.STEP); assert.equal(t.game.phase, 1); assert.equal(t.game.segment, 'field'); assert.equal(t.game.captured, 0);
});
check('pause, focus loss, game over and restart are usable', () => {
  reset(); key('KeyP'); assert.equal(t.game.mode, 'paused'); const before = t.game.t;
  t.frame(1000); t.frame(2000); near(t.game.t, before); key('Escape'); assert.equal(t.game.mode, 'playing');
  key('ArrowRight'); events.get('blur')(); assert.equal(t.game.mode, 'paused'); assert.equal(t.keys.size, 0); key('Enter');
  t.game.lives = 1; t.player.invuln = 0; t.hit(); assert.equal(t.game.mode, 'over'); key('KeyZ'); assert.equal(t.game.mode, 'playing'); assert.equal(t.game.lives, 3); assert.equal(t.game.score, 0);
});
check('four difficulties change density, speed, HP and bombs while keeping three lives', () => {
  const measurements = [];
  for (const name of ['easy','normal','hard','insane']) {
    t.game.difficulty = name; t.start(); t.beginPhase(0); t.game.transition = 0;
    assert.equal(t.game.lives, 3); assert.equal(t.game.bombs, t.difficulties[name].bombs);
    t.bullet(100, 100, 0, 100); measurements.push({ speed: t.bullets.items[0].speed, hp: t.boss.hp });
  }
  for (let i = 1; i < 4; i++) { assert.ok(measurements[i].speed > measurements[i - 1].speed); assert.ok(measurements[i].hp > measurements[i - 1].hp); }
  // v1 numbers for reference: normal speed .85, density .78, rate .88.
  assert.ok(t.difficulties.normal.speed > .85 && t.difficulties.normal.density > .78 && t.difficulties.normal.rate > .88);
});
check('field arrivals follow each chapter roster', () => {
  const expected = [[0, 6, [1, 2]], [1, 4, [2, 3]], [2, 3, [3, 4]]];
  for (const [stage, every, degrees] of expected) {
    fieldReset(stage); for (let i = 0; i < 12; i++) t.spawnFieldEnemy();
    const list = t.enemies.items.slice(0, t.enemies.count);
    list.forEach((e, n) => assert.equal(e.fn, n % every === every - 2 ? 1 : 0, `stage ${stage} arrival ${n}`));
    assert.deepEqual([...new Set(list.filter(e => !e.fn).map(e => e.deg))].sort(), degrees);
  }
  assert.ok(t.game.expSeen);
  for (let stage = 3; stage < 7; stage++) {
    fieldReset(stage); const roster = t.fields[stage].roster; for (let i = 0; i < roster.length; i++) t.spawnFieldEnemy();
    t.enemies.items.slice(0, t.enemies.count).forEach((e, n) => { assert.equal(e.fn, t.SPECS[roster[n]].fn, `stage ${stage} arrival ${n}`); assert.equal(e.type, stage); });
  }
});
check('all seven field waves create distinct attacks', () => {
  for (let phase = 0; phase < 7; phase++) {
    fieldReset(phase); tick(300); assert.equal(t.game.segment, 'field'); assert.ok(t.enemies.count > 0); assert.ok(t.bullets.count > 0, `field ${phase + 1}`);
    assert.ok(t.enemies.items.slice(0, t.enemies.count).some(e => e.type === phase));
    const kinds = new Set(t.bullets.items.slice(0, t.bullets.count).map(b => b.kind));
    if (phase === 3) assert.ok(kinds.has(9), 'vortices fire curling bullets');
    if (phase === 5) assert.ok(kinds.has(10), 'sines fire weaving bullets');
  }
  near(t.weierstrass(0), 1 + .5 + .25 + .125 + .0625);
  fieldReset(2); t.game.phaseTime = t.fields[2].duration + 1; t.update(t.STEP); assert.equal(t.game.segment, 'boss'); assert.equal(t.game.phase, 2);
});
check('shield pickup blocks one hit; the d²/dx² lance erases bullets but still bounces off eˣ', () => {
  reset(); t.spawnItem(t.player.x, t.player.y - 10, 0); t.updateItems(t.STEP);
  assert.equal(t.items.count, 0); assert.equal(t.player.shield, 1);
  t.hit(); assert.equal(t.game.lives, 3); assert.equal(t.player.shield, 0);
  t.player.invuln = 0; t.spawnItem(t.player.x, t.player.y - 10, 1); t.updateItems(t.STEP);
  assert.ok(t.player.lance > 0); t.player.weapon = 1; t.keys.add('KeyZ'); t.fireShots(t.STEP); assert.ok(liveShots(2).length > 0, 'lance overrides any weapon');
  t.bullet(t.player.x, t.player.y - 42, 0, 0); t.updateShots(t.STEP); assert.equal(t.bullets.count, 0);
  fieldReset(); const e = placeEnemy({ fn: 1, hp: 30 }); placeShot({ x: 300, y: 330, speed: 940, kind: 2, damage: 24 });
  t.updateShots(t.STEP); assert.equal(e.hp, 30); assert.equal(t.shots.count, 0);
});
check('24 grazes integrate into a shield and V freezes nearby bullets', () => {
  reset(); for (let i = 0; i < 24; i++) t.bullet(t.player.x + 15, t.player.y, 0, 0);
  t.updateBullets(t.STEP); assert.equal(t.game.graze, 24); assert.equal(t.game.integral, 0); assert.equal(t.player.shield, 1);
  reset(); t.bullet(t.player.x + 70, t.player.y, 0, 120); const b = t.bullets.items[0], before = b.x;
  key('KeyV'); t.updateBullets(t.STEP); near(b.x, before); near(t.game.freeze, 2);
  t.freezeBullets(); near(t.game.freezeCooldown, 14); t.game.freeze = 0; t.updateBullets(t.STEP); assert.ok(b.x > before);
});
check('item timing, type and field drops are random and active effects block new drops', () => {
  const originalRandom = Math.random;
  try {
    reset(); t.game.dropTimer = 0; Math.random = () => .99; t.updateItems(t.STEP);
    assert.equal(t.items.count, 0); assert.ok(t.game.dropTimer >= 18 && t.game.dropTimer <= 30);

    t.game.dropTimer = 0; Math.random = () => .01; t.updateItems(t.STEP);
    assert.equal(t.items.count, 1); assert.equal(t.items.items[0].type, 0);
    t.items.clear(); Math.random = () => .99; t.spawnItem(100, 100); assert.equal(t.items.items[0].type, 1);

    t.items.clear(); t.player.shield = 1; t.game.dropTimer = 0; Math.random = () => 0; t.updateItems(t.STEP);
    assert.equal(t.items.count, 0);

    function defeatEnemy(randomValue) {
      t.game.segment = 'field'; t.game.dropTimer = 20;
      placeEnemy({ x: 100, y: 100, hp: 1 });
      placeShot({ x: 100, y: 100, speed: 0, angle: 0, damage: 2 });
      Math.random = () => randomValue; t.updateShots(t.STEP);
    }
    t.player.shield = 0; defeatEnemy(.99); assert.equal(t.items.count, 0);
    defeatEnemy(0); assert.equal(t.items.count, 1);
  } finally { Math.random = originalRandom; }
});
check('continue mode resumes the same stage; limited mode ends after three lives', () => {
  reset(); t.game.runMode = 'continue'; t.game.score = 1234; t.boss.hp = 500; t.game.lives = 1; t.hit();
  assert.equal(t.game.mode, 'continue'); t.continueRun(); assert.equal(t.game.mode, 'playing'); assert.equal(t.game.lives, 3);
  assert.equal(t.game.score, 1234); assert.equal(t.boss.hp, 500); assert.equal(t.game.continues, 1);
  reset(); t.game.lives = 1; t.hit(); assert.equal(t.game.mode, 'over');
});
check('long simulation of every stage with every weapon stays finite within fixed pools', () => {
  const pools = [t.bullets, t.shots, t.particles, t.warnings, t.enemies, t.items, t.labels];
  for (let phase = 0; phase < 14; phase++) {
    const index = phase % 7, field = phase < 7;
    if (field) fieldReset(index); else bossReset(index);
    t.game.maxPhase = 6; t.keys.add('KeyZ');
    for (let i = 0; i < 3000; i++) {
      t.player.invuln = 10;
      if (i % 200 === 0) t.switchWeapon();
      if (i % 300 === 0) { if (t.keys.has('ShiftLeft')) t.keys.delete('ShiftLeft'); else t.keys.add('ShiftLeft'); }
      // Sweep the pen in a wide loop so ∮ closes curves too.
      if (i % 3 === 0) { const a = i / 40; t.player.x = 300 + 150 * Math.cos(a); t.player.y = 420 + 120 * Math.sin(a); }
      t.update(t.STEP); if (i % 120 === 0) t.render();
      if (t.game.segment !== (field ? 'field' : 'boss')) break;
      for (const pool of pools) assert.ok(pool.count >= 0 && pool.count <= pool.items.length);
    }
    for (const b of t.bullets.items.slice(0, t.bullets.count)) assert.ok(Number.isFinite(b.x + b.y + b.angle + b.speed));
    for (const s of t.shots.items.slice(0, t.shots.count)) assert.ok(Number.isFinite(s.x + s.y + s.angle));
    for (const e of t.enemies.items.slice(0, t.enemies.count)) assert.ok(Number.isFinite(e.x + e.y + e.hp));
    assert.ok(t.conc.every(Number.isFinite));
    assert.equal(new Set(t.bullets.items).size, 5000);
    console.log(`  ${field ? 'Field' : 'Spell'} ${index + 1}: live ${t.bullets.count}, pool peak ${t.bullets.peak}/5000, kills ${t.game.enemyKills}, boss hp ${field ? '-' : Math.round(t.boss.hp)}`);
  }
});
console.log(`\n${passed} checks passed.`);
