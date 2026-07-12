class SoundCommand {
  execute(vm, args) {
    const pitchArg = args[0];
    const durationArg = args[1];

    const pitch = Number(vm.evaluateExpression ? vm.evaluateExpression(pitchArg) : pitchArg);
    const duration = Number(vm.evaluateExpression ? vm.evaluateExpression(durationArg) : durationArg);

    if (vm.events) {
      vm.events({
        type: 'sound',
        pitch,
        duration
      });
    }

    vm.pc++;
  }
}

module.exports = SoundCommand;