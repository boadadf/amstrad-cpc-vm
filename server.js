const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const VM = require('./vm/VM');
const Parser = require('./vm/Parser');

const {
  createDefaultKnowledge,
  hydrateVMFromKnowledge,
  extractKnowledgeFromVM
} = require('./knowledge');

const DimCommand = require('./commands/DIM');
const ForCommand = require('./commands/FOR');
const NextCommand = require('./commands/NEXT');
const PrintCommand = require('./commands/PRINT');
const InputCommand = require('./commands/INPUT');
const LetCommand = require('./commands/LET');
const IfGotoCommand = require('./commands/IFGOTO');
const GotoCommand = require('./commands/GOTO');
const ClsCommand = require('./commands/CLS');
const ModeCommand = require('./commands/MODE');
const EndCommand = require('./commands/END');
const GosubCommand = require('./commands/GOSUB');
const ReturnCommand = require('./commands/RETURN');
const IfSkipCommand = require('./commands/IFSKIP');
const SkipCommand = require('./commands/SKIP');
const SoundCommand = require('./commands/SOUND');

const app = express();
const port = process.env.PORT || 3000;
const basPath = path.join(__dirname, 'examples', 'animal-vegetable-mineral.bas');

app.use(express.json());
app.use('/client', express.static(path.join(__dirname, 'client')));

let sharedKnowledge = createDefaultKnowledge();
const runtimes = new Map();

function parseCookies(req) {
  const raw = req.headers.cookie || '';
  const out = {};
  raw.split(';').forEach(part => {
    const i = part.indexOf('=');
    if (i === -1) return;
    const key = part.slice(0, i).trim();
    const value = part.slice(i + 1).trim();
    if (!key) return;
    out[key] = decodeURIComponent(value);
  });
  return out;
}

