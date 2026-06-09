import { supabase } from "./supabase";
import type {
  AttendeeReadings,
  Highlight,
  Member,
  Paper,
  PaperStatus,
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

/** 세션에서 다룬 논문을 멤버별로 묶어 "누가 어떤 논문" 뷰를 만든다. */
export async function fetchSessionReadings(
  sessionId: string,
  members: Member[]
): Promise<AttendeeReadings[]> {
  const { data, error } = await supabase
    .from("papers")
    .select("*")
    .eq("session_id", sessionId);
  if (error) throw error;

  const byMember = new Map<string, Paper[]>();
  for (const p of (data ?? []) as Paper[]) {
    if (!p.added_by) continue;
    const list = byMember.get(p.added_by) ?? [];
    list.push(p);
    byMember.set(p.added_by, list);
  }

  const memberById = new Map(members.map((m) => [m.id, m]));
  return [...byMember.entries()]
    .map(([memberId, papers]) => ({
      member: memberById.get(memberId)!,
      papers,
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
  color?: string;
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

export async function deleteHighlight(id: string): Promise<void> {
  const { error } = await supabase.from("highlights").delete().eq("id", id);
  if (error) throw error;
}

// ---------- paper metadata (auto-fetch) ----------
export interface PaperMeta {
  title: string;
  authors: string;
  source: string;
}

export async function fetchPaperMeta(url: string): Promise<PaperMeta> {
  const res = await fetch(`/api/paper-meta?url=${encodeURIComponent(url)}`);
  if (!res.ok) throw new Error("metadata fetch failed");
  return (await res.json()) as PaperMeta;
}
