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
