# 주간 스터디 보고서 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 차시별 주간 보고서를 만들고, 그 보고서가 채워지도록 불참 선언·수집 용도 라벨·차시 중심 논문 등록·arXiv 자동 채움을 붙인다.

**Architecture:** 기존 테이블에 컬럼만 더한다(새 테이블·삭제·이름변경 없음). 순수 로직(arXiv 파싱, 참석 분류)은 `lib/` 아래 독립 모듈로 빼서 단위 테스트하고, 화면은 기존 컴포넌트 패턴을 따른다. 논문 등록 진입점을 멤버 페이지에서 차시 쪽으로 옮기고, `/sessions/[id]`를 보고서로 개편한다.

**Tech Stack:** Next.js 14 (App Router) · TypeScript · Tailwind · Supabase (`@supabase/supabase-js`) · react-pdf-highlighter · vitest(신규 devDependency)

**Spec:** `docs/superpowers/specs/2026-09-09-weekly-study-report-design.md`

## Global Constraints

- **사이트가 규칙을 강제하지 않는다.** 저장을 막거나 경고·독촉하는 UI를 만들지 않는다. 안 채운 자리는 `기록 전`으로 비어 보일 뿐이다.
- **스키마는 컬럼 추가만.** 새 테이블, 컬럼 삭제, 테이블 이름 변경 없음.
- **마이그레이션은 몇 번을 다시 실행해도 안전해야 한다** (`add column if not exists` 등). 기존 코드가 돌아가는 상태에서 먼저 실행해도 깨지지 않아야 한다.
- **XML 파서를 의존성에 추가하지 않는다.** arXiv Atom 응답은 정규식으로 필요한 4개 필드만 뽑는다.
- **하이라이트 색(`color`)과 수집 용도(`purpose`)는 별개다.** 색에 용도 의미를 부여하지 않는다.
- **검증은 프로덕션 빌드로 한다.** `next dev`는 React StrictMode 이중 마운트 때문에 프로덕션과 다르게 동작한다(PDF 뷰어에서 이미 겪음).
- **공유 DB에 쓰지 않는다.** 확인은 읽기로만 한다. 쓰기 흐름을 확인해야 하면 스터디원에게 보이지 않는 방법을 쓰고, 남긴 데이터는 지운다.
- **커밋 메시지는 한국어**, 저장소 관례대로 `feat:` / `fix:` / `docs:` / `chore:` 접두어를 쓴다.
- 용도 선택지 문자열은 정확히 `좋은 표현`, `문단 구조`, `논리 연결` 셋이고 나머지는 자유 입력이다.
- 출석 상태 문자열은 정확히 `present`, `absent` 둘이다.

---

## 파일 구조

**새로 만드는 것**

| 파일 | 책임 |
| --- | --- |
| `supabase/add-report-2026-09-09.sql` | 컬럼 추가 마이그레이션 |
| `lib/arxiv.ts` | arXiv 링크에서 id 뽑기, Atom XML에서 메타데이터 뽑기 (순수) |
| `lib/arxiv.test.ts` | 위 함수 단위 테스트 |
| `lib/arxivCategories.ts` | 분류 코드 → 한국어 이름 대응표 |
| `lib/highlightPurposes.ts` | 수집 용도 선택지 상수 |
| `lib/report.ts` | 차시 참석/불참/응답없음 분류 (순수) |
| `lib/report.test.ts` | 위 함수 단위 테스트 |
| `app/api/arxiv/route.ts` | arXiv 메타데이터 프록시 |
| `components/PurposeSelect.tsx` | 용도 선택 UI (없음/3개/기타+자유입력) |
| `components/SessionRecordForm.tsx` | `＋ 이번 차시 기록` — 참석 / 논문 등록 / 불참 갈래 |
| `components/SessionReport.tsx` | 보고서 본문 (참석자·불참자·응답없음) |

**고치는 것**

| 파일 | 무엇을 |
| --- | --- |
| `supabase/schema.sql` | 새 컬럼 반영 |
| `lib/types.ts` | `Paper`·`Attendance`·`Highlight`에 필드 추가 |
| `lib/db.ts` | 출석 upsert(status·reason), 차시 수집 문장 조회, 논문 생성 필드 확장 |
| `components/PdfHighlighterView.tsx` | 하이라이트 생성·수정에 용도 선택 붙이기 |
| `components/SessionReadingsCard.tsx` | 참석 버튼이 `status`를 쓰도록, 기록 버튼 배치 |
| `app/page.tsx` | 예정 스터디 카드에 기록 버튼 |
| `app/sessions/[id]/page.tsx` | 보고서로 개편 |
| `app/members/[id]/page.tsx` | `AddPaperForm` 제거 |
| `README.md` | 페이지 표·자동 채움·수집 용도·마이그레이션 안내 |

---

## Task 1: 테스트 환경과 마이그레이션

**Files:**
- Modify: `package.json`
- Create: `supabase/add-report-2026-09-09.sql`
- Modify: `supabase/schema.sql`
- Modify: `lib/types.ts`

**Interfaces:**
- Consumes: 없음 (첫 작업)
- Produces: `npm test` 명령. `Paper.category: string`, `Paper.published_year: number | null`, `Attendance.status: "present" | "absent"`, `Attendance.reason: string`, `Highlight.purpose: string`

- [ ] **Step 1: vitest 설치**

```bash
npm i -D vitest
```

- [ ] **Step 2: `package.json`의 `scripts`에 test 추가**

`"lint": "next lint"` 아래에 추가한다:

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

- [ ] **Step 3: 설치와 실행 확인**

Run: `npx vitest run`
Expected: 테스트 파일이 없다는 메시지(`No test files found`)와 함께 종료. 설치 자체는 성공.

- [ ] **Step 4: 마이그레이션 파일 작성**

Create `supabase/add-report-2026-09-09.sql`:

```sql
-- ============================================================
--  주간 스터디 보고서 — 컬럼 추가 (2026-09-09)
--  Supabase 대시보드 > SQL Editor 에 붙여넣고 실행하세요.
--  몇 번을 다시 실행해도 안전하며 데이터는 지워지지 않습니다.
-- ============================================================

-- 논문: arXiv 메타데이터 (분류 코드 원본과 발행연도)
alter table papers add column if not exists category       text default '';
alter table papers add column if not exists published_year int;

-- 출석: 불참을 명시적으로 선언할 수 있게 한다.
--  · 행이 없으면 여전히 "아직 응답 없음"
--  · 기존 행은 모두 참석 체크한 사람이므로 기본값 present 가 맞다
alter table session_attendees add column if not exists status text not null default 'present';
alter table session_attendees add column if not exists reason text default '';
alter table session_attendees drop constraint if exists session_attendees_status_check;
alter table session_attendees add constraint session_attendees_status_check
  check (status in ('present', 'absent'));

-- 하이라이트: 수집 용도. 값이 있으면 "수집한 문장", 비어 있으면 개인 하이라이트.
alter table highlights add column if not exists purpose text default '';
```

