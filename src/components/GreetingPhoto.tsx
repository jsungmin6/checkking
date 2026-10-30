import { useEffect, useState } from "react";
import { apiBlob } from "../utils/api";
import type { CSSProperties } from "react";

interface Props {
  classroomId: number;
  greetingId: number;
  imageAvailable?: boolean;
  imageDataUrl?: string;
  style?: CSSProperties;
}

export default function GreetingPhoto({ classroomId, greetingId, imageAvailable, imageDataUrl, style }: Props) {
  const [src, setSrc] = useState(imageDataUrl ?? "");

  useEffect(() => {
    if (imageDataUrl) {
      setSrc(imageDataUrl);
      return;
    }
    if (!imageAvailable) {
      setSrc("");
      return;
    }

    let objectUrl = "";
    let cancelled = false;
    void apiBlob(`/classrooms/${classroomId}/greetings/${greetingId}/image`)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => setSrc(""));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [classroomId, greetingId, imageAvailable, imageDataUrl]);

  if (!src) return null;
  return (
    <img
      src={src}
      alt="인사와 함께 올린 사진"
      style={{ display: "block", width: "min(100%, 260px)", maxHeight: 300, objectFit: "cover", borderRadius: 14, marginTop: 8, ...style }}
    />
  );
}
