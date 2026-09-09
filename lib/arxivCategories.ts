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
