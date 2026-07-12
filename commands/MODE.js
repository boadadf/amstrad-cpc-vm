class ModeCommand {
  execute(vm, inst) {
    const mode = vm.resolveValue(inst.args[0]);
    vm.setMode(mode);
    vm.pc++;
  }
}

module.exports = ModeCommand;