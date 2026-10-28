'use strict';
// Run with node tests/browser.cjs [path-to-playwright-package].
const { chromium } = require(process.argv[2] || 'playwright');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');

(async () => {
  const browser = await chromium.launch({ headless: true });
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
    await page.setViewportSize({ width: 420, height: 800 });
    await page.screenshot({ path: path.join(directory, 'title-narrow.png') });
    const titleFits = await page.evaluate(() => { const overlay = document.getElementById('overlay'); return overlay.scrollHeight <= overlay.clientHeight + 2; });
    assert.equal(titleFits, true, 'difficulty and continue selectors fit in the narrow game overlay');
    await page.setViewportSize({ width: 1100, height: 960 });
    await page.locator('[data-level="insane"]').click();
    assert.equal(await page.locator('[data-level="insane"]').getAttribute('aria-pressed'), 'true');
    assert.match(await page.locator('#level-help').textContent(), /Insane/);
    await page.locator('[data-runmode="limited"]').click();
    assert.equal(await page.locator('[data-runmode="limited"]').getAttribute('aria-pressed'), 'true');
    await page.locator('[data-level="easy"]').click();
    await page.locator('[data-runmode="continue"]').click();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.getElementById('overlay').hidden);
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(directory, 'field-live.png') });
    await page.keyboard.down('z');
    await page.waitForTimeout(700);
    await page.keyboard.press('p');
    assert.equal(await page.locator('#title').textContent(), '일시정지');
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#overlay').isVisible(), false);
    await page.keyboard.up('z');

    // Expose only the test copy's closure for deterministic pattern snapshots.
    const html = await fs.readFile(file, 'utf8');
    const marker = '\n  render();requestAnimationFrame(frame);\n})();';
    const instrumented = html.replace(marker, '\n  window.__game={game,player,boss,bullets,shots,warnings,enemies,items,keys,start,beginField,beginPhase,spawnItem,updateItems,freezeBullets,hit,update,render,bomb,drawBackground,drawBoss,drawPlayer,drawShots,drawBullets,drawParticles,drawHealth,drawPanel};' + marker);
    await page.setContent(instrumented);
    await page.evaluate(() => { window.__game.start(); window.__game.game.muted = true; });
    for (let phase = 0; phase < 3; phase++) {
      const fieldStats = await page.evaluate(phase => {
        const t = window.__game; t.start(); t.beginField(phase); t.game.transition = 0; t.player.invuln = 100; t.game.muted = true;
        for (let i = 0; i < 480; i++) t.update(1 / 60);
        t.game.mode = 'paused'; t.render();
        return { phase: t.game.phase, enemies: t.enemies.count, bullets: t.bullets.count, items: t.items.count };
      }, phase);
      assert.equal(fieldStats.phase, phase); assert.ok(fieldStats.enemies > 0); assert.ok(fieldStats.bullets > 0);
      await page.screenshot({ path: path.join(directory, `field-${phase + 1}.png`) });
      console.log('Field', fieldStats);
    }
    for (let phase = 0; phase < 3; phase++) {
      const stats = await page.evaluate(phase => {
        const t = window.__game; t.game.mode = 'playing'; t.beginPhase(phase); t.game.transition = 0; t.keys.add('KeyZ');
        for (let i = 0; i < 480; i++) { t.player.invuln = 100; t.update(1 / 60); }
        t.player.focus = true; t.game.mode = 'paused'; t.render();
        const began = performance.now();
        for (let j = 0; j < 20; j++) t.render();
        const renderMs = Math.round((performance.now() - began) / 20 * 100) / 100;
        const profile = {};
        if (phase === 2) for (const name of ['drawBackground','drawBoss','drawPlayer','drawShots','drawBullets','drawParticles','drawHealth','drawPanel']) {
          const began = performance.now(); for (let j = 0; j < 10; j++) t[name](); profile[name] = Math.round((performance.now() - began) / 10 * 100) / 100;
        }
        t.render();
        return { phase: t.game.phase, bullets: t.bullets.count, hp: t.boss.hp, graze: t.game.graze, renderMs, profile };
      }, phase);
      await page.screenshot({ path: path.join(directory, `spell-${phase + 1}.png`) });
      assert.equal(stats.phase, phase); assert.ok(stats.bullets > 0); console.log('Rendered', stats);
    }
    await page.evaluate(() => {
      const t = window.__game; t.game.mode = 'playing'; t.beginPhase(1); t.game.transition = 0; t.game.phaseTime = 8.4; t.game.tangent = 0;
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
    await page.evaluate(() => {
      const t = window.__game; t.start(); t.beginField(0); t.game.transition = 0; t.game.mode = 'playing';
      t.spawnItem(t.player.x, t.player.y - 60, 0); t.spawnItem(t.player.x + 70, t.player.y - 120, 1);
      t.freezeBullets(); t.game.mode = 'paused'; t.render();
    });
    await page.screenshot({ path: path.join(directory, 'items-and-skill.png') });
    await page.evaluate(() => { const t = window.__game; t.game.mode = 'playing'; t.game.runMode = 'continue'; t.game.lives = 1; t.player.invuln = 0; t.hit(); });
    assert.equal(await page.locator('#title').textContent(), '이어서 관측');
    await page.locator('#start').click();
    assert.equal(await page.evaluate(() => window.__game.game.continues), 1);
    await page.setViewportSize({ width: 420, height: 800 });
    await page.screenshot({ path: path.join(directory, 'narrow.png') });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    console.log('PASS Chromium: file:// launch, keyboard start/shoot/pause/resume, three spell renders, telegraph, bomb, responsive layout, zero JS errors.');
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
