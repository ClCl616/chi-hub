export async function purgeTrash(client) {
  let count = 0;
  for (let batch = 0; batch < 100; batch++) {
    const { data, error } = await client.rpc('claim_expired_files', {
      batch_size: 100,
    });
    if (error) throw new Error('Could not claim expired trash records.');
    if (!data?.length) break;
    for (const file of data) {
      const { error: storageError } = await client.storage
        .from('private-files')
        .remove([file.storage_path]);
      if (storageError)
        throw new Error(
          'Storage cleanup failed; claimed files will be retried.',
        );
      const { error: deleteError } = await client
        .from('files')
        .delete()
        .eq('id', file.id)
        .not('purge_started_at', 'is', null);
      if (deleteError)
        throw new Error(
          'Trash metadata cleanup failed; claimed files will be retried.',
        );
      count++;
    }
  }
  return count;
}
