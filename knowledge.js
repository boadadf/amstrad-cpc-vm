// knowledge.js

function createDefaultKnowledge() {
  return {
    version: 1,
    maxObjects: 50,
    maxQuestions: 50,
    objectCount: 12,
    questionCount: 8,

    objects: [
      { id: 1, name: 'DOG', kind: 'ANIMAL' },
      { id: 2, name: 'CAT', kind: 'ANIMAL' },
      { id: 3, name: 'HORSE', kind: 'ANIMAL' },
      { id: 4, name: 'FISH', kind: 'ANIMAL' },
      { id: 5, name: 'CARROT', kind: 'VEGETABLE' },
      { id: 6, name: 'POTATO', kind: 'VEGETABLE' },
      { id: 7, name: 'CABBAGE', kind: 'VEGETABLE' },
      { id: 8, name: 'TREE', kind: 'VEGETABLE' },
      { id: 9, name: 'ROCK', kind: 'MINERAL' },
      { id: 10, name: 'BRICK', kind: 'MINERAL' },
      { id: 11, name: 'SPOON', kind: 'MINERAL' },
      { id: 12, name: 'CAR', kind: 'MINERAL' }
    ],

    questions: [
      { id: 1, text: 'IS IT AN ANIMAL?' },
      { id: 2, text: 'IS IT EDIBLE?' },
      { id: 3, text: 'IS IT SMALL?' },
      { id: 4, text: 'DOES IT BARK?' },
      { id: 5, text: 'DOES IT LIVE IN WATER?' },
      { id: 6, text: 'DOES IT GROW IN THE GROUND?' },
      { id: 7, text: 'IS IT MAN-MADE?' },
      { id: 8, text: 'IS IT HARD?' }
    ],

    // weights[i:j] = 1, -1, or 0
    weights: {
      // DOG
      '1:1': 1,  '1:2': -1, '1:3': 0,  '1:4': 1,
      '1:5': -1, '1:6': -1, '1:7': -1, '1:8': -1,

      // CAT
      '2:1': 1,  '2:2': -1, '2:3': 1,  '2:4': -1,
      '2:5': -1, '2:6': -1, '2:7': -1, '2:8': -1,

      // HORSE
      '3:1': 1,  '3:2': -1, '3:3': -1, '3:4': -1,
      '3:5': -1, '3:6': -1, '3:7': -1, '3:8': -1,

      // FISH
      '4:1': 1,  '4:2': 0,  '4:3': 1,  '4:4': -1,
      '4:5': 1,  '4:6': -1, '4:7': -1, '4:8': -1,

      // CARROT
      '5:1': -1, '5:2': 1,  '5:3': 1,  '5:4': -1,
      '5:5': -1, '5:6': 1,  '5:7': -1, '5:8': -1,

      // POTATO
      '6:1': -1, '6:2': 1,  '6:3': 1,  '6:4': -1,
      '6:5': -1, '6:6': 1,  '6:7': -1, '6:8': -1,

      // CABBAGE
      '7:1': -1, '7:2': 1,  '7:3': 0,  '7:4': -1,
      '7:5': -1, '7:6': 1,  '7:7': -1, '7:8': -1,

      // TREE
      '8:1': -1, '8:2': 0,  '8:3': -1, '8:4': -1,
      '8:5': -1, '8:6': 1,  '8:7': -1, '8:8': 0,

      // ROCK
      '9:1': -1, '9:2': -1, '9:3': 0,  '9:4': -1,
      '9:5': -1, '9:6': -1, '9:7': -1, '9:8': 1,

      // BRICK
      '10:1': -1, '10:2': -1, '10:3': 1, '10:4': -1,
      '10:5': -1, '10:6': -1, '10:7': 1, '10:8': 1,

      // SPOON
      '11:1': -1, '11:2': -1, '11:3': 1, '11:4': -1,
      '11:5': -1, '11:6': -1, '11:7': 1, '11:8': 1,

      // CAR
      '12:1': -1, '12:2': -1, '12:3': -1, '12:4': -1,
      '12:5': -1, '12:6': -1, '12:7': 1, '12:8': 1
    }
  };
}

function hydrateVMFromKnowledge(vm, knowledge) {
  // We assume BASIC DIMs ON$, QQ$, W, NO, NQ somewhere in the program.
  // Here we just mirror those into the VM's runtime variables/arrays.

  // Object count / question count
  vm.variables.set('NO', knowledge.objectCount);
  vm.variables.set('NQ', knowledge.questionCount);

  // Object names ON$(i)
  for (const obj of knowledge.objects) {
    const name = 'ON$';
    const key = obj.id + ''; // index
    ensureArray(vm, name);
    const arr = vm.arrays.get(name);
    arr.data.set(key, obj.name);
  }

  // Question texts QQ$(j)
  for (const q of knowledge.questions) {
    const name = 'QQ$';
    const key = q.id + '';
    ensureArray(vm, name);
    const arr = vm.arrays.get(name);
    arr.data.set(key, q.text);
  }

  // Weights W(i,j)
  for (const key of Object.keys(knowledge.weights)) {
    const [iStr, jStr] = key.split(':');
    const i = parseInt(iStr, 10);
    const j = parseInt(jStr, 10);
    const value = knowledge.weights[key];

    ensureArray(vm, 'W');
    const arr = vm.arrays.get('W');
    const cellKey = i + ',' + j;
    arr.data.set(cellKey, value);
  }
}

function ensureArray(vm, name) {
  if (!vm.arrays.has(name)) {
    vm.arrays.set(name, {
      dims: [],
      data: new Map()
    });
  }
}

function extractKnowledgeFromVM(vm, maxObjects, maxQuestions) {
  const knowledge = {
    version: 1,
    maxObjects,
    maxQuestions,
    objectCount: vm.variables.get('NO') || 0,
    questionCount: vm.variables.get('NQ') || 0,
    objects: [],
    questions: [],
    weights: {}
  };

  const onArray = vm.arrays.get('ON$');
  const qqArray = vm.arrays.get('QQ$');
  const wArray = vm.arrays.get('W');

  // Objects
  for (let i = 1; i <= knowledge.objectCount; i++) {
    const key = i + '';
    const name = onArray && onArray.data.get(key);
    if (!name) continue;

    knowledge.objects.push({
      id: i,
      name,
      // kind is optional; default to UNKNOWN if BASIC doesn’t store it
      kind: 'UNKNOWN'
    });
  }

  // Questions
  for (let j = 1; j <= knowledge.questionCount; j++) {
    const key = j + '';
    const text = qqArray && qqArray.data.get(key);
    if (!text) continue;

    knowledge.questions.push({
      id: j,
      text
    });
  }

  // Weights
  if (wArray) {
    for (let i = 1; i <= knowledge.objectCount; i++) {
      for (let j = 1; j <= knowledge.questionCount; j++) {
        const cellKey = i + ',' + j;
        if (!wArray.data.has(cellKey)) continue;
        const value = wArray.data.get(cellKey);
        if (value === 0) continue;
        knowledge.weights[`${i}:${j}`] = value;
      }
    }
  }

  return knowledge;
}

module.exports = {
  createDefaultKnowledge,
  hydrateVMFromKnowledge,
  extractKnowledgeFromVM
};