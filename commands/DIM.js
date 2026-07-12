class DimCommand {
  execute(vm, inst) {
    for (const spec of inst.args) {
      vm.arrays.set(spec.name, {
        dims: spec.dims,
        data: new Map()
      });
    }
    vm.pc++;
  }
}

module.exports = DimCommand;