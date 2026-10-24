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
    this.attributes = {};
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
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name] ?? null; }
  addEventListener(event, callback) { this.handlers[event] = callback; }
  click() { return this.handlers.click?.(); }
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
    select: category => filters.find(button => button.dataset.filter === category).click(),
    retryButton: () => all.children.find(node => node.tagName === 'BUTTON'),
    retry: () => all.children.find(node => node.tagName === 'BUTTON')?.click()
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

test('project filters expose their selected state to assistive technology', async () => {
  const page = harness(async () => ({ ok: true, json: async () => ({ projects: exampleProjects }) }));
  await page.init();
  const selected = () => page.filters.filter(button => button.getAttribute('aria-pressed') === 'true');
  assert.equal(selected().length, 1);
  assert.equal(selected()[0].dataset.filter, 'All');
  for (const category of ['HEAVEN', 'AI', 'Tools', 'All']) {
    page.select(category);
    assert.equal(selected().length, 1, 'exactly one filter should be announced as selected');
    assert.equal(selected()[0].dataset.filter, category);
    assert.ok(page.filters.every(button => ['true', 'false'].includes(button.getAttribute('aria-pressed'))));
  }
});


test('project listings recover from transient API failure without reloading or losing the selected filter', async () => {
  let requests = 0;
  const page = harness(async () => {
    requests++;
    if (requests === 1) throw Error('temporary network failure');
    return { ok: true, json: async () => ({ projects: exampleProjects }) };
  });
  await page.init();
  assert.match(page.all.visibleText, /Project listing is temporarily unavailable/);
  assert.equal(page.retryButton()?.textContent, 'Retry loading projects');
  page.select('AI');
  await page.retry();
  assert.equal(requests, 2);
  assert.equal(page.all.children.length, 1);
  assert.match(page.all.visibleText, /AI Workstation/);
  assert.equal(page.retryButton(), undefined);
  assert.equal(page.featured.children.length, 2);
});

test('retry prevents overlapping requests and remains available after another API failure', async () => {
  let requests = 0;
  let release;
  const page = harness(async () => {
    requests++;
    if (requests === 1) throw Error('initial outage');
    if (requests === 2) return new Promise(resolve => {
      release = () => resolve({ ok: false, status: 503 });
    });
    return { ok: true, json: async () => ({ projects: exampleProjects }) };
  });
  await page.init();
  const button = page.retryButton();
  const pending = button.click();
  assert.equal(button.disabled, true);
  await button.click();
  assert.equal(requests, 2);
  release();
  await pending;
  assert.match(page.all.visibleText, /Project listing is temporarily unavailable/);
  assert.equal(page.retryButton()?.textContent, 'Retry loading projects');
  await page.retry();
  assert.equal(requests, 3);
  assert.equal(page.all.children.length, 3);
});


test('filter changes during an in-flight retry preserve its disabled state and recover afterward', async () => {
  let requests = 0;
  let release;
  const page = harness(async () => {
    requests++;
    if (requests === 1) throw Error('initial outage');
    if (requests === 2) return new Promise(resolve => {
      release = () => resolve({ ok: false, status: 503 });
    });
    return { ok: true, json: async () => ({ projects: exampleProjects }) };
  });
  await page.init();
  const pending = page.retry();
  assert.equal(page.retryButton()?.disabled, true);
  page.select('AI');
  assert.equal(page.retryButton()?.disabled, true, 'a filter change must not re-enable retry while loading');
  assert.equal(page.retryButton()?.textContent, 'Retrying…');
  await page.retry();
  assert.equal(requests, 2, 'a second click must not create another request');
  release();
  await pending;
  assert.equal(page.retryButton()?.disabled, false, 'retry must re-enable after failure');
  assert.equal(page.retryButton()?.textContent, 'Retry loading projects');
  await page.retry();
  assert.equal(requests, 3);
  assert.equal(page.all.children.length, 1);
  assert.match(page.all.visibleText, /AI Workstation/);
});


test('malformed relative project URLs never create navigable offsite cards', async () => {
  const unsafe = ['/\\attacker.example/path', '/\t/attacker.example/path', '//attacker.example/path'];
  const page = harness(async () => ({ ok: true, json: async () => ({
    projects: unsafe.map((url, index) => ({ ...exampleProjects[0], title: 'Unsafe ' + index, url }))
  }) }));
  await page.init();
  assert.equal(page.all.children.length, unsafe.length);
  assert.ok(page.all.children.every(card => card.tagName === 'ARTICLE' && !card.href));
});
