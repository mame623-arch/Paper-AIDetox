-- ============================================================
--  초기 데이터(시드) — 실제 멤버 + 예시 일정/논문
--  ⚠️ 이 스크립트는 기존 데이터를 모두 지우고 다시 채웁니다.
--     최초 1회(또는 초기화하고 싶을 때)만 실행하세요.
--  schema.sql 을 먼저 실행한 뒤 이 파일을 실행합니다.
-- ============================================================

truncate table reviews, highlights, papers, sessions, members restart identity cascade;

-- 스터디원 (요청한 순서대로) ----------------------------------
insert into members (name, sort) values
  ('김민석', 1),
  ('김윤지', 2),
  ('이거루', 3),
  ('이윤석', 4),
  ('이하늘', 5),
  ('정승원', 6),
  ('정승현', 7),
  ('정지우', 8);

-- 일정: 최근(지난) 스터디 + 예정 스터디 -----------------------
insert into sessions (date, time, location, title) values
  ('2026-06-04', '10:00–12:00', '세미나실 A', '1주차 — 전원 필참'),
  ('2026-06-11', '10:00–12:00', '세미나실 A', '2주차 — 전원 필참');

-- 예시 논문 ---------------------------------------------------
-- 정지우: 지난 스터디에서 읽음
insert into papers (title, authors, pdf_url, added_by, status, read_date, session_id)
select 'Attention Is All You Need',
       'Ashish Vaswani 외',
       'https://arxiv.org/pdf/1706.03762',
       m.id, 'read', '2026-06-04', s.id
from members m, sessions s
where m.name = '정지우' and s.date = '2026-06-04';

-- 이하늘: 다음 스터디에서 읽을 예정
insert into papers (title, authors, pdf_url, added_by, status, read_date, session_id)
select 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding',
       'Jacob Devlin 외',
       'https://arxiv.org/pdf/1810.04805',
       m.id, 'toread', null, s.id
from members m, sessions s
where m.name = '이하늘' and s.date = '2026-06-11';
