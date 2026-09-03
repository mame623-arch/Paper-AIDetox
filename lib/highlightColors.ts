// 하이라이트 색 — 이모지 대신 색으로 구분한다.
// fill 은 PDF 위에 mix-blend-mode: multiply 로 얹히므로 밝은 파스텔로 둔다.
export interface HighlightColor {
  key: string;
  label: string;
  /** 하이라이트 채움 */
  fill: string;
  /** 목록의 색 점 / 테두리 */
  dot: string;
}

export const HIGHLIGHT_COLORS: HighlightColor[] = [
  { key: "yellow", label: "노랑", fill: "#ffe28f", dot: "#d9a400" },
  { key: "green", label: "초록", fill: "#b9edc4", dot: "#3f9d55" },
  { key: "blue", label: "파랑", fill: "#bcdcff", dot: "#2f6df6" },
  { key: "pink", label: "분홍", fill: "#ffc7d8", dot: "#df4f89" },
  { key: "purple", label: "보라", fill: "#ddc9f6", dot: "#8a4fc2" },
];

export const DEFAULT_HIGHLIGHT_COLOR = "yellow";

/** 스크롤로 찾아간 하이라이트를 잠깐 강조할 때 쓰는 색 */
export const SCROLLED_TO_FILL = "#ff8a8a";

export function highlightColor(key?: string | null): HighlightColor {
  return (
    HIGHLIGHT_COLORS.find((c) => c.key === key) ?? HIGHLIGHT_COLORS[0]
  );
}
