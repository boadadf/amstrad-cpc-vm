class ForCommand {
  execute(vm, inst) {
    const varName = inst.args[0].name;
    const start = vm.resolveValue(inst.args[1]);
    const end = vm.resolveValue(inst.args[2]);

    vm.variables.set(varName, start);

    if (!Array.isArray(vm.forStack)) vm.forStack = [];
    vm.forStack.push({
      varName,
      end,
      lineIndex: vm.pc
    });

    vm.pc++;
  }
}

module.exports = ForCommand;