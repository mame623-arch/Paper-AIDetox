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
  color: string;
  created_at: string;
}

// 한 사람 + 그 사람이 해당 세션에서 다룬 논문들
export interface AttendeeReadings {
  member: Member;
  papers: Paper[];
}
