'use strict';
// Run with node tests/browser.cjs [path-to-playwright-package].
// Set CHROMIUM_PATH to drive an installed Chromium-based browser (e.g. Edge) instead of a downloaded one.
const { chromium } = require(process.argv[2] || 'playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || undefined });
  let succeeded = false;
  try {
    const page = await browser.newPage({ viewport: { width: 1100, height: 960 }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const directory = path.join(__dirname, 'artifacts');
    await fs.mkdir(directory, { recursive: true });
    const file = path.join(__dirname, '..', 'index.html');
    await page.goto(pathToFileURL(file).href);
    await page.locator('#start').waitFor();
    await page.screenshot({ path: path.join(directory, 'title.png'), fullPage: true });
    const backing = await page.evaluate(() => { const c = document.getElementById('game'); return { width: c.width, css: c.clientWidth }; });
    assert.equal(backing.width, Math.round(800 * Math.max(1, Math.round(backing.css / 800 * 20) / 20)), 'backing store matches the displayed size');
    await page.setViewportSize({ width: 420, height: 800 });
    await page.screenshot({ path: path.join(directory, 'title-narrow.png') });
    const titleFits = await page.evaluate(() => { const overlay = document.getElementById('overlay'); return overlay.scrollHeight <= overlay.clientHeight + 2; });
    assert.equal(titleFits, true, 'difficulty, chapter and continue selectors fit in the narrow game overlay');
    await page.setViewportSize({ width: 1100, height: 960 });
    await page.locator('[data-level="insane"]').click();
    assert.equal(await page.locator('[data-level="insane"]').getAttribute('aria-pressed'), 'true');
    assert.match(await page.locator('#level-help').textContent(), /Insane/);
    await page.locator('[data-runmode="limited"]').click();
    assert.equal(await page.locator('[data-runmode="limited"]').getAttribute('aria-pressed'), 'true');
    await page.locator('[data-chapter="3"]').click();
    assert.equal(await page.locator('[data-chapter="3"]').getAttribute('aria-pressed'), 'true');
    await page.locator('[data-chapter="0"]').click();
    await page.locator('[data-level="easy"]').click();
    await page.locator('[data-runmode="continue"]').click();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.getElementById('overlay').hidden);
    // Chapter 1 opens with the prologue; holding Ctrl skips it.
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(directory, 'talk-prologue.png') });
    await page.keyboard.down('Control');
    await page.waitForTimeout(600);
    await page.keyboard.up('Control');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(directory, 'field-live.png') });
    await page.keyboard.down('z');
    await page.waitForTimeout(700);
    await page.keyboard.press('c');
    await page.waitForTimeout(300);
    await page.keyboard.press('p');
    assert.equal(await page.locator('#title').textContent(), '일시정지');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#overlay').isVisible(), false);
    await page.keyboard.up('z');

    // Expose only the test copy's closure for deterministic pattern snapshots.
    const html = (await fs.readFile(file, 'utf8')).replace(/\r\n/g, '\n');
    const marker = '\n  render();requestAnimationFrame(frame);\n})();';
    const names = 'game,player,boss,bullets,shots,warnings,enemies,items,labels,keys,loop,conc,start,beginField,beginPhase,spawnItem,spawnFieldEnemy,updateItems,freezeBullets,switchWeapon,fireShots,updateShots,hit,update,render,bomb,splash,drawBackground,drawEnemies,drawBoss,drawPlayer,drawShots,drawBullets,drawParticles,drawHealth,drawPanel,drawConcentration,prefs,talk,startTalk,advanceTalk,setLang,setTheme,picturesReady,midEnemy,MID_AT,MIDS,spawnTrain,damageEnemy,figure,K,SH,C,fireShots,useful,O';
    // The test copy lives two folders down, so <base> points it back at story.js and the picture folders.
    const instrumented = html.replace(marker, `\n  window.__game={${names}};` + marker).replace('<head>', '<head><base href="../../">');
    const copy = pathToFileURL(path.join(directory, 'instrumented.html')).href;
    await fs.writeFile(path.join(directory, 'instrumented.html'), instrumented);
    await page.goto(copy);
    await page.waitForFunction(() => window.__game && window.__game.picturesReady(), null, { timeout: 20000 });
    await page.evaluate(() => { window.__game.prefs.talk = false; window.__game.start(); window.__game.game.muted = true; });
    for (let phase = 0; phase < 7; phase++) {
      const fieldStats = await page.evaluate(phase => {
        const t = window.__game; t.start(); t.beginField(phase); t.game.transition = 0; t.game.banner = 0; t.player.invuln = 100; t.game.muted = true;
        t.keys.add('KeyZ');
        for (let i = 0; i < 480; i++) t.update(1 / 60);
        t.game.mode = 'paused'; t.render();
        return { phase: t.game.phase, weapon: t.player.weapon, enemies: t.enemies.count, kinds: [...new Set(t.enemies.items.slice(0, t.enemies.count).map(e => e.fn))], bullets: t.bullets.count, mid: !!t.midEnemy() };
      }, phase);
      assert.equal(fieldStats.phase, phase); assert.ok(fieldStats.enemies > 0); assert.ok(fieldStats.bullets > 0 || fieldStats.mid, 'a fresh midboss has swept the bullets');
      await page.screenshot({ path: path.join(directory, `field-${phase + 1}.png`) });
      console.log('Field', fieldStats);
    }
    for (let phase = 0; phase < 7; phase++) {
      const stats = await page.evaluate(phase => {
        const t = window.__game; t.game.mode = 'playing'; t.game.maxPhase = 6; t.beginPhase(phase); t.game.transition = 0; t.game.banner = 0; t.keys.clear(); t.keys.add('KeyZ');
        t.switchWeapon(0);
        for (let i = 0; i < 480; i++) { t.player.invuln = 100; t.update(1 / 60); }
        t.player.focus = true; t.game.mode = 'paused'; t.render();
        const began = performance.now();
        for (let j = 0; j < 20; j++) t.render();
        const renderMs = Math.round((performance.now() - began) / 20 * 100) / 100;
        t.render();
        return { phase: t.game.phase, bullets: t.bullets.count, hp: Math.round(t.boss.hp), body: t.game.bodyIndex, renderMs };
      }, phase);
      await page.screenshot({ path: path.join(directory, `spell-${phase + 1}.png`) });
      assert.equal(stats.phase, phase); assert.ok(stats.bullets > 0); console.log('Rendered', stats);
    }
    await page.evaluate(() => {
      const t = window.__game; t.game.mode = 'playing'; t.beginPhase(1); t.game.transition = 0; t.game.banner = 0; t.game.phaseTime = 8.4; t.game.tangent = 0;
      for (let i = 0; i < 18; i++) { t.player.invuln = 100; t.update(1 / 60); }
      t.game.mode = 'paused'; t.render();
    });
    await page.screenshot({ path: path.join(directory, 'tangent-warning.png') });
    await page.evaluate(() => {
      const t = window.__game; t.game.mode = 'playing'; t.bomb();
      for (let i = 0; i < 35; i++) t.update(1 / 60);
      t.game.mode = 'paused'; t.render();
    });
    await page.screenshot({ path: path.join(directory, 'bomb.png') });
    // Weapon snapshots on a fixed row of enemies: ∂/∂y beam and cone, ∇ homing and the laser-guided lock.
    const weapons = [];
    for (const [weapon, focus, name] of [[1, true, 'partial-laser'], [1, false, 'partial-cone'], [2, false, 'gradient-homing'], [2, true, 'gradient-guided'], [5, false, 'transform-wave'], [6, true, 'expectation-mean']]) {
      weapons.push(await page.evaluate(([weapon, focus]) => {
        const t = window.__game; t.start(); t.game.muted = true; t.beginField(2); t.game.maxPhase = 6; t.game.transition = 0; t.game.banner = 0;
        for (let i = 0; i < 9; i++) t.spawnFieldEnemy();
        const list = t.enemies.items.slice(0, t.enemies.count);
        list.forEach((e, n) => { e.age = 4; e.baseY = 160 + (n % 3) * 70 - 4 * 44; e.baseX = 150 + n * 38; });
        t.update(1 / 60);
        list.forEach(e => { e.fire = 99; });
        // The field roster is random, so ∇ aims at an enemy it can lock onto (eˣ, sin and the like only answer other tools).
        const aim = weapon === 2 ? list.find(e => t.useful(e, t.O.G)) || list[1] : list[1];
        t.player.x = aim.x; t.player.y = 600; t.switchWeapon(weapon); t.keys.clear(); t.keys.add('KeyZ'); if (focus) t.keys.add('ShiftLeft');
        for (let i = 0; i < 30; i++) { t.player.invuln = 100; if (t.player.lock && t.player.lock.alive) t.player.x = t.player.lock.x; t.update(1 / 60); }
        t.game.mode = 'paused'; t.render();
        return { weapon, focus, beam: t.player.beam, paint: t.player.paint, lock: !!t.player.lock, shots: t.shots.count, labels: t.labels.count };
      }, [weapon, focus]));
      await page.screenshot({ path: path.join(directory, `weapon-${name}.png`) });
    }
    console.log('Weapons', weapons);
    assert.equal(weapons[0].beam, 1); assert.equal(weapons[1].beam, 2); assert.ok(weapons[2].shots > 0); assert.equal(weapons[3].paint, true); assert.equal(weapons[3].lock, true);
    assert.ok(weapons[4].shots > 0 && weapons[5].shots > 0);
    // Sequence trains snaking down; then lim sends 2ⁿ to ∞ and every term bursts into an ∞ of stars.
    const trains = await page.evaluate(() => {
      const t = window.__game; t.start(); t.game.muted = true; t.beginField(0); t.game.transition = 0; t.game.banner = 0; t.game.fieldSpawn = 99; t.keys.clear();
      t.spawnTrain(0, 150); t.spawnTrain(3, 300); t.spawnTrain(5, 450);
      for (let i = 0; i < 260; i++) { t.player.invuln = 100; t.game.fieldSpawn = 99; t.update(1 / 60); }
      t.game.mode = 'paused'; t.render(); return t.enemies.count;
    });
    assert.equal(trains, 18);
    await page.screenshot({ path: path.join(directory, 'seq-trains.png') });
    const burst = await page.evaluate(() => {
      const t = window.__game; t.game.mode = 'playing'; t.bullets.clear();
      const i = t.enemies.items.findIndex((e, j) => j < t.enemies.count && e.fn === t.K.SEQ && e.seq === 3); t.damageEnemy(i, 999, 7);
      for (let k = 0; k < 40; k++) { t.player.invuln = 100; t.game.fieldSpawn = 99; t.update(1 / 60); }
      t.game.mode = 'paused'; t.render(); return { enemies: t.enemies.count, bullets: t.bullets.count };
    });
    assert.equal(burst.enemies, 12); assert.ok(burst.bullets >= 60);
    await page.screenshot({ path: path.join(directory, 'lim-diverge.png') });
    // The Riemann midboss of chapter 2 halfway through its refinements, and a grown e²ˣ next to a sin 2x.
    await page.evaluate(() => {
      const t = window.__game; t.start(); t.game.muted = true; t.beginField(1); t.game.transition = 0; t.game.banner = 0; t.game.phaseTime = t.MIDS[1].at; t.keys.clear(); t.keys.add('KeyZ'); t.switchWeapon(7);
      t.update(1 / 60); const m = t.midEnemy(); m.hp = m.max * .5;
      for (let i = 0; i < 300; i++) { t.player.invuln = 100; t.player.x = m.x; t.update(1 / 60); }
      t.game.mode = 'paused'; t.render();
    });
    await page.screenshot({ path: path.join(directory, 'midboss-riemann.png') });
    await page.evaluate(() => {
      const t = window.__game; t.start(); t.game.muted = true; t.beginField(2); t.game.transition = 0; t.game.banner = 0; t.game.fieldSpawn = 99; t.keys.clear();
      const make = (fn, k, coef, x) => { const e = t.enemies.take(); Object.assign(e, { x, y: 200, baseX: x, baseY: 156, age: 1, hp: 60, max: 60, fire: 0, fn, k, coef, deg: 0, phase: 1, p: 0, pd: 0, grow: 40, flash: 0, immune: 0, alive: true, id: 900 + x, type: 2, seed: 0, spec: '' }); };
      make(t.K.EXP, 2, 16, 200); make(t.K.SIN, 2, 8, 400);
      for (let i = 0; i < 70; i++) { t.player.invuln = 100; t.game.fieldSpawn = 99; for (let j = 0; j < t.enemies.count; j++) t.enemies.items[j].baseY = 200 - t.enemies.items[j].age * 44; t.update(1 / 60); }
      t.game.mode = 'paused'; t.render();
    });
    await page.screenshot({ path: path.join(directory, 'chain-growth.png') });
    // Every chapter's magic-circle midboss a few seconds into its fight.
    for (let p = 0; p < 7; p++) {
      const ok = await page.evaluate(p => {
        const t = window.__game; t.start(); t.game.muted = true; t.beginField(p); t.game.transition = 0; t.game.banner = 0; t.game.phaseTime = t.MIDS[p].at; t.keys.clear(); t.update(1 / 60);
        for (let i = 0; i < 220; i++) { t.player.invuln = 100; t.update(1 / 60); }
        t.game.mode = 'paused'; t.render(); return !!t.midEnemy();
      }, p);
      assert.ok(ok, `midboss ${p + 1}`);
      await page.screenshot({ path: path.join(directory, `midboss-${p + 1}.png`) });
    }
    // The last boss in its Turing phase and in chemotaxis, then a DNA strike on it.
    for (const [hp, name] of [[.45, 'turing'], [.2, 'chemotaxis']]) {
      await page.evaluate(hp => {
        const t = window.__game; t.start(); t.game.muted = true; t.beginPhase(6); t.game.transition = 0; t.game.banner = 0; t.boss.hp = t.boss.max * hp; t.keys.clear();
        for (let i = 0; i < 540; i++) { t.player.invuln = 100; t.update(1 / 60); }
        t.game.mode = 'paused'; t.render();
      }, hp);
      await page.screenshot({ path: path.join(directory, `spell-7-${name}.png`) });
    }
    const dna = await page.evaluate(() => {
      const t = window.__game; t.game.mode = 'playing'; t.game.itemToast = 0; t.game.dnaGraze = 100; t.game.opKills.fill(5); t.boss.hp = t.boss.max * .9; const hp = t.boss.hp;
      window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyV' }));
      for (let i = 0; i < 34; i++) { t.player.invuln = 100; t.update(1 / 60); }
      t.game.mode = 'paused'; t.render(); return { taken: hp - t.boss.hp, want: Math.min(hp, t.boss.max / 3) };
    });
    assert.ok(Math.abs(dna.taken - dna.want) < 60, `DNA took ${dna.taken} of ${dna.want}`);
    await page.screenshot({ path: path.join(directory, 'dna-helix.png') });
    // The extra bosses, each a few seconds into its fight (the second body for the physics ones).
    for (let p = 7; p < 16; p++) {
      const ok = await page.evaluate(p => {
        const t = window.__game; t.game.startChapter = p < 10 ? 7 : 10; t.start(); t.game.muted = true; t.beginPhase(p); t.game.transition = 0; t.game.banner = 0; t.keys.clear(); t.keys.add('KeyZ');
        if (p >= 10) t.boss.hp = t.boss.max * .45;
        t.player.weapon = p >= 10 ? (p - 10) % 4 : 3; t.keys.add('ShiftLeft');
        for (let i = 0; i < 300; i++) { t.player.invuln = 100; t.update(1 / 60); }
        t.game.mode = 'paused'; t.render(); t.game.startChapter = 0; return t.game.segment === 'boss' && t.game.phase === p;
      }, p);
      assert.ok(ok, `extra boss ${p}`);
      await page.screenshot({ path: path.join(directory, `extra-${p - 6}.png`) });
    }
    // The theorem picker after a boss, and the ∂/∂y laser leaving a matrix along A·d.
    await page.evaluate(() => {
      const t = window.__game; t.prefs.cards = true; t.start(); t.game.muted = true; t.beginPhase(0); t.game.transition = 0; t.boss.hp = 0; t.update(1 / 60);
      for (let i = 0; i < 20; i++) t.update(1 / 60); t.game.mode = 'paused'; t.render();
    });
    await page.screenshot({ path: path.join(directory, 'theorem-cards.png') });
    await page.evaluate(() => {
      const t = window.__game; t.prefs.cards = false; t.start(); t.game.muted = true; t.beginPhase(4); t.game.transition = 0; t.game.banner = 0; t.keys.clear();
      t.boss.x = 300; t.boss.y = 200; t.player.x = 300; t.player.y = 600; t.player.weapon = 1; t.player.focus = true; t.keys.add('KeyZ'); t.keys.add('ShiftLeft');
      for (let i = 0; i < 4; i++) { t.player.invuln = 100; t.fireShots(1 / 60); }
      t.game.mode = 'paused'; t.render();
    });
    await page.screenshot({ path: path.join(directory, 'laser-matrix.png') });
    // ∮ drawn by hand around a cluster of vortices and sources, captured just as the curve closes.
    const loopStats = await page.evaluate(() => {
      const t = window.__game; t.start(); t.game.muted = true; t.beginField(3); t.game.transition = 0; t.game.banner = 0;
      for (let i = 0; i < 6; i++) t.spawnFieldEnemy();
      const list = t.enemies.items.slice(0, t.enemies.count);
      list.forEach((e, n) => { e.age = 4; e.baseX = 230 + (n % 3) * 70; e.baseY = 250 + Math.floor(n / 3) * 70 - 160; e.fire = 99; });
      t.update(1 / 60); list.forEach(e => { e.fire = 99; });
      t.keys.clear(); t.keys.add('KeyZ'); let closed = -1;
      for (let k = 0; k <= 140; k++) {
        const a = k / 120 * 2 * Math.PI; t.player.x = 300 + 150 * Math.cos(a); t.player.y = 325 + 120 * Math.sin(a); t.player.invuln = 100;
        t.fireShots(1 / 60); t.updateShots(1 / 60);
        if (t.loop.flash > 0) { closed = k; break; }
      }
      for (let i = 0; i < 6; i++) t.update(1 / 60);
      t.game.mode = 'paused'; t.render();
      return { closed, enemies: t.enemies.count, text: t.loop.text };
    });
    console.log('Loop', loopStats);
    assert.ok(loopStats.closed > 100, 'the curve closed after a full turn'); assert.ok(loopStats.enemies < 6);
    await page.screenshot({ path: path.join(directory, 'weapon-loop-trace.png') });
    const tracing = await page.evaluate(() => {
      const t = window.__game; t.start(); t.game.muted = true; t.beginField(3); t.game.transition = 0; t.game.banner = 0; t.keys.clear(); t.keys.add('KeyZ');
      for (let k = 0; k <= 70; k++) { const a = k / 120 * 2 * Math.PI; t.player.x = 300 + 140 * Math.cos(a); t.player.y = 400 + 110 * Math.sin(a); t.fireShots(1 / 60); }
      t.game.mode = 'paused'; t.render(); return t.loop.n;
    });
    assert.ok(tracing > 10);
    await page.screenshot({ path: path.join(directory, 'weapon-loop-pen.png') });
    // Focused ∮ around a pole of the residue boss, and the projection P against the matrix boss.
    await page.evaluate(() => {
      const t = window.__game; t.start(); t.game.muted = true; t.game.maxPhase = 6; t.beginPhase(5); t.game.transition = 0; t.game.banner = 0; t.switchWeapon(3); t.keys.clear(); t.keys.add('KeyZ'); t.keys.add('ShiftLeft');
      for (let i = 0; i < 240; i++) { t.player.invuln = 100; t.update(1 / 60); }
      t.game.phaseTime = 4; t.update(1 / 60); t.player.x = t.boss.x; t.player.y = t.boss.y + 110;
      for (let i = 0; i < 4; i++) { t.player.invuln = 100; t.update(1 / 60); }
      t.game.mode = 'paused'; t.render();
    });
    await page.screenshot({ path: path.join(directory, 'weapon-loop-circle.png') });
    await page.evaluate(() => {
      const t = window.__game; t.start(); t.game.muted = true; t.game.maxPhase = 6; t.beginPhase(4); t.game.transition = 0; t.game.banner = 0; t.switchWeapon(4); t.keys.clear();
      for (let i = 0; i < 300; i++) { t.player.invuln = 100; t.update(1 / 60); }
      t.keys.add('KeyZ'); t.keys.add('ShiftLeft');
      for (let i = 0; i < 40; i++) { t.player.invuln = 100; t.update(1 / 60); }
      t.game.mode = 'paused'; t.render();
    });
    await page.screenshot({ path: path.join(directory, 'weapon-inverse-projection.png') });
    // The reaction–diffusion boss after its fronts have had time to spread.
    await page.evaluate(() => {
      const t = window.__game; t.start(); t.game.muted = true; t.beginPhase(6); t.game.transition = 0; t.game.banner = 0; t.keys.clear();
      t.boss.hp = t.boss.max * .6; for (let i = 0; i < 900; i++) { t.player.invuln = 100; t.update(1 / 60); }
      t.game.mode = 'paused'; t.render();
    });
    await page.screenshot({ path: path.join(directory, 'spell-7-spread.png') });
    await page.evaluate(() => {
      const t = window.__game; t.start(); t.beginPhase(2); t.game.transition = 0; t.game.banner = 0; t.game.phaseTime = 6; t.game.spawn = 0; t.game.aimed = 0; t.switchWeapon(0); t.keys.clear(); t.keys.add('KeyZ');
      for (let i = 0; i < 200; i++) { t.player.invuln = 100; t.player.x = t.boss.x; t.update(1 / 60); }
      t.game.mode = 'paused'; t.render();
    });
    await page.screenshot({ path: path.join(directory, 'spell-3-armor.png') });
    await page.evaluate(() => {
      const t = window.__game; t.start(); t.beginField(0); t.game.transition = 0; t.game.mode = 'playing';
      t.spawnItem(t.player.x, t.player.y - 60, 0); t.spawnItem(t.player.x + 70, t.player.y - 120, 1);
      t.freezeBullets(); t.game.mode = 'paused'; t.render();
    });
    await page.screenshot({ path: path.join(directory, 'items-and-skill.png') });
    await page.evaluate(() => { const t = window.__game; t.game.mode = 'playing'; t.game.runMode = 'continue'; t.game.lives = 1; t.player.invuln = 0; t.hit(); });
    assert.equal(await page.locator('#title').textContent(), '이어서 풀기');
    await page.locator('#start').click();
    assert.equal(await page.evaluate(() => window.__game.game.continues), 1);
    await page.evaluate(() => { const t = window.__game; t.beginPhase(6); t.game.transition = 0; t.boss.hp = 0; t.update(1 / 60); });
    assert.equal(await page.locator('#title').textContent(), 'Q.E.D.');
    await page.screenshot({ path: path.join(directory, 'clear.png') });
    await page.setViewportSize({ width: 420, height: 800 });
    await page.screenshot({ path: path.join(directory, 'narrow.png') });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);

    // A 2× display gets twice the backing pixels, so lines and glyphs stay sharp.
    const hidpi = await browser.newPage({ viewport: { width: 1100, height: 960 }, deviceScaleFactor: 2 });
    hidpi.on('pageerror', e => errors.push(e.message));
    await hidpi.goto(copy);
    await hidpi.waitForFunction(() => window.__game && window.__game.picturesReady(), null, { timeout: 20000 });
    const dense = await hidpi.evaluate(() => {
      const t = window.__game; t.prefs.talk = false; t.game.muted = true; t.start(); t.beginField(4); t.game.transition = 0; t.game.banner = 0; t.keys.add('KeyZ');
      for (let i = 0; i < 420; i++) { t.player.invuln = 100; t.update(1 / 60); }
      t.game.mode = 'paused'; t.render();
      const c = document.getElementById('game'); return { width: c.width, css: c.clientWidth };
    });
    assert.ok(dense.width >= dense.css * 2 - 40, `backing ${dense.width}px for ${dense.css} CSS px`);
    await hidpi.locator('.stage').screenshot({ path: path.join(directory, 'hidpi-field-5.png') });
    console.log('HiDPI', dense);
    // A boss talk at 2×: the portrait and its box, in Korean and then in English.
    for (const lang of ['ko', 'en']) {
      await hidpi.evaluate(lang => {
        const t = window.__game; t.setLang(lang); t.prefs.talk = true; t.start(); t.beginPhase(4); t.game.mode = 'playing';
        t.startTalk('boss5', null, true); for (let i = 0; i < 90; i++) t.update(1 / 60); t.advanceTalk(); t.advanceTalk(); for (let i = 0; i < 30; i++) t.update(1 / 60); t.render();
      }, lang);
      await hidpi.locator('.stage').screenshot({ path: path.join(directory, `talk-boss-${lang}.png`) });
    }
    // The chapter-7 midboss and a dark sheet; then "shapes only" brings back the bare geometry.
    await hidpi.evaluate(() => { const t = window.__game; t.setLang('ko'); t.prefs.talk = false; t.setTheme('dark'); t.start(); t.beginField(6); t.game.transition = 0; t.game.banner = 0; t.game.phaseTime = t.MID_AT; t.keys.clear(); t.keys.add('KeyZ');
      for (let i = 0; i < 240; i++) { t.player.invuln = 100; t.update(1 / 60); } t.game.mode = 'paused'; t.render(); });
    assert.ok(await hidpi.evaluate(() => !!window.__game.midEnemy()));
    await hidpi.locator('.stage').screenshot({ path: path.join(directory, 'midboss-dark.png') });
    await hidpi.evaluate(() => { const t = window.__game; t.game.mode = 'playing'; t.beginPhase(2); t.game.transition = 0; t.game.banner = 0; for (let i = 0; i < 300; i++) { t.player.invuln = 100; t.update(1 / 60); } t.game.mode = 'paused'; t.render(); });
    await hidpi.locator('.stage').screenshot({ path: path.join(directory, 'spell-3-dark.png') });
    await hidpi.evaluate(() => { const t = window.__game; t.setTheme('light'); t.prefs.shapes = true; t.render(); });
    await hidpi.locator('.stage').screenshot({ path: path.join(directory, 'spell-3-shapes.png') });
    await hidpi.evaluate(() => { window.__game.prefs.shapes = false; });
    assert.deepEqual(errors, []);
    console.log('PASS Chromium: file:// launch with pictures, prologue skip, keyboard start/shoot/switch/pause/resume, seven fields and spells, every weapon, ∮ curves, projection, reaction–diffusion, boss talks in both languages, midboss, dark sheet, clear stamp, HiDPI backing store, responsive layout, zero JS errors.');
    succeeded = true;
  } finally {
    // Some Windows headless drivers hang on teardown after closing audio pages.
    // Bound driver shutdown so a completed verification never blocks the shell.
    const cleanup = setTimeout(() => {
      console.warn('Chromium teardown exceeded 8 seconds; ending the test driver.');
      process.exit(succeeded ? 0 : 1);
    }, 8000);
    await browser.close();
    clearTimeout(cleanup);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
