class IfGotoCommand {
  execute(vm, inst) {
    const condition = inst.args[0];
    const target = inst.args[1].value;
    if (vm.evaluateCondition(condition)) {
      vm.gotoLine(target);
    } else {
      vm.pc++;
    }
  }
}
module.exports = IfGotoCommand;
