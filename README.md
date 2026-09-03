# 논문 AI 디톡스 스터디

AI 없이 논문/글을 읽고, 좋은 표현·문단 구조·논리 연결을 직접 파악하기 위한 스터디용 웹앱.
스터디원 전원이 같은 vercel.app 링크에서 기록을 **공유**합니다.
UI는 레퍼런스(dami-safeagent)의 디자인 토큰(흰 배경 · `#f6f7f9` 사이드바 · `#2f6df6` 파랑 · Pretendard)을 그대로 따랐습니다.

## 기능 / 페이지

| 경로 | 설명 |
| --- | --- |
| `/` (홈) | **최근 스터디 + 예정 스터디** 2개를 표시. 최근 스터디는 **참석자 수 + 참석자 목록**을 보여줍니다(논문 등록 = 자동 참석, 논문을 안 올렸으면 **＋ 나도 참석** 으로 체크). 멤버 클릭 → 개인 페이지, 논문 클릭 → 해당 논문 페이지 |
| `/members` (멤버 목록) | 전체 멤버 카드. 클릭 시 개인 페이지로 |
| `/members/[id]` (개인) | 본인이 읽은/읽을 논문을 **추가·편집(제목·저자·링크)·상태변경·삭제** + **내 논문 검색** |
| `/members/[id]/papers/[paperId]` (세부 논문) | PDF 뷰어 + 문장/**영역** 하이라이트 + 메모. 하이라이트는 **5가지 색**으로 구분하고, 오른쪽 메모 패널은 **토글**됩니다. 멤버 페이지 안에서만 진입 |
| `/calendar` (캘린더) | 월 달력 + 일정(날짜·시간·장소·제목) 추가/삭제 → 홈의 최근/예정 스터디에 반영 |
| `/api/pdf` | 외부 PDF를 동일 출처로 스트리밍하는 프록시 (pdf.js CORS 우회) |

> 제목·저자는 **직접 입력**합니다. (PDF에서 자동 추출하던 기능은 정확도가 낮아 제거했고,
> 대신 등록 후 언제든 **편집**으로 제목·저자·링크를 고칠 수 있습니다.)
> 왼쪽 사이드바는 « / » 버튼으로 접었다 펼 수 있습니다(선택은 브라우저에 저장).

## 기술 스택

- **Next.js 14 (App Router) + TypeScript** — 실제 URL 라우팅, Vercel 네이티브
- **Tailwind CSS** — 사이드바 + 카드 기반의 차분한 UI
- **Supabase** — 공유 DB(멤버/세션/논문/하이라이트/한줄평/출석)
- **react-pdf-highlighter** (pdfjs-dist) — PDF 뷰어 + 하이라이트 + 메모

---

## 1. Supabase 설정

1. <https://supabase.com> 에서 프로젝트를 1개 생성합니다.
2. 대시보드 좌측 **SQL Editor** → New query 에 **`supabase/schema.sql`** 를 붙여넣고 **Run**
   (members/sessions/papers/highlights/reviews/session_attendees + 공개 정책 생성.
   언제 다시 실행해도 안전하며 데이터는 지워지지 않습니다).
3. 이어서 **`supabase/seed.sql`** 을 **Run** — 실제 멤버 10명(김민석·김민준·김윤지·이거루·
   이윤석·이하늘·장윤영·정승원·정승현·정지우)과 예시 일정/논문을 채웁니다.
   - ⚠️ seed.sql 은 기존 데이터를 비우고 다시 채우므로 **초기 1회/초기화 시에만** 실행하세요.
4. **이미 쓰고 있던 DB라면** `supabase/schema.sql` 을 다시 Run 하거나,
   출석 표만 추가하는 **`supabase/add-attendance-2026-09-03.sql`** 을 Run 하세요
   (기존 데이터를 지우지 않습니다). 이 표가 있어야 홈의 **참석 체크**가 동작합니다.
5. 대시보드 **Project Settings → API** 에서 다음 두 값을 복사합니다.
   - `Project URL`
   - `anon` `public` key

## 2. 로컬 실행

```bash
# 1) 환경변수 파일 생성
cp .env.example .env.local
#    .env.local 에 위에서 복사한 두 값을 붙여넣기
#    NEXT_PUBLIC_SUPABASE_URL=...
#    NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# 2) 의존성 설치 & 실행
npm install
npm run dev
```

브라우저에서 <http://localhost:3000> 접속.
키가 없으면 상단에 "Supabase 미설정" 안내가 표시됩니다.

### 사용법

1. **왼쪽 사이드바 "나"** 에서 본인 이름을 고릅니다 (localStorage 저장).
   사이드바가 거슬리면 **«** 로 접고, 왼쪽 끝 **»** 로 다시 폅니다.
2. 멤버(홈/멤버 목록)를 클릭 → 개인 페이지에서 **＋ 논문 기록 추가** →
   **제목**(필수) · 저자 · PDF 링크 + 상태/일정 선택.
   잘못 넣었으면 목록의 **편집** 으로 제목·저자·링크를 고칩니다.
3. 논문을 클릭 → PDF 뷰어에서 **문장을 드래그** → **색 선택 + 메모** → 저장.
   - 그림·표 같은 **영역**은 왼쪽 위 **□ 영역 선택** 을 켜고 드래그(또는 **Alt + 드래그**).
   - 상단 **메모** 버튼으로 오른쪽 패널을 열고 닫습니다(작은 화면은 기본으로 닫힘).
   - 패널에서 하이라이트를 클릭하면 해당 위치로 스크롤되고, 색 점을 눌러 색을 바꿉니다.
4. **캘린더**에서 일정을 추가하면 홈의 최근/예정 스터디에 자동 반영됩니다.
5. 홈 **최근 스터디**에서 참석을 확인합니다. 그 차시에 논문을 등록했으면 자동으로 참석,
   논문 없이 왔으면 **＋ 나도 참석** 을 눌러 체크합니다.

## 3. Vercel 배포 (GitHub 연동)

```bash
# GitHub 새 repo 생성 후
git add -A
git commit -m "feat: AI 디톡스 스터디 웹앱"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

1. <https://vercel.com/new> 에서 위 GitHub repo를 **Import**.
2. **Environment Variables** 에 `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` 두 개를 등록.
3. **Deploy** → 이후 `main` 에 push할 때마다 자동 재배포됩니다.

배포되면 `https://<프로젝트>.vercel.app` 링크를 스터디원과 공유하면 됩니다.

---

## 참고 / 한계

- 식별은 비밀번호 없는 **이름 선택** 방식입니다(소규모 신뢰 그룹 기준).
  추후 PIN/Auth로 강화하려면 `supabase/schema.sql` 의 RLS 정책을 좁히세요.
- PDF는 **외부 링크 입력** 방식이며, 일부 사이트는 임베드를 제한할 수 있습니다.
  대부분의 arXiv PDF(`https://arxiv.org/pdf/<id>`)는 정상 동작합니다.
