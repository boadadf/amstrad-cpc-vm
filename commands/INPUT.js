class InputCommand {
  execute(vm, inst) {
    if (vm.inputQueue && vm.inputQueue.length > 0) {
      const value = vm.inputQueue.shift();
      vm.setTarget(inst.args[0], value);
      vm.waitingForInput = false;
      vm.pc++;
      return;
    }

    vm.waitingForInput = true;
    vm.pendingInputTarget = inst.args[0];
    vm.events({ type: 'input' });
  }
}

module.exports = InputCommand;