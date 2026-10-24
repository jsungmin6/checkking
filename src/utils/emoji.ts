const EMOJI_ONLY_REGEX = /^(?:\p{Extended_Pictographic}️?‍?)+$/u;
const LEADING_EMOJI_REGEX = /^(\p{Extended_Pictographic}️?‍?)\s+(.+)$/su;

export function isEmojiOnly(content: string): boolean {
  const trimmed = content.trim();
  return trimmed.length > 0 && trimmed.length <= 16 && EMOJI_ONLY_REGEX.test(trimmed);
}

export function parseGreetingContent(content: string): { emoji: string | null; text: string } {
  const trimmed = content.trim();
  if (isEmojiOnly(trimmed)) return { emoji: trimmed, text: "" };
  const match = trimmed.match(LEADING_EMOJI_REGEX);
  if (match) return { emoji: match[1]!, text: match[2]! };
  return { emoji: null, text: trimmed };
}
