class VM {
  constructor() {
    this.pc = 0;
    this.running = false;
    this.program = [];

    this.variables = new Map();
    this.arrays = new Map();

    this.stack = [];
    this.forStack = [];

    this.devices = {};
    this.commands = {};
    this.events = () => {};

    this.mode = 0;

    this.waitingForInput = false;
    this.pendingInputTarget = null;
    this.inputQueue = [];
  }

  setEventHandler(fn) {
    this.events = typeof fn === 'function' ? fn : () => {};
  }

  setMode(mode) {
    this.mode = mode;
    this.events({
      type: 'mode',
      mode
    });
  }

  clearScreen() {
    this.events({
      type: 'clear'
    });
  }

  print(text) {
    this.events({
      type: 'screen',
      text: String(text)
    });
  }

  register(op, command) {
    this.commands[op] = command;
  }

  load(program) {
    this.program = program;
    this.pc = 0;
    this.running = true;
  }

  gotoLine(lineNumber) {
    const idx = this.program.findIndex(p => p.line === lineNumber);
    if (idx === -1) {
      throw new Error('Line not found: ' + lineNumber);
    }
    this.pc = idx;
  }

  provideInput(value) {
    if (this.waitingForInput && this.pendingInputTarget) {
      this.setTarget(this.pendingInputTarget, value);
      this.pendingInputTarget = null;
      this.waitingForInput = false;
      this.pc++;
      return;
    }

    this.inputQueue.push(value);
  }

  async runUntilInputOrEnd() {
    while (this.running) {
      if (this.waitingForInput) break;

      const instruction = this.program[this.pc];
      if (!instruction) {
        this.running = false;
        break;
      }

      this.events({
        type: 'line',
        line: instruction.line
      });

      const command = this.commands[instruction.op];
      if (!command) {
        throw new Error('Unknown command ' + instruction.op);
      }

      const result = command.execute(this, instruction);

      if (result && typeof result.then === 'function') {
        await result;
      }

      if (this.waitingForInput) break;
    }
  }

  resolveValue(node) {
    if (!node) return null;

    if (node.type === 'STRING') return node.value;
    if (node.type === 'NUMBER') return node.value;

    if (node.type === 'VARIABLE') {
      return this.variables.get(node.name) ?? 0;
    }

    if (node.type === 'ARRAY_REF') {
      const indexes = node.indexes.map(x => this.resolveValue(x));
      return this.getArrayCell(node.name, indexes);
    }

    if (node.type === 'BINARY_OP') {
      const left = this.resolveValue(node.left);
      const right = this.resolveValue(node.right);

      if (node.op === '+') return left + right;
      if (node.op === '-') return left - right;
      if (node.op === '*') return left * right;
      if (node.op === '/') return left / right;

      throw new Error('Unsupported binary op: ' + node.op);
    }

    if (node.type === 'FUNC' && node.name === 'ABS') {
      return Math.abs(this.resolveValue(node.args[0]));
    }

    throw new Error('Unsupported value node: ' + JSON.stringify(node));
  }

  setTarget(target, value) {
    if (target.type === 'VARIABLE') {
      this.variables.set(target.name, value);
      this.events({
        type: 'variable',
        name: target.name,
        value
      });
      return;
    }

    if (target.type === 'ARRAY_REF') {
      const indexes = target.indexes.map(x => this.resolveValue(x));
      this.setArrayCell(target.name, indexes, value);
      this.events({
        type: 'array',
        name: target.name,
        indexes,
        value
      });
      return;
    }

    throw new Error('Unsupported assignment target: ' + JSON.stringify(target));
  }

  getArrayCell(name, indexes) {
    const arr = this.arrays.get(name);
    if (!arr) throw new Error('Array not DIMed: ' + name);

    const key = indexes.join(',');
    if (!arr.data.has(key)) return 0;
    return arr.data.get(key);
  }

  setArrayCell(name, indexes, value) {
    const arr = this.arrays.get(name);
    if (!arr) throw new Error('Array not DIMed: ' + name);

    const key = indexes.join(',');
    arr.data.set(key, value);
  }

  evaluateCondition(cond) {
    if (cond.type === 'AND') {
      return this.evaluateCondition(cond.left) && this.evaluateCondition(cond.right);
    }

    if (cond.type === 'OR') {
      return this.evaluateCondition(cond.left) || this.evaluateCondition(cond.right);
    }

    if (cond.type === 'EQUALS') {
      return this.resolveValue(cond.left) === this.resolveValue(cond.right);
    }

    if (cond.type === 'NOT_EQUALS') {
      return this.resolveValue(cond.left) !== this.resolveValue(cond.right);
    }

    if (cond.type === 'GT') {
      return this.resolveValue(cond.left) > this.resolveValue(cond.right);
    }

    if (cond.type === 'LT') {
      return this.resolveValue(cond.left) < this.resolveValue(cond.right);
    }

    if (cond.type === 'GTE') {
      return this.resolveValue(cond.left) >= this.resolveValue(cond.right);
    }

    if (cond.type === 'LTE') {
      return this.resolveValue(cond.left) <= this.resolveValue(cond.right);
    }

    throw new Error('Unsupported condition: ' + JSON.stringify(cond));
  }
}

module.exports = VM;