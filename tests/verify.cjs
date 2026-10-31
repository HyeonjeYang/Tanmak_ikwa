'use strict';
// No packages required: exercise the real embedded game script in a minimal DOM.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
// Git may check files out with CRLF; the game and its anchors are compared as LF.
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const storySource = fs.readFileSync(path.join(__dirname, '..', 'story.js'), 'utf8');
const source = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const noop = () => {};
const gradient = { addColorStop: noop };
// Every string the canvas draws can be captured, to prove the English mode leaves no Korean behind.
const drawn = { on: false, list: [] };
const record = str => { if (drawn.on) drawn.list.push(String(str)); };
const context = new Proxy({ createLinearGradient: () => gradient, createRadialGradient: () => gradient, measureText: () => ({ width: 20 }), fillText: record, strokeText: record }, {
  get(target, key) { return key in target ? target[key] : noop; },
  set(target, key, value) { target[key] = value; return true; }
});
const elements = new Map();
const events = new Map();
const documentEvents = new Map();
const storage = new Map();
function element(id) {
  if (!elements.has(id)) elements.set(id, { hidden: false, textContent: '', dataset: {}, attributes: {}, getContext: () => context, focus: noop, addEventListener: noop, setAttribute(k, v) { this.attributes[k] = v; } });
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
vm.runInContext(storySource, sandbox, { filename: 'story.js' });
const marker = '\n  render();requestAnimationFrame(frame);\n})();';
assert.ok(source.includes(marker), 'test instrumentation anchor exists');
const exported = 'game,player,boss,bullets,shots,particles,warnings,enemies,items,labels,fields,spells,difficulties,keys,start,beginField,beginPhase,finishField,finishPhase,hit,bomb,freezeBullets,switchWeapon,continueRun,pause,bullet,spawnItem,spawnFieldEnemy,damageEnemy,damageBoss,enemyText,updateItems,updateField,fireShots,weierstrass,update,updateBoss,updateBullets,updateShots,updateWarnings,render,frame,STEP,HOMING_COOLDOWN,OVERHEAT_LOCK,O,K,OPS,SPECS,loop,conc,poleXY,placePoles,closeLoop,fireCircle,stepConcentration,resize,canvas,GX,GY,CELL,GRID_TOP,prefs,talk,startTalk,advanceTalk,setLang,setTheme,PALETTES,C,MIDS,MID_AT,MID_TIME,midEnemy,pick,choosePick,startPick,CARDS,LAWS,PHYS,P,ext,DISK,POLAR,traceRay,RAY,rayN:()=>rayN,rayHits,beamPath,spawnPart,PARTS,physics,ram,updateWells,midFactor,logisticOrbit,LOGISTIC_R,mandelOut,primeN,isPrime,homing,dnaReady,DNA_GRAZE,DNA_KILLS,available,seedTuring,stepConcentration,SEQS,SH,spawnTrain,trainEval,TRAIN_EVAL,limitOf,riemannN,figure,CAST,KIND_COLOR,bulletColors,ui,EN';
vm.runInContext(source.replace(marker, `\n  globalThis.testGame={${exported},scale:()=>scale};` + marker), sandbox);
const t = sandbox.testGame;
// Dialogue would freeze the stage; it is switched back on only for the checks about it.
t.prefs.talk = false; t.prefs.cards = false;
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
  Object.assign(e, { x: 300, y: 300, baseX: 300, baseY: 300, age: 0, fire: 99, seed: 0, type: t.game.phase, fn: 0, deg: 0, coef: 1, pd: 0, flash: 0, immune: 0, alive: true, id: 9000 + t.enemies.count, spec: '', phase: 0, p: 0, deck: 0, mark: 0, trial: 0, s: 1, k: 1, grow: 0, seq: -1, n: 0, group: 0, amp: 1, kx: 0, ky: 0, kvx: 0, kvy: 0, kcd: 0, charge: 0 }, props);
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

check('one page with an 800×700 logical canvas; story.js is its only script file and nothing is fetched', () => {
  assert.match(html, /width="800" height="700"/);
  assert.deepEqual([...html.matchAll(/<(?:script|img|link)[^>]+(?:src|href)="([^"]+)"/gi)].map(m => m[1]), ['story.js']);
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
check('C cycles d/dx → ∂/∂y → ∇ → lim and 1 / 2 / 3 / 8 pick directly', () => {
  reset(); assert.equal(t.player.weapon, 0);
  key('KeyC'); assert.equal(t.player.weapon, 1); key('KeyC'); assert.equal(t.player.weapon, 2); key('KeyC'); assert.equal(t.player.weapon, O.LIM, 'lim is there from the start');
  key('KeyC'); assert.equal(t.player.weapon, 0);
  key('Digit3'); assert.equal(t.player.weapon, 2); key('Digit8'); assert.equal(t.player.weapon, O.LIM); key('Digit1'); assert.equal(t.player.weapon, 0);
  key('KeyV'); assert.equal(t.game.freezeCooldown, 14);
});
check('chapters 4–7 each hand over one new operator; C only cycles unlocked ones', () => {
  reset(); assert.equal(t.spells.length, 16); assert.equal(t.fields.length, 16); assert.equal(t.OPS.length, 8);
  key('Digit4'); assert.equal(t.player.weapon, 0, '∮ is still locked in chapter 1');
  t.beginField(3); assert.equal(t.player.weapon, 3, 'the new ∮ is put in hand'); assert.equal(t.game.newTool, 3);
  key('KeyC'); assert.equal(t.player.weapon, O.LIM, 'A⁻¹, ℱ and 𝔼 are skipped while locked');
  key('Digit5'); assert.equal(t.player.weapon, O.LIM);
  t.beginField(4); assert.equal(t.player.weapon, 4); t.beginField(5); assert.equal(t.player.weapon, 5); t.beginField(6); assert.equal(t.player.weapon, 6);
  key('Digit4'); assert.equal(t.player.weapon, 3); for (let k = 0; k < 5; k++) key('KeyC'); assert.equal(t.player.weapon, 0);
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
  assert.equal(t.enemies.count, 0); assert.ok(frames >= 21 && frames <= 23, `${frames} frames at 140 dps`);
  assert.ok(noteSeen('∂/∂y = 0'));
});
check('∂/∂y must cover the whole remainder of a polynomial, and d/dx shortens it', () => {
  fieldReset(); const e = placeEnemy({ deg: 2, hp: 10 });
  t.damageEnemy(0, 15, 1); assert.equal(t.enemies.count, 1); assert.equal(e.deg, 2);
  t.damageEnemy(0, 10, 0); assert.equal(e.deg, 1); assert.equal(t.enemies.count, 1);
  t.damageEnemy(0, 5, 0); assert.equal(t.enemies.count, 0, 'd/dx shrank the remainder under the ∂ ring');
});
check('∂/∂y overheats after about 3 s of focused fire and stays locked for 1.5 s', () => {
  reset(); t.player.invuln = 1000; t.player.weapon = 1; t.keys.add('KeyZ'); t.keys.add('ShiftLeft');
  tick(180); assert.equal(t.player.beam, 1); assert.equal(t.player.overheat, 0);
  tick(20); assert.ok(t.player.overheat > 0); assert.equal(t.player.beam, 0);
  tick(70); assert.equal(t.player.beam, 0);
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
check('∮ ver2: the ∮ key again swaps versions; holding Z raises T and letting go throws circle C as a whirlwind', () => {
  try {
    fieldReset(3); assert.equal(t.player.weapon, 3); assert.equal(t.prefs.loopVer, 1);
    key('Digit4'); assert.equal(t.prefs.loopVer, 2, 'the key of the ∮ in hand switches its version');
    assert.ok(storage.get('axiom-prefs').includes('"loopVer":2'), 'and the choice is kept');
    const source = placeEnemy({ fn: K.FIELD, hp: 40, matrix: [1, 0, 0, 1], x: 300, y: 300 });
    const poly = placeEnemy({ deg: 2, hp: 16, x: 330, y: 320 });
    t.player.x = 300; t.player.y = 590; t.keys.add('KeyZ');
    for (let i = 0; i < 60; i++) t.fireShots(t.STEP);
    near(t.player.vcharge, 1, .02); assert.equal(liveShots(8).length, 0, 'nothing leaves while Z is held');
    t.keys.delete('KeyZ'); t.fireShots(t.STEP);
    const [w] = liveShots(8); assert.ok(w, 'letting go throws it'); near(w.m, 1, .02); assert.equal(t.player.vcharge, 0);
    for (let i = 0; i < 150 && source.alive; i++) t.updateShots(t.STEP);
    assert.equal(source.alive, false, 'what it passes over is integrated like circle C');
    assert.ok(poly.alive && poly.hp === 16, 'a gradient field still has no circulation');
    // A tap is no integral, and only three whirlwinds fly at once.
    t.shots.clear(); t.keys.add('KeyZ'); for (let i = 0; i < 6; i++) t.fireShots(t.STEP); t.keys.delete('KeyZ'); t.fireShots(t.STEP);
    assert.equal(liveShots(8).length, 0, 'a tap throws nothing');
    for (let n = 0; n < 4; n++) { t.keys.add('KeyZ'); for (let i = 0; i < 30; i++) t.fireShots(t.STEP); t.keys.delete('KeyZ'); t.fireShots(t.STEP); }
    assert.equal(liveShots(8).length, 3);
    // Boss 4: a whirlwind that passes over the source takes its flux, more for a higher T.
    const flux = T => {
      bossReset(3); t.player.weapon = 3; t.player.x = 300; t.player.y = 590; t.keys.add('KeyZ');
      for (let i = 0; i < T * 60; i++) t.fireShots(t.STEP); t.keys.delete('KeyZ'); t.fireShots(t.STEP);
      const hp = t.boss.hp; for (let i = 0; i < 200 && liveShots(8).length; i++) { t.boss.x = 300; t.boss.y = 200; t.updateShots(t.STEP); }
      return hp - t.boss.hp;
    };
    const low = flux(.5), high = flux(2); assert.ok(low > 0 && high > 2.5 * low, `T = .5: ${low.toFixed(0)}, T = 2: ${high.toFixed(0)}`);
    key('Digit4'); assert.equal(t.prefs.loopVer, 1, 'and back to ver1');
  } finally { t.prefs.loopVer = 1; t.keys.clear(); }
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
  near(vNear, 150 * t.difficulties.easy.speed * (40 / 40 + .32), 1e-6); assert.ok(vFar < vNear / 2, 'still slower far out, but never stalls');
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
check('boss 5: rings obey dx/dt = A(x − x₀) on a doubled clock; shots bend near it unless A⁻¹, and det A = 0 bends nothing', () => {
  bossReset(4); t.game.bodyIndex = 0; t.boss.x = 300; t.boss.y = 150;
  const b = t.bullet(330, 200, 0, 100, 7); b.ox = 300; b.oy = 200;
  t.updateBullets(t.STEP);
  const k = t.difficulties.easy.speed / 60;
  near(b.x - 330, 2 * (.3 * 30) * k, 1e-6); near(b.y - 200, 2 * (1 * 30) * k, 1e-6);
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
check('opposite charges turn by q B Δt near the boss and fly straight far from it; B changes sign', () => {
  reset(); t.game.B = 1.15; t.player.invuln = 10; t.boss.x = 100; t.boss.y = 200;
  t.bullet(100, 200, 0, 100, 3, '#d23b2e', 4, 1); t.bullet(100, 200, 0, 100, 3, '#2a4fb4', 4, -1); t.bullet(100, 600, 0, 100, 3, '#d23b2e', 4, 1);
  t.updateBullets(t.STEP); near(t.bullets.items[0].angle, 1.15 / 60); near(t.bullets.items[1].angle, -1.15 / 60);
  assert.ok(t.bullets.items[2].angle < .1 * 1.15 / 60, '400 px away the field is down to a few per cent');
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
  for (const [weapon, focus] of [[0, false], [0, true], [1, true], [2, false], [2, true], [4, false], [5, false], [5, true], [6, false], [6, true], [7, false], [7, true]]) {
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
  // Each call is one arrival: a card, or a whole train of six terms.
  const arrive = () => { const before = t.enemies.count; t.spawnFieldEnemy(); return t.enemies.items.slice(before, t.enemies.count); };
  const expected = [[0, 6, [1, 2]], [1, 4, [2, 3]], [2, 3, [3, 4]]];
  for (const [stage, every, degrees] of expected) {
    fieldReset(stage); const f = t.fields[stage], degs = new Set(), ks = [];
    for (let n = 0; n < 14; n++) {
      const cards = arrive();
      if (n % f.trainEvery === f.trainEvery - 1) {
        const seq = f.trains[Math.floor(n / f.trainEvery) % f.trains.length];
        assert.equal(cards.length, 6, `stage ${stage} arrival ${n} is a train`);
        assert.ok(cards.every((e, j) => e.fn === K.SEQ && e.seq === seq && e.n === j && e.group === cards[0].group));
        continue;
      }
      assert.equal(cards.length, 1); const e = cards[0];
      assert.equal(e.fn, n % every === every - 2 ? K.EXP : K.POLY, `stage ${stage} arrival ${n}`);
      if (e.fn === K.EXP) ks.push(e.k); else degs.add(e.deg);
    }
    assert.deepEqual([...degs].sort(), degrees);
    assert.ok(ks.length > 0 && ks.every(k => f.ks.includes(k)), `stage ${stage} rates ${ks}`);
    t.resetEnemies && t.resetEnemies();
  }
  assert.ok(t.game.expSeen);
  for (let stage = 3; stage < 7; stage++) {
    fieldReset(stage); const roster = t.fields[stage].roster;
    roster.forEach((name, n) => {
      const cards = arrive();
      if (name.startsWith('seq:')) { assert.equal(cards.length, 6); assert.ok(cards.every(e => e.fn === K.SEQ && e.seq === Number(name.slice(4)))); return; }
      assert.equal(cards[0].fn, t.SPECS[name].fn, `stage ${stage} arrival ${n}`); assert.equal(cards[0].type, stage); assert.equal(cards[0].k, t.SPECS[name].k || 1);
    });
  }
});
check('all seven field waves create distinct attacks', () => {
  for (let phase = 0; phase < 7; phase++) {
    // Fields are random, so the screen can be clear between volleys; what counts is that the field fires at all.
    fieldReset(phase); let fired = 0; for (let i = 0; i < 300; i++) { t.update(t.STEP); fired = Math.max(fired, t.bullets.count); }
    assert.equal(t.game.segment, 'field'); assert.ok(t.enemies.count > 0); assert.ok(fired > 0, `field ${phase + 1}`);
    assert.ok(t.enemies.items.slice(0, t.enemies.count).some(e => e.type === phase));
    const kinds = new Set(t.bullets.items.slice(0, t.bullets.count).map(b => b.kind));
    if (phase === 3) assert.ok(kinds.has(9), 'vortices fire curling bullets');
    if (phase === 5) assert.ok(kinds.has(10), 'sines fire weaving bullets');
  }
  near(t.weierstrass(0), 1 + .5 + .25 + .125 + .0625);
  fieldReset(2); t.game.phaseTime = t.fields[2].duration + 1; t.update(t.STEP); assert.equal(t.game.segment, 'boss'); assert.equal(t.game.phase, 2);
});
check('shield pickup blocks one hit; the d²/dx² lance fires beside the weapon, erases bullets, and still bounces off eˣ', () => {
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
check('chain rule: derivatives pull k out of e^{kx} and sin(kx), so the wrong tool makes them stronger', () => {
  fieldReset(1); const e = placeEnemy({ fn: K.EXP, hp: 40, k: 2 });
  assert.equal(t.enemyText(e), 'e²ˣ');
  assert.equal(t.damageEnemy(0, 30, O.D), false); assert.equal(e.coef, 1, 'one layer is 1.5 × its HP');
  t.damageEnemy(0, 30, O.D); assert.equal(t.enemyText(e), '2e²ˣ'); t.damageEnemy(0, 60, O.G); assert.equal(t.enemyText(e), '4e²ˣ');
  assert.equal(e.hp, 40, 'no damage was done');
  // A bigger coefficient reloads faster and fires a wider fan.
  const volley = coef => { t.bullets.clear(); e.coef = coef; e.fire = 0; e.age = 1; e.p = 1; t.player.x = 300; t.player.y = 600; const before = e.fire; t.updateField(0); return [t.bullets.count, e.fire - before]; };
  const [small, slow] = volley(1), [big, fast] = volley(16); assert.ok(big > small + 5 && fast < slow, `${small}→${big} bullets, ${slow.toFixed(2)}→${fast.toFixed(2)} s`);
  e.coef = 4; t.damageEnemy(0, 41, O.P); assert.equal(e.alive, false, '∂/∂y still clears it whatever its size');
  const plain = placeEnemy({ fn: K.EXP, hp: 40 }); t.damageEnemy(0, 100, O.D); assert.equal(t.enemyText(plain), 'eˣ', 'k = 1 pulls out nothing');
  t.damageEnemy(0, 100, O.LIM); assert.equal(t.enemyText(plain), '2eˣ', 'sent to ∞ by lim, eˣ only grows');
  const decay = placeEnemy({ fn: K.EXP, hp: 40, k: -1 }); t.damageEnemy(1, 100, O.D); assert.equal(t.enemyText(decay), '−e⁻ˣ', 'k = −1 only flips the sign');
  const s = placeEnemy({ fn: K.SIN, hp: 10, k: 2 }), idx = () => t.enemies.items.indexOf(s);
  t.damageEnemy(idx(), 10, O.D); assert.equal(t.enemyText(s), '2cos 2x'); t.damageEnemy(idx(), 10, O.D); assert.equal(t.enemyText(s), '−4sin 2x');
  t.damageEnemy(idx(), 1, O.FT); assert.equal(s.alive, false); assert.ok(noteSeen('ℱ{sin 2x} → δ(ω ± 2)'));
});
check('lim: what tends to 0 vanishes, what tends to ∞ bursts into an ∞ of bullets, what oscillates bounces', () => {
  fieldReset(1); t.bullets.clear();
  const poly = placeEnemy({ deg: 2, hp: 10, x: 200, y: 200 }); t.damageEnemy(0, 7, O.LIM);
  assert.equal(poly.alive, false); assert.ok(t.bullets.count >= 10, 'x² → ∞ leaves a lemniscate of bullets'); assert.ok(noteSeen('lim = ∞'));
  assert.ok(t.bullets.items.slice(0, t.bullets.count).every(b => b.shape === t.SH.STAR));
  for (const [props, name] of [[{ fn: K.EXP, k: -1, hp: 10 }, 'e⁻ˣ'], [{ fn: K.GAUSS, hp: 10 }, 'e⁻ˣ²'], [{ fn: K.POLE, hp: 10 }, '1/(s − 1)']]) {
    t.bullets.clear(); const e = placeEnemy(props); t.damageEnemy(t.enemies.items.indexOf(e), 7, O.LIM);
    assert.equal(e.alive, false, `${name} → 0`); assert.equal(t.bullets.count, 0, `${name} leaves nothing`);
  }
  for (const props of [{ fn: K.SIN, hp: 10 }, { deg: 0, coef: 6, hp: 10 }, { fn: K.FIELD, hp: 10, matrix: [1, 0, 0, 1] }, { fn: K.BROWN, hp: 1 }]) {
    const e = placeEnemy(props); assert.equal(t.damageEnemy(t.enemies.items.indexOf(e), 99, O.LIM), false); assert.ok(e.alive && e.hp === props.hp);
  }
  // Fast lim fires a sequence: the side shots close in as 1/n, then start over.
  reset(); t.player.weapon = O.LIM; t.keys.add('KeyZ'); const spreads = [];
  for (let n = 0; n < 6; n++) { t.shots.clear(); t.player.fire = 0; t.fireShots(t.STEP); const a = liveShots(0).map(s => s.angle); spreads.push(Math.max(...a) - Math.min(...a)); }
  assert.ok(spreads[0] > spreads[1] && spreads[1] > spreads[4] && spreads[5] === spreads[0], spreads.map(v => v.toFixed(2)).join(' '));
});
check('sequence trains: six terms in a column; lim judges the whole train by where aₙ goes', () => {
  const train = index => { fieldReset(0); t.bullets.clear(); t.spawnTrain(index, 300); return [...t.enemies.items.slice(0, t.enemies.count)]; };
  let cards = train(0);
  assert.deepEqual(cards.map(e => t.enemyText(e)), ['1', '½', '⅓', '¼', '⅕', '⅙']);
  assert.ok(cards.every((e, n) => e.y === -24 - n * 44), 'one behind another');
  assert.ok(cards[0].max > cards[5].max, 'smaller terms are weaker');
  const need = t.TRAIN_EVAL * t.difficulties.easy.hp / 1.5;
  t.damageEnemy(3, need / 2, O.LIM); assert.equal(t.enemies.count, 6, 'half judged'); t.damageEnemy(0, need / 2 + .01, O.LIM);
  assert.equal(t.enemies.count, 0, 'lim 1/n = 0 clears every term'); assert.equal(t.bullets.count, 0); assert.ok(noteSeen('lim 1/n = 0'));
  cards = train(3); assert.ok(cards[5].max > cards[0].max, '2ⁿ gets tougher down the line');
  t.damageEnemy(5, need + 1, O.LIM); assert.equal(t.enemies.count, 0); assert.ok(t.bullets.count >= 60, `2ⁿ → ∞ bursts every term: ${t.bullets.count}`);
  cards = train(5); t.damageEnemy(2, need + 1, O.LIM);
  assert.equal(t.enemies.count, 6, '(1 + 1/n)ⁿ settles instead'); assert.ok(cards.every(e => e.p === 1 && t.enemyText(e) === 'e'));
  t.damageEnemy(0, 3, O.D); assert.equal(t.enemies.count, 5, 'and a constant falls to one derivative');
  cards = train(2); assert.equal(t.damageEnemy(0, 99, O.LIM), false, '(−1)ⁿ has no limit'); assert.equal(t.trainEval[cards[0].group % 16], 0);
  t.damageEnemy(0, cards[0].max, O.D); assert.equal(t.enemies.count, 5, 'other tools take terms one by one');
  // Bigger terms fire more.
  cards = train(3); const shots = cards.map(e => { t.bullets.clear(); e.baseY = 254; e.fire = 0; e.age = 1; t.updateField(0); e.baseY = -999; return t.bullets.count; });
  assert.ok(shots[5] > shots[0], `2ⁿ volleys ${shots}`);
});
check('chapter-2 midboss, the Riemann sum: bars refine 2 → 4 → 8 → 16, each drops a square, lim deals 160%', () => {
  fieldReset(1); t.game.phaseTime = t.MIDS[1].at; t.update(t.STEP);
  const m = t.midEnemy(); assert.ok(m); assert.equal(m.spec, 'riemann'); assert.equal(t.game.mid, 1);
  const ns = [...[1, .7, .45, .2]].map(f => { m.hp = m.max * f; return t.riemannN(m); }); assert.deepEqual(ns, [2, 4, 8, 16]);
  m.hp = m.max * .45; t.bullets.clear(); m.fire = 0; m.p = 0; m.age = 1; t.updateField(0);
  assert.equal(t.bullets.items.slice(0, t.bullets.count).filter(b => b.shape === t.SH.SQUARE).length, 8, 'one square per bar');
  assert.match(t.enemyText(m), /^S₈ = 2\.01/);
  m.hp = 1000; t.damageEnemy(0, 10, O.LIM); near(m.hp, 984); t.damageEnemy(0, 10, O.D); near(m.hp, 978);
  assert.equal(t.damageEnemy(0, 99, O.LOOP), false); near(m.hp, 978);
  t.damageEnemy(0, 1000, O.LIM); assert.equal(m.alive, false); assert.equal(t.game.mid, 2); assert.ok(noteSeen('lim Sₙ = ∫[0, π] sin x dx = 2'));
});
check('figures: a shaped volley keeps its shape as it grows, and every boss but the vector field draws one', () => {
  reset(); t.bullets.clear(); t.figure('heart', 300, 300, 24, 20, 80, t.C.red, t.SH.RICE);
  const list = t.bullets.items.slice(0, t.bullets.count), ratio = () => list.map(b => Math.hypot(b.x - 300, b.y - 300));
  const r0 = ratio(); for (let i = 0; i < 30; i++) t.updateBullets(t.STEP); const r1 = ratio();
  const scale = r1[0] / r0[0]; assert.ok(scale > 1.5 && r1.every((r, j) => Math.abs(r / r0[j] - scale) < 1e-6), 'a scaled copy');
  for (let p = 0; p < 7; p++) {
    bossReset(p); t.bullets.clear(); t.game.spawn = t.game.aimed = t.game.rose = t.game.tangent = t.game.seed = t.game.emit = 99; t.game.shape = 0; t.game.phaseTime = 3; t.updateBoss(t.STEP);
    const shapes = new Set(t.bullets.items.slice(0, t.bullets.count).map(b => b.shape));
    if (p === 3) assert.equal(t.bullets.count, 0); else assert.ok(t.bullets.count >= 18 && shapes.size === 1, `boss ${p + 1}: ${t.bullets.count}`);
  }
});
// Summon chapter p's midboss straight away and return it.
function summon(p) { fieldReset(p); t.game.phaseTime = t.MIDS[p].at; t.update(t.STEP); return t.midEnemy(); }
check('every chapter has a magic-circle midboss that answers its own tool best', () => {
  const tools = { logistic: O.LIM, riemann: O.LIM, mandel: O.LIM, lorenz: O.LOOP, fib: O.INV, prime: O.D, monte: O.E };
  for (let p = 0; p < 7; p++) {
    const m = summon(p); assert.ok(m, `chapter ${p + 1}`); assert.equal(m.spec, t.MIDS[p].key);
    assert.ok(t.MIDS[p].sigils && t.MIDS[p].sigils.length === 8, 'eight sigils for its circle');
    const [best] = t.midFactor(m, tools[m.spec]), [plain] = t.midFactor(m, O.G);
    if (m.spec !== 'prime') assert.ok(best > plain, `${m.spec}: ${best} > ${plain}`);
    m.fire = 0; m.age = .1; t.bullets.clear(); t.updateField(0); assert.ok(t.bullets.count > 0, `${m.spec} fires`);
    t.render();
  }
});
check('the logistic map bifurcates 1 → 2 → 4 → chaos, and lim only works while it converges', () => {
  assert.deepEqual([...t.LOGISTIC_R].map(r => t.logisticOrbit(r).length), [1, 2, 4, 8]);
  const m = summon(0), stage = f => { m.hp = m.max * f; return t.midFactor(m, O.LIM); };
  assert.equal(stage(1)[0], 1.8); assert.equal(stage(.7)[0], .5); assert.deepEqual([...stage(.1)], [0, 'lim 없음 · 혼돈']);
  m.hp = m.max * .7; m.fire = 0; m.p = 0; t.bullets.clear(); t.updateField(0); assert.equal(t.bullets.count, 2 * 5, 'two attractor points, five bullets each');
});
check('the Mandelbrot midboss: lim works while c ∈ M and bounces while c ∉ M', () => {
  const m = summon(2); m.age = 1; assert.equal(t.mandelOut(m), false); assert.equal(t.midFactor(m, O.LIM)[0], 1.5);
  m.age = 6; assert.equal(t.mandelOut(m), true); assert.equal(t.damageEnemy(0, 50, O.LIM), false, 'escaping orbit: |zₙ| → ∞');
  assert.match(t.enemyText(m), /∉ M$/);
});
check('the Lorenz midboss flies butterflies that drift down the page, and ∮ around it takes 150%', () => {
  const m = summon(3); m.fire = 0; t.bullets.clear(); t.updateField(0);
  const b = t.bullets.items.slice(0, t.bullets.count).find(x => x.kind === 13); assert.ok(b);
  const y0 = b.oy; for (let i = 0; i < 240; i++) t.updateBullets(t.STEP);
  assert.ok(b.oy - y0 > 150, 'the attractor slides down'); assert.ok(Number.isFinite(b.x + b.y));
  const hp = m.hp; closeCircle(m.x, m.y, 70); assert.ok(hp - m.hp > 90 * 1.5 - 1e-6, `∮ took ${hp - m.hp}`);
});
check('the Fibonacci midboss grows a sunflower of 21, 34, 55 seeds; the prime midboss hits twice as hard on primes', () => {
  const f = summon(4); f.fire = 0; t.bullets.clear(); t.updateField(0); assert.equal(t.bullets.count, 21);
  f.hp = f.max * .6; f.fire = 0; t.bullets.clear(); t.updateField(0); assert.equal(t.bullets.count, 34);
  const p = summon(5); let age = 0; while (!t.isPrime(t.primeN(Object.assign(p, { age })))) age += .55;
  let hp = p.hp; t.damageEnemy(0, 10, O.D); near(hp - p.hp, 20);
  p.age = age + .55; while (t.isPrime(t.primeN(p))) p.age += .55; hp = p.hp; t.damageEnemy(0, 10, O.D); near(hp - p.hp, 5);
  // The sieve: a row of 24 with every p-th place open.
  p.rec = 0; p.ph = 1; t.bullets.clear(); t.updateField(0);
  assert.equal(t.bullets.items.slice(0, t.bullets.count).filter(b => b.shape === t.SH.SQUARE && Math.abs(b.y - (p.y + 34)) < 1).length, 24 - 8, 'multiples of 3 left open');
});
check('homing bullets descend the gradient toward the pen for a while, then fly straight', () => {
  reset(); t.player.x = 500; t.player.y = 600; const b = t.homing(100, 100, 0, 100, t.C.red, 1);
  for (let i = 0; i < 60; i++) t.updateBullets(t.STEP);
  const want = Math.atan2(600 - b.y, 500 - b.x); assert.ok(Math.abs(want - b.angle) < .2, 'turned toward the pen');
  const a = b.angle; for (let i = 0; i < 30; i++) t.updateBullets(t.STEP); near(b.angle, a, 1e-9);
});
check('curving bullets open out and reach the bottom of the page instead of circling', () => {
  reset(); const curl = t.bullet(300, 100, Math.PI / 2, 105, 9, t.C.violet, 3.5, 1.25);
  for (let i = 0; i < 600; i++) { t.player.invuln = 99; t.updateBullets(t.STEP); }
  assert.ok(!curl.alive && t.bullets.count === 0 || Math.hypot(curl.x - 300, curl.y - 100) > 300, 'the curl relaxes');
  bossReset(3); t.boss.x = 300; t.boss.y = 200; t.game.spin = 1; const v = t.bullet(300, 230, Math.PI / 2, 140, 6);
  for (let i = 0; i < 240; i++) { t.player.invuln = 99; t.updateBullets(t.STEP); }
  assert.ok(Math.hypot(v.x - 300, v.y - 200) > 300, 'vortex arms spiral out within 4 s');
  bossReset(4); t.game.bodyIndex = 0; t.boss.x = 300; t.boss.y = 150; const m = t.bullet(326, 150, 0, 100, 7); m.ox = 300; m.oy = 150;
  for (let i = 0; i < 360; i++) { t.player.invuln = 99; t.updateBullets(t.STEP); }
  assert.ok(Math.hypot(m.x - 300, m.y - 150) > 280, 'the λ = .3 ± i spiral leaves the boss within 6 s');
});
check('fields last longer and their cards enter at random places with random sway', () => {
  assert.ok(t.fields.every(f => f.duration >= 25));
  fieldReset(3); const xs = [], amps = new Set();
  for (let i = 0; i < 30; i++) { t.spawnFieldEnemy(); const e = t.enemies.items[t.enemies.count - 1]; xs.push(e.baseX); amps.add(e.amp.toFixed(3)); }
  const mean = xs.reduce((a, b) => a + b) / xs.length, sd = Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length);
  assert.ok(sd > 90, `entry spread ${sd.toFixed(0)} px`); assert.ok(amps.size > 20);
});
check('DNA helix: 100 grazes and five kills with every tool held charge V; it erases its band and takes ⅓ of full HP, even through eˣ', () => {
  reset(); assert.equal(t.dnaReady(), false); key('KeyV'); assert.equal(t.game.freezeCooldown, 14, 'uncharged, V is still the freeze');
  t.game.freezeCooldown = 0; t.game.dnaGraze = t.DNA_GRAZE;
  for (let k = 0; k < 8; k++) if (t.available(k)) t.game.opKills[k] = t.DNA_KILLS - (k === 0 ? 1 : 0);
  assert.equal(t.dnaReady(), false, 'd/dx is one kill short');
  fieldReset(0); t.game.dnaGraze = t.DNA_GRAZE; const e = placeEnemy({ deg: 1, hp: 10, x: 300, y: 300 }); t.player.weapon = 0; t.damageEnemy(0, 99, O.D); t.damageEnemy(0, 99, O.D);
  assert.equal(t.game.opKills[0], 1, 'the killing tool is credited'); assert.ok(!e.alive);
  for (let k = 0; k < 8; k++) if (t.available(k)) t.game.opKills[k] = t.DNA_KILLS;
  bossReset(2); t.game.dnaGraze = t.DNA_GRAZE; for (let k = 0; k < 8; k++) if (t.available(k)) t.game.opKills[k] = t.DNA_KILLS;
  assert.equal(t.dnaReady(), true); t.game.phaseTime = 9; t.updateBoss(t.STEP); assert.equal(t.game.armor, true, 'the boss is in its eˣ armour');
  const hp = t.boss.hp; t.bullet(t.player.x + 10, t.player.y - 200, 0, 0); t.bullet(t.player.x + 200, t.player.y - 200, 0, 0);
  key('KeyV'); assert.ok(t.game.dna > 0); assert.equal(t.game.dnaGraze, 0); assert.ok(t.game.opKills.every(n => n === 0));
  for (let i = 0; i < 40; i++) { t.game.phaseTime = 9; t.update(t.STEP); }
  near(hp - t.boss.hp, t.boss.max / 3, 1e-6); assert.equal(t.bullets.items.slice(0, t.bullets.count).filter(b => Math.abs(b.x - t.player.x) < 40).length, 0, 'its band is clear');
  fieldReset(1); const f = placeEnemy({ deg: 2, hp: 30, max: 30, x: 200, y: 200 }), g = placeEnemy({ deg: 0, hp: 9, max: 30, x: 400, y: 200 });
  t.game.dnaGraze = t.DNA_GRAZE; for (let k = 0; k < 8; k++) if (t.available(k)) t.game.opKills[k] = t.DNA_KILLS;
  key('KeyV'); for (let i = 0; i < 40; i++) t.update(t.STEP); near(f.hp, 20); assert.equal(g.alive, false);
});
check('the last boss: Fisher fronts, then Turing spots that divide, then chemotaxis toward the pen and a last word', () => {
  bossReset(6); t.boss.hp = t.boss.max * .7; t.game.bodyIndex = 1; t.conc.fill(0); t.game.seed = 0; t.player.x = 300; t.updateBoss(t.STEP);
  assert.ok(t.conc[0] === 1 && t.conc[14] === 0, 'a front across the top, open above the pen');
  t.boss.hp = t.boss.max * .45; t.updateBoss(t.STEP); assert.equal(t.game.bodyIndex, 2); assert.ok(t.game.itemToast > 0);
  const spots = () => { const seen = new Uint8Array(t.conc.length); let n = 0; for (let i = 0; i < t.conc.length; i++) { if (t.conc[i] < .2 || seen[i]) continue; n++; const st = [i]; seen[i] = 1; while (st.length) { const j = st.pop(), x = j % t.GX, y = Math.floor(j / t.GX); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = x + dx, b = y + dy; if (a < 0 || b < 0 || a >= t.GX || b >= t.GY) continue; const q = b * t.GX + a; if (t.conc[q] >= .2 && !seen[q]) { seen[q] = 1; st.push(q); } } } } return n; };
  t.conc.fill(0); t.seedTuring(); for (let i = 0; i < 60; i++) t.stepConcentration(t.STEP); const early = spots();
  for (let i = 0; i < 600; i++) t.stepConcentration(t.STEP); const late = spots();
  assert.ok(late > early && late >= 5, `spots divide: ${early} → ${late}`);
  t.boss.hp = t.boss.max * .2; t.updateBoss(t.STEP); assert.equal(t.game.bodyIndex, 3);
  t.conc.fill(0); t.conc[5 * t.GX + 5] = 1; t.player.x = 500; t.player.y = 600;
  const centre = () => { let w = 0, x = 0, y = 0; for (let i = 0; i < t.conc.length; i++) { w += t.conc[i]; x += t.conc[i] * (i % t.GX); y += t.conc[i] * Math.floor(i / t.GX); } return [x / w, y / w]; };
  const before = centre(); t.boss.x = -999; for (let i = 0; i < 240; i++) t.stepConcentration(t.STEP); const after = centre();
  assert.ok(after[0] > before[0] + 2 && after[1] > before[1] + 2, 'the concentration crawls toward the pen');
  bossReset(6); t.game.tangent = 0; t.bullets.clear(); t.game.spawn = t.game.aimed = t.game.seed = t.game.emit = t.game.shape = 99; t.updateBoss(t.STEP);
  assert.ok(t.bullets.items.slice(0, t.bullets.count).some(b => b.kind === 12), 'chemotactic homing bullets');
  t.boss.hp = t.boss.max * .1; t.game.rose = 0; t.bullets.clear(); t.game.tangent = 99; t.updateBoss(t.STEP); assert.ok(t.bullets.count >= 2, 'the double helix starts');
});
// Start chapter (or extra stage) p from its boss, with nothing in the way.
function extraBoss(p) { t.game.difficulty = 'easy'; t.game.startChapter = p < 10 ? 7 : 10; t.start(); t.beginPhase(p); t.game.transition = 0; t.player.invuln = 100; t.bullets.clear(); }
check('the focused ∂/∂y laser no longer pierces a matrix: it leaves along A·d and the matrix takes the hit', () => {
  fieldReset(4); const m = placeEnemy({ fn: K.MATRIX, hp: 300, matrix: [0, -1, 1, 0], x: 300, y: 300 });
  const behind = placeEnemy({ deg: 1, hp: 300, x: 300, y: 150 });
  t.player.x = 300; t.player.y = 600; t.player.weapon = O.P; t.player.focus = true; t.keys.add('KeyZ');
  for (let i = 0; i < 20; i++) t.fireShots(t.STEP);
  assert.ok(m.hp < 300 || m.pd > 0, 'the matrix was struck'); assert.equal(behind.hp, 300, 'nothing behind it is hit');
  const pts = [...t.beamPath.slice(0, 12)]; assert.ok(Math.abs(pts[2] - 300) < 1 && pts[3] > 300 && pts[3] < 350, 'the beam turns at the edge of A');
  near(Math.atan2(pts[5] - pts[3], pts[4] - pts[2]), Math.atan2(0, 1), .02);
  // The lance bends too.
  t.shots.clear(); const lance = placeShot({ x: 300, y: 380, kind: 2, damage: 16 }); for (let i = 0; i < 12; i++) t.updateShots(t.STEP);
  near(Math.cos(lance.angle), 1, 1e-6);
});
check('rays reflect off mirrors (angle in = angle out) and a thin lens brings parallel rays to its focus', () => {
  reset(); t.game.optics = [{ x1: 100, y1: 300, x2: 500, y2: 300 }];
  t.traceRay(200, 500, -Math.PI / 4); const r = [...t.RAY.slice(0, 6)];
  near(r[3], 300, 4); assert.ok(r[5] > r[3], 'reflected back down'); near(Math.atan2(r[5] - r[3], r[4] - r[2]), Math.PI / 4, .05);
  t.game.optics = [{ x1: 100, y1: 300, x2: 500, y2: 300, f: 150 }];
  // A convex lens gathers light from either side: downward rays meet at the focus below, upward ones at the focus above.
  for (const [y0, angle, focus] of [[100, Math.PI / 2, 450], [500, -Math.PI / 2, 150]]) {
    const xs = [-80, -40, 40, 80].map(dx => { t.traceRay(300 + dx, y0, angle, 2000); const q = [...t.RAY.slice(0, t.rayN())]; const a = q.length - 4; return q[a] + (q[a + 2] - q[a]) * (focus - q[a + 1]) / (q[a + 3] - q[a + 1]); });
    assert.ok(xs.every(x => Math.abs(x - 300) < 3), `all cross the axis at the focus y = ${focus}: ${xs.map(x => x.toFixed(1))}`);
  }
  t.game.optics = [];
});
check('theorem cards: three distinct choices after a boss, picked by key, and they change the run', () => {
  t.prefs.cards = true;
  try {
    reset(); t.boss.hp = 0; t.update(t.STEP);
    assert.equal(t.pick.on, true); assert.equal(t.pick.cards.length, 3); assert.equal(new Set(t.pick.cards.map(c => c.id)).size, 3);
    assert.equal(t.game.segment, 'boss', 'the next field waits for the pick');
    const lives = t.game.lives; t.pick.cards[1] = t.CARDS.find(c => c.id === 'euler'); key('ArrowRight'); key('KeyZ');
    assert.equal(t.pick.on, false); assert.ok(t.game.perks.has('euler')); assert.equal(t.game.lives, lives + 1); assert.equal(t.game.segment, 'field');
    t.game.perks.add('green'); t.game.perks.add('ivt'); t.game.perks.add('uncertainty');
    t.player.focus = true; t.player.weapon = O.LOOP; t.game.maxPhase = 6; t.keys.clear(); t.keys.add('KeyZ');
    const far = placeEnemy({ fn: K.FIELD, hp: 999, matrix: [1, 0, 0, 1], x: t.player.x + 80, y: t.player.y }); t.fireShots(t.STEP);
    assert.ok(far.hp < 999, 'Green: circle C now reaches 80 px');
    reset(); t.game.perks.add('ivt'); for (let i = 0; i < 16; i++) t.bullet(t.player.x + 15, t.player.y, 0, 0); t.updateBullets(t.STEP); assert.equal(t.player.shield, 1, 'intermediate value theorem: 16 grazes');
    t.startPick(() => {}); assert.ok(t.pick.cards.every(c => t.CARDS.includes(c)));
    t.pick.on = false; extraBoss(12); t.startPick(() => {}); assert.ok(t.pick.cards.every(c => t.LAWS.includes(c)), 'EX2 deals laws of physics');
    t.pick.on = false;
  } finally { t.prefs.cards = false; t.pick.on = false; t.game.perks.clear(); }
});
check('EX1 polar: ↑↓ change r about the centre and ←→ turn θ at fixed r', () => {
  extraBoss(7); t.player.x = t.POLAR.x; t.player.y = t.POLAR.y + 200;
  const r = () => Math.hypot(t.player.x - t.POLAR.x, t.player.y - t.POLAR.y), th = () => Math.atan2(t.player.y - t.POLAR.y, t.player.x - t.POLAR.x);
  t.keys.add('ArrowUp'); tick(10); t.keys.delete('ArrowUp'); near(r(), 150, 1e-6);
  const before = th(); t.keys.add('ArrowRight'); tick(10); t.keys.delete('ArrowRight'); near(r(), 150, 1e-6); assert.ok(th() > before + .2, 'θ turned');
});
check('EX1 closed surfaces: the torus joins the edges, the Klein bottle turns the sides over, ℝP² all four; shots that go round hit double', () => {
  extraBoss(8); t.updateBoss(t.STEP); assert.equal(t.game.space, 'torus');
  t.player.x = 595; t.player.y = 300; t.keys.add('ArrowRight'); tick(3); t.keys.delete('ArrowRight'); assert.ok(t.player.x < 20 && Math.abs(t.player.y - 300) < 1);
  t.boss.hp = t.boss.max * .5; t.updateBoss(t.STEP); assert.equal(t.game.space, 'klein');
  t.player.x = 595; t.player.y = 200; t.keys.add('ArrowRight'); tick(3); t.keys.delete('ArrowRight'); assert.ok(t.player.x < 20); near(t.player.y, 56 + 700 - 200, 1);
  t.boss.hp = t.boss.max * .1; t.updateBoss(t.STEP); assert.equal(t.game.space, 'projective');
  t.player.x = 100; t.player.y = 64; t.keys.add('ArrowUp'); tick(3); t.keys.delete('ArrowUp'); assert.ok(t.player.y > 680); near(t.player.x, 500, 1);
  const b = t.bullet(598, 300, 0, 300); for (let i = 0; i < 5; i++) t.updateBullets(t.STEP); assert.ok(b.x < 40, 'bullets wrap too');
  t.boss.x = 300; t.boss.y = 600; t.shots.clear(); const shot = placeShot({ x: 300, y: 80, speed: 900, damage: 10 }); const hp = t.boss.hp;
  for (let i = 0; i < 20 && t.shots.count; i++) { t.boss.x = 300; t.boss.y = 600; t.updateShots(t.STEP); }
  assert.ok(shot.wraps === 1); near(hp - t.boss.hp, 20, 1e-6);
});
check('EX1 Poincaré disk: geodesics are arcs meeting the rim at right angles; bullets slow and shrink toward it; the pen stays inside', () => {
  extraBoss(9); t.updateBoss(t.STEP); assert.equal(t.game.space, 'hyper');
  const D = t.DISK, b = t.bullet(D.x + .4 * D.r, D.y, -Math.PI / 2, 120, 14, t.C.teal, 5, 5), pts = [];
  for (let i = 0; i < 600 && b.alive !== false && t.bullets.count; i++) { t.player.invuln = 100; t.updateBullets(t.STEP); if (i % 40 === 0) pts.push([(b.x - D.x) / D.r, (b.y - D.y) / D.r]); }
  // Circle through three samples; orthogonal to the unit circle when |centre|² = 1 + radius².
  const [p1, p2, p3] = [pts[0], pts[2], pts[4]], ax = p1[0], ay = p1[1], bx = p2[0], by = p2[1], cx = p3[0], cy = p3[1];
  const dd = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by)), ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / dd, uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / dd;
  const rad = Math.hypot(ax - ux, ay - uy); near(ux * ux + uy * uy, 1 + rad * rad, .05);
  const c = t.bullet(D.x, D.y, 0, 100, 14, t.C.teal, 5, 5); for (let i = 0; i < 160; i++) t.updateBullets(t.STEP);
  assert.ok(Math.abs(c.y - D.y) < .5, 'through the centre a geodesic is straight'); assert.ok(c.radius < 5);
  t.player.x = D.x; t.player.y = D.y + .9 * D.r; t.keys.add('ArrowDown'); tick(120); t.keys.delete('ArrowDown');
  assert.ok(Math.hypot(t.player.x - D.x, t.player.y - D.y) <= .95 * D.r + 1e-6);
});
check('EX2 physical tools: charges ride the Coulomb field, spheres bounce and shove, wells swallow bullets, the laser burns at its focus', () => {
  extraBoss(10); assert.equal(t.physics(), true); assert.equal(t.player.weapon, 0);
  t.boss.x = 400; t.boss.y = 150; t.shots.clear(); const q = placeShot({ x: 300, y: 500, angle: -Math.PI / 2, speed: 600, kind: 5, op: t.P.Q }); q.q = 1;
  for (let i = 0; i < 20; i++) { t.boss.x = 400; t.boss.y = 150; t.updateShots(t.STEP); }
  assert.ok(q.x > 302, 'a + charge is pulled toward the − boss');
  t.shots.clear(); const ball = placeShot({ x: 590, y: 400, angle: 0, speed: 600, kind: 6, op: t.P.M }); ball.m = 3; t.updateShots(t.STEP);
  assert.ok(Math.cos(ball.angle) < 0 && ball.hits === 1, 'off the wall');
  fieldReset(0); t.game.phase = 10; const e = placeEnemy({ fn: t.K.PART, spec: 'p', hp: 999, x: 300, y: 300 });
  t.shots.clear(); const b2 = placeShot({ x: 300, y: 322, speed: 600, kind: 6, op: t.P.M }); b2.m = 3; t.updateShots(t.STEP);
  assert.ok(e.hp < 999 && e.kvy < 0, 'the struck particle is shoved'); assert.equal(t.shots.count, 1, 'and the sphere glances off');
  t.shots.clear(); t.bullets.clear(); const well = placeShot({ x: 300, y: 400, speed: 0, kind: 7, op: t.P.G }); well.m = 1;
  const near1 = t.bullet(305, 400, 0, 0), farB = t.bullet(300, 480, 0, 0); t.updateWells(t.STEP);
  assert.ok(!t.bullets.items.slice(0, t.bullets.count).includes(near1), 'swallowed'); assert.ok(farB.y < 480, 'pulled in');
  extraBoss(10); t.boss.x = 300; t.boss.y = 600 - 18 - 210; t.player.x = 300; t.player.y = 600; t.player.weapon = 2; t.player.focus = true; t.keys.add('KeyZ');
  let hp = t.boss.hp; t.fireShots(t.STEP); const atFocus = hp - t.boss.hp; t.boss.y = 150; hp = t.boss.hp; t.fireShots(t.STEP); const offFocus = hp - t.boss.hp;
  assert.ok(atFocus > 2.5 * offFocus && offFocus > 0, `focus ${atFocus.toFixed(2)} vs path ${offFocus.toFixed(2)}`);
});
check('momentum: with the shield up, touching an enemy throws it back by J = Δp; thrown far enough, it is gone', () => {
  fieldReset(0); t.player.invuln = 0; t.player.shield = 1; t.player.shieldTime = 12; t.player.x = 300; t.player.y = 400;
  const e = placeEnemy({ deg: 1, hp: 500, x: 300, y: 390, baseX: 300, baseY: 390 }); e.fire = 99;
  t.updateField(t.STEP); assert.equal(t.game.lives, 3); assert.ok(e.kvy < 0, 'thrown up'); assert.ok(t.player.shieldTime < 12, 'the shield paid');
  for (let i = 0; i < 60 && e.alive; i++) { e.age = 0; t.updateField(t.STEP); }
  assert.ok(Math.hypot(e.kx, e.ky) > 20);
  const weak = placeEnemy({ deg: 1, hp: 500, x: 300, y: 395, baseX: 300, baseY: 395 }); weak.kvy = -2000; weak.fire = 99;
  for (let i = 0; i < 30 && weak.alive; i++) { weak.age = 0; t.updateField(t.STEP); } assert.equal(weak.alive, false, 'knocked out of the fight');
  t.player.shield = 0; const touch = placeEnemy({ deg: 1, hp: 50, x: t.player.x, y: t.player.y - 5, baseX: t.player.x, baseY: t.player.y - 5 }); t.player.invuln = 0; t.updateField(t.STEP); assert.equal(t.game.lives, 2, 'without the shield it still hurts');
});
check('EX2 particles: n⁰ decays into p⁺ and e⁻, and a neutral one shrugs off charge shots', () => {
  fieldReset(0); t.game.phase = 10; const n = t.spawnPart('n', 300, 200); n.age = 2.99; n.fire = 99;
  t.updateField(t.STEP); t.updateField(t.STEP);
  const kinds = t.enemies.items.slice(0, t.enemies.count).map(e => e.spec).sort(); assert.deepEqual([...kinds], ['e', 'p']);
  const g = t.spawnPart('gamma', 200, 200); const hp = g.hp; t.damageEnemy(t.enemies.items.indexOf(g), 10, t.P.Q); near(hp - g.hp, 4);
});
check('items fall where they fall: no chasing the pen, only a short reach at the end', () => {
  reset(); t.player.x = 300; t.player.y = 600; t.spawnItem(150, 300, 0); const it = t.items.items[0], x0 = it.x;
  for (let i = 0; i < 60; i++) t.updateItems(t.STEP); assert.ok(Math.abs(it.x - x0) < 10, 'no drift toward the pen'); assert.equal(t.items.count, 1);
  t.spawnItem(t.player.x + 30, t.player.y - 10, 1); for (let i = 0; i < 20; i++) t.updateItems(t.STEP); assert.ok(t.player.lance > 0, 'close enough, it comes');
  // The lance fires beside ∂/∂y, which still clears eˣ.
  fieldReset(); t.player.lance = 9; const ex = placeEnemy({ fn: K.EXP, hp: 30, x: 300, y: 300 }); t.player.x = 300; t.player.y = 600; t.player.weapon = O.P; t.player.focus = true; t.keys.add('KeyZ');
  let frames = 0; while (ex.alive && frames < 120) { t.fireShots(t.STEP); t.updateShots(t.STEP); frames++; } assert.equal(ex.alive, false);
});
check('extra stages run from the chapter list: EX1 with every operator, EX2 with physical tools, each ending on the marked paper', () => {
  for (const [startAt, last, tools] of [[7, 9, 8], [10, 15, 4]]) {
    t.game.startChapter = startAt; t.game.difficulty = 'easy'; t.start(); assert.equal(t.game.phase, startAt); assert.equal(t.game.segment, 'field');
    for (let k = 0; k < tools; k++) assert.ok(t.available(k), `tool ${k + 1}`); assert.equal(t.available(tools), false);
    t.game.phaseTime = t.fields[startAt].duration + 1; t.game.transition = 0; t.update(t.STEP); assert.equal(t.game.segment, 'boss');
    for (let p = startAt; p <= last; p++) { assert.equal(t.game.phase, p); t.game.transition = 0; t.boss.hp = 0; t.update(t.STEP); }
    assert.equal(t.game.mode, 'clear');
  }
  t.game.startChapter = 0;
});
check('every physics boss shows its mechanism: guided beams, a rigid rotor, mass burnt by firing, a Carnot ride, a vortex that drags, light that burns', () => {
  extraBoss(10); t.boss.hp = t.boss.max * .4; for (let i = 0; i < 200; i++) { t.player.invuln = 100; t.update(t.STEP); } assert.ok(t.ext.snakes.length > 0);
  extraBoss(11); for (let i = 0; i < 60; i++) { t.player.invuln = 100; t.update(t.STEP); } assert.ok(t.bullets.items.slice(0, t.bullets.count).filter(b => b.kind === 15).length >= 30, 'rotor arms');
  extraBoss(12); let hp = t.boss.hp; t.game.spawn = 0; t.updateBoss(t.STEP); assert.ok(t.boss.hp < hp, 'firing costs mass');
  extraBoss(13); for (let i = 0; i < 120; i++) { t.player.invuln = 100; t.update(t.STEP); } assert.ok(t.bullets.items.slice(0, t.bullets.count).some(b => b.kind === 17), 'riders on the cycle');
  extraBoss(14); t.boss.hp = t.boss.max * .4; t.updateBoss(t.STEP); const v = t.ext.vort[0]; t.player.x = v.x + 120; t.player.y = v.y; const x0 = t.player.x; t.updateBoss(t.STEP); assert.ok(t.player.x < x0, 'dragged in');
  extraBoss(15); t.game.tangent = 0; t.updateBoss(t.STEP); assert.ok(t.ext.rays.length >= 4 && t.game.optics.length === 2);
  t.boss.hp = t.boss.max * .4; t.game.tangent = 0; t.updateBoss(t.STEP); assert.ok(t.game.optics.some(o => o.f), 'a lens for the second body');
});
// Width and height straight from a PNG header.
function pngSize(file) { const b = fs.readFileSync(file); return [b.readUInt32BE(16), b.readUInt32BE(20)]; }
function skipTalk() { t.keys.add('ControlLeft'); for (let i = 0; i < 400 && t.talk.on; i++) t.update(t.STEP); t.keys.delete('ControlLeft'); }
check('story.js: every line names a cast member and has both languages; drawn pictures exist and are trimmed, the rest wait as todo', () => {
  const story = sandbox.window.STORY, root = path.join(__dirname, '..');
  assert.equal(t.CAST, story.cast, 'the game reads the same cast');
  assert.equal(story.bosses.length, 16, '7 chapters, 3 in EX1, 6 in EX2'); assert.equal(story.mids.length, 6);
  for (const id of [story.player, story.midboss, ...story.bosses, ...story.mids]) assert.ok(story.cast[id], id);
  for (const [id, who] of Object.entries(story.cast)) {
    assert.ok(who.ko && who.en && /^#[0-9a-f]{6}$/i.test(who.color), id);
    // Characters still to be drawn only need a file name to drop their pictures into.
    if (who.todo) { assert.equal(who.file, `pixel_${id}.png`); continue; }
    for (const dir of ['figures', 'figures_tanmak']) {
      const file = path.join(root, dir, who.file); assert.ok(fs.existsSync(file), `${dir}/${who.file}`);
      // The trim table lets file:// pages, which cannot read pixels, still crop the transparent margins.
      const box = html.match(new RegExp(`'${dir}/${who.file.replace('.', '\\.')}':\\[(\\d+),(\\d+),(\\d+),(\\d+)\\]`));
      assert.ok(box, `trim for ${dir}/${who.file}`);
      const [w, h] = pngSize(file), [x, y, bw, bh] = box.slice(1).map(Number);
      assert.ok(x >= 0 && y >= 0 && x + bw <= w && y + bh <= h && bw > w / 2 && bh > h / 2, `${dir}/${who.file} trim inside ${w}×${h}`);
    }
  }
  const needed = ['prologue', ...[1, 2, 3, 4, 5, 6, 7].flatMap(n => [`mid${n}`, `mid${n}-after`, `mid${n}-escape`]), ...[1, 2, 3, 4, 5, 6, 7].flatMap(n => [`boss${n}`, `boss${n}-after`]), 'ex1', 'ex2', ...[8, 9, 10, 11, 12, 13, 14, 15, 16].map(n => `boss${n}`), 'boss10-after', 'boss16-after'];
  for (const id of needed) assert.ok(story.scenes[id] && story.scenes[id].length, id);
  for (const [id, lines] of Object.entries(story.scenes)) for (const [who, ko, en] of lines) {
    assert.ok(story.cast[who], `${id}: ${who}`); assert.ok(ko && en, `${id}: both languages`); assert.doesNotMatch(en, /[가-힣]/, `${id}: ${en}`);
  }
});
check('dialogue: the stage freezes, Z finishes the line then advances, Ctrl skips; bosses talk before and after', () => {
  t.prefs.talk = true;
  try {
    t.game.difficulty = 'easy'; t.game.runMode = 'limited'; t.game.startChapter = 0; t.start();
    assert.equal(t.talk.on, true); assert.equal(t.talk.id, 'prologue');
    const x = t.player.x, clock = t.game.phaseTime; t.keys.add('ArrowRight'); tick(20); t.keys.delete('ArrowRight');
    assert.equal(t.player.x, x); assert.equal(t.game.phaseTime, clock, 'nothing moves while talking'); assert.equal(t.bullets.count, 0);
    key('KeyZ'); assert.equal(t.talk.i, 0, 'the first Z only finishes typing'); key('KeyZ'); assert.equal(t.talk.i, 1);
    key('KeyX'); assert.equal(t.game.bomb, 0, 'no bombs during a talk');
    while (t.talk.on) key('KeyZ');
    t.keys.clear(); t.player.invuln = 100; tick(5); assert.ok(t.game.phaseTime > clock, 'the field runs once the talk closes');
    t.game.transition = 0; t.game.phaseTime = t.fields[0].duration + 1; t.update(t.STEP);
    assert.equal(t.game.segment, 'boss'); assert.equal(t.talk.id, 'boss1'); assert.equal(t.talk.enter, true);
    assert.ok(t.talk.lines.some(l => l[0] === sandbox.window.STORY.bosses[0]), 'the chapter-1 boss speaks');
    skipTalk(); assert.equal(t.talk.on, false); assert.equal(t.game.segment, 'boss');
    t.game.transition = 0; t.boss.hp = 0; t.update(t.STEP);
    assert.equal(t.talk.id, 'boss1-after'); assert.equal(t.game.segment, 'boss', 'the next field waits for the talk');
    skipTalk(); assert.equal(t.game.segment, 'field'); assert.equal(t.game.phase, 1);
    t.beginPhase(6); t.game.transition = 0; t.boss.hp = 0; t.update(t.STEP);
    assert.equal(t.talk.id, 'boss7-after'); assert.equal(t.game.mode, 'playing');
    skipTalk(); assert.equal(t.game.mode, 'clear', 'the marked paper comes after the last words');
    t.prefs.talk = false; t.start(); assert.equal(t.talk.on, false, 'with talk off nothing opens');
  } finally { t.prefs.talk = false; t.talk.on = false; t.keys.clear(); }
});
check('chapter-7 midboss: comes at 9 s, stops the field clock, takes 150% from 𝔼, shrugs off ∮, then hands back the field', () => {
  fieldReset(6); t.game.phaseTime = t.MID_AT; t.update(t.STEP);
  const m = t.midEnemy(); assert.ok(m); assert.equal(m.fn, K.MID); assert.equal(t.game.mid, 1);
  assert.equal(t.enemies.count, 1, 'the field is swept for it');
  const clock = t.game.phaseTime; tick(150);
  assert.equal(t.game.phaseTime, clock, 'field clock stopped'); assert.equal(t.enemies.count, 1, 'no new arrivals'); assert.ok(t.bullets.count > 0, 'it fires');
  const hp = m.hp; t.damageEnemy(0, 10, O.E); near(hp - m.hp, 15); t.damageEnemy(0, 10, O.D); near(hp - m.hp, 22);
  assert.equal(t.damageEnemy(0, 99, O.LOOP), false); near(hp - m.hp, 22);
  t.items.clear(); const score = t.game.score; t.damageEnemy(0, m.hp / 1.5 + 1, O.E);
  assert.equal(m.alive, false); assert.equal(t.game.mid, 2); assert.equal(t.items.count, 1, 'it always drops an item'); assert.equal(t.bullets.count, 0); assert.ok(t.game.score - score >= 30000);
  tick(60); assert.ok(t.game.phaseTime > clock, 'the field clock runs again'); assert.ok(t.enemies.count > 0, 'arrivals resume');
  fieldReset(6); t.game.phaseTime = t.MID_AT; t.update(t.STEP); const late = t.midEnemy(); late.age = t.MID_TIME + .01;
  // The pool hands the freed slot to the next card, so ask for the midboss rather than the old object.
  assert.ok(late); tick(150); assert.equal(t.midEnemy(), null, 'left alone it floats away'); assert.equal(t.game.mid, 2);
  fieldReset(6); t.game.phaseTime = t.MID_AT; t.update(t.STEP); t.game.runMode = 'continue'; t.player.invuln = 0; t.game.lives = 1; t.hit(); t.continueRun();
  assert.ok(t.midEnemy(), 'a continue keeps the midboss on the page');
});
check('a beaten midboss and one that runs out of time leave with different words', () => {
  t.prefs.talk = true;
  try {
    fieldReset(6); skipTalk(); t.game.phaseTime = t.MID_AT; t.update(t.STEP); assert.equal(t.talk.id, 'mid7'); skipTalk();
    const m = t.midEnemy(); t.damageEnemy(t.enemies.items.indexOf(m), m.hp * 2 + 1, O.E); assert.equal(t.talk.id, 'mid7-after'); skipTalk();
    fieldReset(6); skipTalk(); t.game.phaseTime = t.MID_AT; t.update(t.STEP); skipTalk();
    t.midEnemy().age = t.MID_TIME + .01;
    for (let i = 0; i < 200 && !t.talk.on; i++) { t.player.invuln = 100; t.update(t.STEP); }
    assert.equal(t.talk.id, 'mid7-escape'); assert.equal(t.midEnemy(), null); assert.equal(t.game.mid, 2);
  } finally { t.prefs.talk = false; t.talk.on = false; t.keys.clear(); }
});
check('English mode: overlays, HUD, panel, banners, notes and dialogue draw no Korean', () => {
  const hangul = /[ㄱ-ㆎ가-힣]/;
  const body = html.slice(html.indexOf('<body>'));
  assert.equal(body.split('lang="ko"').length, body.split('lang="en"').length, 'every Korean block in the page has an English twin');
  t.setLang('en'); assert.equal(JSON.parse(storage.get('axiom-prefs')).lang, 'en');
  drawn.list = []; drawn.on = true;
  try {
    for (let p = 0; p < 7; p++) {
      fieldReset(p); t.game.maxPhase = 6; t.keys.add('KeyZ'); t.game.banner = 2;
      for (let i = 0; i < 360; i++) { if (i % 60 === 0) t.switchWeapon(); t.player.invuln = 100; t.update(t.STEP); if (i % 45 === 0) t.render(); }
      // Every kind meets a tool it shrugs off, so each bounce note is drawn.
      for (const fn of [K.EXP, K.GAUSS, K.BROWN, K.GBM, K.POIS, K.POLE, K.GEOM, K.SIN, K.FIELD]) {
        const e = placeEnemy({ fn, hp: 30, x: 300, y: 300, matrix: [0, 0, 0, 0] });
        for (const op of [O.D, O.LOOP, O.FT, O.G]) { e.immune = 0; if (e.alive) t.damageEnemy(t.enemies.items.indexOf(e), 1, op); }
      }
      closeCircle(300, 300, 60); t.spawnItem(t.player.x, t.player.y, p % 2); t.updateItems(t.STEP); t.game.itemToast = 2; t.render();
      bossReset(p); t.game.maxPhase = 6; t.game.banner = 2; t.game.itemToast = 2;
      for (const f of [1, .7, .45, .2]) { t.boss.hp = t.boss.max * f; t.game.phaseTime = p === 2 ? 9 : 3; t.update(t.STEP); t.render(); }
      t.damageBoss(1, O.D); t.damageBoss(1, O.P); closeCircle(t.boss.x + 250, t.boss.y, 30); closeCircle(t.boss.x, t.boss.y, 120); t.bomb(); t.update(t.STEP); t.render();
    }
    for (let p = 0; p < 7; p++) { const m = summon(p); t.game.banner = 2; for (let i = 0; i < 200; i++) { m.age += .05; t.update(t.STEP); if (i % 25 === 0) t.render(); } for (const op of [O.LOOP, O.LIM, O.D]) { m.immune = 0; t.damageEnemy(0, 1, op); } t.render(); }
    bossReset(6); for (const f of [.7, .45, .2, .1]) { t.boss.hp = t.boss.max * f; t.updateBoss(t.STEP); t.render(); }
    for (let p = 7; p < 16; p++) { extraBoss(p); t.game.banner = 2; t.game.itemToast = 2; for (const f of [1, .4]) { t.boss.hp = t.boss.max * f; for (let i = 0; i < 90; i++) { t.player.invuln = 100; t.update(t.STEP); } t.keys.add('KeyZ'); for (let k = 0; k < 4; k++) { t.player.weapon = k; t.update(t.STEP); t.render(); } } }
    for (const start of [7, 10]) { t.game.startChapter = start; t.start(); t.game.banner = 2; t.game.itemToast = 2; t.render(); }
    t.game.startChapter = 0; fieldReset(0); t.game.phase = 10; for (const sp of Object.keys(t.PARTS)) t.spawnPart(sp, 300, 200); t.render();
    t.prefs.cards = true; for (const pool of [t.CARDS, t.LAWS]) for (let k = 0; k < pool.length; k += 3) { t.pick.on = true; t.pick.cards = pool.slice(k, k + 3); t.pick.done = null; t.render(); } t.pick.on = false; t.prefs.cards = false;
    t.game.perks.add('green'); t.game.perks.add('newton3'); t.render(); t.game.perks.clear();
    t.game.dnaGraze = t.DNA_GRAZE; for (let k = 0; k < 8; k++) t.game.opKills[k] = t.DNA_KILLS; t.render(); key('KeyV'); for (let i = 0; i < 20; i++) { t.update(t.STEP); t.render(); }
    t.prefs.talk = true;
    for (const id of Object.keys(sandbox.window.STORY.scenes)) { t.startTalk(id); while (t.talk.on) { t.render(); t.advanceTalk(); t.advanceTalk(); } }
    t.prefs.talk = false;
    t.pause(); assert.equal(t.ui.title.textContent, 'Paused'); t.pause();
    t.game.lives = 1; t.player.invuln = 0; t.game.runMode = 'continue'; t.hit(); assert.equal(t.ui.title.textContent, 'Keep solving'); t.continueRun();
    for (const id of ['eyebrow', 'title', 'subtitle', 'description', 'start', 'hint']) drawn.list.push(t.ui[id].textContent);
    drawn.list.push(elements.get('level-help').textContent, elements.get('theme-toggle').textContent);
    assert.equal(elements.get('lang-toggle').textContent, '한국어', 'the way back is offered in its own language');
  } finally { drawn.on = false; t.setLang('ko'); }
  const korean = [...new Set(drawn.list.filter(s => hangul.test(s)))];
  assert.deepEqual(korean, [], `Korean left in English mode: ${korean.join(' | ')}`);
  assert.ok(drawn.list.length > 2000, `${drawn.list.length} strings checked`);
  assert.equal(t.ui.title.textContent, '이어서 풀기', 'switching back redraws the open sheet in Korean');
});
check('dark theme swaps the palette and recolours data and live bullets; light restores every colour', () => {
  assert.deepEqual(Object.keys(t.PALETTES.dark).sort(), Object.keys(t.PALETTES.light).sort());
  reset(); const snapshot = () => JSON.stringify([t.C, t.OPS.map(o => o.color), t.spells.map(s => s.color), t.fields.map(f => f.color), t.KIND_COLOR, t.bulletColors, Object.values(t.MIDS).map(m => m.color)]);
  const before = snapshot(); const b = t.bullet(100, 100, 0, 0, 1, t.C.blue);
  t.setTheme('dark');
  assert.equal(t.C.paper, t.PALETTES.dark.paper); assert.equal(b.color, t.PALETTES.dark.blue); assert.equal(t.OPS[0].color, t.PALETTES.dark.blue);
  assert.ok(t.bulletColors.includes(b.color), 'a live bullet still belongs to a draw batch');
  t.render(); assert.notEqual(snapshot(), before);
  t.setTheme('light'); assert.equal(snapshot(), before); assert.equal(b.color, t.PALETTES.light.blue);
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
