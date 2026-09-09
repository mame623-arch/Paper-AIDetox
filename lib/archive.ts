import { isPreset } from "./highlightPurposes";
import type { Highlight, Paper } from "./types";

/** 프리셋 밖의 자유 입력값은 차트·칩에서 하나로 묶는다. */
export const OTHER_PURPOSE = "기타";

export interface ArchiveStats {
  /** 최근 12개월, 시간 오름차순. 기록이 없는 달도 0 으로 채운다 */
  monthly: { month: string; highlights: number }[];
  /** 논문 수. 개수 내림차순, 동률이면 code 오름차순. 빈 code 제외 */
  categories: { code: string; count: number }[];
  /** 논문 수. 연도 내림차순. null 제외 */
  years: { year: number; count: number }[];
  /** 문장 수. 개수 내림차순, 동률이면 이름 오름차순 */
  purposes: { purpose: string; count: number }[];
}

export function bucketPurpose(purpose: string): string {
  return isPreset(purpose) ? purpose : OTHER_PURPOSE;
}

export function groupHighlightsByPaper(
  highlights: Highlight[]
): Map<string, Highlight[]> {
  const map = new Map<string, Highlight[]>();
  for (const h of highlights) {
    const list = map.get(h.paper_id) ?? [];
    list.push(h);
    map.set(h.paper_id, list);
  }
  return map;
}

const MONTHS = 12;

/** "2026-09" */
const monthKey = (y: number, m0: number) =>
  `${y}-${String(m0 + 1).padStart(2, "0")}`;

/**
 * 아카이브 레일이 그리는 값.
 *
 * papers 는 **읽은 논문만** 넘긴다 — 거르는 것은 호출부의 책임이다.
 * 정렬은 필드마다 다르다: monthly 는 시간순, years 는 연도순,
 * categories 와 purposes 는 개수순이다.
 */
export function buildArchiveStats(
  readPapers: Paper[],
  highlights: Highlight[],
  now: Date = new Date()
): ArchiveStats {
  const paperById = new Map(readPapers.map((p) => [p.id, p]));

  // ── monthly ── 최근 12개월 창을 먼저 만들고 그 안에만 더한다.
  const counts = new Map<string, number>();
  const window: string[] = [];
  for (let i = MONTHS - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const k = monthKey(d.getFullYear(), d.getMonth());
    window.push(k);
    counts.set(k, 0);
  }
  for (const h of highlights) {
    const p = paperById.get(h.paper_id);
    // read_date 가 없으면 어느 달에 넣을 근거가 없다 — 월별에서 뺀다.
    if (!p?.read_date) continue;
    const k = p.read_date.slice(0, 7);
    if (counts.has(k)) counts.set(k, counts.get(k)! + 1);
  }
  const monthly = window.map((month) => ({ month, highlights: counts.get(month)! }));

  // ── categories ── 논문 수
  const catCount = new Map<string, number>();
  for (const p of readPapers) {
    if (!p.category) continue;
    catCount.set(p.category, (catCount.get(p.category) ?? 0) + 1);
  }
  const categories = [...catCount.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));

  // ── years ── 논문 수, 연도 내림차순
  const yearCount = new Map<number, number>();
  for (const p of readPapers) {
    if (p.published_year == null) continue;
    yearCount.set(p.published_year, (yearCount.get(p.published_year) ?? 0) + 1);
  }
  const years = [...yearCount.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => b.year - a.year);

  // ── purposes ── 문장 수. 읽은 논문에 속한 것만 센다.
  const purposeCount = new Map<string, number>();
  for (const h of highlights) {
    if (!paperById.has(h.paper_id)) continue;
    const key = bucketPurpose(h.purpose);
    purposeCount.set(key, (purposeCount.get(key) ?? 0) + 1);
  }
  const purposes = [...purposeCount.entries()]
    .map(([purpose, count]) => ({ purpose, count }))
    .sort((a, b) => b.count - a.count || a.purpose.localeCompare(b.purpose));

  return { monthly, categories, years, purposes };
}
