const basicEl = document.getElementById('basic');
const varsEl = document.getElementById('vars');   // SCORE panel
const aiEl = document.getElementById('ai');       // TRAINED-MODEL panel
const consoleEl = document.getElementById('console');
const inputEl = document.getElementById('input');
const sendBtn = document.getElementById('send');

let state = null;
let audioCtx = null;
let lastSoundCount = 0;

function render(s) {
  state = s;
  renderBasic(s);
  renderScore(s);
  renderAI(s.ai);
  consoleEl.textContent = (s.output || []).join('\n');
  consoleEl.scrollTop = consoleEl.scrollHeight;
  playSoundsFromState(s);
}

function renderBasic(s) {
  basicEl.innerHTML = '';

  (s.programLines || []).forEach(line => {
    const trimmed = line.trim();
    const num = parseInt(trimmed.split(' ')[0], 10);

    const row = document.createElement('div');
    row.textContent = line;

    if (num === s.currentLine) {
      row.className = 'active-line';
    }

    basicEl.appendChild(row);
  });

  const active = basicEl.querySelector('.active-line');
  if (active) {
    active.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

function renderScore(s) {
  const rows = s.scores || [];

  if (!rows.length) {
    varsEl.textContent = 'NO SCORE';
    return;
  }

  varsEl.textContent = rows
    .map(r =>
      `${String(r.name).padEnd(16, ' ')} ${String(r.score).padStart(6, ' ')}`
    )
    .join('\n');
}

function renderAI(ai) {
  if (!ai || !ai.objects || !ai.questions) {
    aiEl.textContent = 'NO AI DATA';
    return;
  }

  const questions = ai.questions || [];
  const objects = ai.objects || [];
  const weights = ai.weights || {};

  let html = '';

  html += '<div class="ai-section">';
  html += '<div class="ai-heading">QUESTIONS</div>';
  html += '<table class="ai-questions">';
  html += '<tbody>';
  for (const q of questions) {
    html += `<tr><td class="q-id">Q${q.id}</td><td>${escapeHtml(q.text)}</td></tr>`;
  }
  html += '</tbody></table>';
  html += '</div>';

  html += '<div class="ai-section">';
  html += '<div class="ai-heading">OBJECT WEIGHTS</div>';
  html += '<table class="ai-table">';
  html += '<thead><tr><th>OBJECT</th>';
  for (const q of questions) {
    html += `<th>Q${q.id}</th>`;
  }
  html += '</tr></thead><tbody>';

  for (const obj of objects) {
    html += `<tr><td class="obj-name">${escapeHtml(obj.name)}</td>`;
    for (const q of questions) {
      const key = `${obj.id}:${q.id}`;
      const value = weights[key];
      const shown = value === undefined ? '' : String(value);
      const cls =
        value === 1 ? 'w-pos' :
        value === -1 ? 'w-neg' :
        value === 0 ? 'w-zero' : '';
      html += `<td class="${cls}">${shown}</td>`;
    }
    html += '</tr>';
  }

  html += '</tbody></table>';
  html += '</div>';

  aiEl.innerHTML = html;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function post(url, body = {}) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

sendBtn.addEventListener('click', async () => {
    const raw = inputEl.value;
    const trimmed = raw.trim();
    inputEl.value = '';

    // Shell mode (no program started yet)
    if (!state || !state.started) {
      if (trimmed.toUpperCase() === 'RUN') {
        const s = await post('/api/start');
        render(s);
      } else if (trimmed !== '') {
        consoleEl.textContent += (consoleEl.textContent ? '\n' : '') + 'Syntax error';
      }
      inputEl.focus();
      return;
    }

    // Program is running: always send raw, even if it's empty
    const s = await post('/api/input', { value: raw });
    render(s);
    inputEl.focus();
  });

inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendBtn.click();
});

function playSoundsFromState(s) {
  const sounds = s.sounds || [];
  if (!sounds.length || sounds.length === lastSoundCount) return;

  if (!audioCtx) {
    try {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      lastSoundCount = sounds.length;
      return;
    }
  }

  for (let i = lastSoundCount; i < sounds.length; i++) {
    const snd = sounds[i];
    if (!snd) continue;
    const freq = snd.pitch || snd.freq || 660;
    const dur = snd.duration || 0.08;
    playBeep(freq, dur);
  }

  lastSoundCount = sounds.length;
}

function playBeep(freq, duration) {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'square';
  osc.frequency.value = freq;
  gain.gain.value = 0.03;

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start();
  osc.stop(audioCtx.currentTime + duration);
}

// Initial state
fetch('/api/state')
  .then(r => r.json())
  .then(s => {
    if (!s.output || !s.output.length) s.output = ['Ready'];
    render(s);
    inputEl.focus();
  });