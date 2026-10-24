import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const siteSource = readFileSync(new URL('../public/assets/site.js', import.meta.url), 'utf8');

class Element {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.dataset = {};
    this.className = '';
    this.textContent = '';
    this.hidden = false;
    this.handlers = {};
    this.classList = {
      toggle: (name, enabled) => {
        const classes = new Set(this.className.split(/\s+/).filter(Boolean));
        if (enabled) classes.add(name);
        else classes.delete(name);
        this.className = [...classes].join(' ');
      }
    };
  }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  addEventListener(event, callback) { this.handlers[event] = callback; }
  click() { this.handlers.click?.(); }
  get visibleText() { return [this.textContent, ...this.children.map(node => node.visibleText)].join(' '); }
}

function harness(fetchImplementation) {
  const all = new Element();
  all.dataset.projectGrid = 'all';
  const featured = new Element();
  featured.dataset.projectGrid = 'featured';
  const filters = ['All', 'HEAVEN', 'AI', 'Tools'].map(category => {
    const button = new Element('button');
    button.dataset.filter = category;
    return button;
  });
  const empty = new Element();
  const year = new Element();
  const callbacks = {};
  const document = {
    createElement: tag => new Element(tag),
    querySelectorAll: selector => ({
      '[data-project-grid]': [all, featured],
      '[data-filter]': filters,
      '[data-year]': [year]
    }[selector] ?? []),
    querySelector: selector => selector === '#empty-projects' ? empty : null,
    addEventListener: (event, callback) => { callbacks[event] = callback; }
  };
  runInNewContext(siteSource, {
    document,
    fetch: fetchImplementation,
    AbortController,
    setTimeout,
    clearTimeout,
    Date
  }, { filename: 'public/assets/site.js' });
  return {
    all, featured, empty, filters,
    init: () => callbacks.DOMContentLoaded(),
    select: category => filters.find(button => button.dataset.filter === category).click()
  };
}

const exampleProjects = [
  { title: 'HEAVEN FPS', category: 'HEAVEN', status: 'In development', summary: 'Game', featured: 1, url: '/heaven.html' },
  { title: 'AI Workstation', category: 'AI', status: 'Local build', summary: 'AI', featured: 0, url: 'https://example.org/app' },
  { title: 'Code Forge', category: 'Tools', status: 'Local build', summary: 'Tools', featured: 1, url: 'http://example.org/forge' }
];

for (const [label, fetchImplementation] of [
  ['network failure', async () => { throw Error('network unavailable'); }],
  ['HTTP 503', async () => ({ ok: false, status: 503 })],
  ['invalid JSON', async () => ({ ok: true, json: async () => { throw SyntaxError('invalid JSON'); } })],
  ['HTTP 200 with missing projects', async () => ({ ok: true, json: async () => ({ error: 'backend failure' }) })],
  ['HTTP 200 with null projects', async () => ({ ok: true, json: async () => ({ projects: null }) })],
  ['HTTP 200 with non-array projects', async () => ({ ok: true, json: async () => ({ projects: 'invalid' }) })]
]) {
  test(`project API ${label} remains an error after changing filters`, async () => {
    const page = harness(fetchImplementation);
    await page.init();
    for (const category of ['All', 'HEAVEN', 'AI', 'Tools']) {
      page.select(category);
      assert.match(page.all.visibleText, /Project listing is temporarily unavailable/);
      assert.match(page.featured.visibleText, /Project listing is temporarily unavailable/);
      assert.doesNotMatch(page.all.visibleText, /No projects in this category/);
      assert.equal(page.empty.hidden, true);
    }
  });
}

test('healthy API filters projects and preserves featured cards', async () => {
  const page = harness(async (url, options) => {
    assert.equal(url, '/api/projects');
    assert.equal(options.headers.Accept, 'application/json');
    assert.ok(options.signal);
    return { ok: true, json: async () => ({ projects: exampleProjects }) };
  });
  await page.init();
  assert.equal(page.all.children.length, 3);
  assert.equal(page.featured.children.length, 2);
  page.select('HEAVEN');
  assert.equal(page.all.children.length, 1);
  assert.match(page.all.visibleText, /HEAVEN FPS/);
  page.select('AI');
  assert.equal(page.all.children.length, 1);
  assert.match(page.all.visibleText, /AI Workstation/);
  assert.equal(page.featured.children.length, 2);
  page.select('Tools');
  assert.equal(page.all.children.length, 1);
  assert.match(page.all.visibleText, /Code Forge/);
  page.select('All');
  assert.equal(page.all.children.length, 3);
});

test('HTTP and HTTPS project cards open safely in a new tab', async () => {
  const page = harness(async () => ({ ok: true, json: async () => ({ projects: exampleProjects }) }));
  await page.init();
  for (const project of page.all.children.filter(card => /^https?:/.test(card.href ?? ''))) {
    assert.equal(project.tagName, 'A');
    assert.equal(project.target, '_blank');
    assert.equal(project.rel, 'noopener noreferrer');
  }
});
