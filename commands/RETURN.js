class ReturnCommand {
  execute(vm) {
    if (!Array.isArray(vm.stack) || vm.stack.length === 0) {
      vm.running = false;
      return;
    }
    const addr = vm.stack.pop();
    vm.pc = addr;
  }
}

module.exports = ReturnCommand;