import type { ValidationType } from "../types";

/** 일반 출석은 특별할 게 없어서 태그를 붙이지 않는다. */
const LABELS: Partial<Record<ValidationType, string>> = {
  PHOTO: "사진 인증",
  GPS: "위치 인증",
  WIFI: "와이파이",
  GPS_AND_WIFI: "위치+와이파이",
};

interface Props {
  validationType?: ValidationType | null;
}

export default function ValidationTag({ validationType }: Props) {
  const label = validationType ? LABELS[validationType] : undefined;
  if (!label) return null;

  return (
    <span style={{
      flexShrink: 0, padding: "3px 8px", borderRadius: 12,
      background: "#E8F1FE", color: "#1B64DA",
      fontSize: 11, fontWeight: 600, whiteSpace: "nowrap",
    }}>
      {label}
    </span>
  );
}
