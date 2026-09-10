import { describe, expect, it } from "vitest";
import { normalizeCategory, parseYear } from "./paperMeta";

const NOW = new Date("2026-09-10T00:00:00Z");

describe("parseYear", () => {
  it("빈 칸은 오류가 아니라 모름이다", () => {
    expect(parseYear("", NOW)).toEqual({ ok: true, value: null });
    expect(parseYear("   ", NOW)).toEqual({ ok: true, value: null });
  });

  it("네 자리 숫자를 연도로 읽는다", () => {
    expect(parseYear("2017", NOW)).toEqual({ ok: true, value: 2017 });
  });

  it("앞뒤 공백은 무시한다", () => {
    expect(parseYear(" 2017 ", NOW)).toEqual({ ok: true, value: 2017 });
  });

  it("숫자가 아니면 오류다 — 조용히 버리지 않는다", () => {
    expect(parseYear("이천십칠", NOW).ok).toBe(false);
    expect(parseYear("20x7", NOW).ok).toBe(false);
  });

  it("네 자리가 아니면 오류다", () => {
    expect(parseYear("17", NOW).ok).toBe(false);
    expect(parseYear("20170", NOW).ok).toBe(false);
  });

  it("범위 밖은 오류다", () => {
    expect(parseYear("1899", NOW).ok).toBe(false);
    expect(parseYear("2028", NOW).ok).toBe(false);
  });

  it("아직 안 나온 논문을 위해 내년까지는 받는다", () => {
    expect(parseYear("2027", NOW)).toEqual({ ok: true, value: 2027 });
  });

  it("경계값을 받는다", () => {
    expect(parseYear("1900", NOW)).toEqual({ ok: true, value: 1900 });
  });
});

describe("normalizeCategory", () => {
  it("공백만 있는 입력은 없음과 같다", () => {
    expect(normalizeCategory("   ")).toBe("");
  });

  it("앞뒤 공백을 지운다", () => {
    expect(normalizeCategory(" cs.CL ")).toBe("cs.CL");
  });
});
