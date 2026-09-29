import test from 'node:test';
import assert from 'node:assert/strict';
import { validPreference, reorderIds } from '../lib/workspace-preferences.ts';
test('Preferences reject reserved folders, invalid IDs and duplicated values', () => {
  assert.equal(validPreference('favorites', ['notes', 'study']), true);
  assert.equal(validPreference('favorites', ['profile']), false);
  assert.equal(validPreference('favorites', ['notes', 'notes']), false);
  assert.equal(validPreference('noteFolders', ['프로젝트']), true);
  assert.equal(validPreference('noteFolders', ['휴지통']), false);
  assert.equal(validPreference('noteFolders', [' 개인 ']), false);
  assert.equal(validPreference('fileOrder', ['not-an-id']), false);
  assert.equal(validPreference('__proto__', []), false);
});
test('Drag order preserves records hidden by a folder or search', () => {
  assert.deepEqual(
    reorderIds(['a', 'hidden', 'b', 'c'], ['a', 'b', 'c'], 'c', 'a'),
    ['c', 'hidden', 'a', 'b'],
  );
  assert.deepEqual(reorderIds([], ['a', 'b', 'c'], 'a', 'c'), ['b', 'c', 'a']);
  assert.deepEqual(reorderIds(['hidden'], ['new', 'a'], 'a', 'new'), [
    'hidden',
    'a',
    'new',
  ]);
  assert.deepEqual(reorderIds(['a', 'b'], ['a', 'b'], 'external', 'b'), [
    'a',
    'b',
  ]);
});
