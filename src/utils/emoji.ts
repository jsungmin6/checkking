const EMOJI_ONLY_REGEX = /^(?:\p{Extended_Pictographic}️?‍?)+$/u;
const LEADING_EMOJI_REGEX = /^(\p{Extended_Pictographic}️?‍?)\s+(.+)$/su;
const CUSTOM_EMOJI_REGEX = /^:checkking:([a-z0-9-]+):(?:\s+([\s\S]+))?$/u;

export interface GreetingEmoji {
  id: string;
  label: string;
  src: string;
}

export const GREETING_EMOJIS: GreetingEmoji[] = [
  { id: "hello-rabbit", label: "안녕하세요 토끼", src: "/emojis/redrawn/hello-rabbit.png" },
  { id: "hello-tortoise", label: "안녕하세요 거북이", src: "/emojis/redrawn/hello-tortoise.png" },
  { id: "hello-cloud", label: "안녕하세요 구름", src: "/emojis/redrawn/hello-cloud.png" },
  { id: "morning-chick", label: "좋은 아침 병아리", src: "/emojis/redrawn/morning-chick.png" },
  { id: "morning-hamster", label: "좋은 아침 햄스터", src: "/emojis/redrawn/morning-hamster.png" },
  { id: "morning-cat", label: "좋은 아침 고양이", src: "/emojis/redrawn/morning-cat.png" },
  { id: "attendance-tortoise", label: "출석 거북이", src: "/emojis/redrawn/attendance-tortoise.png" },
  { id: "attendance-rabbit", label: "출석 토끼", src: "/emojis/redrawn/attendance-rabbit.png" },
  { id: "attendance-penguin", label: "출석 펭귄", src: "/emojis/redrawn/attendance-penguin.png" },
  { id: "cheer-rabbit", label: "응원 토끼", src: "/emojis/redrawn/cheer-rabbit.png" },
  { id: "cheer-tortoise", label: "응원 거북이", src: "/emojis/redrawn/cheer-tortoise.png" },
  { id: "cheer-puppy", label: "응원 강아지", src: "/emojis/redrawn/cheer-puppy.png" },
  { id: "wellwish-frog", label: "행복 개구리", src: "/emojis/redrawn/wellwish-frog.png" },
  { id: "wellwish-cloud", label: "행복 구름", src: "/emojis/redrawn/wellwish-cloud.png" },
  { id: "wellwish-chick", label: "행복 병아리", src: "/emojis/redrawn/wellwish-chick.png" },
  { id: "together-rabbit-tortoise", label: "함께 토끼와 거북이", src: "/emojis/redrawn/together-rabbit-tortoise.png" },
  { id: "together-cat-penguin", label: "함께 고양이와 펭귄", src: "/emojis/redrawn/together-cat-penguin.png" },
  { id: "together-hamster-chick", label: "함께 햄스터와 병아리", src: "/emojis/redrawn/together-hamster-chick.png" },
];

export function customEmojiMarker(id: string): string {
  return `:checkking:${id}:`;
}

export function getCustomEmojiSrc(marker: string): string | null {
  const match = marker.match(/^:checkking:([a-z0-9-]+):$/u);
  if (!match) return null;
  return GREETING_EMOJIS.find((emoji) => emoji.id === match[1])?.src ?? null;
}

export function isEmojiOnly(content: string): boolean {
  const trimmed = content.trim();
  return trimmed.length > 0 && trimmed.length <= 16 && EMOJI_ONLY_REGEX.test(trimmed);
}

export function parseGreetingContent(content: string): { emoji: string | null; text: string } {
  const trimmed = content.trim();
  const customMatch = trimmed.match(CUSTOM_EMOJI_REGEX);
  if (customMatch) return { emoji: customEmojiMarker(customMatch[1]!), text: customMatch[2]?.trim() ?? "" };
  if (isEmojiOnly(trimmed)) return { emoji: trimmed, text: "" };
  const match = trimmed.match(LEADING_EMOJI_REGEX);
  if (match) return { emoji: match[1]!, text: match[2]! };
  return { emoji: null, text: trimmed };
}
