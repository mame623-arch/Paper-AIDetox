-- ============================================================
--  주간 스터디 보고서 — 컬럼 추가 (2026-09-09)
--  Supabase 대시보드 > SQL Editor 에 붙여넣고 실행하세요.
--  몇 번을 다시 실행해도 안전하며 데이터는 지워지지 않습니다.
-- ============================================================

-- 논문: arXiv 메타데이터 (분류 코드 원본과 발행연도)
alter table papers add column if not exists category       text default '';
alter table papers add column if not exists published_year int;

-- 출석: 불참을 명시적으로 선언할 수 있게 한다.
--  · 행이 없으면 여전히 "아직 응답 없음"
--  · 기존 행은 모두 참석 체크한 사람이므로 기본값 present 가 맞다
alter table session_attendees add column if not exists status text not null default 'present';
alter table session_attendees add column if not exists reason text default '';
alter table session_attendees drop constraint if exists session_attendees_status_check;
alter table session_attendees add constraint session_attendees_status_check
  check (status in ('present', 'absent'));

-- 하이라이트: 수집 용도. 값이 있으면 "수집한 문장", 비어 있으면 개인 하이라이트.
alter table highlights add column if not exists purpose text default '';
