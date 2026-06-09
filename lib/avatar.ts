// 이름 기반 아바타 — 이모지 대신 이름에서 색/이니셜을 결정적으로 생성.
const PALETTE: { bg: string; fg: string }[] = [
  { bg: "#eaf1ff", fg: "#2f6df6" },
  { bg: "#e7f3ec", fg: "#3f7d58" },
  { bg: "#f6eefb", fg: "#7a3b8a" },
  { bg: "#fbf6ec", fg: "#c2701c" },
  { bg: "#fdf3f0", fg: "#b4543f" },
  { bg: "#eef1f4", fg: "#374151" },
  { bg: "#eaf5ef", fg: "#2e7d6b" },
  { bg: "#f4dada", fg: "#b4543f" },
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export function avatarColors(name: string) {
  return PALETTE[hash(name) % PALETTE.length];
}

/** 한국어 이름이면 성을 뺀 이름(뒤 2글자)을 라벨로 사용. */
export function avatarLabel(name: string): string {
  const n = name.trim();
  if (!n) return "?";
  if (/^[가-힣]+$/.test(n)) return n.length >= 3 ? n.slice(1) : n;
  return n[0].toUpperCase();
}
