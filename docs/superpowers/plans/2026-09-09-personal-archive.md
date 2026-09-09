# 개인 논문 기록 아카이브 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 멤버 페이지를 개인 아카이브로 바꾼다 — 논문마다 그 논문에서 수집한 문장이 붙고, 옆에 집계 차트가 서고, 기존 기록 관리 기능은 하나도 잃지 않는다.

**Architecture:** 스키마를 건드리지 않는다. 주간 보고서 작업이 만든 `highlights.purpose` / `papers.category` / `papers.published_year` 를 처음으로 읽는 화면이다. 집계는 `lib/archive.ts` 순수 함수로 빼서 단위 테스트하고, 화면은 기존 `PaperRow` 를 확장해 문장과 차트를 얹는다. 차트는 라이브러리 없이 CSS/SVG.

**Tech Stack:** Next.js 14 (App Router) · TypeScript · Tailwind · Supabase · vitest

**Spec:** `docs/superpowers/specs/2026-09-09-personal-archive-design.md`

## Global Constraints

- **스키마를 바꾸지 않는다.** 컬럼 추가·삭제·마이그레이션 없음.
- **지금 멤버 페이지의 기능은 하나도 사라지지 않는다** — 논문 편집(제목·저자·PDF 링크), 삭제, 상태 전환, 한줄평 작성·수정·삭제, 제목·저자 검색, 읽을 예정 목록. 편집은 특히 필수다: PDF 링크가 없는 논문의 뷰어가 "멤버 페이지에서 **편집**으로 PDF 링크를 넣어 주세요"라고 안내한다 (`app/members/[id]/papers/[paperId]/page.tsx:149-152`).
- **아카이브 본문과 집계는 읽은 논문만** 다룬다. 읽을 예정은 아래 별도 섹션에 목록으로만 남고 문장도 차트도 붙지 않는다.
- **용도 칩과 차트에서 프리셋 밖의 값은 전부 `기타` 하나로 묶는다.** `PurposeSelect` 가 자유 입력 문자열을 그대로 `purpose` 에 저장하므로 값의 가짓수에 상한이 없다. 다만 **문장에 붙는 라벨에는 실제 입력값을 그대로** 보인다.
- 프리셋 판정은 `lib/highlightPurposes.ts` 의 `isPreset` 을 쓴다. 문자열을 하드코딩하지 않는다.
- **차트는 단일 색조(`--accent`)** 만 쓴다. 범주별 색을 쓰지 않고 정체는 라벨이 나른다. 차트 라이브러리를 추가하지 않는다.
- **남의 아카이브도 같은 화면이 그대로 보인다.** 조작 버튼만 `canEdit` 으로 숨는다.
- 커밋 메시지는 한국어, `feat:` / `fix:` / `docs:` / `chore:` 접두어.
- **공유 DB 에 쓰지 않는다.** 백필(Task 7)만 예외이고 그것도 사용자 승인 후에. 검증은 `tsc` / `lint` / `build` / `test` 와 프로덕션 빌드 화면 확인.

---

## 파일 구조

**새로 만드는 것**

| 파일 | 책임 |
| --- | --- |
| `lib/archive.ts` | 집계와 묶기 (순수) |
| `lib/archive.test.ts` | 위 단위 테스트 |
| `components/ArchiveRail.tsx` | 집계 레일 — 차트 넷 |
| `components/PurposeFilter.tsx` | 용도 칩 줄 |
| `scripts/backfill-arxiv.mjs` | 과거 논문 분야·발행연도 채우기 |

**고치는 것**

| 파일 | 무엇을 |
| --- | --- |
| `lib/db.ts` | `fetchHighlightsByMember` 추가 |
| `app/members/[id]/page.tsx` | 탭·필터·페이지네이션·문장·레일. 기존 기능은 유지 |
| `README.md` | 멤버 페이지 설명, 백필 안내 |

---

## Task 1: 멤버 기준 수집 문장 조회

**Files:**
- Modify: `lib/db.ts`

**Interfaces:**
- Consumes: 없음
- Produces: `fetchHighlightsByMember(memberId: string): Promise<Highlight[]>`

- [ ] **Step 1: `lib/db.ts` 끝에 추가**

`fetchSessionHighlights` 바로 아래에 둔다 (같은 성격의 조회끼리 모은다).

