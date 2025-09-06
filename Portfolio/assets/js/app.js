(function(){
  // Footer year
  document.getElementById('year').textContent = new Date().getFullYear();

  // Load certs
  fetch('data/certs.json')
    .then(r => r.json())
    .then(certs => {
      const host = document.getElementById('cert-list');
      host.innerHTML = certs.map(c => 
        <div class="item">
          <div class="badge"></div>
          <h3></h3>
          <p></p>
        </div>
      ).join('');
    }).catch(() => {});

  // Load projects
  fetch('data/projects.json')
    .then(r => r.json())
    .then(items => {
      const host = document.getElementById('project-list');
      host.innerHTML = items.map(p => 
        <div class="item">
          <div class="badge"></div>
          <h3></h3>
          <p></p>
        </div>
      ).join('');
    }).catch(() => {});

  // Playground
  const codeEl = document.getElementById('code');
  const runBtn = document.getElementById('runBtn');
  const saveBtn = document.getElementById('saveBtn');
  const resetBtn = document.getElementById('resetBtn');
  const preview = document.getElementById('preview');

  const KEY = 'portfolio.playground.code';
  const DEFAULT = codeEl.value;

  // Restore saved
  const saved = localStorage.getItem(KEY);
  if (saved) codeEl.value = saved;

  function run(){
    const html = codeEl.value;
    const doc = preview.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();
  }

  run(); // initial

  runBtn?.addEventListener('click', run);
  saveBtn?.addEventListener('click', () => {
    localStorage.setItem(KEY, codeEl.value);
    alert('Saved locally!');
  });
  resetBtn?.addEventListener('click', () => {
    if (confirm('Reset to starter code?')) {
      codeEl.value = DEFAULT;
      localStorage.removeItem(KEY);
      run();
    }
  });
})();
