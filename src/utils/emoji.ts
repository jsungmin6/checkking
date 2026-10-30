const EMOJI_ONLY_REGEX = /^(?:\p{Extended_Pictographic}️?‍?)+$/u;
const LEADING_EMOJI_REGEX = /^(\p{Extended_Pictographic}️?‍?)\s+(.+)$/su;
const CUSTOM_EMOJI_REGEX = /^:checkking:([a-z0-9-]+):(?:\s+([\s\S]+))?$/u;

export interface GreetingEmoji {
  id: string;
  label: string;
  src: string;
}

/** 글자가 들어간 스티커 — 한눈에 뜻이 보여서 위쪽에 둔다. */
const STICKERS: GreetingEmoji[] = [
  { id: "sticker-im-here", label: "나 왔어요", src: "/emojis/greeting-stickers/im-here.png" },
  { id: "sticker-check-in-complete", label: "출첵 완료", src: "/emojis/greeting-stickers/check-in-complete.png" },
  { id: "sticker-wake-up", label: "기상 완료", src: "/emojis/greeting-stickers/wake-up.png" },
  { id: "sticker-first-place", label: "1등이에요", src: "/emojis/greeting-stickers/first-place.png" },
  { id: "sticker-checkking-best", label: "출석왕 최고", src: "/emojis/greeting-stickers/checkking-best.png" },
  { id: "sticker-lets-go", label: "오늘도 가보자", src: "/emojis/greeting-stickers/lets-go.png" },
  { id: "sticker-cheer-up", label: "힘내자", src: "/emojis/greeting-stickers/cheer-up.png" },
  { id: "sticker-nice-to-see-you", label: "반가워요", src: "/emojis/greeting-stickers/nice-to-see-you.png" },
  { id: "sticker-sleepy", label: "졸려용", src: "/emojis/greeting-stickers/sleepy.png" },
];

/** 글자 없는 캐릭터 이모지 */
const CHARACTERS: GreetingEmoji[] = [
  { id: "hello-tortoise", label: "안녕하세요 거북이", src: "/emojis/redrawn/hello-tortoise.png" },
  { id: "morning-chick", label: "좋은 아침 병아리", src: "/emojis/redrawn/morning-chick.png" },
  { id: "morning-hamster", label: "좋은 아침 햄스터", src: "/emojis/redrawn/morning-hamster.png" },
  { id: "attendance-tortoise", label: "출석 거북이", src: "/emojis/redrawn/attendance-tortoise.png" },
  { id: "attendance-rabbit", label: "출석 토끼", src: "/emojis/redrawn/attendance-rabbit.png" },
  { id: "cheer-rabbit", label: "응원 토끼", src: "/emojis/redrawn/cheer-rabbit.png" },
  { id: "cheer-tortoise", label: "응원 거북이", src: "/emojis/redrawn/cheer-tortoise.png" },
  { id: "wellwish-frog", label: "행복 개구리", src: "/emojis/redrawn/wellwish-frog.png" },
  { id: "wellwish-cloud", label: "행복 구름", src: "/emojis/redrawn/wellwish-cloud.png" },
  { id: "wellwish-chick", label: "행복 병아리", src: "/emojis/redrawn/wellwish-chick.png" },
  { id: "together-rabbit-tortoise", label: "함께 토끼와 거북이", src: "/emojis/redrawn/together-rabbit-tortoise.png" },
  { id: "together-cat-penguin", label: "함께 고양이와 펭귄", src: "/emojis/redrawn/together-cat-penguin.png" },
  { id: "together-hamster-chick", label: "함께 햄스터와 병아리", src: "/emojis/redrawn/together-hamster-chick.png" },
];

/**
 * 글자 스티커와 뜻이 겹쳐서 고르는 목록에서는 뺐지만, 지난 인사에 이미 쓰인 것들이다.
 * 여기서 지우면 그 인사의 그림이 깨지므로 렌더용으로만 남겨둔다.
 */
const RETIRED_EMOJIS: GreetingEmoji[] = [
  { id: "hello-rabbit", label: "안녕하세요 토끼", src: "/emojis/redrawn/hello-rabbit.png" },
  { id: "hello-cloud", label: "안녕하세요 구름", src: "/emojis/redrawn/hello-cloud.png" },
  { id: "morning-cat", label: "좋은 아침 고양이", src: "/emojis/redrawn/morning-cat.png" },
  { id: "attendance-penguin", label: "출석 펭귄", src: "/emojis/redrawn/attendance-penguin.png" },
  { id: "cheer-puppy", label: "응원 강아지", src: "/emojis/redrawn/cheer-puppy.png" },
];

/** 인사 작성 화면의 이모지 선택 목록 */
export const GREETING_EMOJIS: GreetingEmoji[] = [...STICKERS, ...CHARACTERS];

/**
 * 프로필 그림으로 쓰는 목록.
 *
 * 글자가 들어간 스티커는 36px로 줄이면 읽히지 않아 뺐다. 캐릭터가 둘인 together- 도
 * 그 크기에서는 뭉개진다. 고르는 목록에서 빠진 이모지들은 뜻이 겹쳐 뺀 것일 뿐
 * 그림 자체는 멀쩡하므로 여기서는 함께 쓴다.
 */
export const AVATAR_EMOJIS: GreetingEmoji[] = [
  ...CHARACTERS.filter((emoji) => !emoji.id.startsWith("together-")),
  ...RETIRED_EMOJIS,
];

/** 사람마다 늘 같은 그림이 나오도록 userId 로 고른다. */
export function avatarEmojiSrc(userId: number): string {
  const count = AVATAR_EMOJIS.length;
  // userId 가 음수여도 안전하게 범위 안으로 넣는다.
  const index = ((userId % count) + count) % count;
  return AVATAR_EMOJIS[index]!.src;
}

export function customEmojiMarker(id: string): string {
  return `:checkking:${id}:`;
}

export function getCustomEmojiSrc(marker: string): string | null {
  const match = marker.match(/^:checkking:([a-z0-9-]+):$/u);
  if (!match) return null;
  // 고르는 목록에서 빠진 것도 지난 인사에 남아 있으므로 함께 찾는다.
  const found = GREETING_EMOJIS.find((emoji) => emoji.id === match[1])
    ?? RETIRED_EMOJIS.find((emoji) => emoji.id === match[1]);
  return found?.src ?? null;
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
