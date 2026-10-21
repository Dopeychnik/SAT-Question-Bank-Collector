
/* SAT Question Bank Collector v1.0 — unofficial educational utility.
   Run on the SAT Educator Question Bank website after reviewing the source.
   Does not bypass authentication, access controls, or rate limits.
*/
(async () => {
  const PANEL_ID = 'sqbc-v1-panel';
  document.getElementById(PANEL_ID)?.remove();
  const API = 'https://qbank-api.collegeboard.org/msreportingquestionbank-prod/questionbank/digital/';
  const DOMAINS = [
    ['INI', 'Information and Ideas'],
    ['CAS', 'Craft and Structure'],
    ['SEC', 'Standard English Conventions'],
    ['EOI', 'Expression of Ideas']
  ];
  const DB_NAME = 'sat-qbank-collector-v1';
  const catalog = new Map();
  const downloaded = new Map();
  let db, busy = false, stopped = false;

  function openDatabase() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const database = req.result;
        if (!database.objectStoreNames.contains('catalog')) database.createObjectStore('catalog', { keyPath: 'external_id' });
        if (!database.objectStoreNames.contains('questions')) database.createObjectStore('questions', { keyPath: 'external_id' });
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  function dbPut(store, item) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, 'readwrite');
      tx.objectStore(store).put(item);
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }
  function dbAll(store) {
    return new Promise((resolve, reject) => {
      const req = db.transaction(store, 'readonly').objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  async function post(endpoint, body) {
    const response = await fetch(API + endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error(`${endpoint}: HTTP ${response.status}`);
    return response.json();
  }
  function unwrap(data) {
    if (Array.isArray(data)) return data;
    if (!data || typeof data !== 'object') return [];
    return Object.values(data).flatMap(v => Array.isArray(v) ? v : []);
  }
  function make(tag, parent, props = {}) {
    const element = document.createElement(tag);
    Object.assign(element, props);
    if (parent) parent.appendChild(element);
    return element;
  }
  const panel = make('section', document.body, { id: PANEL_ID });
  panel.style.cssText = `position:fixed;top:18px;right:18px;width:390px;max-width:calc(100vw - 36px);max-height:calc(100vh - 36px);overflow:auto;z-index:2147483647;background:#101827;color:#e2e8f0;border:1px solid #334155;border-radius:16px;box-shadow:0 20px 65px #0009;font:13px/1.5 system-ui,sans-serif;padding:18px;box-sizing:border-box`;
  const style = make('style', panel);
  style.textContent = `#${PANEL_ID} *{box-sizing:border-box}#${PANEL_ID} h2{font-size:17px;margin:0}#${PANEL_ID} h3{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#94a3b8;margin:15px 0 8px}#${PANEL_ID} label{display:flex;align-items:center;gap:7px;padding:3px 0;cursor:pointer}#${PANEL_ID} input{accent-color:#60a5fa}#${PANEL_ID} button{background:#2563eb;color:white;border:0;border-radius:8px;padding:8px 10px;cursor:pointer;font:inherit}#${PANEL_ID} button.secondary{background:#334155}#${PANEL_ID} button:disabled{opacity:.5;cursor:default}#${PANEL_ID} .buttons{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}#${PANEL_ID} .muted{color:#94a3b8}#${PANEL_ID} .skills{max-height:190px;overflow:auto;background:#0b1220;border:1px solid #334155;padding:9px;border-radius:9px}#${PANEL_ID} .meter{height:8px;background:#334155;border-radius:10px;overflow:hidden;margin:10px 0}#${PANEL_ID} .fill{height:100%;background:#60a5fa;width:0%;transition:width .2s}#${PANEL_ID} .status{white-space:pre-wrap;overflow-wrap:anywhere;background:#0b1220;border-radius:9px;padding:10px;color:#bfdbfe;min-height:44px}`;
  const header = make('div', panel);
  header.style.cssText = 'display:flex;align-items:start;justify-content:space-between;gap:10px';
  const heading = make('div', header);
  make('h2', heading, { textContent: 'SAT Question Bank Collector' });
  make('div', heading, { textContent: 'v1.0 · Local-first browser utility', className: 'muted' });
  const close = make('button', header, { textContent: '×', className: 'secondary', title: 'Close panel' });
  close.onclick = () => panel.remove();
  make('h3', panel, { textContent: 'Domains' });
  const domainArea = make('div', panel);
  const domainBoxes = DOMAINS.map(([value, label]) => {
    const row = make('label', domainArea);
    const box = make('input', row, { type: 'checkbox', value, checked: value === 'INI' || value === 'CAS' });
    make('span', row, { textContent: label });
    return box;
  });
  const scanButtons = make('div', panel, { className: 'buttons' });
  const scanButton = make('button', scanButtons, { textContent: 'Scan catalog' });
  make('h3', panel, { textContent: 'Skills' });
  const skillsActions = make('div', panel, { className: 'buttons' });
  const allSkills = make('button', skillsActions, { textContent: 'Select all', className: 'secondary' });
  const noSkills = make('button', skillsActions, { textContent: 'Clear', className: 'secondary' });
  const skillArea = make('div', panel, { className: 'skills' });
  make('div', skillArea, { textContent: 'Scan the catalog to load skills.', className: 'muted' });
  allSkills.onclick = () => skillArea.querySelectorAll('input').forEach(x => x.checked = true);
  noSkills.onclick = () => skillArea.querySelectorAll('input').forEach(x => x.checked = false);
  make('h3', panel, { textContent: 'Difficulty' });
  const difficultyArea = make('div', panel);
  const difficulties = [['H','Hard'],['M','Medium'],['E','Easy']].map(([value,label]) => {
    const row = make('label', difficultyArea);
    row.style.display = 'inline-flex'; row.style.marginRight = '13px';
    const input = make('input', row, { type: 'checkbox', value, checked: value === 'H' });
    make('span', row, { textContent: label });
    return input;
  });
  const count = make('div', panel, { className: 'muted', textContent: '0 questions selected' });
  const meter = make('div', panel, { className: 'meter' });
  const fill = make('div', meter, { className: 'fill' });
  const status = make('div', panel, { className: 'status', textContent: 'Loading local data…' });
  const actions = make('div', panel, { className: 'buttons' });
  const downloadButton = make('button', actions, { textContent: 'Download / Resume' });
  const stopButton = make('button', actions, { textContent: 'Stop', className: 'secondary' });
  const exportButton = make('button', actions, { textContent: 'Export selected JSON', className: 'secondary' });
  const exportCatalogButton = make('button', actions, { textContent: 'Export catalog', className: 'secondary' });
  const clearButton = make('button', actions, { textContent: 'Clear saved data', className: 'secondary' });
  make('div', panel, { className: 'muted', textContent: 'Data stays in this browser until exported or cleared. Do not publish copyrighted question datasets.' });

  function log(text) { status.textContent = text; console.info('[SQBC]', text); }
  function setProgress(done, total) { fill.style.width = total ? `${Math.round(done / total * 100)}%` : '0%'; }
  function selection() {
    const skills = new Set([...skillArea.querySelectorAll('input:checked')].map(x => x.value));
    const levels = new Set(difficulties.filter(x => x.checked).map(x => x.value));
    return [...catalog.values()].filter(q => skills.has(q.skill_desc || q.skill_cd || 'Unknown') && levels.has(q.difficulty));
  }
  function updateCount() {
    const selected = selection();
    const done = selected.filter(q => downloaded.has(q.external_id)).length;
    count.textContent = `${selected.length} selected · ${done} already downloaded · ${catalog.size} cataloged`;
    return selected;
  }
  function refreshSkills() {
    const previous = new Map([...skillArea.querySelectorAll('input')].map(x => [x.value, x.checked]));
    const counts = new Map();
    for (const q of catalog.values()) {
      const skill = q.skill_desc || q.skill_cd || 'Unknown';
      counts.set(skill, (counts.get(skill) || 0) + 1);
    }
    skillArea.replaceChildren();
    for (const [skill, number] of [...counts].sort((a,b) => a[0].localeCompare(b[0]))) {
      const row = make('label', skillArea);
      const box = make('input', row, { type: 'checkbox', value: skill, checked: previous.get(skill) ?? true });
      make('span', row, { textContent: `${skill} (${number})` });
      box.addEventListener('change', updateCount);
    }
    updateCount();
  }
  async function scan() {
    if (busy) return;
    const selectedDomains = domainBoxes.filter(x => x.checked).map(x => x.value);
    if (!selectedDomains.length) return log('Select at least one domain.');
    busy = true; stopped = false; scanButton.disabled = true;
    try {
      for (const domain of selectedDomains) {
        if (stopped) break;
        log(`Scanning ${domain}…`);
        const records = unwrap(await post('get-questions', { asmtEventId: 99, test: 1, domain }));
        for (const q of records) {
          if (!q.external_id) continue;
          const entry = { ...q, _domain_code: domain };
          catalog.set(q.external_id, entry);
          await dbPut('catalog', entry);
        }
        log(`${domain}: ${records.length} records. Total unique: ${catalog.size}`);
        await sleep(400);
      }
      refreshSkills();
      if (!stopped) log(`Catalog ready: ${catalog.size} unique questions.`);
    } catch (err) { log(`Scan stopped: ${err.message}`); }
    finally { busy = false; scanButton.disabled = false; }
  }
  async function download() {
    if (busy) return;
    const selected = updateCount();
    if (!selected.length) return log('Select at least one skill and difficulty.');
    const pending = selected.filter(q => !downloaded.has(q.external_id));
    if (!pending.length) return log('All selected questions are already saved.');
    busy = true; stopped = false; downloadButton.disabled = true;
    let completed = selected.length - pending.length;
    setProgress(completed, selected.length);
    try {
      for (const q of pending) {
        if (stopped) break;
        // Stop on API errors; do not attempt to bypass service restrictions.
        const detail = await post('get-question', { external_id: q.external_id });
        const record = {
          ...detail,
          external_id: q.external_id,
          questionId: q.questionId,
          skill: q.skill_desc,
          difficulty: q.difficulty,
          domain: q.primary_class_desc
        };
        await dbPut('questions', record);
        downloaded.set(q.external_id, record);
        completed++;
        setProgress(completed, selected.length);
        if (completed % 5 === 0 || completed === selected.length) {
          log(`${completed}/${selected.length} saved · ${selected.length - completed} remaining`);
          updateCount();
        }
        await sleep(600);
      }
      log(stopped ? `Paused. ${completed}/${selected.length} saved. Click Download / Resume to continue.` : `Complete: ${completed}/${selected.length} saved.`);
    } catch (err) { log(`Paused due to error: ${err.message}\nAlready downloaded questions remain saved.`); }
    finally { busy = false; downloadButton.disabled = false; updateCount(); }
  }
  function exportJSON(filename, object) {
    const url = URL.createObjectURL(new Blob([JSON.stringify(object, null, 2)], { type: 'application/json' }));
    const anchor = make('a', document.body, { href: url, download: filename });
    anchor.click(); anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
  scanButton.onclick = scan;
  downloadButton.onclick = download;
  stopButton.onclick = () => { stopped = true; log('Stopping after the current request…'); };
  exportButton.onclick = () => {
    const selected = selection();
    const items = selected.map(q => downloaded.get(q.external_id)).filter(Boolean);
    if (!items.length) return log('No downloaded questions match current filters.');
    exportJSON('SAT_SQB_Selected.json', { source: 'College Board SAT Question Bank', exportedAt: new Date().toISOString(), count: items.length, questions: items });
    log(`Exported ${items.length} selected questions.`);
  };
  exportCatalogButton.onclick = () => {
    exportJSON('SAT_SQB_Catalog.json', { exportedAt: new Date().toISOString(), count: catalog.size, questions: [...catalog.values()] });
    log(`Exported catalog of ${catalog.size} questions.`);
  };
  clearButton.onclick = async () => {
    if (busy) return log('Stop the active operation first.');
    if (!confirm('Delete all saved catalog and question data from this browser?')) return;
    for (const store of ['catalog', 'questions']) {
      await new Promise((resolve, reject) => {
        const tx = db.transaction(store, 'readwrite');
        tx.objectStore(store).clear();
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    }
    catalog.clear(); downloaded.clear(); refreshSkills(); setProgress(0, 0);
    log('Saved data cleared.');
  };
  difficulties.forEach(x => x.addEventListener('change', updateCount));
  try {
    db = await openDatabase();
    (await dbAll('catalog')).forEach(q => catalog.set(q.external_id, q));
    (await dbAll('questions')).forEach(q => downloaded.set(q.external_id, q));
    refreshSkills();
    log(`Ready. Restored ${catalog.size} catalog entries and ${downloaded.size} downloaded questions.`);
  } catch (err) {
    log(`IndexedDB unavailable: ${err.message}. Check browser storage settings.`);
    scanButton.disabled = true; downloadButton.disabled = true;
  }
})();
