export type ActiveField = {
  id: string;
  seed: number;
  openedAt: string;
  theme: number;
  foundIndexes: number[];
  hintUsed: boolean;
  bonus: boolean;
};

export const THEMES = [
  { name: "이슬 맺힌 풀밭", hue: 104 },
  { name: "햇살 드는 풀밭", hue: 87 },
  { name: "비 온 뒤 풀밭", hue: 131 },
] as const;

export function random(seed: number) {
  let value = seed >>> 0;
  return () => {
    value += 0x6d2b79f5;
    let n = Math.imul(value ^ (value >>> 15), 1 | value);
    n ^= n + Math.imul(n ^ (n >>> 7), 61 | n);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
