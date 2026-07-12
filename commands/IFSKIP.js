class IfSkipCommand {
  execute(vm, inst) {
    const condition = inst.args[0];
    const skipCount = inst.args[1].value;
    if (vm.evaluateCondition(condition)) {
      vm.pc++;
    } else {
      vm.pc += skipCount + 1;
    }
  }
}

module.exports = IfSkipCommand;