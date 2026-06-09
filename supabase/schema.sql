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

-- 논문(읽은/읽을) — 제목·저자는 PDF 링크에서 자동 취합 ----------
create table if not exists papers (
  id         uuid primary key default gen_random_uuid(),
  title      text not null default '',
  authors    text default '',
  pdf_url    text default '',
  added_by   uuid references members(id) on delete set null,
  status     text not null default 'toread' check (status in ('read', 'toread')),
  read_date  date,
  session_id uuid references sessions(id) on delete set null,
  created_at timestamptz default now()
);

-- 하이라이트 + 메모 (react-pdf-highlighter position JSON) -------
create table if not exists highlights (
  id         uuid primary key default gen_random_uuid(),
  paper_id   uuid references papers(id) on delete cascade,
  member_id  uuid references members(id) on delete set null,
  text       text default '',
  position   jsonb not null,
  note       text default '',
  color      text default 'yellow',
  created_at timestamptz default now()
);

-- 더 이상 사용하지 않는 테이블 정리(있으면 제거)
drop table if exists session_attendees cascade;

create index if not exists idx_papers_added_by on papers(added_by);
create index if not exists idx_papers_session  on papers(session_id);
create index if not exists idx_highlights_paper on highlights(paper_id);

-- ------------------------------------------------------------
-- RLS: 데모 단계 — anon 키로 읽기/쓰기 모두 허용
-- ------------------------------------------------------------
alter table members    enable row level security;
alter table sessions   enable row level security;
alter table papers     enable row level security;
alter table highlights enable row level security;

do $$
declare t text;
begin
  foreach t in array array['members','sessions','papers','highlights']
  loop
    execute format('drop policy if exists "public_all" on %I;', t);
    execute format('create policy "public_all" on %I for all using (true) with check (true);', t);
  end loop;
end $$;