```ts
/**
 * 그 사람이 수집한 문장 — purpose 가 붙은 하이라이트만.
 * 논문마다 따로 조회하지 않고 논문 id 를 모아 한 번에 읽는다
 * (fetchSessionHighlights 의 멤버 버전).
 *
 * 누구의 문장인가 — 두 조건을 모두 만족해야 한다.
 *  1. 그 사람이 등록한 논문에 달려 있고
 *  2. highlights.member_id 가 그 사람이거나 비어 있다
 * 1만 쓰면 남의 문장이 섞인다. 지금은 논문 주인만 하이라이트를 남길 수 있지만
 * 그 제한이 생기기 전 데이터에는 남의 논문에 단 것이 있을 수 있고 RLS 는 막지 않는다.
 * 2의 "비어 있다"는 사이드바에서 이름을 고르지 않고 남긴 옛 기록을 논문 주인 것으로
 * 보기 위한 것이다.
 */
export async function fetchHighlightsByMember(
  memberId: string
): Promise<Highlight[]> {
  const { data: papers, error: pErr } = await supabase
    .from("papers")
    .select("id")
    .eq("added_by", memberId);
  if (pErr) throw pErr;

  const ids = (papers ?? []).map((p) => (p as { id: string }).id);
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("highlights")
    .select("*")
    .in("paper_id", ids)
    .neq("purpose", "")
    .order("created_at", { ascending: true });
  if (error) {
    // 마이그레이션 전이면 purpose 컬럼이 없다. fetchAttendance 와 같이
    // 경고만 남기고 빈 목록으로 처리해 나머지 화면은 그대로 돌게 한다.
    console.warn("수집 문장을 불러오지 못했습니다(마이그레이션 미실행?)", error.message);
    return [];
  }

  return ((data ?? []) as Highlight[]).filter(
    (h) => !h.member_id || h.member_id === memberId
  );
}
```

- [ ] **Step 2: 타입·린트·빌드 확인**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: 셋 다 통과

- [ ] **Step 3: 커밋**

```bash
git add lib/db.ts
git commit -m "feat: 멤버 기준 수집 문장 조회

내 논문에 달렸고 member_id 가 나이거나 빈 하이라이트만 가져온다.
논문 기준만으로 거르면 하이라이트 제한이 생기기 전 데이터에서
남의 문장이 섞일 수 있다."
```

---

## Task 2: 집계와 묶기 (순수 함수)

**Files:**
- Create: `lib/archive.ts`
- Test: `lib/archive.test.ts`

**Interfaces:**
- Consumes: `Paper`, `Highlight` (`lib/types.ts`), `isPreset` (`lib/highlightPurposes.ts`)
- Produces:
  - `interface ArchiveStats { monthly: { month: string; highlights: number }[]; categories: { code: string; count: number }[]; years: { year: number; count: number }[]; purposes: { purpose: string; count: number }[] }`
  - `buildArchiveStats(readPapers: Paper[], highlights: Highlight[], now?: Date): ArchiveStats`
  - `groupHighlightsByPaper(highlights: Highlight[]): Map<string, Highlight[]>`
  - `bucketPurpose(purpose: string): string`

**엄격한 TDD 작업이다.** 테스트를 먼저 쓰고, 빨간 것을 확인하고, 구현하고, 초록을 확인한다.

- [ ] **Step 1: 실패하는 테스트 작성**

