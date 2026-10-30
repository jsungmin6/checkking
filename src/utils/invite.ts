import { isTossApp } from "./platform";
import { api } from "./api";

const APP_NAME = "checkking";

export type ShareInviteResult = "shared" | "copied" | "failed";

/** 방 초대 메시지를 네이티브 공유시트(토스 앱) 또는 Web Share API로 보낸다. 둘 다 안 되면 클립보드에 복사한다. */
export async function shareRoomInvite(roomName: string, inviteCode: string, classroomId: number): Promise<ShareInviteResult> {
  const text = `[${roomName}] 출석왕 방에 초대해요!\n초대 코드: ${inviteCode}`;
  const result = await doShare(text, inviteCode);
  // 토스 공유시트는 사용자가 취소했을 때 Promise를 reject하는지 문서에 정의돼 있지 않다.
  // 결과를 그대로 서버에 보내, 실제로 취소가 failed로 잡히는지 알림으로 확인한다.
  void api("/notifications/room-invited", {
    method: "POST",
    body: JSON.stringify({ classroomId, result }),
  }).catch(() => {});
  return result;
}

async function doShare(text: string, inviteCode: string): Promise<ShareInviteResult> {
  if (isTossApp()) {
    try {
      const { Share } = await import("@apps-in-toss/web-framework");
      const link = await Share.createLink({ path: `intoss://${APP_NAME}/join?inviteCode=${inviteCode}` });
      await Share.sendMessage({ message: `${text}\n${link}` });
      return "shared";
    } catch {
      return "failed";
    }
  }

  if (navigator.share) {
    try {
      await navigator.share({ title: "출석왕 초대", text });
      return "shared";
    } catch {
      return "failed";
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}
