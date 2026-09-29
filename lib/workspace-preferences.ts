export const featureIds = [
  'focus',
  'morning',
  'calendar',
  'notes',
  'study',
  'sleep',
  'workouts',
  'files',
  'meals',
];
export const defaultNoteFolders = ['업무', '공부', '아이디어', '개인'];
export const preferenceKeys = [
  'favorites',
  'noteFolders',
  'noteOrder',
  'fileOrder',
] as const;
export type PreferenceKey = (typeof preferenceKeys)[number];
export type Preferences = Record<PreferenceKey, string[]>;
export type PreferenceResponse = {
  preferences: Preferences;
  versions: Partial<Record<PreferenceKey, string>>;
};
export const emptyPreferences: Preferences = {
  favorites: [],
  noteFolders: [],
  noteOrder: [],
  fileOrder: [],
};
export function validPreference(
  key: unknown,
  value: unknown,
): key is PreferenceKey {
  if (
    !preferenceKeys.includes(key as PreferenceKey) ||
    !Array.isArray(value) ||
    value.some((item) => typeof item !== 'string') ||
    new Set(value).size !== value.length
  )
    return false;
  if (key === 'favorites')
    return (
      value.length <= featureIds.length &&
      value.every((item) => featureIds.includes(item))
    );
  if (key === 'noteFolders')
    return (
      value.length <= 50 &&
      value.every(
        (item) =>
          item.length > 0 &&
          item.length <= 40 &&
          item.trim() === item &&
          !['전체', '고정', '휴지통', ...defaultNoteFolders].includes(item),
      )
    );
  return (
    value.length <= 5000 &&
    value.every((item) =>
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        item,
      ),
    )
  );
}
export function orderRank(order: string[], id: string) {
  const index = order.indexOf(id);
  return index < 0 ? Number.MAX_SAFE_INTEGER : index;
}
// Reorder visible records without discarding IDs belonging to other folders.
export function reorderIds(
  saved: string[],
  visible: string[],
  source: string,
  target: string,
) {
  if (
    source === target ||
    !visible.includes(source) ||
    !visible.includes(target)
  )
    return saved;
  const reordered = [...visible];
  const from = reordered.indexOf(source),
    to = reordered.indexOf(target);
  reordered.splice(from, 1);
  reordered.splice(to, 0, source);
  const visibleSet = new Set(visible);
  const merged = [...saved, ...visible.filter((id) => !saved.includes(id))];
  let index = 0;
  return merged.map((id) => (visibleSet.has(id) ? reordered[index++] : id));
}
export const noteDragType = 'application/x-chi-note';
export const fileDragType = 'application/x-chi-file';
