import { useState } from "react";
import { api, ApiError } from "../utils/api";
import { customEmojiMarker, getCustomEmojiSrc, GREETING_EMOJIS, parseGreetingContent } from "../utils/emoji";
import { markGreetingMissionDone } from "../hooks/useAttendancePoints";
import type { RoomGreeting } from "../types";

interface PostGreetingModalProps {
  classroomId: number;
  editGreeting?: RoomGreeting;
  onClose: () => void;
  onPosted: (greeting: RoomGreeting) => void;
}

export default function PostGreetingModal({ classroomId, editGreeting, onClose, onPosted }: PostGreetingModalProps) {
  const isEdit = !!editGreeting;
  const initial = editGreeting ? parseGreetingContent(editGreeting.content) : { emoji: null, text: "" };
  const [text, setText] = useState(initial.text);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(initial.emoji);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const content = selectedEmoji ? [selectedEmoji, text.trim()].filter(Boolean).join(" ") : text.trim();
  const selectedEmojiSrc = selectedEmoji ? getCustomEmojiSrc(selectedEmoji) : null;

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setSending(true);
    setError(null);
    try {
      const url = isEdit
        ? `/classrooms/${classroomId}/greetings/${editGreeting!.greetingId}`
        : `/classrooms/${classroomId}/greetings`;
      const greeting = await api<RoomGreeting>(url, {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify({ content: content.trim() }),
      });
      // 수정이 아니라 "새로 남긴" 경우에만 미션 완료로 친다.
      if (!isEdit) markGreetingMissionDone();
      onPosted(greeting);
      onClose();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "전송에 실패했어요");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 360, background: "var(--bg-card)", borderRadius: 20, padding: "22px 20px",
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{isEdit ? "인사 수정" : "오늘의 출석 인사"}</div>
        <div style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14, lineHeight: 1.5 }}>
          {isEdit ? "이모지와 코멘트를 함께 수정할 수 있어요." : "하루에 한 번, 짧게 한마디 남겨보세요."}
        </div>
        <div style={{
          borderRadius: "var(--radius-input)", border: "1px solid var(--border-light)",
          overflow: "hidden", marginBottom: 4,
        }}>
          {selectedEmoji && (
            <div style={{
              position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
              width: "100%", height: 90, background: "var(--bg-secondary)",
              borderBottom: "1px solid var(--border-light)",
            }}>
              {selectedEmojiSrc ? (
                <img src={selectedEmojiSrc} alt="선택한 캐릭터" style={{ width: 76, height: 76, objectFit: "contain" }} />
              ) : (
                <span style={{ fontSize: 44, lineHeight: 1 }}>{selectedEmoji}</span>
              )}
              <button
                type="button"
                onClick={() => setSelectedEmoji(null)}
                style={{
                  position: "absolute", top: 8, right: 8, width: 24, height: 24, borderRadius: "50%",
                  border: "none", background: "rgba(0,0,0,0.08)", color: "var(--text-secondary)",
                  fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
                }}
              >
                ✕
              </button>
            </div>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="메시지 입력"
            maxLength={200}
            rows={selectedEmoji ? 2 : 4}
            autoFocus
            style={{
              width: "100%", padding: 12, border: "none", outline: "none", background: "var(--bg-card)",
              color: "var(--text-primary)", fontSize: 14, resize: "none", boxSizing: "border-box",
              display: "block",
            }}
          />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: showEmojiPicker ? 8 : 10 }}>
          <button
            type="button"
            onClick={() => setShowEmojiPicker((v) => !v)}
            style={{
              width: 32, height: 32, borderRadius: "50%",
              border: showEmojiPicker ? "1px solid var(--accent-blue)" : "1px solid var(--border-light)",
              background: showEmojiPicker ? "var(--accent-blue-light, var(--bg-secondary))" : "var(--bg-secondary)",
              fontSize: 17, display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
            }}
          >
            <img
              src={selectedEmojiSrc ?? GREETING_EMOJIS[0]!.src}
              alt="캐릭터 선택"
              style={{ width: 24, height: 24, objectFit: "contain" }}
            />
          </button>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{content.length}/200</span>
        </div>
        {showEmojiPicker && (
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 6, padding: 10, marginBottom: 10,
            background: "var(--bg-secondary)", borderRadius: "var(--radius-input)",
          }}>
            {GREETING_EMOJIS.map((emoji) => {
              const marker = customEmojiMarker(emoji.id);
              return (
              <button
                key={emoji.id}
                type="button"
                title={emoji.label}
                aria-label={emoji.label}
                onClick={() => setSelectedEmoji(marker)}
                style={{
                  width: "100%", aspectRatio: "1", borderRadius: 10,
                  border: selectedEmoji === marker ? "2px solid var(--accent-blue)" : "1px solid var(--border-light)",
                  background: "var(--bg-card)", display: "flex", alignItems: "center",
                  justifyContent: "center", padding: 3, overflow: "hidden",
                }}
              >
                <img src={emoji.src} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
              </button>
              );
            })}
          </div>
        )}
        {error && <div style={{ color: "var(--accent-red)", fontSize: 13, marginBottom: 8 }}>{error}</div>}
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button onClick={onClose} style={{
            flex: 1, padding: 13, borderRadius: "var(--radius-button)", border: "1px solid var(--border-color)",
            background: "transparent", color: "var(--text-secondary)", fontSize: 14, fontWeight: 600,
          }}>
            취소
          </button>
          <button
            onClick={handleSubmit}
            disabled={!content.trim() || sending}
            style={{
              flex: 2, padding: 13, borderRadius: "var(--radius-button)", border: "none",
              background: "var(--accent-blue)", color: "#fff", fontSize: 14, fontWeight: 700,
              opacity: !content.trim() || sending ? 0.5 : 1,
            }}
          >
            {sending ? (isEdit ? "수정 중..." : "남기는 중...") : (isEdit ? "수정하기" : "남기기")}
          </button>
        </div>
      </div>
    </div>
  );
}
