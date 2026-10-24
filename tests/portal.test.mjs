import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync(new URL('../public/game/portal.js', import.meta.url), 'utf8');

function portal(fetchImplementation) {
  const nodes = new Map(['server-status', 'server-detail', 'server-banner', 'play-button', 'dev-game-link', 'refresh-button'].map(id => [id, {
    hidden: id === 'play-button' || id === 'dev-game-link',
    textContent: '', className: '', disabled: false, handlers: {},
    addEventListener(event, handler) { this.handlers[event] = handler; }
  }]));
  const timers = new Map();
  let timerId = 0;
  const document = { getElementById: id => nodes.get(id), hidden: false };
  runInNewContext(source, {
    document,
    fetch: fetchImplementation,
    AbortController,
    setTimeout: callback => { const id = ++timerId; timers.set(id, callback); return id; },
    clearTimeout: id => timers.delete(id),
    setInterval: () => {}
  });
  return {
    get: id => nodes.get(id),
    tick: () => { for (const [id, callback] of [...timers]) { timers.delete(id); callback(); } },
    timers,
    refresh: () => nodes.get('refresh-button').handlers.click()
  };
}
const flush = async () => { for (let i = 0; i < 10; i++) await new Promise(resolve => setImmediate(resolve)); };

test('offline status keeps Play and developer links hidden', async () => {
  const p = portal(async () => ({ ok: true, json: async () => ({ online: false }) }));
  await flush();
  assert.equal(p.get('server-status').textContent, 'Server offline');
  assert.equal(p.get('play-button').hidden, true);
  assert.equal(p.get('dev-game-link').hidden, true);
  assert.equal(p.get('refresh-button').disabled, false);
  assert.equal(p.timers.size, 0);
});

test('verified ready response reveals game links', async () => {
  const p = portal(async () => ({ ok: true, json: async () => ({ online: true, destination: 'https://play.projectheaven.site/', version: '0.10.8.43', players: 2 }) }));
  await flush();
  assert.equal(p.get('server-status').textContent, 'Server online');
  assert.equal(p.get('play-button').hidden, false);
  assert.equal(p.get('dev-game-link').hidden, false);
  assert.equal(p.get('play-button').href, 'https://play.projectheaven.site/');
  assert.equal(p.timers.size, 0);
});

test('stalled JSON body times out, restores refresh and hides links', async () => {
  const p = portal(async (_url, options) => ({
    ok: true,
    json: () => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new Error('aborted')));
    })
  }));
  await flush();
  assert.equal(p.get('server-status').textContent, 'Checking live server…');
  assert.equal(p.timers.size, 1, 'timeout must remain active until JSON is read');
  p.tick();
  await flush();
  assert.equal(p.get('server-status').textContent, 'Server offline');
  assert.equal(p.get('play-button').hidden, true);
  assert.equal(p.get('dev-game-link').hidden, true);
  assert.equal(p.get('refresh-button').disabled, false);
  assert.equal(p.timers.size, 0);
});
