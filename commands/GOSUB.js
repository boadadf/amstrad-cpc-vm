class GosubCommand {
  execute(vm, inst) {
    if (!Array.isArray(vm.stack)) vm.stack = [];
    // Return to the next instruction
    vm.stack.push(vm.pc + 1);
    vm.gotoLine(inst.args[0].value);
  }
}

module.exports = GosubCommand;