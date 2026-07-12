class Parser {
  parse(source) {
    const lines = source.split(/\r?\n/);
    const instructions = [];

    for (const raw of lines) {
      const line = raw.trim();
      if (!line) continue;

      const insts = this.parseSourceLine(line);
      for (const inst of insts) instructions.push(inst);
    }

    return instructions;
  }

  parseSourceLine(line) {
    const m = line.match(/^(\d+)\s+(.*)$/);
    if (!m) throw new Error('Invalid BASIC line: ' + line);

    const lineNumber = parseInt(m[1], 10);
    let body = m[2].trim();

    const upper = body.toUpperCase();
    const remIndex = upper.indexOf('REM');
    if (remIndex === 0) {
      return [{ line: lineNumber, op: 'REM', args: [] }];
    }
    if (remIndex > 0) {
      body = body.slice(0, remIndex).trim();
    }
    if (!body) {
      return [{ line: lineNumber, op: 'REM', args: [] }];
    }

    const statements = this.splitStatements(body);

    if (/^IF\s+/i.test(statements[0])) {
      const first = statements[0];
      const mm = first.match(/^IF\s+(.+?)\s+THEN\s*(.*)$/i);
      if (!mm) throw new Error('Unsupported IF form: ' + line);

      const condition = this.parseCondition(mm[1].trim());
      const split = this.splitThenElse(mm[2].trim());

      const thenStatements = [];
      const elseStatements = [];

      if (split.thenPart) {
        thenStatements.push(...this.splitStatements(split.thenPart));
      }

      for (let i = 1; i < statements.length; i++) {
        thenStatements.push(statements[i]);
      }

      if (split.elsePart) {
        elseStatements.push(...this.splitStatements(split.elsePart));
      }

      const compiledThen = [];
      for (const st of thenStatements) {
        const insts = this.parseSimpleStatement(lineNumber, st);
        for (const inst of insts) compiledThen.push(inst);
      }

      const compiledElse = [];
      for (const st of elseStatements) {
        const insts = this.parseSimpleStatement(lineNumber, st);
        for (const inst of insts) compiledElse.push(inst);
      }

      const out = [];

      if (compiledElse.length === 0) {
        out.push({
          line: lineNumber,
          op: 'IFSKIP',
          args: [condition, { type: 'NUMBER', value: compiledThen.length }]
        });
        for (const inst of compiledThen) out.push(inst);
        return out;
      }

      out.push({
        line: lineNumber,
        op: 'IFSKIP',
        args: [condition, { type: 'NUMBER', value: compiledThen.length + 1 }]
      });

      for (const inst of compiledThen) out.push(inst);

      out.push({
        line: lineNumber,
        op: 'SKIP',
        args: [{ type: 'NUMBER', value: compiledElse.length }]
      });

      for (const inst of compiledElse) out.push(inst);

      return out;
    }

    const out = [];
    for (const st of statements) {
      const insts = this.parseSimpleStatement(lineNumber, st);
      for (const inst of insts) out.push(inst);
    }
    return out;
  }

  splitStatements(body) {
    const result = [];
    let current = '';
    let inString = false;

    for (let i = 0; i < body.length; i++) {
      const ch = body[i];

      if (ch === '"') {
        inString = !inString;
        current += ch;
      } else if (ch === ':' && !inString) {
        if (current.trim()) result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }

    if (current.trim()) result.push(current.trim());
    return result;
  }

  splitTopLevelCommas(text) {
    const result = [];
    let current = '';
    let depth = 0;
    let inString = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];

      if (ch === '"') {
        inString = !inString;
        current += ch;
        continue;
      }

      if (!inString && ch === '(') {
        depth++;
        current += ch;
        continue;
      }

      if (!inString && ch === ')') {
        depth--;
        current += ch;
        continue;
      }

      if (!inString && depth === 0 && ch === ',') {
        if (current.trim()) result.push(current.trim());
        current = '';
        continue;
      }

      current += ch;
    }

    if (current.trim()) result.push(current.trim());
    return result;
  }

  splitThenElse(text) {
    let depth = 0;
    let inString = false;
    const upper = text.toUpperCase();

    for (let i = 0; i <= upper.length - 4; i++) {
      const ch = upper[i];

      if (ch === '"') {
        inString = !inString;
        continue;
      }

      if (!inString && ch === '(') {
        depth++;
        continue;
      }

      if (!inString && ch === ')') {
        depth--;
        continue;
      }

      if (inString || depth !== 0) continue;

      const slice = upper.slice(i, i + 4);
      const before = i === 0 ? ' ' : upper[i - 1];
      const after = i + 4 >= upper.length ? ' ' : upper[i + 4];

      const beforeOk = /\s|\)/.test(before);
      const afterOk = /\s|\(/.test(after);

      if (slice === 'ELSE' && beforeOk && afterOk) {
        return {
          thenPart: text.slice(0, i).trim(),
          elsePart: text.slice(i + 4).trim()
        };
      }
    }

    return {
      thenPart: text.trim(),
      elsePart: ''
    };
  }

  parseSimpleStatement(lineNumber, body) {
    // DIM
    if (/^DIM\s+/i.test(body)) {
      const rest = body.replace(/^DIM\s+/i, '').trim();
      const specs = this.splitTopLevelCommas(rest).map(x => this.parseArraySpec(x));
      return [{ line: lineNumber, op: 'DIM', args: specs }];
    }

    // FOR
    if (/^FOR\s+/i.test(body)) {
      const mm = body.match(/^FOR\s+([A-Z][A-Z0-9\$]*)\s*=\s*(.+)\s+TO\s+(.+)$/i);
      if (!mm) throw new Error('Invalid FOR syntax: ' + body);

      return [{
        line: lineNumber,
        op: 'FOR',
        args: [
          { type: 'VARIABLE', name: mm[1].toUpperCase() },
          this.parseExpression(mm[2].trim()),
          this.parseExpression(mm[3].trim())
        ]
      }];
    }

    // NEXT
    if (/^NEXT\b/i.test(body)) {
      const mm = body.match(/^NEXT\s*([A-Z][A-Z0-9\$]*)?$/i);
      return [{
        line: lineNumber,
        op: 'NEXT',
        args: mm && mm[1] ? [{ type: 'VARIABLE', name: mm[1].toUpperCase() }] : []
      }];
    }

    // PRINT
    if (/^PRINT\s+/i.test(body)) {
      const raw = body.replace(/^PRINT\s+/i, '').trim();
      const parts = this.splitPrintItems(raw).map(x => this.parseExpression(x));
      return [{
        line: lineNumber,
        op: 'PRINT',
        args: parts
      }];
    }

    // INPUT
    if (/^INPUT\s+/i.test(body)) {
      const target = body.replace(/^INPUT\s+/i, '').trim();
      return [{
        line: lineNumber,
        op: 'INPUT',
        args: [this.parseTarget(target)]
      }];
    }

    // LET
    if (/^LET\s+/i.test(body)) {
      const mm = body.match(/^LET\s+(.+?)\s*=\s*(.+)$/i);
      if (!mm) throw new Error('Invalid LET syntax: ' + body);

      return [{
        line: lineNumber,
        op: 'LET',
        args: [
          this.parseTarget(mm[1].trim()),
          this.parseExpression(mm[2].trim())
        ]
      }];
    }

    // Bare assignment
    if (/^[A-Z][A-Z0-9\$]*(\s*\(.+\))?\s*=/.test(body)) {
      const mm = body.match(/^(.+?)\s*=\s*(.+)$/);
      if (!mm) throw new Error('Invalid assignment syntax: ' + body);

      return [{
        line: lineNumber,
        op: 'LET',
        args: [
          this.parseTarget(mm[1].trim()),
          this.parseExpression(mm[2].trim())
        ]
      }];
    }

    // GOTO
    if (/^GOTO\s+/i.test(body)) {
      return [{
        line: lineNumber,
        op: 'GOTO',
        args: [{ type: 'NUMBER', value: parseInt(body.replace(/^GOTO\s+/i, '').trim(), 10) }]
      }];
    }

    // GOSUB
    if (/^GOSUB\s+/i.test(body)) {
      return [{
        line: lineNumber,
        op: 'GOSUB',
        args: [{ type: 'NUMBER', value: parseInt(body.replace(/^GOSUB\s+/i, '').trim(), 10) }]
      }];
    }

    // RETURN
    if (/^RETURN$/i.test(body)) {
      return [{ line: lineNumber, op: 'RETURN', args: [] }];
    }

    if (/^SOUND\s+/i.test(body)) {
      const raw = body.replace(/^SOUND\s+/i, '').trim();
      const parts = this.splitTopLevelCommas(raw);

      if (parts.length !== 2) {
        throw new Error('Invalid SOUND syntax: ' + body);
      }

      return [{
        line: lineNumber,
        op: 'SOUND',
        args: [
          this.parseExpression(parts[0].trim()),
          this.parseExpression(parts[1].trim())
        ]
      }];
    }

    // CLS
    if (/^CLS$/i.test(body)) {
      return [{ line: lineNumber, op: 'CLS', args: [] }];
    }

    // MODE
    if (/^MODE\s+/i.test(body)) {
      return [{
        line: lineNumber,
        op: 'MODE',
        args: [{ type: 'NUMBER', value: parseInt(body.replace(/^MODE\s+/i, '').trim(), 10) }]
      }];
    }

    // END
    if (/^END$/i.test(body)) {
      return [{ line: lineNumber, op: 'END', args: [] }];
    }

    // REM
    if (/^REM/i.test(body)) {
      return [{ line: lineNumber, op: 'REM', args: [] }];
    }

    throw new Error('Unsupported statement: ' + lineNumber + ' ' + body);
  }

  splitPrintItems(text) {
    const result = [];
    let current = '';
    let depth = 0;
    let inString = false;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];

      if (ch === '"') {
        inString = !inString;
        current += ch;
        continue;
      }

      if (!inString && ch === '(') {
        depth++;
        current += ch;
        continue;
      }

      if (!inString && ch === ')') {
        depth--;
        current += ch;
        continue;
      }

      if (!inString && depth === 0 && (ch === ';' || ch === ',')) {
        result.push(current.trim());
        current = '';
        continue;
      }

      current += ch;
    }

    if (current.trim()) result.push(current.trim());
    return result;
  }

  parseArraySpec(raw) {
    const mm = raw.match(/^([A-Z][A-Z0-9\$]*)\((.+)\)$/i);
    if (!mm) throw new Error('Invalid DIM item: ' + raw);

    const dims = this.splitTopLevelCommas(mm[2]).map(x => parseInt(x.trim(), 10));

    return {
      type: 'ARRAY_SPEC',
      name: mm[1].toUpperCase(),
      dims
    };
  }

  parseTarget(raw) {
    const arr = raw.match(/^([A-Z][A-Z0-9\$]*)\((.+)\)$/i);
    if (arr) {
      return {
        type: 'ARRAY_REF',
        name: arr[1].toUpperCase(),
        indexes: this.splitTopLevelCommas(arr[2]).map(x => this.parseExpression(x.trim()))
      };
    }

    return {
      type: 'VARIABLE',
      name: raw.toUpperCase()
    };
  }

  parseExpression(raw) {
    raw = raw.trim();

    if (/^ABS\((.+)\)$/i.test(raw)) {
      const inner = raw.match(/^ABS\((.+)\)$/i)[1];
      return {
        type: 'FUNC',
        name: 'ABS',
        args: [this.parseExpression(inner.trim())]
      };
    }

    const plusMinus = this.findTopLevelMathOp(raw, ['+', '-']);
    if (plusMinus !== -1) {
      return {
        type: 'BINARY_OP',
        op: raw[plusMinus],
        left: this.parseExpression(raw.slice(0, plusMinus).trim()),
        right: this.parseExpression(raw.slice(plusMinus + 1).trim())
      };
    }

    const multDiv = this.findTopLevelMathOp(raw, ['*', '/']);
    if (multDiv !== -1) {
      return {
        type: 'BINARY_OP',
        op: raw[multDiv],
        left: this.parseExpression(raw.slice(0, multDiv).trim()),
        right: this.parseExpression(raw.slice(multDiv + 1).trim())
      };
    }

    return this.parseAtom(raw);
  }

  findTopLevelMathOp(raw, ops) {
    let depth = 0;
    let inString = false;

    for (let i = raw.length - 1; i >= 0; i--) {
      const ch = raw[i];

      if (ch === '"') {
        inString = !inString;
      } else if (!inString && ch === ')') {
        depth++;
      } else if (!inString && ch === '(') {
        depth--;
      } else if (!inString && depth === 0 && ops.includes(ch)) {
        return i;
      }
    }

    return -1;
  }

  findTopLevelKeyword(raw, keyword) {
    let depth = 0;
    let inString = false;
    const upper = raw.toUpperCase();

    for (let i = 0; i <= upper.length - keyword.length; i++) {
      const ch = upper[i];

      if (ch === '"') {
        inString = !inString;
        continue;
      }

      if (!inString && ch === '(') {
        depth++;
        continue;
      }

      if (!inString && ch === ')') {
        depth--;
        continue;
      }

      if (inString || depth !== 0) continue;

      const slice = upper.slice(i, i + keyword.length);
      const before = i === 0 ? ' ' : upper[i - 1];
      const after = i + keyword.length >= upper.length ? ' ' : upper[i + keyword.length];

      const beforeOk = /\s|\(/.test(before);
      const afterOk = /\s|\)/.test(after);

      if (slice === keyword && beforeOk && afterOk) {
        return i;
      }
    }

    return -1;
  }

  findTopLevelOperator(raw, op) {
    let depth = 0;
    let inString = false;

    for (let i = 0; i <= raw.length - op.length; i++) {
      const ch = raw[i];

      if (ch === '"') {
        inString = !inString;
        continue;
      }

      if (!inString && ch === '(') {
        depth++;
        continue;
      }

      if (!inString && ch === ')') {
        depth--;
        continue;
      }

      if (!inString && depth === 0 && raw.slice(i, i + op.length) === op) {
        return i;
      }
    }

    return -1;
  }

  parseAtom(raw) {
    if (/^".*"$/.test(raw)) {
      return { type: 'STRING', value: raw.slice(1, -1) };
    }

    if (/^\d+$/.test(raw)) {
      return { type: 'NUMBER', value: parseInt(raw, 10) };
    }

    const arr = raw.match(/^([A-Z][A-Z0-9\$]*)\((.+)\)$/i);
    if (arr) {
      return {
        type: 'ARRAY_REF',
        name: arr[1].toUpperCase(),
        indexes: this.splitTopLevelCommas(arr[2]).map(x => this.parseExpression(x.trim()))
      };
    }

    return {
      type: 'VARIABLE',
      name: raw.toUpperCase()
    };
  }

  parseCondition(raw) {
    raw = raw.trim();

    const orIndex = this.findTopLevelKeyword(raw, 'OR');
    if (orIndex !== -1) {
      return {
        type: 'OR',
        left: this.parseCondition(raw.slice(0, orIndex).trim()),
        right: this.parseCondition(raw.slice(orIndex + 2).trim())
      };
    }

    const andIndex = this.findTopLevelKeyword(raw, 'AND');
    if (andIndex !== -1) {
      return {
        type: 'AND',
        left: this.parseCondition(raw.slice(0, andIndex).trim()),
        right: this.parseCondition(raw.slice(andIndex + 3).trim())
      };
    }

    const ops = [
      ['<>', 'NOT_EQUALS'],
      ['>=', 'GTE'],
      ['<=', 'LTE'],
      ['=', 'EQUALS'],
      ['>', 'GT'],
      ['<', 'LT']
    ];

    for (const [symbol, type] of ops) {
      const idx = this.findTopLevelOperator(raw, symbol);
      if (idx !== -1) {
        return {
          type,
          left: this.parseExpression(raw.slice(0, idx).trim()),
          right: this.parseExpression(raw.slice(idx + symbol.length).trim())
        };
      }
    }

    throw new Error('Unsupported IF condition: ' + raw);
  }
}

module.exports = Parser;