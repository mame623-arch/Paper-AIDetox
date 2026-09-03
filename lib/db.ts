import { supabase } from "./supabase";
import type {
  Attendance,
  AttendeeReadings,
  Highlight,
  Member,
  Paper,
  PaperStatus,
  Review,
  Session,
} from "./types";

// 오늘 날짜(YYYY-MM-DD, 로컬)
export function today(): string {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10);
}

// ---------- members ----------
export async function fetchMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .order("sort", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw error;
  return data as Member[];
}

export async function fetchMember(id: string): Promise<Member | null> {
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Member | null;
}

// ---------- sessions ----------
export async function fetchSessions(): Promise<Session[]> {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .order("date", { ascending: true });
  if (error) throw error;
  return data as Session[];
}

export async function fetchRecentSession(): Promise<Session | null> {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .lte("date", today())
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as Session | null;
}

export async function fetchSession(id: string): Promise<Session | null> {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Session | null;
}

export async function fetchUpcomingSession(): Promise<Session | null> {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .gt("date", today())
    .order("date", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as Session | null;
}

export interface NewSessionInput {
  date: string;
  time: string;
  location: string;
  title: string;
}

export async function createSession(input: NewSessionInput): Promise<Session> {
  const { data, error } = await supabase
    .from("sessions")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data as Session;
}

export async function updateSession(
  id: string,
  input: NewSessionInput
): Promise<void> {
  const { error } = await supabase.from("sessions").update(input).eq("id", id);
  if (error) throw error;
}

export async function deleteSession(id: string): Promise<void> {
  const { error } = await supabase.from("sessions").delete().eq("id", id);
  if (error) throw error;
}

// ---------- 출석(참석) ----------
/**
 * 세션 참석자 목록.
 * 마이그레이션(supabase/add-attendance-2026-09-03.sql) 전이라면 테이블이 없으므로,
 * 실패해도 빈 목록으로 처리해 나머지 화면은 그대로 동작하게 한다.
 */
export async function fetchAttendance(sessionId: string): Promise<Attendance[]> {
  const { data, error } = await supabase
    .from("session_attendees")
    .select("*")
    .eq("session_id", sessionId);
  if (error) {
    console.warn("출석 정보를 불러오지 못했습니다(테이블 미생성?)", error.message);
    return [];
  }
  return (data ?? []) as Attendance[];
}

export async function addAttendance(
  sessionId: string,
  memberId: string
): Promise<void> {
  const { error } = await supabase
    .from("session_attendees")
    .insert({ session_id: sessionId, member_id: memberId });
  // 23505 = 이미 체크됨(unique 위반) — 성공으로 취급
  if (error && error.code !== "23505") throw error;
}

export async function removeAttendance(
  sessionId: string,
  memberId: string
): Promise<void> {
  const { error } = await supabase
    .from("session_attendees")
    .delete()
    .eq("session_id", sessionId)
    .eq("member_id", memberId);
  if (error) throw error;
}

/**
 * "누가 참석해서 어떤 논문을 다뤘는지" 뷰.
 * 참석 = 그 세션에 논문을 등록했거나(자동), 출석 체크를 했거나(수동).
 */
export async function fetchSessionReadings(
  sessionId: string,
  members: Member[]
): Promise<AttendeeReadings[]> {
  const [{ data, error }, attendance] = await Promise.all([
    supabase.from("papers").select("*").eq("session_id", sessionId),
    fetchAttendance(sessionId),
  ]);
  if (error) throw error;

  const byMember = new Map<string, Paper[]>();
  for (const p of (data ?? []) as Paper[]) {
    if (!p.added_by) continue;
    const list = byMember.get(p.added_by) ?? [];
    list.push(p);
    byMember.set(p.added_by, list);
  }

  const checked = new Set(attendance.map((a) => a.member_id));
  const memberById = new Map(members.map((m) => [m.id, m]));

  return [...new Set([...byMember.keys(), ...checked])]
    .map((memberId) => ({
      member: memberById.get(memberId)!,
      papers: byMember.get(memberId) ?? [],
      attended: checked.has(memberId),
    }))
    .filter((r) => r.member)
    .sort((a, b) => a.member.sort - b.member.sort);
}

// ---------- papers ----------
export async function fetchPapersByMember(memberId: string): Promise<Paper[]> {
  const { data, error } = await supabase
    .from("papers")
    .select("*")
    .eq("added_by", memberId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data as Paper[];
}

export async function fetchPaper(id: string): Promise<Paper | null> {
  const { data, error } = await supabase
    .from("papers")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data as Paper | null;
}

export interface NewPaperInput {
  title: string;
  authors: string;
  pdf_url: string;
  added_by: string;
  status: PaperStatus;
  read_date: string | null;
  session_id: string | null;
}

export async function createPaper(input: NewPaperInput): Promise<Paper> {
  const { data, error } = await supabase
    .from("papers")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data as Paper;
}

export async function updatePaperStatus(
  id: string,
  status: PaperStatus,
  read_date: string | null
): Promise<void> {
  const { error } = await supabase
    .from("papers")
    .update({ status, read_date })
    .eq("id", id);
  if (error) throw error;
}

export interface PaperEditInput {
  title: string;
  authors: string;
  pdf_url: string;
}

/** 제목·저자·링크 편집 */
export async function updatePaper(
  id: string,
  input: PaperEditInput
): Promise<void> {
  const { error } = await supabase.from("papers").update(input).eq("id", id);
  if (error) throw error;
}

export async function deletePaper(id: string): Promise<void> {
  const { error } = await supabase.from("papers").delete().eq("id", id);
  if (error) throw error;
}

// ---------- highlights ----------
export async function fetchHighlights(paperId: string): Promise<Highlight[]> {
  const { data, error } = await supabase
    .from("highlights")
    .select("*")
    .eq("paper_id", paperId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as Highlight[];
}

export interface NewHighlightInput {
  paper_id: string;
  member_id: string | null;
  text: string;
  position: Highlight["position"];
  note: string;
  /** lib/highlightColors.ts 의 key */
  color: string;
}

export async function createHighlight(
  input: NewHighlightInput
): Promise<Highlight> {
  const { data, error } = await supabase
    .from("highlights")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data as Highlight;
}

export async function updateHighlight(
  id: string,
  input: { note: string; color: string }
): Promise<Highlight> {
  const { data, error } = await supabase
    .from("highlights")
    .update(input)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Highlight;
}

export async function deleteHighlight(id: string): Promise<void> {
  const { error } = await supabase.from("highlights").delete().eq("id", id);
  if (error) throw error;
}

// ---------- reviews (한줄평) ----------
export async function fetchReviews(sessionId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as Review[];
}

export async function createReview(input: {
  session_id: string;
  member_id: string;
  text: string;
}): Promise<Review> {
  const { data, error } = await supabase
    .from("reviews")
    .insert(input)
    .select("*")
    .single();
  if (error) throw error;
  return data as Review;
}

export async function updateReview(id: string, text: string): Promise<Review> {
  const { data, error } = await supabase
    .from("reviews")
    .update({ text })
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as Review;
}

export async function deleteReview(id: string): Promise<void> {
  const { error } = await supabase.from("reviews").delete().eq("id", id);
  if (error) throw error;
}
