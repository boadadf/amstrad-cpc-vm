class Tokenizer {
  tokenize(source) {
    return source.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  }
}

module.exports = Tokenizer;
