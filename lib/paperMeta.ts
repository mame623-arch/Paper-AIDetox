/**
 * 논문 메타 입력값 다루기. 등록 폼과 편집 폼이 같은 규칙을 써야 해서 여기 모은다.
 */

export type YearParse =
  | { ok: true; value: number | null }
  | { ok: false; message: string };

/** 발행연도로 받아들일 수 있는 가장 이른 해. 이보다 옛 논문은 이 스터디 범위 밖이다. */
export const MIN_YEAR = 1900;

/**
 * 입력 칸의 문자열을 발행연도로 바꾼다.
 *
 * 빈 칸은 오류가 아니라 "모름"(null)이다 — 연도를 모른다고 논문을 못 올리게
 * 막을 이유가 없다. 반대로 숫자가 아니거나 범위 밖인 값은 조용히 버리지 않고
 * 오류로 알린다. 조용히 버리면 사용자는 저장된 줄 알고 넘어간다.
 *
 * 아직 안 나온 논문(in press)을 위해 내년까지는 받는다.
 */
export function parseYear(input: string, now: Date = new Date()): YearParse {
  const text = input.trim();
  if (!text) return { ok: true, value: null };

  if (!/^\d{4}$/.test(text)) {
    return { ok: false, message: "발행연도는 네 자리 숫자로 입력하세요. (예: 2017)" };
  }

  const year = Number(text);
  const max = now.getFullYear() + 1;
  if (year < MIN_YEAR || year > max) {
    return { ok: false, message: `발행연도는 ${MIN_YEAR}~${max} 사이여야 합니다.` };
  }
  return { ok: true, value: year };
}

/** 분야 코드를 저장 형태로. 공백만 있는 입력은 "없음"과 같다. */
export function normalizeCategory(input: string): string {
  return input.trim();
}
