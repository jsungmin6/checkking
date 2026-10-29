import BackHeader from "../components/BackHeader";
import Toast from "../components/Toast";
import InviteCodeForm from "../components/InviteCodeForm";
import { useToast } from "../hooks/useToast";

interface JoinRoomScreenProps {
  onBack: () => void;
  onJoined: (classroomId: number) => void;
  initialCode?: string;
}

/**
 * 초대 딥링크(intoss://checkking/join?inviteCode=...)로 들어왔을 때의 전체 화면.
 * 방 찾기에서 직접 코드를 넣을 때는 화면을 옮기지 않고 JoinRoomModal을 띄운다.
 */
export default function JoinRoomScreen({ onBack, onJoined, initialCode }: JoinRoomScreenProps) {
  const { toastMessage, showToast } = useToast();

  return (
    <div className="page animate-fade-in" style={{ alignItems: "center", justifyContent: "center" }}>
      <BackHeader title="" onBack={onBack} />
      <div style={{ padding: "40px 16px", textAlign: "center", width: "100%", maxWidth: 360 }}>
        <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 8 }}>방 참여하기</div>
        <div style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 24 }}>초대 코드를 입력하세요</div>
        <InviteCodeForm onJoined={onJoined} initialCode={initialCode} onNotice={showToast} />
      </div>
      <Toast message={toastMessage} />
    </div>
  );
}
