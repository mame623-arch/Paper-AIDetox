"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Member, Paper, Session, SessionAttendee } from "@/lib/types";
import {
  fetchLatestSession,
  fetchMembers,
  fetchRecentPapers,
  fetchSessionAttendees,
} from "@/lib/db";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  Card,
  EmojiAvatar,
  SectionTitle,
  StatusBadge,
  formatDate,
} from "@/components/ui";

export default function HomePage() {
  const [session, setSession] = useState<Session | null>(null);
  const [attendees, setAttendees] = useState<SessionAttendee[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [recent, setRecent] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [s, ms, rp] = await Promise.all([
          fetchLatestSession(),
          fetchMembers(),
          fetchRecentPapers(10),
        ]);
        setSession(s);
        setMembers(ms);
        setRecent(rp);
        if (s) setAttendees(await fetchSessionAttendees(s.id));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const memberName = (id: string | null) =>
    members.find((m) => m.id === id)?.name ?? "—";

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8">
      {/* 인트로 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink">인공지능 없이 읽기 📚</h1>
        <p className="mt-1 text-sm text-muted">
          AI 없이 논문/글을 읽고, 좋은 표현과 문단 구조를 직접 파악합니다.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-muted">불러오는 중…</div>
      ) : (
        <div className="space-y-8">
          {/* 가장 최근 스터디 */}
          <section>
            <SectionTitle hint={session ? formatDate(session.date) : undefined}>
              가장 최근 스터디
            </SectionTitle>
            <Card>
              {session ? (
                <>
                  <div className="mb-4 flex items-center gap-2">
                    <span className="text-lg">🗓️</span>
                    <span className="font-medium text-ink">
                      {formatDate(session.date)}
                    </span>
                    {session.title && (
                      <span className="rounded-full bg-[#f1f0ee] px-2 py-0.5 text-xs text-[#5f5e5b]">
                        {session.title}
                      </span>
                    )}
                  </div>

                  {attendees.length === 0 ? (
                    <p className="text-sm text-muted">참석 기록이 없습니다.</p>
                  ) : (
                    <ul className="divide-y divide-line">
                      {attendees.map(({ member, papers }) => (
                        <li
                          key={member.id}
                          className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
                        >
                          <Link href={`/members/${member.id}`}>
                            <EmojiAvatar emoji={member.emoji} />
                          </Link>
                          <div className="min-w-0 flex-1">
                            <Link
                              href={`/members/${member.id}`}
                              className="font-medium text-ink hover:underline"
                            >
                              {member.name}
                            </Link>
                            {member.role && (
                              <span className="ml-2 text-xs text-muted">
                                {member.role}
                              </span>
                            )}
                            <div className="mt-1 space-y-1">
                              {papers.length === 0 ? (
                                <span className="text-sm text-muted">
                                  읽은 논문 기록 없음
                                </span>
                              ) : (
                                papers.map((p) => (
                                  <Link
                                    key={p.id}
                                    href={`/papers/${p.id}`}
                                    className="block text-sm text-[#5f5e5b] hover:text-ink hover:underline"
                                  >
                                    📄 {p.title}
                                  </Link>
                                ))
                              )}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="text-sm text-muted">아직 등록된 세션이 없습니다.</p>
              )}
            </Card>
          </section>

          {/* 멤버 */}
          <section id="members" className="scroll-mt-20">
            <SectionTitle hint={`${members.length}명`}>멤버</SectionTitle>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {members.map((m) => (
                <Link key={m.id} href={`/members/${m.id}`}>
                  <Card className="flex flex-col items-center gap-2 p-4 text-center transition hover:border-[#d6d5d2] hover:bg-[#faf9f8]">
                    <EmojiAvatar emoji={m.emoji} size={48} />
                    <div className="font-medium text-ink">{m.name}</div>
                    {m.role && (
                      <div className="text-xs text-muted">{m.role}</div>
                    )}
                  </Card>
                </Link>
              ))}
            </div>
          </section>

          {/* 최근 읽은 논문 */}
          <section id="papers" className="scroll-mt-20">
            <SectionTitle>최근 논문</SectionTitle>
            <Card className="p-0">
              {recent.length === 0 ? (
                <p className="p-5 text-sm text-muted">아직 논문이 없습니다.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {recent.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/papers/${p.id}`}
                        className="flex items-center gap-3 px-5 py-3 hover:bg-[#faf9f8]"
                      >
                        <span className="text-lg">📄</span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-medium text-ink">
                            {p.title}
                          </div>
                          <div className="truncate text-xs text-muted">
                            {p.authors || "저자 미상"} · {memberName(p.added_by)}
                            {p.read_date ? ` · ${formatDate(p.read_date)}` : ""}
                          </div>
                        </div>
                        <StatusBadge status={p.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </section>
        </div>
      )}
    </div>
  );
}
