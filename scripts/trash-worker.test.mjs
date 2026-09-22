import test from 'node:test';
import assert from 'node:assert/strict';
import { purgeTrash } from './trash-worker.mjs';

function fixture({ storageError = null, deleteError = null } = {}) {
  const calls = [];
  let claimed = false;
  const client = {
    rpc: async () => ({
      data: claimed
        ? []
        : ((claimed = true), [{ id: 'expired', storage_path: 'owner/object' }]),
      error: null,
    }),
    storage: {
      from: () => ({
        remove: async (paths) => {
          calls.push(['storage', paths]);
          return { error: storageError };
        },
      }),
    },
    from: () => ({
      delete: () => ({
        eq: () => ({
          not: async () => {
            calls.push(['metadata']);
            return { error: deleteError };
          },
        }),
      }),
    }),
  };
  return { client, calls };
}
test('Deletes bytes before metadata and stops when no expired files remain', async () => {
  const { client, calls } = fixture();
  assert.equal(await purgeTrash(client), 1);
  assert.deepEqual(calls, [['storage', ['owner/object']], ['metadata']]);
});
test('Storage failure preserves metadata for retry', async () => {
  const { client, calls } = fixture({
    storageError: { message: 'unavailable' },
  });
  await assert.rejects(purgeTrash(client), /Storage cleanup failed/);
  assert.equal(calls.length, 1);
});
test('Metadata failure is reported rather than silently losing the retry record', async () => {
  const { client } = fixture({ deleteError: { message: 'unavailable' } });
  await assert.rejects(purgeTrash(client), /metadata cleanup failed/);
});
