class SkipCommand {
  execute(vm, inst) {
    const count = inst.args[0].value;
    vm.pc += count + 1;
  }
}

module.exports = SkipCommand;