Create `lib/archive.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { bucketPurpose, buildArchiveStats, groupHighlightsByPaper } from "./archive";
import type { Highlight, Paper } from "./types";

const paper = (id: string, read_date: string | null, category = "", year: number | null = null): Paper => ({
  id, title: `제목 ${id}`, authors: "", pdf_url: "", added_by: "m1",
  status: "read", read_date, session_id: null, category, published_year: year,
  created_at: "2026-01-01T00:00:00Z",
});

const hl = (id: string, paper_id: string, purpose: string): Highlight => ({
  id, paper_id, member_id: "m1", text: `문장 ${id}`,
  position: {} as Highlight["position"], note: "", color: "yellow", purpose,
  created_at: "2026-01-01T00:00:00Z",
});

// 12개월 창의 끝을 고정해야 테스트가 결정적이다.
const NOW = new Date("2026-09-15T00:00:00Z");

describe("bucketPurpose", () => {
  it("프리셋은 그대로 둔다", () => {
    expect(bucketPurpose("좋은 표현")).toBe("좋은 표현");
    expect(bucketPurpose("문단 구조")).toBe("문단 구조");
    expect(bucketPurpose("논리 연결")).toBe("논리 연결");
  });

  it("프리셋이 아닌 자유 입력은 전부 기타로 묶는다", () => {
    expect(bucketPurpose("발표자료용")).toBe("기타");
    expect(bucketPurpose("나중에 인용")).toBe("기타");
  });
});

describe("groupHighlightsByPaper", () => {
  it("논문 id 로 묶는다", () => {
    const g = groupHighlightsByPaper([hl("a", "p1", "좋은 표현"), hl("b", "p2", "논리 연결"), hl("c", "p1", "기타")]);
    expect(g.get("p1")?.map((h) => h.id)).toEqual(["a", "c"]);
    expect(g.get("p2")?.map((h) => h.id)).toEqual(["b"]);
  });

  it("빈 입력이면 빈 맵", () => {
    expect(groupHighlightsByPaper([]).size).toBe(0);
  });
});

describe("buildArchiveStats — monthly", () => {
  it("최근 12개월만 그리고 기록 없는 달도 0 으로 채운다", () => {
    const r = buildArchiveStats([paper("p1", "2026-09-03")], [hl("a", "p1", "좋은 표현")], NOW);
    expect(r.monthly).toHaveLength(12);
    expect(r.monthly[11].month).toBe("2026-09");
    expect(r.monthly[0].month).toBe("2025-10");
    expect(r.monthly[11].highlights).toBe(1);
    expect(r.monthly[10].highlights).toBe(0);
  });

  it("문장은 소속 논문의 read_date 로 센다", () => {
    const r = buildArchiveStats(
      [paper("p1", "2026-07-01"), paper("p2", "2026-09-03")],
      [hl("a", "p1", "좋은 표현"), hl("b", "p2", "좋은 표현"), hl("c", "p2", "논리 연결")],
      NOW
    );
    const by = Object.fromEntries(r.monthly.map((m) => [m.month, m.highlights]));
    expect(by["2026-07"]).toBe(1);
    expect(by["2026-09"]).toBe(2);
  });

  it("read_date 가 없는 논문의 문장은 월별에서 뺀다", () => {
    const r = buildArchiveStats([paper("p1", null)], [hl("a", "p1", "좋은 표현")], NOW);
    expect(r.monthly.every((m) => m.highlights === 0)).toBe(true);
  });

  it("12개월 창 밖의 문장은 빼고, 창은 그대로 12칸이다", () => {
    const r = buildArchiveStats([paper("p1", "2024-01-05")], [hl("a", "p1", "좋은 표현")], NOW);
    expect(r.monthly).toHaveLength(12);
    expect(r.monthly.every((m) => m.highlights === 0)).toBe(true);
  });
});

describe("buildArchiveStats — categories / years", () => {
  it("분야와 연도는 논문 수를 센다", () => {
    const r = buildArchiveStats(
      [paper("p1", "2026-09-03", "cs.CL", 2025), paper("p2", "2026-08-01", "cs.CL", 2024), paper("p3", "2026-07-01", "cs.LG", 2025)],
      [hl("a", "p1", "좋은 표현"), hl("b", "p1", "논리 연결")],
      NOW
    );
    expect(r.categories).toEqual([{ code: "cs.CL", count: 2 }, { code: "cs.LG", count: 1 }]);
    expect(r.years).toEqual([{ year: 2025, count: 2 }, { year: 2024, count: 1 }]);
  });

  it("빈 분야와 null 연도는 막대에서 뺀다", () => {
    const r = buildArchiveStats([paper("p1", "2026-09-03", "", null)], [], NOW);
    expect(r.categories).toEqual([]);
    expect(r.years).toEqual([]);
  });

  it("분야 동률이면 코드 오름차순", () => {
    const r = buildArchiveStats(
      [paper("p1", "2026-09-03", "cs.LG"), paper("p2", "2026-09-03", "cs.AI")],
      [], NOW
    );
    expect(r.categories.map((c) => c.code)).toEqual(["cs.AI", "cs.LG"]);
  });
});

describe("buildArchiveStats — purposes", () => {
  it("문장 수를 세고 프리셋 밖은 기타로 합산한다", () => {
    const r = buildArchiveStats(
      [paper("p1", "2026-09-03")],
      [hl("a", "p1", "좋은 표현"), hl("b", "p1", "좋은 표현"), hl("c", "p1", "발표자료용"), hl("d", "p1", "나중에 인용")],
      NOW
    );
    expect(r.purposes).toEqual([{ purpose: "좋은 표현", count: 2 }, { purpose: "기타", count: 2 }]);
  });

  it("읽은 논문에 속하지 않는 문장은 세지 않는다", () => {
    const r = buildArchiveStats([paper("p1", "2026-09-03")], [hl("a", "p9", "좋은 표현")], NOW);
    expect(r.purposes).toEqual([]);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run lib/archive.test.ts`
Expected: FAIL — `Failed to resolve import "./archive"`

- [ ] **Step 3: 구현**

Create `lib/archive.ts`:

```ts
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
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run`
Expected: PASS — 기존 22개에 이 파일의 11개가 더해진다. 실제 총계를 보고에 적는다.

- [ ] **Step 5: 커밋**

