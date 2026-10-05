export const AVATARS = Array.from({ length: 12 }, (_, index) => ({
  id: `robot-${String(index + 1).padStart(2, '0')}`,
  label: `Robot ${index + 1}`,
}));
export const DEFAULT_AVATAR_ID = 'robot-01';
export function isAvatarId(value: unknown): value is string {
  return typeof value === 'string' && AVATARS.some(avatar => avatar.id === value);
}
export function avatarSource(id?: string): string {
  return `/avatars/${isAvatarId(id) ? id : DEFAULT_AVATAR_ID}.svg`;
}