- [ ] **Step 5: `supabase/schema.sql`에 같은 컬럼 반영**

`papers` 테이블 정의의 `session_id` 줄 아래에 추가:

```sql
  category   text default '',
  published_year int,
```

`highlights` 테이블 정의의 `color` 줄 아래에 추가:

```sql
  purpose    text default '',
```

`session_attendees` 테이블 정의의 `member_id` 줄 아래에 추가:

```sql
  status     text not null default 'present' check (status in ('present', 'absent')),
  reason     text default '',
```

- [ ] **Step 6: `lib/types.ts` 필드 추가**

`Paper` 인터페이스에 추가:

```ts
  /** arXiv 분류 코드 원본 (예: "cs.CL"). arXiv 가 아니면 빈 문자열 */
  category: string;
  /** 논문 발행연도. 모르면 null */
  published_year: number | null;
```

`Highlight` 인터페이스에 추가:

```ts
  /** 수집 용도. 값이 있으면 "수집한 문장", 비어 있으면 개인 하이라이트 */
  purpose: string;
```

`Attendance` 인터페이스에 추가:

```ts
  status: "present" | "absent";
  /** 불참 사유. 참석이면 빈 문자열 */
  reason: string;
```

- [ ] **Step 7: 타입 검사**

Run: `npx tsc --noEmit`
Expected: exit 0. (아직 아무도 새 필드를 안 쓰므로 통과해야 한다)

- [ ] **Step 8: 커밋**

```bash
git add package.json package-lock.json supabase/ lib/types.ts
git commit -m "chore: 보고서용 컬럼 마이그레이션과 vitest 도입

papers.category/published_year, session_attendees.status/reason,
highlights.purpose 를 추가한다. 전부 컬럼 추가라 기존 코드가
돌아가는 상태에서 먼저 실행해도 안전하다."
```

---

## Task 2: arXiv 파싱 (순수 함수)

**Files:**
- Create: `lib/arxiv.ts`
- Test: `lib/arxiv.test.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `extractArxivId(url: string): string | null`
  - `interface ArxivMeta { title: string; authors: string; published_year: number | null; category: string }`
  - `parseArxivAtom(xml: string): ArxivMeta | null`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `lib/arxiv.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { extractArxivId, parseArxivAtom } from "./arxiv";

describe("extractArxivId", () => {
  it("pdf 링크에서 id 를 뽑는다", () => {
    expect(extractArxivId("https://arxiv.org/pdf/2402.08787")).toBe("2402.08787");
  });

  it("버전이 붙어도 버전을 뗀다", () => {
    expect(extractArxivId("https://arxiv.org/pdf/2402.08787v4")).toBe("2402.08787");
  });

  it("abs 링크도 받는다", () => {
    expect(extractArxivId("https://arxiv.org/abs/2402.08787")).toBe("2402.08787");
  });

  it("arXiv 가 아니면 null", () => {
    expect(extractArxivId("https://openreview.net/pdf?id=abc")).toBeNull();
  });

  it("빈 문자열이면 null", () => {
    expect(extractArxivId("")).toBeNull();
  });

  it(".pdf 확장자가 붙어도 뗀다", () => {
    expect(extractArxivId("https://arxiv.org/pdf/2402.08787.pdf")).toBe("2402.08787");
  });

  it("버전과 확장자가 함께 붙어도 뗀다", () => {
    expect(extractArxivId("https://arxiv.org/pdf/2402.08787v4.pdf")).toBe("2402.08787");
  });
});

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <published>2024-02-13T21:59:56Z</published>
    <title>Rethinking Machine Unlearning
  for Large Language Models</title>
    <author><name>Sijia Liu</name></author>
    <author><name>Yuanshun Yao</name></author>
    <arxiv:primary_category xmlns:arxiv="http://arxiv.org/schemas/atom" term="cs.CL" scheme="http://arxiv.org/schemas/atom"/>
  </entry>
</feed>`;

describe("parseArxivAtom", () => {
  it("제목의 줄바꿈을 한 칸으로 접는다", () => {
    expect(parseArxivAtom(SAMPLE)?.title).toBe(
      "Rethinking Machine Unlearning for Large Language Models"
    );
  });

  it("저자를 쉼표로 잇는다", () => {
    expect(parseArxivAtom(SAMPLE)?.authors).toBe("Sijia Liu, Yuanshun Yao");
  });

  it("발행연도를 숫자로 뽑는다", () => {
    expect(parseArxivAtom(SAMPLE)?.published_year).toBe(2024);
  });

  it("분류 코드를 뽑는다", () => {
    expect(parseArxivAtom(SAMPLE)?.category).toBe("cs.CL");
  });

  it("entry 가 없으면 null", () => {
    expect(parseArxivAtom("<feed></feed>")).toBeNull();
  });

  // arXiv 는 잘못된 id 에 대해 404 가 아니라 200 으로 "Error" entry 를 돌려준다.
  // 이걸 거르지 않으면 제목이 "Error" 인 논문이 저장된다.
  it("arXiv 오류 응답은 null", () => {
    const err = `<feed xmlns="http://www.w3.org/2005/Atom">
      <entry>
        <id>http://arxiv.org/api/errors#incorrect_id_format_for_zzz</id>
        <title>Error</title>
        <summary>incorrect id format for zzz</summary>
      </entry>
    </feed>`;
    expect(parseArxivAtom(err)).toBeNull();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run lib/arxiv.test.ts`
Expected: FAIL — `Failed to resolve import "./arxiv"`

- [ ] **Step 3: 최소 구현**

Create `lib/arxiv.ts`:

