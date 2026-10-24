const EMOJI_ONLY_REGEX = /^(?:\p{Extended_Pictographic}️?‍?)+$/u;

export function isEmojiOnly(content: string): boolean {
  const trimmed = content.trim();
  return trimmed.length > 0 && trimmed.length <= 16 && EMOJI_ONLY_REGEX.test(trimmed);
}
