const assert = require('assert/strict');
const test = require('node:test');
const path = require('path');
const { loadWithFirebaseMocks } = require('./helpers/load-with-firebase-mocks');

const lifeGridPath = path.resolve(__dirname, '../life-grid-2027.js');

function loadLifeGrid() {
  delete require.cache[lifeGridPath];
  return loadWithFirebaseMocks(lifeGridPath).loaded;
}

test('conditionMet handles completed_task_count', () => {
  const { conditionMet } = loadLifeGrid();

  assert.equal(
    conditionMet({ type: 'completed_task_count', value: 2 }, ['A1', 'B1'], 'B1'),
    true,
  );
  assert.equal(
    conditionMet({ type: 'completed_task_count', value: 3 }, ['A1', 'B1'], 'B1'),
    false,
  );
});

test('conditionMet handles completed_task', () => {
  const { conditionMet } = loadLifeGrid();

  assert.equal(
    conditionMet({ type: 'completed_task', task_id: 'A1' }, ['A1'], 'A1'),
    true,
  );
  assert.equal(
    conditionMet({ type: 'completed_task' }, ['B1'], 'B1'),
    true,
  );
});

test('conditionMet handles completed_level_count', () => {
  const { conditionMet } = loadLifeGrid();

  assert.equal(
    conditionMet({ type: 'completed_level_count', level: 'C', value: 2 }, ['C1', 'C2', 'A1'], 'C2'),
    true,
  );
  assert.equal(
    conditionMet({ type: 'completed_level_count', level: 'B', value: 1 }, ['C1'], 'C1'),
    false,
  );
});

test('conditionMet handles completed_all_level', () => {
  const { conditionMet } = loadLifeGrid();

  assert.equal(
    conditionMet({ type: 'completed_all_level', level: 'A' }, ['A1', 'A2'], 'A2'),
    true,
  );
  assert.equal(
    conditionMet({ type: 'completed_all_level', level: 'A' }, ['A1'], 'A1'),
    false,
  );
});

test('conditionMet handles completed_before', () => {
  const { conditionMet } = loadLifeGrid();
  const future = Date.now() + 10000;
  const past = Date.now() - 10000;

  assert.equal(
    conditionMet({ type: 'completed_before', task_count: 2, before: future }, ['A1', 'B1'], 'B1'),
    true,
  );
  assert.equal(
    conditionMet({ type: 'completed_before', task_count: 2, before: past }, ['A1', 'B1'], 'B1'),
    false,
  );
});
