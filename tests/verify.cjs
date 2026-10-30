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
vm.runInContext(source.replace(marker, '\n  globalThis.testGame={game,player,boss,bullets,shots,particles,warnings,enemies,items,labels,fields,spells,difficulties,keys,start,beginField,beginPhase,finishField,finishPhase,hit,bomb,freezeBullets,switchWeapon,continueRun,pause,bullet,spawnItem,spawnFieldEnemy,damageEnemy,damageBoss,enemyText,updateItems,updateField,fireShots,weierstrass,update,updateBoss,updateBullets,updateShots,updateWarnings,render,frame,STEP,HOMING_COOLDOWN,OVERHEAT_LOCK};' + marker), sandbox);
const t = sandbox.testGame;
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} ≈ ${b}`);
let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`PASS ${name}`); }
function reset() { t.game.difficulty = 'easy'; t.game.runMode = 'limited'; t.start(); t.beginPhase(0); t.game.transition = 0; t.player.invuln = 0; }
function fieldReset(stage = 0) { t.game.difficulty = 'easy'; t.start(); t.beginField(stage); t.game.transition = 0; t.player.invuln = 100; }
function tick(frames) { for (let i = 0; i < frames; i++) t.update(t.STEP); }
function key(code, type = 'keydown', repeat = false) { events.get(type)({ code, repeat, preventDefault: noop }); }
function liveShots(kind) { return t.shots.items.slice(0, t.shots.count).filter(s => kind === undefined || s.kind === kind); }
function placeEnemy(props) {
  const e = t.enemies.take();
  Object.assign(e, { x: 300, y: 300, baseX: 300, baseY: 300, age: 0, fire: 99, seed: 0, type: 0, fn: 0, deg: 0, coef: 1, pd: 0, flash: 0, immune: 0, alive: true, id: 9000 + t.enemies.count }, props);
  if (props.hp !== undefined && props.max === undefined) e.max = props.hp;
  return e;
}

check('single self-contained 800×700 document', () => {
  assert.match(html, /width="800" height="700"/);
  assert.doesNotMatch(html, /<(?:script|img|link)[^>]+(?:src|href)=/i);
  assert.doesNotMatch(html, /fetch\s*\(|XMLHttpRequest|TODO/);
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
  assert.ok(t.labels.items.slice(0, t.labels.count).some(l => l.text === '= 0'));
});
check('eˣ ignores d/dx and ∇ but the focused ∂/∂y laser annihilates it', () => {
  fieldReset(); const e = placeEnemy({ fn: 1, hp: 50 });
  assert.equal(t.damageEnemy(0, 30, 0), false); assert.equal(t.damageEnemy(0, 30, 2), false); assert.equal(e.hp, 50);
  assert.ok(t.labels.items.slice(0, t.labels.count).some(l => l.text === 'd/dx eˣ = eˣ'));
  t.player.x = 300; t.player.y = 600; t.player.focus = true; t.player.weapon = 1; t.keys.add('KeyZ');
  let frames = 0; while (t.enemies.count && frames < 120) { t.fireShots(t.STEP); frames++; }
  assert.equal(t.enemies.count, 0); assert.ok(frames >= 29 && frames <= 31, `${frames} frames at 100 dps`);
  assert.ok(t.labels.items.slice(0, t.labels.count).some(l => l.text === '∂/∂y = 0'));
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
check('homing beams ignore eˣ while choosing a target', () => {
  fieldReset(); const exp = placeEnemy({ fn: 1, hp: 50, x: 300, y: 520 }); const poly = placeEnemy({ deg: 1, hp: 500, x: 120, y: 200 });
  t.player.weapon = 2; t.keys.add('KeyZ'); t.fireShots(t.STEP);
  const beam = liveShots(1)[0]; const before = Math.hypot(beam.x - poly.x, beam.y - poly.y);
  for (let i = 0; i < 20; i++) t.updateShots(t.STEP);
  assert.ok(Math.hypot(beam.x - poly.x, beam.y - poly.y) < before); assert.equal(exp.hp, 50);
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
check('every operator damages the boss through real shots', () => {
  for (const [weapon, focus] of [[0, false], [0, true], [1, true], [2, false], [2, true]]) {
    reset(); t.player.weapon = weapon; t.player.focus = focus; t.boss.x = t.player.x; t.boss.y = 150; t.keys.add('KeyZ');
    for (let i = 0; i < 120; i++) { t.fireShots(t.STEP); t.updateShots(t.STEP); }
    assert.ok(t.boss.hp < t.boss.max, `weapon ${weapon} focus ${focus}`);
  }
});
check('HP depletion clears bullets and advances all three spells', () => {
  reset(); for (let i = 0; i < 3; i++) {
    t.beginPhase(i); t.game.transition = 0; t.bullet(20, 20, 0, 0); t.boss.hp = 0; t.update(t.STEP); assert.equal(t.bullets.count, 0);
    if (i < 2) { assert.equal(t.game.phase, i + 1); assert.equal(t.game.segment, 'field'); }
  }
  assert.equal(t.game.mode, 'clear'); assert.equal(t.game.captured, 3); assert.ok(t.game.high > 0);
  assert.equal(elements.get('overlay').dataset.state, 'clear');
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
check('field arrivals: every k-th is eˣ and monomial degree rises by stage', () => {
  const expected = [[0, 6, [1, 2]], [1, 4, [2, 3]], [2, 3, [3, 4]]];
  for (const [stage, every, degrees] of expected) {
    fieldReset(stage); for (let i = 0; i < 12; i++) t.spawnFieldEnemy();
    const list = t.enemies.items.slice(0, t.enemies.count);
    list.forEach((e, n) => assert.equal(e.fn, n % every === every - 2 ? 1 : 0, `stage ${stage} arrival ${n}`));
    assert.deepEqual([...new Set(list.filter(e => !e.fn).map(e => e.deg))].sort(), degrees);
  }
  assert.ok(t.game.expSeen);
});
check('modulo, tanh and Weierstrass field waves create distinct attacks', () => {
  for (let phase = 0; phase < 3; phase++) {
    fieldReset(phase); tick(250); assert.equal(t.game.segment, 'field'); assert.ok(t.enemies.count > 0); assert.ok(t.bullets.count > 0);
    assert.ok(t.enemies.items.slice(0, t.enemies.count).some(e => e.type === phase));
  }
  near(t.weierstrass(0), 1 + .5 + .25 + .125 + .0625);
  t.game.phaseTime = t.fields[2].duration + 1; t.update(t.STEP); assert.equal(t.game.segment, 'boss'); assert.equal(t.game.phase, 2);
});
check('shield pickup blocks one hit; the d²/dx² lance erases bullets but still bounces off eˣ', () => {
  reset(); t.spawnItem(t.player.x, t.player.y - 10, 0); t.updateItems(t.STEP);
  assert.equal(t.items.count, 0); assert.equal(t.player.shield, 1);
  t.hit(); assert.equal(t.game.lives, 3); assert.equal(t.player.shield, 0);
  t.player.invuln = 0; t.spawnItem(t.player.x, t.player.y - 10, 1); t.updateItems(t.STEP);
  assert.ok(t.player.lance > 0); t.player.weapon = 1; t.keys.add('KeyZ'); t.fireShots(t.STEP); assert.ok(liveShots(2).length > 0, 'lance overrides any weapon');
  t.bullet(t.player.x, t.player.y - 42, 0, 0); t.updateShots(t.STEP); assert.equal(t.bullets.count, 0);
  fieldReset(); const e = placeEnemy({ fn: 1, hp: 30 }); const s = t.shots.take();
  Object.assign(s, { x: 300, y: 330, px: 300, py: 330, angle: -Math.PI / 2, speed: 940, kind: 2, damage: 24, age: 0, op: 0 });
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
      const s = t.shots.take(); Object.assign(s, { x: 100, y: 100, px: 100, py: 100, angle: 0, speed: 0, kind: 0, damage: 2, age: 0, op: 0 });
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
  for (let phase = 0; phase < 6; phase++) {
    if (phase < 3) { fieldReset(phase); } else { reset(); t.beginPhase(phase - 3); t.game.transition = 0; }
    t.keys.add('KeyZ');
    for (let i = 0; i < 3000; i++) {
      t.player.invuln = 10;
      if (i % 200 === 0) t.switchWeapon();
      if (i % 300 === 0) { if (t.keys.has('ShiftLeft')) t.keys.delete('ShiftLeft'); else t.keys.add('ShiftLeft'); }
      t.update(t.STEP); if (i % 120 === 0) t.render();
      if (t.game.segment !== (phase < 3 ? 'field' : 'boss')) break;
      for (const pool of pools) assert.ok(pool.count >= 0 && pool.count <= pool.items.length);
    }
    for (const b of t.bullets.items.slice(0, t.bullets.count)) assert.ok(Number.isFinite(b.x + b.y + b.angle));
    for (const s of t.shots.items.slice(0, t.shots.count)) assert.ok(Number.isFinite(s.x + s.y + s.angle));
    assert.equal(new Set(t.bullets.items).size, 5000);
    console.log(`  ${phase < 3 ? 'Field' : 'Spell'} ${phase % 3 + 1}: live ${t.bullets.count}, pool peak ${t.bullets.peak}/5000, kills ${t.game.enemyKills}`);
  }
});
console.log(`\n${passed} checks passed.`);
