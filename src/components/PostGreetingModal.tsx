import { useRef, useState } from "react";
import { api, ApiError } from "../utils/api";
import { customEmojiMarker, getCustomEmojiSrc, GREETING_EMOJIS, parseGreetingContent } from "../utils/emoji";
import { markMissionDone } from "../hooks/useMissions";
import { isTossApp } from "../utils/platform";
import type { RoomGreeting } from "../types";
import GreetingPhoto from "./GreetingPhoto";

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
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [removeExistingPhoto, setRemoveExistingPhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const content = selectedEmoji ? [selectedEmoji, text.trim()].filter(Boolean).join(" ") : text.trim();
  const selectedEmojiSrc = selectedEmoji ? getCustomEmojiSrc(selectedEmoji) : null;
  const hasExistingPhoto = !!editGreeting?.imageAvailable && !removeExistingPhoto;
  const canSubmit = !!content.trim() || !!photoBase64 || hasExistingPhoto;

  const toJpeg = async (source: string): Promise<string> => {
    const image = new Image();
    image.src = source.startsWith("data:") ? source : `data:image/jpeg;base64,${source}`;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("사진을 읽지 못했어요"));
    });
    const scale = Math.min(1, 1024 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("사진을 처리하지 못했어요");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.78, 0.66, 0.54]) {
      const encoded = canvas.toDataURL("image/jpeg", quality).split(",")[1] ?? "";
      if (encoded.length <= 1_333_334) return encoded;
    }
    throw new Error("사진 용량이 커요. 다른 사진을 골라주세요.");
  };

  const setPhoto = async (source: string) => {
    try {
      const base64 = await toJpeg(source);
      if (!base64) throw new Error("사진을 읽지 못했어요");
      setPhotoBase64(base64);
      setPhotoPreview(`data:image/jpeg;base64,${base64}`);
      setRemoveExistingPhoto(false);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "사진을 불러오지 못했어요");
    }
  };

  const choosePhoto = async (kind: "camera" | "gallery") => {
    if (photoBusy) return;
    setError(null);
    if (!isTossApp()) {
      (kind === "camera" ? cameraInputRef : galleryInputRef).current?.click();
      return;
    }
    setPhotoBusy(true);
    try {
      const { Device } = await import("@apps-in-toss/web-framework");
      if (kind === "camera") {
        const image = await Device.openCamera({ base64: true, maxWidth: 1024 });
        await setPhoto(image.dataUri);
      } else {
        const images = await Device.getPhotos({ base64: true, maxCount: 2, maxWidth: 1024 });
        if (images.length > 0) await setPhoto(images[0]!.dataUri);
      }
    } catch (e) {
      // 카메라/앨범을 그냥 닫은 것은 실패가 아닌데, 네이티브가 cancel 계열 에러를 던진다.
      // 그대로 보여주면 "canceled"가 빨간 경고로 찍히므로 조용히 넘긴다.
      const message = e instanceof Error ? e.message : "";
      if (/cancel/i.test(message)) return;
      setError(message || "사진을 가져오지 못했어요. 권한을 확인해 주세요.");
    } finally {
      setPhotoBusy(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const source = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("사진을 읽지 못했어요"));
      reader.onerror = () => reject(new Error("사진을 읽지 못했어요"));
      reader.readAsDataURL(file);
    }).catch((e) => {
      setError(e instanceof Error ? e.message : "사진을 읽지 못했어요");
      return "";
    });
    if (source) await setPhoto(source);
  };

  const handleSubmit = async () => {
    if (!canSubmit || photoBusy) return;
    setSending(true);
    setError(null);
    try {
      const url = isEdit
        ? `/classrooms/${classroomId}/greetings/${editGreeting!.greetingId}`
        : `/classrooms/${classroomId}/greetings`;
      const greeting = await api<RoomGreeting>(url, {
        method: isEdit ? "PUT" : "POST",
        body: JSON.stringify({
          content: content.trim(),
          imageBase64: photoBase64,
          removeImage: removeExistingPhoto,
        }),
      });
      // 수정이 아니라 "새로 남긴" 경우에만 미션 완료로 친다.
      if (!isEdit) markMissionDone("greeting");
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
          {isEdit ? "캐릭터, 사진, 코멘트를 수정할 수 있어요." : "인사와 사진을 자유롭게 남겨보세요."}
        </div>
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileChange} style={{ display: "none" }} />
        <input ref={galleryInputRef} type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
        <div style={{
          borderRadius: "var(--radius-input)", border: "1px solid var(--border-light)",
          overflow: "hidden", marginBottom: 4,
        }}>
          {(selectedEmoji || photoPreview || hasExistingPhoto) && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "flex-start", gap: 10,
              width: "100%", minHeight: 104, padding: 10, boxSizing: "border-box",
              background: "var(--bg-secondary)", borderBottom: "1px solid var(--border-light)",
            }}>
              {selectedEmoji && (
                <div style={{ position: "relative", flex: "0 0 82px", width: 82, height: 82 }}>
                  {selectedEmojiSrc ? (
                    <img src={selectedEmojiSrc} alt="선택한 캐릭터" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  ) : (
                    <span style={{ display: "grid", width: "100%", height: "100%", placeItems: "center", fontSize: 52 }}>{selectedEmoji}</span>
                  )}
                  <button type="button" aria-label="캐릭터 제거" onClick={() => setSelectedEmoji(null)} style={removeItemStyle}>✕</button>
                </div>
              )}
              {(photoPreview || hasExistingPhoto) && (
                <div style={{ position: "relative", flex: "0 1 150px", width: 150, height: 88 }}>
                  {photoPreview ? (
                    <img src={photoPreview} alt="올릴 사진 미리보기" style={photoPreviewStyle} />
                  ) : editGreeting && (
                    <GreetingPhoto
                      classroomId={classroomId}
                      greetingId={editGreeting.greetingId}
                      imageAvailable={editGreeting.imageAvailable}
                      imageDataUrl={editGreeting.imageDataUrl}
                      style={{ width: "100%", height: "100%", maxHeight: "none", borderRadius: 12, marginTop: 0 }}
                    />
                  )}
                  <button type="button" aria-label="사진 제거" onClick={() => {
                    setPhotoBase64(null);
                    setPhotoPreview(null);
                    if (editGreeting?.imageAvailable) setRemoveExistingPhoto(true);
                  }} style={removeItemStyle}>✕</button>
                </div>
              )}
            </div>
          )}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="메시지 입력"
            maxLength={200}
            rows={selectedEmoji || photoPreview || hasExistingPhoto ? 2 : 4}
            autoFocus
            style={{
              width: "100%", padding: 12, border: "none", outline: "none", background: "var(--bg-card)",
              color: "var(--text-primary)", fontSize: 14, resize: "none", boxSizing: "border-box",
              display: "block",
            }}
          />
        </div>
        {photoBusy && <div style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 8 }}>사진을 불러오는 중...</div>}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: showEmojiPicker ? 8 : 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
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
          <button type="button" aria-label="카메라로 사진 찍기" title="카메라" onClick={() => void choosePhoto("camera")} disabled={photoBusy} style={mediaIconButtonStyle}>
            <img src="/icons/greeting-camera.png" alt="" style={mediaIconImageStyle} />
          </button>
          <button type="button" aria-label="사진첩에서 사진 선택" title="사진첩" onClick={() => void choosePhoto("gallery")} disabled={photoBusy} style={mediaIconButtonStyle}>
            <img src="/icons/greeting-gallery.png" alt="" style={mediaIconImageStyle} />
          </button>
          </div>
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
            disabled={!canSubmit || sending || photoBusy}
            style={{
              flex: 2, padding: 13, borderRadius: "var(--radius-button)", border: "none",
              background: "var(--accent-blue)", color: "#fff", fontSize: 14, fontWeight: 700,
              opacity: !canSubmit || sending || photoBusy ? 0.5 : 1,
            }}
          >
            {sending ? (isEdit ? "수정 중..." : "남기는 중...") : (isEdit ? "수정하기" : "남기기")}
          </button>
        </div>
      </div>
    </div>
  );
}

const mediaIconButtonStyle: React.CSSProperties = {
  width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--border-light)",
  background: "var(--bg-secondary)", color: "var(--text-primary)",
  display: "flex", alignItems: "center", justifyContent: "center", padding: 0,
};

const mediaIconImageStyle: React.CSSProperties = {
  display: "block", width: 29, height: 29, objectFit: "contain",
};

const photoPreviewStyle: React.CSSProperties = {
  display: "block", width: "100%", height: "100%", objectFit: "cover", borderRadius: 12, background: "var(--bg-card)",
};

const removeItemStyle: React.CSSProperties = {
  position: "absolute", top: 0, right: 0, width: 22, height: 22, border: 0, borderRadius: "50%",
  background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 12, display: "grid", placeItems: "center", padding: 0,
};
