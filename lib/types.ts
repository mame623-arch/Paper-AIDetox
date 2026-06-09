import type { ScaledPosition } from "react-pdf-highlighter";

export type PaperStatus = "read" | "toread";

export interface Member {
  id: string;
  name: string;
  emoji: string;
  role: string;
  created_at: string;
}

export interface Session {
  id: string;
  date: string;
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

// Home page: one attendee of the latest session and the papers they read
export interface SessionAttendee {
  member: Member;
  papers: Paper[];
}