```ts
/**
 * arXiv 링크·Atom 응답 파싱.
 *
 * XML 파서를 의존성에 추가하지 않는다. 필요한 필드가 넷뿐이고 arXiv Atom 형식이
 * 안정적이라 정규식으로 충분하다. 형식이 바뀌어 파싱이 실패하면 null 을 돌려주고,
 * 호출부는 손 입력으로 넘어가므로 기능이 막히지 않는다.
 */

export interface ArxivMeta {
  title: string;
  /** 저자명을 ", " 로 이어 붙인 문자열 (papers.authors 가 자유 문자열이다) */
  authors: string;
  published_year: number | null;
  /** 분류 코드 원본 (예: "cs.CL") */
  category: string;
}

/**
 * arxiv.org/pdf/<id> · /pdf/<id>v3 · /pdf/<id>.pdf · /pdf/<id>v3.pdf · /abs/<id>
 * 에서 확장자와 버전을 뗀 id 를 뽑는다. 확장자를 먼저 떼야 버전 제거가 걸린다.
 *
 * 옛 형식 id(math.GT/0309136 처럼 슬래시가 들어가는 것)는 받지 않는다 —
 * null 이 되어 손 입력으로 넘어간다.
 */
export function extractArxivId(url: string): string | null {
  const m = url.match(/arxiv\.org\/(?:pdf|abs)\/([^\s/?#]+)/i);
  if (!m) return null;
  const id = m[1].replace(/\.pdf$/i, "").replace(/v\d+$/i, "");
  return id || null;
}

const textOf = (xml: string, tag: string): string | null => {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? m[1] : null;
};

/** 줄바꿈과 연속 공백을 한 칸으로 접는다. arXiv 제목은 여러 줄로 온다. */
const squash = (s: string) => s.replace(/\s+/g, " ").trim();

export function parseArxivAtom(xml: string): ArxivMeta | null {
  const entry = textOf(xml, "entry");
  if (!entry) return null;

  // arXiv 는 잘못된 id 에도 200 으로 응답하고 "Error" entry 를 돌려준다.
  // 거르지 않으면 제목이 "Error" 인 논문이 저장된다.
  if (/arxiv\.org\/api\/errors/i.test(textOf(entry, "id") ?? "")) return null;

  const title = squash(textOf(entry, "title") ?? "");

  const authors = [...entry.matchAll(/<name[^>]*>([\s\S]*?)<\/name>/gi)]
    .map((m) => squash(m[1]))
    .filter(Boolean)
    .join(", ");

  const published = textOf(entry, "published") ?? "";
  const year = Number(published.slice(0, 4));

  const cat = entry.match(/primary_category[^>]*term="([^"]+)"/i);

  return {
    title,
    authors,
    published_year: Number.isFinite(year) && year > 0 ? year : null,
    category: cat ? cat[1] : "",
  };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run lib/arxiv.test.ts`
Expected: PASS — 13 tests

- [ ] **Step 5: 커밋**

```bash
git add lib/arxiv.ts lib/arxiv.test.ts
git commit -m "feat: arXiv 링크·Atom 파싱 함수

의존성을 늘리지 않으려고 정규식으로 필요한 네 필드만 뽑는다.
파싱이 실패하면 null 을 돌려주고 호출부는 손 입력으로 넘어간다."
```

---

## Task 3: `/api/arxiv` 라우트

**Files:**
- Create: `app/api/arxiv/route.ts`
- Reference: `app/api/pdf/route.ts` (같은 패턴을 따른다)

**Interfaces:**
- Consumes: `extractArxivId`, `parseArxivAtom`, `ArxivMeta` (Task 2)
- Produces: `GET /api/arxiv?url=<논문 링크>` → `200 ArxivMeta` / `422 {error}` / `502 {error}`

- [ ] **Step 1: 라우트 작성**

Create `app/api/arxiv/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { extractArxivId, parseArxivAtom } from "@/lib/arxiv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// arXiv 메타데이터를 서버가 받아 돌려준다 → 브라우저의 CORS 제약 우회.
export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("url");
  if (!target) {
    return NextResponse.json({ error: "url 파라미터가 필요합니다." }, { status: 400 });
  }

  const id = extractArxivId(target);
  if (!id) {
    return NextResponse.json({ error: "arXiv 링크가 아닙니다." }, { status: 422 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  try {
    const upstream = await fetch(
      `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}`,
      {
        signal: controller.signal,
        headers: { "User-Agent": "AIDetoxStudy/1.0 (+https://vercel.app)" },
      }
    );
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `arXiv 응답 오류 (${upstream.status})` },
        { status: 502 }
      );
    }

    const meta = parseArxivAtom(await upstream.text());
    if (!meta || !meta.title) {
      return NextResponse.json({ error: "메타데이터를 찾지 못했습니다." }, { status: 422 });
    }

    return NextResponse.json(meta, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return NextResponse.json(
      { error: aborted ? "arXiv 요청 시간 초과" : "arXiv 조회에 실패했습니다." },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
```

- [ ] **Step 2: 타입·린트 확인**

Run: `npx tsc --noEmit && npm run lint`
Expected: 둘 다 통과

- [ ] **Step 3: 프로덕션 빌드로 라우트 확인**

```bash
npm run build && npx next start -p 3200 &
# 서버가 뜰 때까지 기다린 뒤:
curl -s "http://localhost:3200/api/arxiv?url=https://arxiv.org/pdf/2402.08787"
curl -s -o /dev/null -w '%{http_code}\n' "http://localhost:3200/api/arxiv?url=https://openreview.net/pdf?id=x"
```

Expected:
- 첫 번째 — `{"title":"Rethinking Machine Unlearning...","authors":"...","published_year":2024,"category":"cs.CL"}`
- 두 번째 — `422`

확인 후 서버를 내린다 (`pgrep -f "next start -p 3200"` 로 PID를 찾아 `kill`. `pkill -f` 는 명령 자신을 죽일 수 있으니 쓰지 않는다).

- [ ] **Step 4: 커밋**

```bash
git add app/api/arxiv/route.ts
git commit -m "feat: arXiv 메타데이터 프록시 라우트

브라우저에서 arXiv 를 직접 부르면 CORS 에 막히므로 /api/pdf 와 같은
방식으로 서버가 받아 돌려준다. arXiv 가 아니면 422 로 떨어지고
호출부는 손 입력으로 넘어간다."
```

---

## Task 4: 수집 용도 상수와 선택 UI

**Files:**
- Create: `lib/highlightPurposes.ts`
- Create: `components/PurposeSelect.tsx`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `PURPOSE_PRESETS: readonly ["좋은 표현", "문단 구조", "논리 연결"]`
  - `NO_PURPOSE = ""`
  - `isPreset(value: string): boolean`
  - `<PurposeSelect value={string} onChange={(v: string) => void} size?: "sm" | "md" />`

- [ ] **Step 1: 상수 모듈 작성**

Create `lib/highlightPurposes.ts`:

```ts
/**
 * 수집 용도. 값이 있으면 "수집한 문장", 비어 있으면 개인 하이라이트다.
 *
 * 하이라이트 색(lib/highlightColors.ts)과는 별개다. 색은 PDF 위의 시각 표시이고
 * 용도는 분류 라벨이라, 하나에 두 의미를 얹으면 바로 충돌한다.
 *
 * 앞의 셋은 README 에 적힌 스터디 목적 그대로이고, 그 밖의 값은 자유 입력이
 * 그대로 들어간다. 그래서 용도가 늘어도 스키마는 그대로다.
 */
export const PURPOSE_PRESETS = ["좋은 표현", "문단 구조", "논리 연결"] as const;

export const NO_PURPOSE = "";

export function isPreset(value: string): boolean {
  return (PURPOSE_PRESETS as readonly string[]).includes(value);
}
```

- [ ] **Step 2: 선택 UI 작성**

Create `components/PurposeSelect.tsx`:

