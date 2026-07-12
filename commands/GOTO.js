class GotoCommand {
  execute(vm, inst) {
    vm.gotoLine(inst.args[0].value);
  }
}
module.exports = GotoCommand;