```bash
git add lib/archive.ts lib/archive.test.ts
git commit -m "feat: 아카이브 집계 순수 함수

최근 12개월 창, read_date 없는 논문은 월별에서 제외, 분야·연도는 논문 수,
월별·용도는 문장 수, 프리셋 밖의 용도는 기타로 합산. 정렬은 필드마다 다르다."
```

---

## Task 3: 용도 필터 칩

**Files:**
- Create: `components/PurposeFilter.tsx`

**Interfaces:**
- Consumes: `PURPOSE_PRESETS` (`lib/highlightPurposes.ts`), `OTHER_PURPOSE` (Task 2)
- Produces: `<PurposeFilter counts={{ purpose: string; count: number }[]} total={number} value={string | null} onChange={(v: string | null) => void} />` — `counts` 는 `ArchiveStats["purposes"]` 를 그대로 받는다. `value` 가 `null` 이면 전체

- [ ] **Step 1: 작성**

Create `components/PurposeFilter.tsx`:

```tsx
"use client";

import { PURPOSE_PRESETS } from "@/lib/highlightPurposes";
import { OTHER_PURPOSE } from "@/lib/archive";

/**
 * 용도로 수집 문장을 거르는 칩 줄.
 *
 * 칩은 프리셋 셋 + 기타로 고정한다. PurposeSelect 가 자유 입력 문자열을 그대로
 * 저장하므로 값마다 칩을 만들면 줄이 무한정 길어진다. 문장에 붙는 라벨에는
 * 실제 입력값을 그대로 보인다(그건 이 컴포넌트가 아니라 논문 줄이 그린다).
 */
export default function PurposeFilter({
  counts,
  total,
  value,
  onChange,
}: {
  /** ArchiveStats["purposes"] 를 그대로 받는다 — 이미 기타로 묶이고 정렬돼 있다 */
  counts: { purpose: string; count: number }[];
  total: number;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const chip = "rounded-full border px-2.5 py-1 text-[0.78rem] transition whitespace-nowrap";
  const on = "border-accent bg-accent text-white font-semibold";
  const off = "border-line text-muted hover:border-accent hover:text-accent";

  const options: (string | null)[] = [null, ...PURPOSE_PRESETS, OTHER_PURPOSE];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-0.5 text-[0.74rem] text-faint">용도</span>
      {options.map((opt) => {
        const n =
          opt === null ? total : counts.find((c) => c.purpose === opt)?.count ?? 0;
        // 한 번도 쓰인 적 없는 용도는 칩을 만들지 않는다 — 전체는 항상 남긴다.
        if (opt !== null && n === 0) return null;
        return (
          <button
            key={opt ?? "all"}
            type="button"
            onClick={() => onChange(opt)}
            className={`${chip} ${value === opt ? on : off}`}
          >
            {opt ?? "전체"}
            <span className="ml-1 opacity-70 tabular-nums">{n}</span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: 타입·린트·빌드 확인**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: 셋 다 통과

- [ ] **Step 3: 커밋**

```bash
git add components/PurposeFilter.tsx
git commit -m "feat: 용도 필터 칩

칩은 프리셋 셋 + 기타로 고정한다. 자유 입력값마다 칩을 만들면 줄이 무한정 길어진다.
한 번도 쓰이지 않은 용도는 칩을 만들지 않는다."
```

---

## Task 4: 집계 레일

**Files:**
- Create: `components/ArchiveRail.tsx`

**Interfaces:**
- Consumes: `ArchiveStats` (Task 2), `categoryLabel` (`lib/arxivCategories.ts`)
- Produces: `<ArchiveRail stats={ArchiveStats} />`

- [ ] **Step 1: 작성**

Create `components/ArchiveRail.tsx`. 요구사항:

- 차트 넷을 세로로: **쌓인 문장**(월별 세로 막대) · **분야**(가로 막대) · **발행연도**(가로 막대) · **용도**(가로 막대)
- **단일 색조** — 모든 막대가 `bg-accent`. 범주별 색을 쓰지 않는다
- 월별 차트 제목 아래에 `읽은 날짜 기준 · 최근 12개월` 을 작게 적는다. 발행연도와 헷갈리지 않게 하는 장치다
- 월 라벨은 12칸이 좁으므로 **3칸마다 하나씩만** 적는다 (`1월`, `4월`, …). 나머지 칸은 라벨 없이 막대만
- 가로 막대의 길이는 그 차트 안 최댓값 대비 비율. 최댓값이 0이면 막대를 그리지 않는다
- 분야는 `categoryLabel(code)` 로 이름을 바꿔 보인다. 표에 없는 코드는 코드를 그대로 보인다
- 각 막대 오른쪽에 개수를 `tabular-nums` 로 적는다
- **모든 차트가 빌 때**(읽은 논문 0편) 레일 전체를 `기록이 쌓이면 여기에 보입니다.` 한 줄로 대체한다
- 개별 차트가 빌 때(예: 분야가 다 비어 있음)는 그 차트만 `아직 없습니다.` 로 대체한다
- 마크업과 토큰은 `components/SessionReport.tsx` 의 카드·패널 스타일을 따른다 (`border-line`, `rounded-10px`, `text-muted` 등)

- [ ] **Step 2: 타입·린트·빌드 확인**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: 셋 다 통과

- [ ] **Step 3: 커밋**

```bash
git add components/ArchiveRail.tsx
git commit -m "feat: 아카이브 집계 레일