```tsx
"use client";

import { useState } from "react";
import { NO_PURPOSE, PURPOSE_PRESETS, isPreset } from "@/lib/highlightPurposes";

/**
 * 용도 선택. 기본값은 "없음" 이다 — 기록을 남기는 데 마찰을 더하지 않는다.
 * "기타" 를 고르면 자유 입력 칸이 열리고, 입력한 문자열이 그대로 purpose 가 된다.
 */
export default function PurposeSelect({
  value,
  onChange,
  size = "md",
}: {
  value: string;
  onChange: (v: string) => void;
  size?: "sm" | "md";
}) {
  // 프리셋이 아니면서 값이 있으면 이미 "기타" 를 쓴 것이다.
  const [custom, setCustom] = useState(Boolean(value) && !isPreset(value));

  const text = size === "sm" ? "text-[11px]" : "text-xs";
  const chip = `rounded-full border px-2 py-0.5 ${text} transition`;
  const on = "border-accent bg-accent text-white";
  const off = "border-line text-muted hover:border-accent hover:text-accent";

  const pick = (v: string) => {
    setCustom(false);
    onChange(v);
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      <button type="button" onClick={() => pick(NO_PURPOSE)}
        className={`${chip} ${!custom && !value ? on : off}`}>
        없음
      </button>

      {PURPOSE_PRESETS.map((p) => (
        <button key={p} type="button" onClick={() => pick(p)}
          className={`${chip} ${!custom && value === p ? on : off}`}>
          {p}
        </button>
      ))}

      <button type="button" onClick={() => { setCustom(true); onChange(NO_PURPOSE); }}
        className={`${chip} ${custom ? on : off}`}>
        기타
      </button>

      {custom && (
        <input
          value={isPreset(value) ? "" : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="용도 직접 입력"
          autoFocus
          className={`w-32 rounded-md border border-line bg-bg px-2 py-0.5 ${text} outline-none focus:border-accent`}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: 타입·린트·빌드 확인**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: 전부 통과

- [ ] **Step 4: 커밋**

```bash
git add lib/highlightPurposes.ts components/PurposeSelect.tsx
git commit -m "feat: 수집 용도 상수와 선택 UI

기본값은 '없음' 이다 — 기록에 마찰을 더하지 않는다. 값이 있으면
수집한 문장, 비어 있으면 개인 하이라이트로 갈린다."
```

---

## Task 5: PDF 뷰어에 용도 붙이기

**Files:**
- Modify: `components/PdfHighlighterView.tsx`
- Modify: `lib/db.ts` (`NewHighlightInput`, `updateHighlight`)

**Interfaces:**
- Consumes: `PurposeSelect` (Task 4), `Highlight.purpose` (Task 1)
- Produces: `createHighlight` 가 `purpose` 를 받고, `updateHighlight(id, { note, color, purpose })` 로 바뀐다

- [ ] **Step 1: `lib/db.ts` 확장**

`NewHighlightInput` 에 추가:

```ts
  /** 수집 용도. 빈 문자열이면 개인 하이라이트 (lib/highlightPurposes.ts) */
  purpose: string;
