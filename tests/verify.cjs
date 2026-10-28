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
const context = new Proxy({ createLinearGradient: () => gradient, createRadialGradient: () => gradient }, {
  get(target, key) { return key in target ? target[key] : noop; },
  set(target, key, value) { target[key] = value; return true; }
});
const elements = new Map();
const events = new Map();
const documentEvents = new Map();
const storage = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, { hidden: false, textContent: '', getContext: () => context, focus: noop, addEventListener: noop });
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
vm.runInContext(source.replace(marker, '\n  globalThis.testGame={game,player,boss,bullets,shots,particles,warnings,enemies,items,fields,difficulties,keys,start,beginField,beginPhase,finishField,finishPhase,hit,bomb,freezeBullets,continueRun,pause,bullet,spawnItem,updateItems,updateField,fireShots,weierstrass,update,updateBoss,updateBullets,updateShots,updateWarnings,render,frame,STEP};' + marker), sandbox);
const t = sandbox.testGame;
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-7, `${a} ≈ ${b}`);
let passed = 0;
function check(name, fn) { fn(); passed++; console.log(`PASS ${name}`); }
function reset() { t.game.difficulty = 'easy'; t.game.runMode = 'limited'; t.start(); t.beginPhase(0); t.game.transition = 0; t.player.invuln = 0; }
function tick(frames) { for (let i = 0; i < frames; i++) t.update(t.STEP); }
function key(code, type = 'keydown', repeat = false) { events.get(type)({ code, repeat, preventDefault: noop }); }

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
check('epsilon-delta slowdown matches formula and minimum speed', () => {
  for (const [distance, factor] of [[60, .25], [10, .15], [200, 1]]) {
    reset(); t.player.invuln = 10; t.bullet(t.player.x + distance, t.player.y, 0, 100);
    const b = t.bullets.items[0], before = b.x; t.updateBullets(t.STEP); near(b.x - before, 100 * t.difficulties.easy.speed * factor / 60);
  }
});
check('graze is counted once and produces white sparks', () => {
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
  t.bullet(100, 200, 0, 100, 3, '#ff658d', 4, 1); t.bullet(100, 200, 0, 100, 3, '#75b5ff', 4, -1);
  t.updateBullets(t.STEP); near(t.bullets.items[0].angle, 1.15 / 60); near(t.bullets.items[1].angle, -1.15 / 60);
  t.beginPhase(2); t.game.transition = 0; t.game.phaseTime = 2; t.updateBoss(t.STEP); assert.ok(t.game.B > 0);
  t.game.phaseTime = 8; t.updateBoss(t.STEP); assert.ok(t.game.B < 0);
});
check('straight shots and homing missiles damage boss', () => {
  reset(); t.keys.add('KeyZ'); tick(180); assert.ok(t.shots.count > 0); assert.ok(t.boss.hp < t.boss.max);
  assert.ok(t.shots.items.slice(0, t.shots.count).some(s => s.kind === 1));
});
check('HP depletion clears bullets and advances all three spells', () => {
  reset(); for (let i = 0; i < 3; i++) {
    t.beginPhase(i); t.game.transition = 0; t.bullet(20, 20, 0, 0); t.boss.hp = 0; t.update(t.STEP); assert.equal(t.bullets.count, 0);
    if (i < 2) { assert.equal(t.game.phase, i + 1); assert.equal(t.game.segment, 'field'); }
  }
  assert.equal(t.game.mode, 'clear'); assert.equal(t.game.captured, 3); assert.ok(t.game.high > 0);
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
});
check('modulo, tanh and Weierstrass field waves create distinct attacks', () => {
  for (let phase = 0; phase < 3; phase++) {
    t.game.difficulty = 'easy'; t.start(); t.beginField(phase); t.game.transition = 0; t.player.invuln = 100;
    tick(250); assert.equal(t.game.segment, 'field'); assert.ok(t.enemies.count > 0); assert.ok(t.bullets.count > 0);
    assert.ok(t.enemies.items.slice(0, t.enemies.count).some(e => e.type === phase));
  }
  near(t.weierstrass(0), 1 + .5 + .25 + .125 + .0625);
  t.game.phaseTime = t.fields[2].duration + 1; t.update(t.STEP); assert.equal(t.game.segment, 'boss'); assert.equal(t.game.phase, 2);
});
check('shield pickup blocks one hit and lance destroys a bullet', () => {
  reset(); t.spawnItem(t.player.x, t.player.y - 10, 0); t.updateItems(t.STEP);
  assert.equal(t.items.count, 0); assert.equal(t.player.shield, 1);
  t.hit(); assert.equal(t.game.lives, 3); assert.equal(t.player.shield, 0);
  t.player.invuln = 0; t.spawnItem(t.player.x, t.player.y - 10, 1); t.updateItems(t.STEP);
  assert.ok(t.player.lance > 0); t.keys.add('KeyZ'); t.fireShots(t.STEP); assert.ok(t.shots.items.slice(0, t.shots.count).some(s => s.kind === 2));
  t.bullet(t.player.x, t.player.y - 42, 0, 0); t.updateShots(t.STEP); assert.equal(t.bullets.count, 0);
});
check('24 grazes integrate into a shield and C freezes nearby bullets', () => {
  reset(); for (let i = 0; i < 24; i++) t.bullet(t.player.x + 15, t.player.y, 0, 0);
  t.updateBullets(t.STEP); assert.equal(t.game.graze, 24); assert.equal(t.game.integral, 0); assert.equal(t.player.shield, 1);
  reset(); t.bullet(t.player.x + 70, t.player.y, 0, 120); const b = t.bullets.items[0], before = b.x;
  t.freezeBullets(); t.updateBullets(t.STEP); near(b.x, before); near(t.game.freeze, 2);
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
      const e = t.enemies.take(); Object.assign(e, { x: 100, y: 100, hp: 1, max: 1 });
      const s = t.shots.take(); Object.assign(s, { x: 100, y: 100, px: 100, py: 100, angle: 0, speed: 0, kind: 0, damage: 2, age: 0 });
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
check('long simulation of every spell stays finite within fixed pools', () => {
  for (let phase = 0; phase < 3; phase++) {
    reset(); t.beginPhase(phase); t.game.transition = 0;
    for (let i = 0; i < 3000; i++) {
      t.player.invuln = 10; t.update(t.STEP); if (i % 120 === 0) t.render();
      for (const pool of [t.bullets, t.shots, t.particles, t.warnings, t.enemies, t.items]) assert.ok(pool.count >= 0 && pool.count <= pool.items.length);
    }
    for (const b of t.bullets.items.slice(0, t.bullets.count)) assert.ok(Number.isFinite(b.x + b.y + b.angle));
    assert.equal(new Set(t.bullets.items).size, 5000);
    console.log(`  Spell ${phase + 1}: live ${t.bullets.count}, pool peak ${t.bullets.peak}/5000`);
  }
});
console.log(`\n${passed} checks passed.`);