차트 넷을 단일 색조로 그린다. 월별은 읽은 날짜 기준 최근 12개월이고
라벨은 세 칸마다 하나씩만 적는다."
```

---

## Task 5: 탭과 URL 상태

**Files:**
- Modify: `app/members/[id]/page.tsx`

**Interfaces:**
- Consumes: 없음
- Produces: `?tab=record|trend`, `?page=<n>` 을 읽고 쓰는 상태. `읽기 경향` 탭 placeholder

이 작업은 **탭 뼈대만** 만든다. `기록` 탭 안의 내용은 지금 그대로 두고 Task 6 에서 바꾼다.

- [ ] **Step 1: 탭 상태를 URL 에서 읽는다**

`next/navigation` 의 `useSearchParams`, `useRouter`, `usePathname` 을 쓴다.

```tsx
const searchParams = useSearchParams();
const router = useRouter();
const pathname = usePathname();

const tab = searchParams.get("tab") === "trend" ? "trend" : "record";
const page = Math.max(1, Number(searchParams.get("page")) || 1);

/** 탭을 바꾸면 page 를 버린다 — 다른 탭의 쪽 번호를 들고 갈 이유가 없다. */
const setTab = (next: "record" | "trend") => {
  const q = new URLSearchParams(searchParams.toString());
  if (next === "record") q.delete("tab");
  else q.set("tab", next);
  q.delete("page");
  router.replace(`${pathname}${q.toString() ? `?${q}` : ""}`, { scroll: false });
};