```

`updateHighlight` 의 인자 타입을 바꾼다:

```ts
export async function updateHighlight(
  id: string,
  input: { note: string; color: string; purpose: string }
): Promise<Highlight> {
```

- [ ] **Step 2: 새 하이라이트 툴팁에 용도 선택 추가**

`components/PdfHighlighterView.tsx` 의 `NewHighlightTip` 은 지금 `onConfirm(note, color)` 를 호출한다. 용도를 세 번째 인자로 넘기도록 바꾼다.

- `NewHighlightTip` 안에 `const [purpose, setPurpose] = useState("")` 를 추가하고, 색 선택(`ColorSwatches`) 아래에 `<PurposeSelect value={purpose} onChange={setPurpose} size="sm" />` 를 넣는다.
- `onConfirm` 시그니처를 `(note: string, color: string, purpose: string) => void` 로 바꾸고 `onConfirm(note, color, purpose)` 로 호출한다.
- `addHighlight` 시그니처에 `purpose: string` 을 더하고 `createHighlight({ …, purpose })` 로 넘긴다.
- `onSelectionFinished` 의 `onConfirm={(note, color, purpose) => { addHighlight(position, content, note, color, purpose); hideTipAndSelection(); }}` 로 고친다.

- [ ] **Step 3: 메모 패널 수정 폼에 용도 선택 추가**

같은 파일에서 편집 상태(`editingId === h.id`)일 때 쓰는 `draftNote` / `draftColor` 옆에 `draftPurpose` 를 둔다.

- `const [draftPurpose, setDraftPurpose] = useState("")`
- `startEdit(h)` 에서 `setDraftPurpose(h.purpose ?? "")`
- 편집 폼의 `ColorSwatches` 아래에 `<PurposeSelect value={draftPurpose} onChange={setDraftPurpose} size="sm" />`
- `saveEdit` 에서 `updateHighlight(id, { note: draftNote.trim(), color: draftColor, purpose: draftPurpose })`

- [ ] **Step 4: 목록에서 용도를 라벨로 보이기**

메모 패널의 하이라이트 항목에서, 색 라벨 옆에 용도가 있으면 함께 보인다. 편집 중이 아닐 때 그리는 줄에 추가한다:

```tsx
{h.purpose && (
  <span className="rounded-full bg-accentsoft px-1.5 py-0.5 text-[10px] font-semibold text-accent">
    {h.purpose}
  </span>
)}
```

- [ ] **Step 5: 타입·린트·빌드 확인**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: 전부 통과

- [ ] **Step 6: 커밋**

```bash
git add lib/db.ts components/PdfHighlighterView.tsx
git commit -m "feat: 하이라이트에 수집 용도 붙이기

새로 남길 때와 고칠 때 모두 용도를 고를 수 있게 하고, 용도가 붙은
하이라이트는 메모 패널에서 라벨로 구분해 보인다."
```

---

## Task 6: 출석 상태와 차시 수집 문장 조회

**Files:**
- Modify: `lib/db.ts`

**Interfaces:**
- Consumes: `Attendance.status`, `Attendance.reason` (Task 1)
- Produces:
  - `setAttendance(sessionId: string, memberId: string, status: "present" | "absent", reason?: string): Promise<void>`
  - `removeAttendance(sessionId: string, memberId: string): Promise<void>` — 이름과 시그니처 그대로 둔다. 응답 자체를 지우는 용도다
  - `fetchSessionHighlights(sessionId: string): Promise<Highlight[]>` — 그 차시 논문들의 **수집 문장만** (`purpose` 가 빈 값이 아닌 것)
  - `NewPaperInput` 에 `category: string`, `published_year: number | null` 추가

- [ ] **Step 1: 출석 쓰기를 upsert 로 바꾸기**

기존 `addAttendance` 를 대체한다. `session_attendees` 에 `unique(session_id, member_id)` 인덱스가 이미 있으므로 upsert 로 참석·불참을 같은 경로에서 처리한다.

```ts
export async function setAttendance(
  sessionId: string,
  memberId: string,
  status: "present" | "absent",
  reason = ""
): Promise<void> {
  const { error } = await supabase
    .from("session_attendees")
    .upsert(
      { session_id: sessionId, member_id: memberId, status, reason },
      { onConflict: "session_id,member_id" }
    );
  if (error) throw error;
}
```

`removeAttendance` 는 그대로 둔다 — 응답 자체를 지우는 용도다.

- [ ] **Step 2: 차시 수집 문장 조회 추가**

```ts
/**
 * 한 차시의 "수집한 문장" — 그 차시에 등록된 논문들의 하이라이트 중
 * purpose 가 붙은 것만. 논문마다 따로 조회하지 않고 id 를 모아 한 번에 읽는다.
 */
export async function fetchSessionHighlights(
  sessionId: string
): Promise<Highlight[]> {
  const { data: papers, error: pErr } = await supabase
    .from("papers")
    .select("id")
    .eq("session_id", sessionId);
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
  return (data ?? []) as Highlight[];
}
```

`setAttendance` 도 같은 이유로 실패를 삼키지는 않되(쓰기는 조용히 실패하면 안 된다)
호출부가 메시지를 띄울 수 있도록 `throw` 를 유지한다. 기존 `SessionReadingsCard` 의
출석 실패 처리가 이미 그 방식이다.

- [ ] **Step 3: `NewPaperInput` 확장**

```ts
  category: string;
  published_year: number | null;
```

- [ ] **Step 4: 기존 호출부 정리**

`components/SessionReadingsCard.tsx` 의 `addAttendance(session.id, currentMemberId)` 를 `setAttendance(session.id, currentMemberId, "present")` 로 바꾼다. import 도 함께 고친다.

- [ ] **Step 5: 타입·린트·빌드 확인**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: 전부 통과. `createPaper` 호출부(`app/members/[id]/page.tsx`)가 새 필드를 안 넘겨 타입 에러가 나면, 그 폼은 Task 9 에서 제거되므로 여기서는 `category: "", published_year: null` 을 임시로 넘겨 통과시킨다.

- [ ] **Step 6: 커밋**

```bash
git add lib/db.ts components/SessionReadingsCard.tsx
git commit -m "feat: 출석 상태 upsert 와 차시 수집 문장 조회

참석·불참을 같은 경로에서 처리하고, 보고서가 쓸 '한 차시 전원의
수집 문장' 조회를 더한다. 논문마다 따로 조회하지 않는다."
```

---

## Task 7: 참석 분류 (순수 함수)

**Files:**
- Create: `lib/report.ts`
- Test: `lib/report.test.ts`

**Interfaces:**
- Consumes: `Member`, `Paper`, `Attendance` (`lib/types.ts`)
- Produces: `classifyAttendance(members, papers, attendance): { present: Member[]; absent: { member: Member; reason: string }[]; noResponse: Member[] }`

- [ ] **Step 1: 실패하는 테스트 작성**

Create `lib/report.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { classifyAttendance } from "./report";
import type { Attendance, Member, Paper } from "./types";

const m = (id: string, name: string, sort = 0): Member => ({
  id, name, role: "", sort, created_at: "",
});
const paper = (added_by: string): Paper => ({
  id: `p-${added_by}`, title: "t", authors: "", pdf_url: "", added_by,
  status: "read", read_date: null, session_id: "s1", created_at: "",
  category: "", published_year: null,
});
const att = (member_id: string, status: "present" | "absent", reason = ""): Attendance => ({
  id: `a-${member_id}`, session_id: "s1", member_id, status, reason, created_at: "",
});

const MEMBERS = [m("1", "가", 0), m("2", "나", 1), m("3", "다", 2), m("4", "라", 3)];

describe("classifyAttendance", () => {
  it("참석 체크한 사람은 참석자", () => {
    const r = classifyAttendance(MEMBERS, [], [att("1", "present")]);
    expect(r.present.map((x) => x.id)).toEqual(["1"]);
  });

  it("논문을 등록하면 체크가 없어도 참석자", () => {
    const r = classifyAttendance(MEMBERS, [paper("2")], []);
    expect(r.present.map((x) => x.id)).toEqual(["2"]);
  });

  it("불참 선언은 논문 등록보다 우선한다", () => {
    const r = classifyAttendance(MEMBERS, [paper("3")], [att("3", "absent", "출장")]);
    expect(r.present).toHaveLength(0);
    expect(r.absent).toEqual([{ member: MEMBERS[2], reason: "출장" }]);
  });

  it("나머지는 전부 응답 없음", () => {
    const r = classifyAttendance(MEMBERS, [paper("1")], [att("2", "absent", "감기")]);
    expect(r.noResponse.map((x) => x.id)).toEqual(["3", "4"]);
  });

  it("sort 순서를 지킨다", () => {
    const r = classifyAttendance(MEMBERS, [], [att("3", "present"), att("1", "present")]);
    expect(r.present.map((x) => x.id)).toEqual(["1", "3"]);
  });

  it("멤버 목록에 없는 id 는 무시한다", () => {
    const r = classifyAttendance(MEMBERS, [paper("999")], []);
    expect(r.present).toHaveLength(0);
    expect(r.noResponse).toHaveLength(4);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run lib/report.test.ts`
Expected: FAIL — `Failed to resolve import "./report"`

- [ ] **Step 3: 최소 구현**

Create `lib/report.ts`:

```ts
import type { Attendance, Member, Paper } from "./types";

export interface AbsentEntry {
  member: Member;
  reason: string;
}

export interface AttendanceGroups {
  present: Member[];
  absent: AbsentEntry[];
  /** 참석·불참 어느 쪽도 선언하지 않았고 논문도 올리지 않은 멤버 */
  noResponse: Member[];
}

/**
 * 보고서의 세 갈래를 가른다.
 *
 *   참석자    = (present 선언 ∪ 그 차시에 논문 등록) − absent 선언
 *   불참자    = absent 선언
 *   응답 없음 = 나머지 전원
 *
 * absent 가 우선한다. 논문을 올려둔 사람이 나중에 불참으로 바꾸면
 * 논문은 개인 기록으로 남되 보고서에서는 불참자로 나온다.
 */
export function classifyAttendance(
  members: Member[],
  papers: Paper[],
  attendance: Attendance[]
): AttendanceGroups {
  const byId = new Map(members.map((m) => [m.id, m]));

  const absentReason = new Map<string, string>();
  const declaredPresent = new Set<string>();
  for (const a of attendance) {
    if (a.status === "absent") absentReason.set(a.member_id, a.reason ?? "");
    else declaredPresent.add(a.member_id);
  }

  const presentIds = new Set<string>(declaredPresent);
  for (const p of papers) {
    if (p.added_by) presentIds.add(p.added_by);
  }
  for (const id of absentReason.keys()) presentIds.delete(id);

  const inOrder = (ids: Iterable<string>) =>
    [...ids]
      .map((id) => byId.get(id))
      .filter((m): m is Member => Boolean(m))
      .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));

  const present = inOrder(presentIds);
  const absent = inOrder(absentReason.keys()).map((member) => ({
    member,
    reason: absentReason.get(member.id) ?? "",
  }));

  const spoken = new Set([...present, ...absent.map((a) => a.member)].map((m) => m.id));
  const noResponse = members
    .filter((m) => !spoken.has(m.id))
    .sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name));

  return { present, absent, noResponse };
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run`
Expected: PASS — Task 2 의 13개와 합쳐 19 tests

- [ ] **Step 5: 커밋**

```bash
git add lib/report.ts lib/report.test.ts
git commit -m "feat: 보고서 참석 분류

참석 = (present 선언 ∪ 논문 등록) − absent 선언, 불참 = absent 선언,
나머지는 응답 없음. absent 가 우선한다."
```

---

## Task 8: `＋ 이번 차시 기록` 폼

**Files:**
- Create: `components/SessionRecordForm.tsx`
- Create: `lib/arxivCategories.ts`

**Interfaces:**
- Consumes: `setAttendance`, `removeAttendance`, `createPaper`, `NewPaperInput` (Task 6), `ArxivMeta` (Task 2)
- Produces: `<SessionRecordForm session={Session} myAttendance={Attendance | null} myPapers={Paper[]} onDone={() => Promise<void>} />`

- [ ] **Step 1: 분류 코드 대응표 작성**

Create `lib/arxivCategories.ts`:

```ts
/**
 * arXiv 분류 코드를 사람이 읽는 이름으로. DB 에는 코드 원본만 저장하고
 * 표현은 여기서만 바꾼다 — 이름이 바뀌어도 데이터는 그대로다.
 * 목록에 없는 코드는 코드를 그대로 보여준다.
 */
const NAMES: Record<string, string> = {
  "cs.AI": "인공지능",
  "cs.CL": "자연어처리",
  "cs.CV": "컴퓨터비전",
  "cs.LG": "기계학습",
  "cs.RO": "로보틱스",
  "cs.HC": "HCI",
  "cs.CR": "보안",
  "cs.IR": "정보검색",
  "cs.SE": "소프트웨어공학",
  "cs.DB": "데이터베이스",
  "stat.ML": "통계적 기계학습",
  "eess.AS": "음성·오디오",
  "eess.IV": "영상처리",
};

export function categoryLabel(code: string): string {
  if (!code) return "";
  return NAMES[code] ?? code;
}
```

- [ ] **Step 2: 폼 컴포넌트 작성**

Create `components/SessionRecordForm.tsx`. 요구사항은 이렇다.

- 닫혀 있을 때는 버튼 하나: `＋ 이번 차시 기록`
- 열면 **내 현재 상태를 먼저 보여준다**: `응답 없음` / `참석` / `불참 · <사유>`. 예정 스터디 카드에는 `참석` 버튼이 없어서 불참을 되돌릴 자리가 이 폼 안에만 있기 때문이다.
- 갈래 선택: **`참석` / `논문 등록` / `불참` 세 갈래**
  - **`참석`** — 논문 없이 참석만 표시한다. `setAttendance(session.id, 나, "present")` 한 번이 전부다.
    이 갈래가 없으면 **불참을 선언한 사람이 논문을 등록하지 않고는 참석으로 되돌릴 수 없다.**
    예정 스터디 카드에는 `참석` 버튼이 없고(그 버튼은 `mode === "read"` 일 때만 나온다),
    Task 10 에서 차시 상세의 `SessionReadingsCard` 도 보고서로 바뀌기 때문이다.
    "논문 없이 참석" 은 지금도 있는 개념이라 보고서가 그대로 받아준다.
- **논문 등록** 칸: PDF 링크 · 제목 · 저자 · 상태(`읽을 예정`/`읽음`)
  - 링크 입력이 멈추고 600ms 뒤 `/api/arxiv?url=…` 를 한 번 부른다 (디바운스)
  - **응답이 늦게 도착해 새 링크를 덮어쓰지 않게 막는다.** 디바운스만으로는 막히지 않는다 —
    이미 날아간 요청은 링크를 바꿔도 계속 살아 있다. 요청마다 번호를 매겨 마지막 것만 반영한다:

    ```ts
    const reqRef = useRef(0);

    const lookup = async (link: string) => {
      const seq = ++reqRef.current;
      try {
        const r = await fetch(`/api/arxiv?url=${encodeURIComponent(link)}`);
        if (seq !== reqRef.current) return;   // 그새 링크가 바뀌었다
        if (!r.ok) return;                    // 422·502 는 조용히 넘어간다
        const meta = (await r.json()) as ArxivMeta;
        if (seq !== reqRef.current || !meta?.title) return;
        // 비어 있는 칸만 채운다 — 사용자가 고쳐 둔 값을 덮지 않는다
        setTitle((t) => t || meta.title);
        setAuthors((a) => a || meta.authors);
        setCategory(meta.category ?? "");
        setYear(meta.published_year ?? null);
      } catch {
        /* 조용히 넘어간다 */
      }
    };
    ```
  - **`r.ok` 를 반드시 확인한다.** 확인하지 않으면 `{ error: … }` 본문이 메타데이터 자리에
    들어가 제목 없는 논문이 저장된다. arXiv 자체의 "Error" 응답은 `parseArxivAtom` 이
    라우트에서 이미 걸러 422 로 떨어진다 (Task 2·3)
  - 성공하면 제목·저자가 비어 있을 때만 채우고, 분야·연도를 `categoryLabel(category)` 로 함께 보여준다. **채워진 값은 그대로 고칠 수 있다**
  - 실패하면 조용히 넘어간다. 에러를 띄우지 않는다 — arXiv 가 아닌 논문도 정상이다
  - 링크를 비우면 `category`·`published_year` 도 비운다. 앞선 논문의 분야가 남아 저장되면 안 된다
  - 저장: `createPaper({ title, authors, pdf_url, added_by: 나, status, read_date: status === "read" ? session.date : null, session_id: session.id, category, published_year })`
  - **출석은 필요할 때만 따로 쓴다.** 참석 판정이 이미 "논문을 등록한 사람 = 참석" 이므로
    (`classifyAttendance`, Task 7) 논문 저장만으로 참석자로 분류된다. 연달아 출석까지 쓰면
    중간 실패와 중복 쓰기 위험만 는다.
    **예외는 하나** — 내가 이미 `absent` 를 선언해 둔 경우다. `absent` 가 우선하므로 논문을
    등록해도 불참자로 남는다. 이때만 `setAttendance(session.id, 나, "present")` 를 이어서
    호출해 불참 표시를 지운다. 즉:

    ```ts
    await createPaper({ … });
    if (myAttendance?.status === "absent") {
      await setAttendance(session.id, me, "present");
    }
    ```
  - **차시가 이미 정해져 있으므로 "스터디 일정" 드롭다운은 없다**
- **불참** 칸: 사유 입력 한 줄
  - 저장 전에, 그 차시에 내가 등록한 논문이 있으면 (`myPapers.length > 0`) `window.confirm("이 차시에 등록한 논문이 있습니다. 불참으로 바꿀까요?")` 로 한 번 묻는다
  - 저장: `setAttendance(session.id, 나, "absent", reason)`
- 사이드바에서 이름을 안 골랐으면(`useCurrentMemberId()` 가 null) 버튼 대신 `사이드바에서 내 이름을 고르면 기록할 수 있어요` 를 보여준다. **아무 설명 없이 사라지게 두지 않는다**
- 저장 실패 시 폼 안에 메시지를 남긴다 (`저장에 실패했습니다.`)
- 저장에 성공하면 `onDone()` 을 불러 부모가 다시 읽게 한다

기존 `AddPaperForm`(`app/members/[id]/page.tsx`)의 마크업과 `field` 클래스를 그대로 따른다.

- [ ] **Step 3: 타입·린트·빌드 확인**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: 전부 통과

- [ ] **Step 4: 커밋**

```bash
git add components/SessionRecordForm.tsx lib/arxivCategories.ts
git commit -m "feat: 이번 차시 기록 폼 (논문 등록 / 불참)

차시가 정해진 자리에 붙어 일정 드롭다운이 없다. 링크를 넣으면
arXiv 메타데이터로 제목·저자·분야·연도를 채우고, 채운 값은 고칠 수 있다.
폼을 열면 내 현재 상태를 먼저 보여줘 불참을 되돌릴 수 있게 한다."
```

---

## Task 9: 진입점 이전

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/members/[id]/page.tsx`
- Modify: `components/SessionReadingsCard.tsx`

**Interfaces:**
- Consumes: `SessionRecordForm` (Task 8)
- Produces: 없음 (배치 변경)

- [ ] **Step 1: 홈 예정 스터디 카드에 폼 배치**

`app/page.tsx` 에서 예정 스터디용 `SessionReadingsCard` 아래에 `SessionRecordForm` 을 둔다. 폼에 넘길 `myAttendance` 와 `myPapers` 를 위해 그 차시의 출석·논문을 읽어 온다 (`fetchAttendance`, 이미 받아둔 `upcomingReadings` 에서 내 논문 추리기).

`onDone` 에서 홈 데이터를 다시 읽는다.

- [ ] **Step 2: 멤버 페이지에서 `AddPaperForm` 제거**

`app/members/[id]/page.tsx` 에서:

- `{canEdit && ( <AddPaperForm … /> )}` 블록을 지운다
- `AddPaperForm` 함수 정의 전체를 지운다
- 더 이상 쓰지 않는 import 를 정리한다: `createPaper`, `today`, `Card`, `PaperStatus` 중 남은 코드가 안 쓰는 것
- `sessions` 상태와 `fetchSessions` 호출은 **남긴다** — 논문 줄에 차시 제목을 보여주는 데 계속 쓴다

Run: `npx tsc --noEmit` 로 안 쓰는 import 를 잡는다.

- [ ] **Step 3: 차시 상세에도 같은 폼 배치**

이 단계는 Task 10 에서 보고서 페이지를 다시 쓰면서 함께 넣는다. 여기서는 홈만 처리한다.

- [ ] **Step 4: 타입·린트·빌드 확인**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: 전부 통과

- [ ] **Step 5: 프로덕션 빌드로 화면 확인**

```bash
npm run build && npx next start -p 3200
```

확인:
- 홈 예정 스터디 아래에 `＋ 이번 차시 기록` 이 보인다
- 사이드바에서 이름을 고르지 않으면 안내 문구가 보인다 (아무것도 없이 사라지지 않는다)
- 멤버 페이지에 `＋ 논문 기록 추가` 가 없다
- 멤버 페이지의 논문 목록·편집·삭제·한줄평은 그대로 동작한다

**공유 DB 에 쓰지 않는다** — 폼을 열어 화면만 확인하고 저장은 누르지 않는다.

- [ ] **Step 6: 커밋**

```bash
git add app/page.tsx "app/members/[id]/page.tsx" components/SessionReadingsCard.tsx
git commit -m "feat: 논문 등록 진입점을 차시 쪽으로 옮긴다

논문 등록은 차시에 참여하려고 하는 일인데 멤버 페이지에 있고 일정이
곁다리 드롭다운이었다. 홈 예정 스터디에 기록 폼을 두고 멤버 페이지의
추가 폼을 없앤다. 멤버 페이지는 기록을 보는 곳으로 정리된다."
```

---

## Task 10: 보고서 페이지

**Files:**
- Create: `components/SessionReport.tsx`
- Modify: `app/sessions/[id]/page.tsx`

**Interfaces:**
- Consumes: `classifyAttendance` (Task 7), `fetchSessionHighlights` (Task 6), `SessionRecordForm` (Task 8), `useSessionReview` (기존 `components/SessionReview.tsx`)
- Produces: `<SessionReport session members papers highlights reviews attendance onChanged />`

- [ ] **Step 1: 보고서 본문 컴포넌트 작성**

Create `components/SessionReport.tsx`. 구조는 이렇다.

```
── 참석자 ──
<멤버 이름>
  읽은 논문    <제목>            ← 논문마다 한 줄
  한줄평       <내용> 또는 기록 전   ← 사람당 한 번
  수집 문장    "<문장>" — <이유>  [<용도>]   ← 그 논문의 것만, 3개까지
               [ 더보기 N개 ]

── 불참자 ──
<멤버 이름>   <사유>

── 응답 없음 ──
<이름> · <이름> · <이름>
```

규칙:
- `기록 전`은 **항목별로** 표시한다. 사람을 통째로 묶지 않는다
- 논문이 여러 편이면 논문 줄이 여러 개가 되고, **수집 문장은 각 논문 아래에 그 논문 것만** 붙는다. 더보기는 논문마다 따로 센다
- 한줄평은 차시 단위라 사람당 한 번만 나온다. 선택이므로 없으면 그 자리만 `기록 전`
- 응답 없음은 이름만 나열한다. **경고나 독촉 문구를 붙이지 않는다**
- 수집 문장은 `highlights.text` 와 `highlights.note` 가 한 쌍이고 `purpose` 를 라벨로 함께 보인다
- 더보기는 `useState` 로 논문별 펼침 상태를 들고 있는 작은 하위 컴포넌트로 뺀다 (훅을 map 콜백 안에서 쓸 수 없다)

**`SessionReadingsCard` 가 하던 동선을 잃지 않는다.** 이 페이지에서만 되던 일이 있어서,
그냥 표시용 화면으로 바꾸면 기능이 사라진다. 아래를 그대로 옮긴다.

| 지금 되는 것 | 보고서에서 |
| --- | --- |
| 멤버 이름·아바타 → `/members/[id]` | 그대로 링크 |
| 논문 제목 → `/members/[id]/papers/[paperId]` | 그대로 링크 — **PDF 하이라이트 화면으로 들어가는 유일한 경로다** |
| 한줄평 작성·수정·삭제 (본인만) | `useSessionReview` 를 그대로 쓴다 (`components/SessionReview.tsx`) |
| 참석 체크 버튼 | `SessionRecordForm` 의 `참석` 갈래가 대신한다 |
| 참석 N명 · 논문 N편 요약 | 세 갈래 머리말에 인원 수로 남긴다 |

한줄평이 특히 중요하다. 홈의 `SessionReadingsCard` 는 **가장 최근 차시 하나**만 보여주므로,
차시 상세에서 한줄평 작성이 빠지면 **2주 전 차시에는 한줄평을 쓸 방법이 없어진다.**
보고서의 한줄평 자리는 읽기 전용이 아니라 `useSessionReview` 의 버튼·패널을 그대로 단다 —
본인이면 `＋ 한줄평` 으로 쓰고 `수정`·`삭제` 가 되고, 남이면 펼쳐 보기만 된다.

- [ ] **Step 2: 차시 상세 페이지를 보고서로 교체**

`app/sessions/[id]/page.tsx` 에서:

- `fetchMembers`, `fetchSession`, `fetchReviews` 에 더해 `fetchAttendance(sessionId)`, `fetchSessionHighlights(sessionId)`, 그리고 그 차시 논문 목록을 읽는다
- 기존 `SessionReadingsCard` 자리를 `SessionReport` 로 바꾼다
- 제목 아래에 `SessionRecordForm` 을 둔다 — **지난 차시를 나중에 채우는 자리**다. 이게 없으면 스터디가 끝난 뒤 수집 문장을 넣을 곳이 사라진다
- `onChanged` 에서 전부 다시 읽는다

- [ ] **Step 3: 타입·린트·빌드 확인**

Run: `npx tsc --noEmit && npm run lint && npm run build`
Expected: 전부 통과

- [ ] **Step 4: 프로덕션 빌드로 실제 데이터 확인**

```bash
npm run build && npx next start -p 3200
```

과거 차시 하나를 열어 확인한다:
- 참석자/불참자/응답 없음 세 갈래가 나온다
- 과거 하이라이트는 `purpose` 가 비어 있으므로 **수집 문장 칸이 `기록 전`** 이다 (스펙대로 정상)
- 한줄평이 있는 사람은 한줄평이 나오고, 없는 사람은 그 자리만 `기록 전`
- 응답 없음에 이름이 나열되고 경고 문구가 없다
- **동선 확인** — 논문 제목을 누르면 PDF 하이라이트 화면으로 들어간다,
  멤버 이름을 누르면 멤버 페이지로 간다, 본인 자리에 `＋ 한줄평` 이 보이고
  이미 쓴 한줄평에는 `수정`·`삭제` 가 보인다 (누르지는 않는다 — 공유 DB 에 쓰지 않는다)
- 콘솔 에러가 없다

- [ ] **Step 5: 커밋**

```bash
git add components/SessionReport.tsx "app/sessions/[id]/page.tsx"
git commit -m "feat: 차시 상세를 주간 보고서로 개편

참석자·불참자·응답 없음 세 갈래로 나누고, 참석자는 읽은 논문·한줄평·
수집 문장을 항목별로 보여준다. 비면 항목별로 '기록 전' 이 된다.
같은 페이지에 기록 폼을 둬서 지난 차시도 나중에 채울 수 있다."
```

---

## Task 11: README 갱신

**Files:**
- Modify: `README.md`

**Interfaces:**
- Consumes: 없음
- Produces: 없음

- [ ] **Step 1: 페이지 표 고치기**

`/sessions/[id]` 줄을 보고서로 고치고, `/api/arxiv` 줄을 추가한다. `/members/[id]` 줄에서 논문 **추가**가 빠졌음을 반영한다(편집·삭제·상태 전환은 남는다).

- [ ] **Step 2: 자동 채움 설명 추가**

기술 스택 아래에 한 문단:

> 논문을 등록할 때 arXiv 링크를 넣으면 제목·저자·분야·발행연도가 자동으로 채워집니다. 예전에 있던 PDF 본문 추출과 달리 arXiv 가 내주는 원본 메타데이터라 정확합니다. arXiv 가 아닌 링크는 직접 입력합니다.

기존의 "제목·저자는 직접 입력합니다" 문단을 이 내용에 맞게 고친다.

- [ ] **Step 3: 마이그레이션·백필 안내 추가**

Supabase 설정 절에 `supabase/add-report-2026-09-09.sql` 실행 안내를 더하고, 백필 스크립트 사용법을 적는다.

- [ ] **Step 4: 수집 용도 설명 추가**

> PDF 에서 문장을 하이라이트할 때 **수집 용도**(좋은 표현 · 문단 구조 · 논리 연결 · 기타)를 고를 수 있습니다. 용도를 고른 문장만 주간 보고서에 올라갑니다. 용도 없이 남긴 하이라이트는 개인 기록으로만 남습니다. 하이라이트 색과는 별개입니다.

- [ ] **Step 5: 커밋**

```bash
git add README.md
git commit -m "docs: 보고서·수집 용도·arXiv 자동 채움 안내"
```

---

## 마무리 확인

전체 작업이 끝나면 한 번에 확인한다.

- [ ] `npx vitest run` — 19 tests 통과
- [ ] `npx tsc --noEmit` — exit 0
- [ ] `npm run lint` — 경고 없음
- [ ] `npm run build` — 성공
- [ ] 프로덕션 빌드(`npx next start`)로 아래를 확인하고, **공유 DB 에는 쓰지 않는다**
  - 홈: 예정 스터디에 `＋ 이번 차시 기록`, 사이드바 미선택 시 안내 문구
  - 차시 상세: 보고서 세 갈래, 항목별 `기록 전`, 기록 폼
  - 차시 상세 동선: 논문 제목 → PDF 화면, 멤버 이름 → 멤버 페이지, 한줄평 작성·수정 버튼
  - 불참을 선언한 상태에서 `＋ 이번 차시 기록` 을 열면 `참석` 으로 되돌릴 수 있다
  - 멤버 페이지: 추가 폼 없음, 목록·편집·삭제·한줄평 정상
  - PDF 뷰어: 용도 선택이 생성·수정 양쪽에 있고, 남의 논문에서는 여전히 보기 전용
