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

export async function setAttendance(
  sessionId: string,
  memberId: string,
  status: "present" | "absent",
  reason = ""
): Promise<void> {
  const { error } = await supabase
    .from("session_attendees")
    .upsert(
      { session_id: sessionId, member_id: memberId, status, reason },
      { onConflict: "session_id,member_id" }
    );
  if (error) throw error;
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
 * 참석 = (그 세션에 논문을 등록했거나(자동) present 로 체크했거나(수동)) − absent 선언.
 * absent 가 우선한다 — 논문을 올려 뒀어도 불참을 선언했으면 참석자가 아니다
 * (lib/report.ts 의 classifyAttendance 와 같은 규칙).
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

  const memberById = new Map(members.map((m) => [m.id, m]));

  // status 를 본다. 행이 있어도 absent 는 참석이 아니고, 논문을 올렸어도
  // absent 가 우선한다 (lib/report.ts 의 classifyAttendance 와 같은 규칙).
  const present = new Set(
    attendance.filter((a) => a.status !== "absent").map((a) => a.member_id)
  );
  const absent = new Set(
    attendance.filter((a) => a.status === "absent").map((a) => a.member_id)
  );

  return [...new Set([...byMember.keys(), ...present])]
    .filter((id) => !absent.has(id))
    .map((memberId) => ({
      member: memberById.get(memberId)!,
      papers: byMember.get(memberId) ?? [],
      attended: present.has(memberId),
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

/** 그 차시에 등록된 논문 전체(등록자 무관). 보고서의 참석/불참 분류와 논문 목록에 쓴다. */
export async function fetchPapersBySession(sessionId: string): Promise<Paper[]> {
  const { data, error } = await supabase
    .from("papers")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as Paper[];
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
  category: string;
  published_year: number | null;
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

/**
 * 한 차시의 "수집한 문장" — 그 차시에 등록된 논문들의 하이라이트 중
 * purpose 가 붙은 것만. 논문마다 따로 조회하지 않고 id 를 모아 한 번에 읽는다.
 */
export async function fetchSessionHighlights(
  sessionId: string
): Promise<Highlight[]> {
  const { data: papers, error: pErr } = await supabase
    .from("papers")
    .select("id")
    .eq("session_id", sessionId);
  if (pErr) throw pErr;

  const ids = (papers ?? []).map((p) => (p as { id: string }).id);
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from("highlights")
    .select("*")
    .in("paper_id", ids)
    .neq("purpose", "")
    .order("created_at", { ascending: true });
  if (error) {
    // 마이그레이션 전이면 purpose 컬럼이 없다. fetchAttendance 와 같이
    // 경고만 남기고 빈 목록으로 처리해 나머지 화면은 그대로 돌게 한다.
    console.warn("수집 문장을 불러오지 못했습니다(마이그레이션 미실행?)", error.message);
    return [];
  }
  return (data ?? []) as Highlight[];
}

export interface NewHighlightInput {
  paper_id: string;
  member_id: string | null;
  text: string;
  position: Highlight["position"];
  note: string;
  /** lib/highlightColors.ts 의 key */
  color: string;
  /** 수집 용도. 빈 문자열이면 개인 하이라이트 (lib/highlightPurposes.ts) */
  purpose: string;
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
  input: { note: string; color: string; purpose: string }
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

// ---------- 멤버 기준 조회 ----------
/** 그 사람이 쓴 한줄평 전체 (차시별로 최대 1개) */
export async function fetchReviewsByMember(memberId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from("reviews")
    .select("*")
    .eq("member_id", memberId);
  if (error) throw error;
  return (data ?? []) as Review[];
}

/**
 * 그 사람이 참여한 차시 id 집합.
 * 참여 = 그 차시에 논문을 등록했거나(자동), present 로 체크했거나(수동).
 * absent 로 선언한 행은 참여가 아니다 — 불참을 밝힌 차시가 "내 참여만" 에
 * 섞이지 않도록 status 를 보고 거른다.
 * 세션마다 조회하지 않도록 두 방향을 각각 한 번씩만 읽는다.
 * 출석 테이블은 아직 없을 수 있으므로, 실패하면 논문 기준만으로 계산한다.
 */
export async function fetchMemberSessionIds(
  memberId: string
): Promise<Set<string>> {
  const [papersRes, attRes] = await Promise.all([
    supabase
      .from("papers")
      .select("session_id")
      .eq("added_by", memberId)
      .not("session_id", "is", null),
    // status 는 뒤(add-report-2026-09-09.sql)에 붙은 컬럼이라 이름으로 집어
    // 고르면 마이그레이션 전에는 조회 자체가 실패한다. "*" 로 읽고 걸러낸다.
    supabase
      .from("session_attendees")
      .select("*")
      .eq("member_id", memberId),
  ]);
  if (papersRes.error) throw papersRes.error;
  if (attRes.error) {
    console.warn(
      "출석 정보를 불러오지 못했습니다(테이블 미생성?)",
      attRes.error.message
    );
  }

  const ids = new Set<string>();
  for (const r of (papersRes.data ?? []) as { session_id: string | null }[]) {
    if (r.session_id) ids.add(r.session_id);
  }
  // 마이그레이션 전에는 status 가 없어 undefined 다 — 그때는 지금까지처럼
  // 행이 있으면 참여로 센다(=== "present" 로 보면 전부 빠져 버린다).
  for (const r of (attRes.data ?? []) as { session_id: string; status?: string }[]) {
    if (r.status !== "absent") ids.add(r.session_id);
  }
  return ids;
}