function getSessionId(req, res) {
  const cookies = parseCookies(req);
  if (cookies.sid) return cookies.sid;

  const sid = crypto.randomUUID();
  const isProd = process.env.NODE_ENV === 'production';
  const parts = [
    `sid=${encodeURIComponent(sid)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax'
  ];

  if (isProd) parts.push('Secure');

  res.setHeader('Set-Cookie', parts.join('; '));
  return sid;
}

function snapshotKnowledge(vm, fallbackKnowledge) {
  let knowledge = fallbackKnowledge;

  if (typeof extractKnowledgeFromVM === 'function') {
    try {
      knowledge = extractKnowledgeFromVM(vm, 50, 50);
    } catch (err) {
      knowledge = fallbackKnowledge;
    }
  }

  return {
    objects: knowledge?.objects || [],
    questions: knowledge?.questions || [],
    weights: knowledge?.weights || {}
  };
}

function buildScores(vm) {
  const rows = [];

  const no =
    Number(vm.variables?.get?.('NO')) ||
    Number(vm.variables?.NO) ||
    0;

  const onArr = vm.arrays?.get?.('ON$');
  const osArr = vm.arrays?.get?.('OS');

  for (let i = 1; i <= no; i++) {
    const name = onArr?.data?.get(String(i)) ?? '';
    const score = osArr?.data?.get(String(i)) ?? 0;

    if (name !== '') {
      rows.push({
        index: i,
        name: String(name),
        score: Number(score) || 0
      });
    }
  }

  rows.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return rows;
}

function createRuntime() {
  const vm = new VM();
  const parser = new Parser();
  const source = fs.readFileSync(basPath, 'utf8');
  const program = parser.parse(source);

  const state = {
    output: ['Ready'],
    variables: {},
    scores: [],
    ai: { objects: [], questions: [], weights: {} },
    sounds: [],
    currentLine: null,
    waitingForInput: false,
    programLines: source.split(/\r?\n/).filter(Boolean),
    mode: 0,
    started: false
  };

  vm.register('PRINT', new PrintCommand());
  vm.register('INPUT', new InputCommand());
  vm.register('LET', new LetCommand());
  vm.register('DIM', new DimCommand());
  vm.register('FOR', new ForCommand());
  vm.register('NEXT', new NextCommand());
  vm.register('IFGOTO', new IfGotoCommand());
  vm.register('GOTO', new GotoCommand());
  vm.register('CLS', new ClsCommand());
  vm.register('MODE', new ModeCommand());
  vm.register('END', new EndCommand());
  vm.register('GOSUB', new GosubCommand());
  vm.register('RETURN', new ReturnCommand());
  vm.register('IFSKIP', new IfSkipCommand());
  vm.register('SKIP', new SkipCommand());
  vm.register('SOUND', new SoundCommand());
  vm.register('REM', { execute(vm) { vm.pc++; } });

  vm.setEventHandler((evt) => {
    if (evt.type === 'line') state.currentLine = evt.line;
    if (evt.type === 'screen') state.output.push(evt.text);
    if (evt.type === 'variable') state.variables[evt.name] = evt.value;
    if (evt.type === 'input') state.waitingForInput = true;
    if (evt.type === 'clear') state.output = [];
    if (evt.type === 'mode') state.mode = evt.mode;
    if (evt.type === 'sound') {
      state.sounds.push({
        pitch: evt.pitch,
        duration: evt.duration
      });
    }
  });

  hydrateVMFromKnowledge(vm, sharedKnowledge);
  vm.load(program);

  return { vm, state };
}

function extractAnswers(vm) {
  const answers = {};
  const vars = vm.variables || {};

  for (let j = 1; j <= 50; j++) {
    const keyPlain = 'A' + j;
    const keyParen = 'A(' + j + ')';

    const v =
      (typeof vars.get === 'function' ? vars.get(keyPlain) : undefined) ??
      (typeof vars.get === 'function' ? vars.get(keyParen) : undefined) ??
      vars[keyPlain] ??
      vars[keyParen];

    if (v === undefined || v === null) continue;

    const val = Number(v) || 0;
    if (val === 0) continue;

    answers[j] = val;
  }

  return answers;
}

function refreshState(runtime) {
  runtime.state.ai = snapshotKnowledge(runtime.vm, sharedKnowledge);
  runtime.state.answers = extractAnswers(runtime.vm);
  runtime.state.scores = buildScores(runtime.vm);

  try {
    const extracted = extractKnowledgeFromVM(runtime.vm, 50, 50);
    sharedKnowledge = extracted;
  } catch (err) {}
}

function getRuntime(req, res) {
  const sid = getSessionId(req, res);

  if (!runtimes.has(sid)) {
    runtimes.set(sid, createRuntime());
  }

  return { sid, runtime: runtimes.get(sid) };
}

app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, 'client', 'index.html'));
});

app.get('/api/state', (req, res) => {
  const { runtime } = getRuntime(req, res);
  refreshState(runtime);
  res.json(runtime.state);
});

app.post('/api/start', async (req, res) => {
  const { sid } = getRuntime(req, res);
  const runtime = createRuntime();
  runtime.state.started = true;
  runtimes.set(sid, runtime);

  await runtime.vm.runUntilInputOrEnd();
  refreshState(runtime);
  res.json(runtime.state);
});

app.post('/api/input', async (req, res) => {
  const { runtime } = getRuntime(req, res);
  const value = String(req.body.value || '');

  runtime.state.output.push('> ' + value);
  runtime.state.waitingForInput = false;
  runtime.state.started = true;

  if (typeof runtime.vm.provideInput === 'function') {
    runtime.vm.provideInput(value);
  } else {
    runtime.vm.variables = runtime.vm.variables || {};
    runtime.vm.variables.LASTINPUT = value;
  }

  await runtime.vm.runUntilInputOrEnd();
  refreshState(runtime);
  res.json(runtime.state);
});

app.post('/api/run', async (req, res) => {
  const { runtime } = getRuntime(req, res);
  runtime.state.started = true;

  await runtime.vm.runUntilInputOrEnd();
  refreshState(runtime);
  res.json(runtime.state);
});

app.listen(port, () => {
  console.log(`CPC BASIC runtime running at http://localhost:${port}`);
});