const setPage = (next: number) => {
  const q = new URLSearchParams(searchParams.toString());
  if (next <= 1) q.delete("page");
  else q.set("page", String(next));
  router.replace(`${pathname}${q.toString() ? `?${q}` : ""}`, { scroll: false });
};
```

`useSearchParams` 를 쓰는 클라이언트 컴포넌트는 Next 14 에서 `<Suspense>` 경계를 요구한다. 빌드가 그 오류를 내면 페이지 본문을 별도 컴포넌트로 빼고 `export default` 에서 `<Suspense fallback={<p className="…">불러오는 중…</p>}>` 로 감싼다.

- [ ] **Step 2: 탭 줄을 그린다**

멤버 머리말 아래, 본문 위. 두 칸짜리 탭:

```tsx
<div className="mt-5 flex gap-1 border-b border-line">
  {([["record", "기록"], ["trend", "읽기 경향"]] as const).map(([key, label]) => (
    <button
      key={key}
      onClick={() => setTab(key)}
      className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
        tab === key
          ? "border-accent font-semibold text-accent"
          : "border-transparent text-muted hover:text-ink"
      }`}
    >
      {label}
    </button>
  ))}
</div>
```

- [ ] **Step 3: `읽기 경향` placeholder**

`tab === "trend"` 일 때 보인다. 가짜 데이터나 스켈레톤을 넣지 않는다.

```tsx
<div className="mt-6 rounded-xl border border-dashed border-linestrong bg-surface p-8 text-center">
  <p className="text-sm font-semibold text-ink">준비 중입니다</p>
  <p className="mx-auto mt-2 max-w-[52ch] text-sm text-muted">
    수집한 문장이 쌓이면, 여러 논문에 걸쳐 반복해서 꽂힌 주제를 묶어
    읽기 경향을 정리해 보여줄 자리입니다.
  </p>
</div>
```

- [ ] **Step 4: 타입·린트·빌드 확인**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: 셋 다 통과. `기록` 탭은 지금까지와 똑같이 보여야 한다

- [ ] **Step 5: 커밋**

```bash
git add "app/members/[id]/page.tsx"
git commit -m "feat: 멤버 페이지에 기록·읽기 경향 탭

탭과 쪽 번호를 URL 에 담아 링크로 공유되고 뒤로 가기가 동작한다.
탭을 바꾸면 쪽 번호는 버린다. 읽기 경향은 준비 중 안내만 둔다."
```

---

## Task 6: `기록` 탭 본문

**Files:**
- Modify: `app/members/[id]/page.tsx`

**Interfaces:**
- Consumes: `fetchHighlightsByMember` (Task 1), `buildArchiveStats` / `groupHighlightsByPaper` / `bucketPurpose` (Task 2), `PurposeFilter` (Task 3), `ArchiveRail` (Task 4)
- Produces: 없음

이 계획에서 가장 큰 작업이다. **기존 기능을 하나도 잃지 않는 것이 이 작업의 성패다.**

- [ ] **Step 1: 데이터 읽기 확장**

`reload()` 가 `fetchHighlightsByMember(memberId)` 도 부르고 상태에 담는다. 기존
`fetchMember` / `fetchPapersByMember` / `fetchReviewsByMember` / `fetchSessions` 는 그대로 둔다.

`fetchMemberSessionIds(memberId)` 도 부른다 — 머리말의 `N차시 참석` 이 이 값이다.
직접 세면 "논문 없이 참석"을 놓치거나 불참을 잘못 포함한다.

- [ ] **Step 2: 머리말 요약 줄**

`읽은 논문 4편 · 수집 문장 17개 · 한줄평 3차시 · 4차시 참석`

- 읽은 논문 = `papers.filter(p => p.status === "read").length`
- 수집 문장 = `highlights.length`
- 한줄평 = `reviewBySession.size`
- 참석 차시 = `fetchMemberSessionIds` 가 돌려준 집합 크기

- [ ] **Step 3: 2단 배치**

`기록` 탭 안을 `SessionReport` 가 쓰는 것과 같은 형태로 나눈다:

```tsx
<div className="mt-6 grid gap-6 lg:grid-cols-[1fr_286px] lg:items-start">
  <div className="min-w-0">{/* 본문 */}</div>
  <ArchiveRail stats={stats} />
</div>
```

- [ ] **Step 4: 본문 — 필터·검색·목록**

위에서 아래로: 용도 칩(`PurposeFilter`) → 검색창(기존 것 그대로) → 읽은 논문 목록 →
페이지네이션 → `읽을 예정` 섹션.

거르는 순서와 규칙:

```
읽은 논문
  → 검색어로 제목·저자 거르기 (기존 로직)
  → 용도 필터가 켜져 있으면:
       각 논문의 문장을 그 용도로 거르고,
       남은 문장이 0개인 논문은 목록에서 뺀다
  → read_date 내림차순, 같으면 created_at 내림차순.
     read_date 가 없는 것은 맨 뒤
  → 10편씩 페이지로 자른다
```

용도 필터를 켜면 문장이 없는 논문을 **빼는** 이유: 남기면 "이 용도로 수집한 문장이
없습니다"만 가득한 쪽이 나온다.

**검색어나 용도 필터를 바꾸면 `setPage(1)` 로 되돌린다.** 목록이 달라졌는데 3쪽에
머무르면 빈 화면이 된다.

`page` 가 마지막 쪽을 넘으면 마지막 쪽으로 맞춘다. 삭제·상태 전환으로 현재 쪽이
비었을 때도 같은 규칙이 적용된다.

- [ ] **Step 5: 논문 줄에 문장 붙이기**

기존 `PaperRow` 를 확장한다. **지우지 말고 얹는다.**

그대로 남아야 하는 것:
- 논문 제목 → `/members/${memberId}/papers/${paper.id}` 링크
- 메타 줄 (저자 · 읽은 날짜 · 차시 제목 · PDF 유무). 여기에 **분야와 발행연도, 문장 수**를 더한다. 값이 없으면 그 항목만 생략한다
- `StatusBadge`
- `useSessionReview` 로 붙는 한줄평 버튼과 패널
- `canEdit` 일 때만 보이는 상태 전환 / 편집 / 삭제 버튼

새로 붙는 것 — 논문 카드 아래의 문장 목록:

```tsx
{visibleHighlights.length === 0 ? (
  <p className="mt-2 text-sm text-faint">
    {purposeFilter ? "이 용도로 수집한 문장이 없습니다." : "수집한 문장이 없습니다."}
  </p>
) : (
  <ul className="mt-2 space-y-2">
    {visibleHighlights.map((h) => (
      <li key={h.id} className="rounded-lg border border-line bg-surface px-3 py-2">
        <p className="text-sm text-ink">{h.text}</p>
        {h.note && <p className="mt-1 text-[0.82rem] text-muted">{h.note}</p>}
        <span className="mt-1.5 inline-block rounded-full bg-accentsoft px-1.5 py-0.5 text-[0.66rem] font-semibold text-accent">
          {h.purpose}
        </span>
      </li>
    ))}
  </ul>
)}
```

`{h.purpose}` 는 **실제 저장된 값**이다 — `기타` 로 묶지 않는다. 묶는 것은 칩과 차트뿐이다.

- [ ] **Step 6: 비었을 때의 문구**

읽은 논문이 하나도 없으면 본문을 `아직 읽은 논문이 없습니다.` 한 줄로 대체한다
(레일은 Task 4 가 자체적으로 `기록이 쌓이면 여기에 보입니다.` 로 대체한다).

검색어나 용도 필터 때문에 결과가 비면 `검색 결과가 없습니다.` / `이 용도로 수집한
문장이 없습니다.` 를 보이고 **페이지네이션은 감춘다.**

- [ ] **Step 7: `읽을 예정` 섹션**

읽은 논문 목록 아래. 제목·메타와 조작 버튼(상태 전환·편집·삭제)만 있고 문장은 붙지
않는다. 페이지네이션도 없다. 이 섹션이 없으면 `읽을 예정 → 읽음` 을 바꿀 곳이 사라진다.

- [ ] **Step 8: 페이지네이션**

```tsx
{totalPages > 1 && (
  <div className="mt-4 flex items-center justify-center gap-1.5">
    <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="…">←</button>
    {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
      <button key={n} onClick={() => setPage(n)} className={n === page ? "…on" : "…off"}>{n}</button>
    ))}
    <button onClick={() => setPage(page + 1)} disabled={page >= totalPages} className="…">→</button>
  </div>
)}
```

- [ ] **Step 9: 타입·린트·빌드 확인**

Run: `npx tsc --noEmit && npm run lint && npm run build && npx vitest run`
Expected: 전부 통과

- [ ] **Step 10: 자기 점검 — 잃은 게 없는지**

바뀐 파일을 처음부터 끝까지 읽고 확인한다. 하나라도 없으면 되돌린다.

- 제목·저자 검색이 남아 있는가
- `읽을 예정` 목록이 남아 있는가
- 상태 전환 / 편집 / 삭제 버튼이 `canEdit` 일 때 보이는가
- `EditPaperForm` 이 그대로 동작하는가 (PDF 링크 보정 경로)
- 한줄평 버튼·패널이 남아 있고 본인이면 작성·수정·삭제가 되는가
- 논문 제목이 PDF 뷰어로 가는 링크인가
- 남의 페이지에서 조작 버튼만 숨고 나머지는 다 보이는가

- [ ] **Step 11: 커밋**

```bash
git add "app/members/[id]/page.tsx"
git commit -m "feat: 기록 탭을 아카이브로

논문마다 그 논문에서 수집한 문장이 붙고, 용도 칩으로 거르고, 10편씩 페이지를
넘긴다. 옆에 집계 레일이 선다. 검색·편집·삭제·상태 전환·한줄평·읽을 예정은
그대로 남는다 — 특히 편집은 PDF 링크가 없는 논문의 유일한 복구 경로다."
```

---

## Task 7: 백필 스크립트

**Files:**
- Create: `scripts/backfill-arxiv.mjs`

**Interfaces:**
- Consumes: `GET /api/arxiv` (기존)
- Produces: 없음 (일회성 도구)

- [ ] **Step 1: 작성**

Create `scripts/backfill-arxiv.mjs`:

```js
/**
 * 기존 논문의 분야·발행연도를 채운다. 몇 번을 다시 돌려도 안전하다.
 *
 * 파싱 코드를 두 벌로 갈라놓지 않으려고 실행 중인 앱의 /api/arxiv 를 부른다.
 * 그래서 앱이 떠 있어야 한다:
 *
 *   npm run build && npx next start -p 3200 &
 *   BASE=http://localhost:3200 node scripts/backfill-arxiv.mjs
 *
 * NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 가 필요하다
 * (.env.local 에서도 읽는다).
 */
import { readFileSync } from "node:fs";

const BASE = process.env.BASE ?? "http://localhost:3000";

const env = { ...process.env };
try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] ??= m[2];
  }
} catch {}

const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!URL_ || !KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY 가 필요합니다.");
  process.exit(1);
}
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const res = await fetch(
  `${URL_}/rest/v1/papers?select=id,title,pdf_url,category,published_year&pdf_url=neq.`,
  { headers }
);
const papers = await res.json();

// 필드마다 따로 판단한다. "둘 다 비었을 때만" 으로 하면 부분적으로 빈 행이
// 영영 안 채워진다.
const todo = papers.filter((p) => p.pdf_url && (!p.category || p.published_year == null));
console.log(`대상 ${todo.length}편 / 전체 ${papers.length}편`);

const failed = [];
for (const p of todo) {
  try {
    const r = await fetch(`${BASE}/api/arxiv?url=${encodeURIComponent(p.pdf_url)}`);
    if (!r.ok) {
      failed.push([p.title, `HTTP ${r.status}`]);
      await sleep(3000);
      continue;
    }
    const meta = await r.json();

    // 이미 값이 있는 필드는 덮어쓰지 않는다.
    const patch = {};
    if (!p.category && meta.category) patch.category = meta.category;
    if (p.published_year == null && meta.published_year != null)
      patch.published_year = meta.published_year;
    if (Object.keys(patch).length === 0) {
      await sleep(3000);
      continue;
    }

    const w = await fetch(`${URL_}/rest/v1/papers?id=eq.${p.id}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!w.ok) failed.push([p.title, `PATCH ${w.status}`]);
    else console.log(`  ✓ ${JSON.stringify(patch)}  ${p.title.slice(0, 50)}`);
  } catch (e) {
    failed.push([p.title, String(e)]);
  }
  await sleep(3000); // arXiv API 권고: 요청 사이에 간격을 둔다
}

