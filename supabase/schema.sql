-- ============================================================
--  논문 AI 디톡스 스터디 — Supabase 스키마 (구조만)
--  Supabase 대시보드 > SQL Editor 에 붙여넣고 실행하세요.
--  언제 다시 실행해도 안전합니다(데이터 유지). 초기 멤버/일정은 seed.sql 참고.
-- ============================================================

create extension if not exists "pgcrypto";

-- 스터디원 -----------------------------------------------------
create table if not exists members (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  role       text default '',
  sort       int  default 0,
  created_at timestamptz default now()
);
-- 기존(구버전) members 테이블이 이미 있을 때 컬럼 보강
alter table members add column if not exists role text default '';
alter table members add column if not exists sort int default 0;
create unique index if not exists members_name_key on members(name);

-- 스터디 일정(캘린더) — 시간·장소 포함 --------------------------
create table if not exists sessions (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  time       text default '',
  location   text default '',
  title      text default '',
  created_at timestamptz default now()
);
-- 기존(구버전)에서 올라오는 경우를 위한 컬럼 보강
alter table sessions add column if not exists time     text default '';
alter table sessions add column if not exists location text default '';

-- 논문(읽은/읽을) — 제목·저자는 등록자가 직접 입력 ----------------
create table if not exists papers (
  id         uuid primary key default gen_random_uuid(),
  title      text not null default '',
  authors    text default '',
  pdf_url    text default '',
  added_by   uuid references members(id) on delete set null,
  status     text not null default 'toread' check (status in ('read', 'toread')),
  read_date  date,
  session_id uuid references sessions(id) on delete set null,
  category   text default '',
  published_year int,
  created_at timestamptz default now()
);
-- 기존(구버전)에서 올라오는 경우를 위한 컬럼 보강
alter table papers add column if not exists category       text default '';
alter table papers add column if not exists published_year int;

-- 하이라이트 + 메모 (react-pdf-highlighter position JSON) -------
--  color: 하이라이트 색(yellow/green/blue/pink/purple)
--  position.rects 가 비어 있으면 '영역(area)' 하이라이트
create table if not exists highlights (
  id         uuid primary key default gen_random_uuid(),
  paper_id   uuid references papers(id) on delete cascade,
  member_id  uuid references members(id) on delete set null,
  text       text default '',
  position   jsonb not null,
  note       text default '',
  color      text default 'yellow',
  purpose    text default '',
  created_at timestamptz default now()
);
-- 기존(구버전)에서 올라오는 경우를 위한 컬럼 보강
alter table highlights add column if not exists purpose text default '';

-- 한줄평(소감) — 세션별·멤버별 한 번만 ---------------------------
create table if not exists reviews (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  member_id  uuid references members(id) on delete cascade,
  text       text default '',
  created_at timestamptz default now()
);
create unique index if not exists reviews_session_member_key
  on reviews(session_id, member_id);

-- 출석 — 논문을 올리지 않고 참석만 한 사람도 기록 --------------
--  · 논문을 올린 사람은 papers.session_id 로 자동 참석 처리
--  · 이 표는 "논문 없이 참석" 을 포함한 명시적 출석 체크
create table if not exists session_attendees (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid references sessions(id) on delete cascade,
  member_id  uuid references members(id)  on delete cascade,
  status     text not null default 'present' check (status in ('present', 'absent')),
  reason     text default '',
  created_at timestamptz default now()
);
create unique index if not exists session_attendees_session_member_key
  on session_attendees(session_id, member_id);
-- 기존(구버전)에서 올라오는 경우를 위한 컬럼 보강
alter table session_attendees add column if not exists status text not null default 'present';
alter table session_attendees add column if not exists reason text default '';
alter table session_attendees drop constraint if exists session_attendees_status_check;
alter table session_attendees add constraint session_attendees_status_check
  check (status in ('present', 'absent'));

create index if not exists idx_papers_added_by on papers(added_by);
create index if not exists idx_papers_session  on papers(session_id);
create index if not exists idx_highlights_paper on highlights(paper_id);
create index if not exists idx_reviews_session  on reviews(session_id);
create index if not exists idx_attendees_session on session_attendees(session_id);

-- ------------------------------------------------------------
-- RLS: 데모 단계 — anon 키로 읽기/쓰기 모두 허용
-- ------------------------------------------------------------
alter table members    enable row level security;
alter table sessions   enable row level security;
alter table papers     enable row level security;
alter table highlights enable row level security;
alter table reviews    enable row level security;
alter table session_attendees enable row level security;

do $$
declare t text;
begin
  foreach t in array array['members','sessions','papers','highlights','reviews','session_attendees']
  loop
    execute format('drop policy if exists "public_all" on %I;', t);
    execute format('create policy "public_all" on %I for all using (true) with check (true);', t);
  end loop;
end $$;
