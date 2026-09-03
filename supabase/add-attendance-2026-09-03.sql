-- ============================================================
--  출석(참석) 기록 추가 — 2026-09-03
--  Supabase 대시보드 > SQL Editor 에 붙여넣고 실행하세요.
--  기존 데이터(멤버·논문·한줄평·하이라이트·일정)를 지우지 않습니다.
--  여러 번 실행해도 안전합니다(멱등).
--
--  홈 "최근 스터디"의 참석자 표시 기준
--   1) 그 세션에 논문을 등록한 사람  → 자동으로 참석
--   2) 논문을 안 올렸어도 이 표에 체크된 사람 → 참석
-- ============================================================

create extension if not exists "pgcrypto";

create table if not exists session_attendees (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  member_id  uuid references members(id)  on delete cascade,
  created_at timestamptz default now()
);

create unique index if not exists session_attendees_session_member_key
  on session_attendees(session_id, member_id);
create index if not exists idx_attendees_session on session_attendees(session_id);

alter table session_attendees enable row level security;
drop policy if exists "public_all" on session_attendees;
create policy "public_all" on session_attendees for all using (true) with check (true);
