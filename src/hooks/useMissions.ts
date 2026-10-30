import { useCallback, useEffect, useState } from "react";
import { MISSIONS } from "../missions";
import type { MissionDef } from "../missions";

/**
 * 미션 진행 상태는 서버에 테이블을 두지 않고 기기에만 남긴다.
 * 기존 출석인사 미션이 쓰던 키를 그대로 이어받아야, 이미 받은 사람에게 다시 보이지 않는다.
 */
const doneKey = (id: string) => `att-mission-${id}-done`;
const rewardedKey = (id: string) => `att-mission-${id}-rewarded`;
const SEEN_KEY = "att-mission-seen";

/** 미션 상태가 바뀐 걸 열려 있는 화면들에 알리는 이벤트. */
const CHANGED_EVENT = "att-mission-changed";

function flag(key: string): boolean {
  return localStorage.getItem(key) === "1" || localStorage.getItem(key) === "true";
}

function setFlag(key: string) {
  localStorage.setItem(key, "1");
  window.dispatchEvent(new Event(CHANGED_EVENT));
}

/** 미션을 수행한 순간 호출 — 보상 수령은 별도다. */
export function markMissionDone(id: string) {
  setFlag(doneKey(id));
}

export function markMissionRewarded(id: string) {
  setFlag(rewardedKey(id));
}

export interface MissionState extends MissionDef {
  done: boolean;
}

export function useMissions() {
  const [, bump] = useState(0);

  useEffect(() => {
    const onChange = () => bump((n) => n + 1);
    window.addEventListener(CHANGED_EVENT, onChange);
    return () => window.removeEventListener(CHANGED_EVENT, onChange);
  }, []);

  // 보상까지 받은 미션은 더 보여줄 이유가 없다.
  // 나중에 추가한 미션일수록 위에 오도록 뒤집어서 보여준다(MISSIONS는 오래된 것이 앞).
  const missions: MissionState[] = MISSIONS
    .filter((mission) => !flag(rewardedKey(mission.id)))
    .map((mission) => ({ ...mission, done: flag(doneKey(mission.id)) }))
    .reverse();

  // 마지막으로 열어본 시점의 상태. 달라졌으면 "아직 못 본 변화"가 있다는 뜻이라 배지를 띄운다.
  // 처음에는 저장된 값이 없어서, 한 번도 안 본 사용자에게도 배지가 보인다.
  const state = missions.map((m) => `${m.id}:${m.done ? 1 : 0}`).join(",");
  const hasUpdate = localStorage.getItem(SEEN_KEY) !== state;

  const markSeen = useCallback(() => {
    localStorage.setItem(SEEN_KEY, state);
    bump((n) => n + 1);
  }, [state]);

  const claim = useCallback((id: string) => {
    markMissionRewarded(id);
  }, []);

  return { missions, hasUpdate, markSeen, claim };
}
