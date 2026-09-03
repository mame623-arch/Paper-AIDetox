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
  created_at: string;
}

export interface Review {
  id: string;
  session_id: string;
  member_id: string;
  text: string;
  created_at: string;
}

/** 명시적 출석 체크 (논문을 안 올려도 참석으로 기록) */
export interface Attendance {
  id: string;
  session_id: string;
  member_id: string;
  created_at: string;
}

// 한 사람의 세션 참여 기록 — 다룬 논문 + 출석 체크 여부
export interface AttendeeReadings {
  member: Member;
  papers: Paper[];
  /** session_attendees 에 직접 체크된 경우 true (논문 등록만 한 경우 false) */
  attended: boolean;
}
