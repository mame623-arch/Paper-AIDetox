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
    expect(r.purposes).toEqual([{ purpose: "기타", count: 2 }, { purpose: "좋은 표현", count: 2 }]);
  });

  it("문장 수가 같으면 이름 오름차순", () => {
    const r = buildArchiveStats(
      [paper("p1", "2026-09-03")],
      [hl("a", "p1", "문단 구조"), hl("b", "p1", "논리 연결")],
      NOW
    );
    expect(r.purposes.map((p) => p.purpose)).toEqual(["논리 연결", "문단 구조"]);
  });

  it("읽은 논문에 속하지 않는 문장은 세지 않는다", () => {
    const r = buildArchiveStats([paper("p1", "2026-09-03")], [hl("a", "p9", "좋은 표현")], NOW);
    expect(r.purposes).toEqual([]);
  });
});
