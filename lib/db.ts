import { supabase } from "./supabase";
import type {
  Highlight,
  Member,
  Paper,
  PaperStatus,
  Session,
  SessionAttendee,
} from "./types";

// ---------- members ----------
export async function fetchMembers(): Promise<Member[]> {
  const { data, error } = await supabase
    .from("members")
    .select("*")
    .order("created_at", { ascending: true });
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
export async function fetchLatestSession(): Promise<Session | null> {
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .order("date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as Session | null;
}

/** Build the "who came + what they read" view for a given session. */
export async function fetchSessionAttendees(
  sessionId: string
): Promise<SessionAttendee[]> {
  const [{ data: rows, error: e1 }, { data: papers, error: e2 }] =
    await Promise.all([
      supabase
        .from("session_attendees")
        .select("member:members(*)")
        .eq("session_id", sessionId),
      supabase.from("papers").select("*").eq("session_id", sessionId),
    ]);
  if (e1) throw e1;
  if (e2) throw e2;

  const papersByMember = new Map<string, Paper[]>();
  for (const p of (papers ?? []) as Paper[]) {
    if (!p.added_by) continue;
    const list = papersByMember.get(p.added_by) ?? [];
    list.push(p);
    papersByMember.set(p.added_by, list);
  }

  return ((rows ?? []) as unknown as { member: Member }[])
    .map((r) => r.member)
    .filter(Boolean)
    .map((member) => ({
      member,
      papers: papersByMember.get(member.id) ?? [],
    }));
}

// ---------- papers ----------
export async function fetchRecentPapers(limit = 12): Promise<Paper[]> {
  const { data, error } = await supabase
    .from("papers")
    .select("*")
    .order("read_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as Paper[];
}

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

export async function updateHighlightNote(
  id: string,
  note: string
): Promise<void> {
  const { error } = await supabase
    .from("highlights")
    .update({ note })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteHighlight(id: string): Promise<void> {
  const { error } = await supabase.from("highlights").delete().eq("id", id);
  if (error) throw error;
}
