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
    const html = await fs.readFile(file, 'utf8');
    const marker = '\n  render();requestAnimationFrame(frame);\n})();';
    const names = 'game,player,boss,bullets,shots,warnings,enemies,items,labels,keys,loop,conc,start,beginField,beginPhase,spawnItem,spawnFieldEnemy,updateItems,freezeBullets,switchWeapon,fireShots,updateShots,hit,update,render,bomb,splash,drawBackground,drawEnemies,drawBoss,drawPlayer,drawShots,drawBullets,drawParticles,drawHealth,drawPanel,drawConcentration';
    const instrumented = html.replace(marker, `\n  window.__game={${names}};` + marker);
    await page.setContent(instrumented);
    await page.evaluate(() => { window.__game.start(); window.__game.game.muted = true; });
    for (let phase = 0; phase < 7; phase++) {
      const fieldStats = await page.evaluate(phase => {
        const t = window.__game; t.start(); t.beginField(phase); t.game.transition = 0; t.game.banner = 0; t.player.invuln = 100; t.game.muted = true;
        t.keys.add('KeyZ');
        for (let i = 0; i < 480; i++) t.update(1 / 60);
        t.game.mode = 'paused'; t.render();
        return { phase: t.game.phase, weapon: t.player.weapon, enemies: t.enemies.count, kinds: [...new Set(t.enemies.items.slice(0, t.enemies.count).map(e => e.fn))], bullets: t.bullets.count };
      }, phase);
      assert.equal(fieldStats.phase, phase); assert.ok(fieldStats.enemies > 0); assert.ok(fieldStats.bullets > 0);
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
        t.player.x = list[1].x; t.player.y = 600; t.switchWeapon(weapon); t.keys.clear(); t.keys.add('KeyZ'); if (focus) t.keys.add('ShiftLeft');
        for (let i = 0; i < 30; i++) { t.player.invuln = 100; if (t.player.lock && t.player.lock.alive) t.player.x = t.player.lock.x; t.update(1 / 60); }
        t.game.mode = 'paused'; t.render();
        return { weapon, focus, beam: t.player.beam, paint: t.player.paint, lock: !!t.player.lock, shots: t.shots.count, labels: t.labels.count };
      }, [weapon, focus]));
      await page.screenshot({ path: path.join(directory, `weapon-${name}.png`) });
    }
    console.log('Weapons', weapons);
    assert.equal(weapons[0].beam, 1); assert.equal(weapons[1].beam, 2); assert.ok(weapons[2].shots > 0); assert.equal(weapons[3].paint, true); assert.equal(weapons[3].lock, true);
    assert.ok(weapons[4].shots > 0 && weapons[5].shots > 0);
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
    await hidpi.setContent(instrumented);
    const dense = await hidpi.evaluate(() => {
      const t = window.__game; t.game.muted = true; t.start(); t.beginField(4); t.game.transition = 0; t.game.banner = 0; t.keys.add('KeyZ');
      for (let i = 0; i < 420; i++) { t.player.invuln = 100; t.update(1 / 60); }
      t.game.mode = 'paused'; t.render();
      const c = document.getElementById('game'); return { width: c.width, css: c.clientWidth };
    });
    assert.ok(dense.width >= dense.css * 2 - 40, `backing ${dense.width}px for ${dense.css} CSS px`);
    await hidpi.locator('.stage').screenshot({ path: path.join(directory, 'hidpi-field-5.png') });
    console.log('HiDPI', dense);
    assert.deepEqual(errors, []);
    console.log('PASS Chromium: file:// launch, keyboard start/shoot/switch/pause/resume, seven fields and spells, every weapon, ∮ curves, projection, reaction–diffusion, clear stamp, HiDPI backing store, responsive layout, zero JS errors.');
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
