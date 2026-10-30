interface InlineEmojiProps {
  src: string;
  size?: number;
}

/** 글 사이에 끼워 넣는 작은 캐릭터 이모지 — 기기마다 모양이 달라지는 기본 이모지 대신 직접 그린 것을 쓴다. */
export default function InlineEmoji({ src, size = 19 }: InlineEmojiProps) {
  return (
    <img
      src={src}
      alt=""
      style={{
        width: size, height: size, objectFit: "contain",
        verticalAlign: `-${Math.round(size * 0.21)}px`, display: "inline-block",
      }}
    />
  );
}
