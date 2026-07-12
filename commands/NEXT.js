class NextCommand {
  execute(vm, inst) {
    if (!Array.isArray(vm.forStack) || vm.forStack.length === 0) {
      vm.running = false;
      return;
    }

    const frame = vm.forStack[vm.forStack.length - 1];
    const current = vm.variables.get(frame.varName) || 0;
    const nextValue = current + 1;

    vm.variables.set(frame.varName, nextValue);

    if (nextValue <= frame.end) {
      vm.pc = frame.lineIndex + 1;
    } else {
      vm.forStack.pop();
      vm.pc++;
    }
  }
}

module.exports = NextCommand;