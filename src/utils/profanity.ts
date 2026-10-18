// 비속어 필터 (한국어 + 영어 기본)
const PROFANITY_LIST = [
  // 한국어
  "시발", "씨발", "ㅅㅂ", "씨바", "시바", "개새끼", "ㄱㅅㄲ", "병신", "ㅂㅅ",
  "지랄", "ㅈㄹ", "미친", "꺼져", "닥쳐", "죽어", "씹", "좆", "보지", "자지",
  "년", "놈", "새끼", "ㅅㄲ", "멍청", "바보", "찐따", "등신",
  // 영어
  "fuck", "shit", "bitch", "ass", "dick", "pussy", "bastard", "damn",
];

export function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase().replace(/\s/g, "");
  return PROFANITY_LIST.some((word) => lower.includes(word));
}

export function validateNickname(nickname: string): string | null {
  if (nickname.length < 2) return "닉네임은 2자 이상이어야 합니다";
  if (nickname.length > 20) return "닉네임은 20자 이하여야 합니다";
  if (containsProfanity(nickname)) return "부적절한 표현이 포함되어 있습니다";
  return null;
}

export function validateRoomName(name: string): string | null {
  if (name.trim().length === 0) return "방 이름을 입력해주세요";
  if (containsProfanity(name)) return "부적절한 표현이 포함되어 있습니다";
  return null;
}
