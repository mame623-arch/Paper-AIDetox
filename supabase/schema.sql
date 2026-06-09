-- ============================================================
--  논문 AI 디톡스 스터디 — Supabase 스키마
--  Supabase 대시보드 > SQL Editor 에 그대로 붙여넣고 실행하세요.
--  (이미 실행한 적이 있다면 아래 drop 주석을 풀어 초기화할 수 있습니다.)
-- ============================================================

-- drop table if exists highlights cascade;
-- drop table if exists session_attendees cascade;
-- drop table if exists papers cascade;
-- drop table if exists sessions cascade;
-- drop table if exists members cascade;

create extension if not exists "pgcrypto";

-- 스터디원 -----------------------------------------------------
create table if not exists members (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  emoji      text default '🙂',
  role       text default '',
  created_at timestamptz default now()
);

-- 스터디 세션(매주 목 10–12시) --------------------------------
create table if not exists sessions (
  id         uuid primary key default gen_random_uuid(),
  date       date not null,
  title      text default '',
  created_at timestamptz default now()
);

-- 세션 참석자(누가 왔는지) ------------------------------------
create table if not exists session_attendees (
  session_id uuid references sessions(id) on delete cascade,
  member_id  uuid references members(id) on delete cascade,
  primary key (session_id, member_id)
);

-- 논문(읽은/읽을) --------------------------------------------
create table if not exists papers (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  authors    text default '',
  pdf_url    text default '',
  added_by   uuid references members(id) on delete set null,
  status     text not null default 'toread' check (status in ('read', 'toread')),
  read_date  date,
  session_id uuid references sessions(id) on delete set null,
  created_at timestamptz default now()
);

-- 하이라이트 + 메모 (react-pdf-highlighter position JSON 저장) --
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

create index if not exists idx_papers_added_by on papers(added_by);
create index if not exists idx_papers_session on papers(session_id);
create index if not exists idx_highlights_paper on highlights(paper_id);

-- ------------------------------------------------------------
-- RLS: 데모 단계 — anon 키로 읽기/쓰기 모두 허용
-- (추후 PIN/Auth 도입 시 정책을 좁히세요)
-- ------------------------------------------------------------
alter table members           enable row level security;
alter table sessions          enable row level security;
alter table session_attendees enable row level security;
alter table papers            enable row level security;
alter table highlights        enable row level security;

do $$
declare t text;
begin
  foreach t in array array['members','sessions','session_attendees','papers','highlights']
  loop
    execute format('drop policy if exists "public_all" on %I;', t);
    execute format('create policy "public_all" on %I for all using (true) with check (true);', t);
  end loop;
end $$;

-- ------------------------------------------------------------
-- 시드 데이터 (이름/날짜는 자유롭게 수정하세요)
-- ------------------------------------------------------------
insert into members (name, emoji, role) values
  ('다미', '🦊', '진행'),
  ('하늘', '🌿', '스터디원'),
  ('지우', '📘', '스터디원'),
  ('민준', '☕', '스터디원')
on conflict do nothing;

-- 첫 세션 (가장 최근 목요일 예시: 2026-06-11) + 전원 필참
insert into sessions (date, title) values
  ('2026-06-11', '1주차 — 전원 필참')
on conflict do nothing;

-- 전원 참석 처리
insert into session_attendees (session_id, member_id)
select s.id, m.id
from sessions s cross join members m
where s.date = '2026-06-11'
on conflict do nothing;

-- 예시 논문 1편 (Attention Is All You Need) — 다미가 1주차에 읽음
insert into papers (title, authors, pdf_url, added_by, status, read_date, session_id)
select
  'Attention Is All You Need',
  'Vaswani et al., 2017',
  'https://arxiv.org/pdf/1706.03762',
  m.id, 'read', '2026-06-11', s.id
from members m, sessions s
where m.name = '다미' and s.date = '2026-06-11'
on conflict do nothing;