console.log(`\n완료. 실패 ${failed.length}편`);
for (const [t, why] of failed) console.log(`  - ${t.slice(0, 50)} : ${why}`);
```

- [ ] **Step 2: 린트 확인**

Run: `npm run lint`
Expected: 통과 (`scripts/` 는 `next lint` 대상이 아니지만 확인은 한다)

- [ ] **Step 3: 실행은 사용자 승인 후에**

**이 스크립트는 공유 DB 에 쓴다.** 계획 실행자가 임의로 돌리지 않는다. 사용자에게
이렇게 보고하고 승인을 받는다:

> 백필 스크립트가 준비됐습니다. 돌리면 arXiv 링크가 있는 기존 논문의 `category`·
> `published_year` 중 **비어 있는 필드만** 채웁니다. 이미 값이 있는 필드와 다른
> 컬럼은 건드리지 않습니다. 돌릴까요?

- [ ] **Step 4: 커밋**

```bash
git add scripts/backfill-arxiv.mjs
git commit -m "chore: 기존 논문 arXiv 메타데이터 백필

필드마다 따로 판단해 비어 있는 것만 채운다 — 둘 다 비었을 때만 처리하면
부분적으로 빈 행이 영영 안 채워진다. 파싱 코드를 두 벌로 갈라놓지 않으려고
실행 중인 앱의 /api/arxiv 를 부른다."
```

---

## Task 8: README 갱신

**Files:**
- Modify: `README.md`

- [ ] **Step 1: 페이지 표의 `/members/[id]` 줄을 고친다**

지금은 "본인이 읽은/읽을 논문을 편집·상태변경·삭제 + 내 논문 검색" 정도로 적혀 있다.
아카이브가 된 사실을 반영한다 — 논문마다 수집 문장이 붙고, 용도로 거를 수 있고,
옆에 집계(분야·발행연도·용도·월별)가 서고, `기록` / `읽기 경향` 두 탭이라는 것.
편집·삭제·상태 전환·검색·읽을 예정이 그대로라는 것도 적는다.

- [ ] **Step 2: 백필 안내를 Supabase 설정 절 뒤에 더한다**

실행 방법(앱을 띄우고 `BASE` 를 주는 것)과, 비어 있는 필드만 채운다는 것.

- [ ] **Step 3: 확인**

Run: `npm run lint && npm run build`
Expected: 통과. 바뀐 문단을 다시 읽고 코드와 어긋나는 문장이 없는지 본다

- [ ] **Step 4: 커밋**

```bash
git add README.md
git commit -m "docs: 멤버 페이지 아카이브와 백필 안내"
```

---

## 마무리 확인

- [ ] `npx vitest run` — Task 2 가 더한 11개를 포함해 전부 통과. 실제 총계를 보고에 적는다
- [ ] `npx tsc --noEmit` — exit 0
- [ ] `npm run lint` — 경고 없음
- [ ] `npm run build` — 성공
- [ ] 프로덕션 빌드(`npx next start`)로 실제 데이터 확인. **공유 DB 에는 쓰지 않는다**
  - 본인 페이지: 논문마다 문장, 용도 칩, 검색, 페이지네이션, 읽을 예정 섹션, 레일 차트 넷
  - 편집 / 삭제 / 상태 전환 / 한줄평이 그대로 되는가 (누르지는 않고 보이는지만)
  - 논문 제목이 PDF 뷰어로 들어가는가
  - 남의 페이지: 같은 화면이되 조작 버튼만 숨는가
  - `읽기 경향` 탭이 준비 중 안내만 보이는가
  - `?tab=trend`, `?page=2` 로 직접 들어가도 맞게 열리는가
- [ ] 사용자에게 백필 실행 승인을 받는다
