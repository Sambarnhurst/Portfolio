import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/projects.html', import.meta.url), 'utf8');

test('project filters have an accessible group label and one selected default', () => {
  const group = html.match(/<div\b[^>]*class="filter-bar"[^>]*>/)?.[0];
  assert.ok(group, 'project filter container must exist');
  assert.match(group, /\brole="group"/, 'a generic div needs a group role for its label to be exposed');
  assert.match(group, /\baria-label="Filter projects"/);

  const buttons = [...html.matchAll(/<button\b[^>]*\bdata-filter="([^"]+)"[^>]*>/g)];
  assert.deepEqual(buttons.map(match => match[1]), ['All', 'HEAVEN', 'AI', 'Tools', 'Apps']);
  const selected = buttons.filter(match => /\baria-pressed="true"/.test(match[0]));
  assert.equal(selected.length, 1, 'only one filter is selected before JavaScript runs');
  assert.equal(selected[0][1], 'All');
  assert.ok(buttons.every(match => /\baria-pressed="(?:true|false)"/.test(match[0])));
});
