/**
 * 안 읽은 인사 표시.
 *
 * 읽었는지는 사람이 아니라 기기 단위로 봐야 자연스러워서(폰에서 본 걸 태블릿에서도 읽음 처리하면
 * 어색하다) 서버에는 남기지 않고 기기에 둔다. 서버는 방마다 "오늘의 마지막 인사 id"만 주고,
 * 그게 내가 본 마지막 글보다 크면 새 글이 있다고 본다.
 */

const SEEN_PREFIX = "att-greeting-seen-";
const LATEST_PREFIX = "att-greeting-latest-";

function readNumber(key: string): number {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return 0;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : 0;
  } catch {
    return 0;
  }
}

function writeNumber(key: string, value: number) {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // 저장이 막힌 환경이면 점이 계속 보이는 정도의 불편으로 끝난다.
  }
}

/** 이 방에 내가 아직 안 본 인사가 있는지. */
export function hasUnreadGreeting(classroomId: number, latestGreetingId: number | null | undefined): boolean {
  if (latestGreetingId == null) return false;
  return latestGreetingId > readNumber(SEEN_PREFIX + classroomId);
}

/** 여기까지 봤다고 기록한다. 뒤로 돌아가지 않도록 더 큰 id 일 때만 올린다. */
export function markGreetingsSeen(classroomId: number, latestGreetingId: number | null | undefined) {
  if (latestGreetingId == null) return;
  if (latestGreetingId <= readNumber(SEEN_PREFIX + classroomId)) return;
  writeNumber(SEEN_PREFIX + classroomId, latestGreetingId);
}

/**
 * 서버가 준 마지막 인사 id를 기억해둔다.
 * 방 안의 랭킹·통계·설정 탭은 방 정보를 따로 받아오지 않는데, 거기서도 인사 탭에 점이 보여야 한다.
 */
export function rememberLatestGreetingId(classroomId: number, latestGreetingId: number | null | undefined) {
  writeNumber(LATEST_PREFIX + classroomId, latestGreetingId ?? 0);
}

/** 방 정보를 받아오지 않는 화면에서 쓰는 판단. 마지막으로 받아둔 값을 기준으로 본다. */
export function hasUnreadGreetingFromCache(classroomId: number): boolean {
  return readNumber(LATEST_PREFIX + classroomId) > readNumber(SEEN_PREFIX + classroomId);
}
