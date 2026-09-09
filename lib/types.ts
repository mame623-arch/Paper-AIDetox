import type { ScaledPosition } from "react-pdf-highlighter";

export type PaperStatus = "read" | "toread";

export interface Member {
  id: string;
  name: string;
  role: string;
  sort: number;
  created_at: string;
}

export interface Session {
  id: string;
  date: string;
  time: string;
  location: string;
  title: string;
  created_at: string;
}

export interface Paper {
  id: string;
  title: string;
  authors: string;
  pdf_url: string;
  added_by: string | null;
  status: PaperStatus;
  read_date: string | null;
  session_id: string | null;
  /** arXiv 분류 코드 원본 (예: "cs.CL"). arXiv 가 아니면 빈 문자열 */
  category: string;
  /** 논문 발행연도. 모르면 null */
  published_year: number | null;
  created_at: string;
}

export interface Highlight {
  id: string;
  paper_id: string;
  member_id: string | null;
  text: string;
  position: ScaledPosition;
  note: string;
  /** yellow | green | blue | pink | purple (lib/highlightColors.ts) */
  color: string;
  /** 수집 용도. 값이 있으면 "수집한 문장", 비어 있으면 개인 하이라이트 */
  purpose: string;
  created_at: string;
}

export interface Review {
  id: string;
  session_id: string;
  member_id: string;
  text: string;
  created_at: string;
}

/**
 * 출석 선언. 행이 있다는 것만으로 참석은 아니다 — status 가 가른다.
 * present 면 참석(논문을 안 올려도 참석으로 기록), absent 면 불참이고
 * 이때는 논문을 올려 뒀더라도 absent 가 이긴다(lib/report.ts 의 classifyAttendance).
 * 행이 아예 없으면 "아직 응답 없음" 이다.
 */
export interface Attendance {
  id: string;
  session_id: string;
  member_id: string;
  /** 마이그레이션(supabase/add-report-2026-09-09.sql) 전 행에는 없을 수 있다 */
  status: "present" | "absent";
  /** 불참 사유. 참석이면 빈 문자열 */
  reason: string;
  created_at: string;
}

// 한 사람의 세션 참여 기록 — 다룬 논문 + 참석 선언 여부.
// 불참(absent)을 선언한 사람은 애초에 이 목록에 들어오지 않는다.
export interface AttendeeReadings {
  member: Member;
  papers: Paper[];
  /** session_attendees 에 absent 아닌 행이 있으면 true (논문 등록만 한 경우 false) */
  attended: boolean;
}
