class LetCommand {
  execute(vm, inst) {
    const target = inst.args[0];
    const value = vm.resolveValue(inst.args[1]);
    vm.setTarget(target, value);
    vm.pc++;
  }
}

module.exports = LetCommand;