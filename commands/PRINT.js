class PrintCommand {
  execute(vm, inst) {
    const text = inst.args.map(arg => String(vm.resolveValue(arg))).join('');
    vm.print(text);
    vm.pc++;
  }
}

module.exports = PrintCommand;