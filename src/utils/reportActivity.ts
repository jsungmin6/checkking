/**
 * 기기 안에서만 끝나는 행동을 서버에 한 줄 알린다. **분석용이다.**
 *
 * 점수·토스포인트는 기기가 관리한다는 원칙은 그대로다 — 여기서는 **무엇을 했는지만**
 * 보내고 금액은 보내지 않는다. 서버는 받은 걸 로그로만 남긴다(DB 저장 없음).
 *
 * 이게 없으면 "포인트탭에 온 사람이 복권을 긁었나, 다른 앱을 둘러봤나, 아니면 10초만
 * 채우고 나갔나"를 구분할 수 없다. 둘러보기·출석박스는 서버를 한 번도 부르지 않아
 * 로그에 흔적이 아예 없었다.
 */

/** 서버 SAFE_EVENT(`[a-z0-9_]{1,40}`)를 통과하는 값만 쓴다. 모르는 값은 서버가 400으로 막는다. */
export type ActivityEvent =
  /** 다른 앱으로 이동했다. */
  | "other_app_open"
  /** 다른 앱을 둘러본 보상을 받았다. */
  | "other_app_claim"
  /** 포인트탭에 10·30·60초 머물렀다. */
  | "points_tab_dwell"
  /** 출석 선물상자를 열었다. */
  | "gift_open"
  /** 연속출석 도장을 받았다. */
  | "streak_claim"
  /** 복권을 긁었다. */
  | "lottery_scratch";

interface ActivityOptions {
  /** 대상(앱 이름 등). 서버가 `[A-Za-z0-9._-]{1,60}`로 거른다. */
  target?: string;
  /** 숫자 값(머문 초, 연속일 등). */
  value?: number;
}

/**
 * 보고한다. **실패해도 조용히 넘어간다** — 보상은 이미 기기에 적혔으므로 보고 실패로
 * 본 흐름을 막으면 안 된다.
 *
 * `api`를 정적으로 들이면 constants가 window를 읽어 테스트(node)에서 터진다.
 */
export function reportActivity(event: ActivityEvent, options: ActivityOptions = {}): void {
  void import("./api")
    .then(({ api }) => api("/diagnostics/activity", {
      method: "POST",
      body: JSON.stringify({
        appName: "checkking",
        event,
        target: options.target,
        value: options.value,
      }),
    }))
    .catch(() => {});
}
