const stages = ['Backlog', 'Research', 'Ready', 'In Progress', 'Review', 'Done'];
const $ = selector => document.querySelector(selector);
let state;
let debounce;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

async function load() {
  const response = await fetch('/api/state', { cache: 'no-store' });
  if (!response.ok) throw new Error('Unable to load board');
  state = await response.json();
  render();
}

function render() {
  const tasks = state.board.tasks;
  $('#metric-total').textContent = tasks.length;
  $('#metric-active').textContent = tasks.filter(task => ['Research', 'Ready', 'In Progress', 'Review'].includes(task.stage)).length;
  $('#metric-done').textContent = tasks.filter(task => task.stage === 'Done').length;
  $('#metric-files').textContent = state.graph.files.toLocaleString();
  $('#graph-stamp').textContent = `${state.graph.symbols.toLocaleString()} symbols · ${state.graph.edges.toLocaleString()} links`;
  const board = $('#board'); board.replaceChildren();
  for (const stage of stages) {
    const column = el('div', 'column');
    column.dataset.stage = stage;
    const heading = el('div', 'column-head');
    heading.append(el('h3', '', stage), el('span', '', tasks.filter(task => task.stage === stage).length));
    column.append(heading);
    column.addEventListener('dragover', event => { event.preventDefault(); column.classList.add('dragover'); });
    column.addEventListener('dragleave', () => column.classList.remove('dragover'));
    column.addEventListener('drop', event => { event.preventDefault(); column.classList.remove('dragover'); move(event.dataTransfer.getData('text/plain'), stage); });
    for (const task of tasks.filter(item => item.stage === stage)) {
      const card = el('article', 'card'); card.draggable = true;
      card.addEventListener('dragstart', event => { event.dataTransfer.setData('text/plain', task.id); card.classList.add('dragging'); });
      card.addEventListener('dragend', () => card.classList.remove('dragging'));
      const top = el('div', 'card-top'); top.append(el('span', '', task.id), el('span', 'priority', task.priority));
      card.append(top, el('h4', '', task.title), el('p', '', task.detail));
      const bottom = el('div', 'card-bottom'); bottom.append(el('span', 'area', task.area));
      const select = el('select', 'stage-select'); select.setAttribute('aria-label', `Status for ${task.title}`);
      for (const optionStage of stages) { const option = el('option', '', optionStage); option.value = optionStage; option.selected = optionStage === task.stage; select.append(option); }
      select.addEventListener('change', () => move(task.id, select.value));
      bottom.append(select); card.append(bottom);
      if (task.evidence) {
        const evidence = el('button', 'evidence-button', 'View evidence ↗'); evidence.type = 'button';
        evidence.addEventListener('click', () => showEvidence(task)); card.append(evidence);
      }
      column.append(card);
    }
    board.append(column);
  }
  const activity = $('#activity-list'); activity.replaceChildren();
  if (!state.activity.length) activity.append(el('p', 'empty', 'No card movements yet.'));
  for (const event of state.activity.slice(0, 12)) {
    const item = el('div', 'activity-item');
    item.append(el('strong', '', `${event.taskId} · ${event.title}`), el('span', '', `${event.from} → ${event.to} · ${new Date(event.at).toLocaleString()}`));
    activity.append(item);
  }
}

async function move(id, stage) {
  if (!id || !stages.includes(stage)) return;
  const response = await fetch(`/api/tasks/${encodeURIComponent(id)}/stage`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage }) });
  if (!response.ok) { alert('The update could not be saved.'); await load(); return; }
  await load();
}

async function showEvidence(task) {
  const response = await fetch(`/api/evidence/${encodeURIComponent(task.id)}`);
  const data = await response.json();
  $('#evidence-title').textContent = task.title;
  $('#evidence-path').textContent = data.path || task.evidence;
  $('#evidence-content').textContent = data.content || data.error || 'Evidence unavailable';
  $('#evidence-dialog').showModal();
}

$('#evidence-close').addEventListener('click', () => $('#evidence-dialog').close());

async function search() {
  const query = $('#search').value.trim();
  const results = $('#search-results'); results.replaceChildren();
  if (!query) { results.append(el('p', 'empty', 'Enter a term to search the index.')); return; }
  const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
  const data = await response.json();
  if (!data.results.length) { results.append(el('p', 'empty', 'No indexed file or symbol matched.')); return; }
  for (const node of data.results) {
    const row = el('button', 'result'); row.type = 'button';
    row.append(el('strong', '', `${node.type === 'symbol' ? '◇' : '▤'} ${node.label}`), el('small', '', `${node.path}${node.line ? ':' + node.line : ''}`));
    row.title = 'Copy source path';
    row.addEventListener('click', async () => { await navigator.clipboard.writeText(`${node.path}${node.line ? ':' + node.line : ''}`); row.title = 'Copied'; });
    results.append(row);
  }
}

$('#search').addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(search, 180); });
function connect() {
  const stream = new EventSource('/api/events');
  stream.onopen = () => { $('#connection-dot').classList.add('online'); $('#connection-label').textContent = 'Live · workspace connected'; };
  stream.onmessage = event => { const update = JSON.parse(event.data); if (update.type === 'tasks' || update.type === 'graph') { load().catch(console.error); if ($('#search').value.trim()) search().catch(console.error); } };
  stream.onerror = () => { $('#connection-dot').classList.remove('online'); $('#connection-label').textContent = 'Reconnecting'; };
}
load().then(connect).catch(error => { $('#connection-label').textContent = error.message; });
