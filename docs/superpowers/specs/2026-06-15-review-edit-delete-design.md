# 한줄평 추가·수정·삭제 설계

날짜: 2026-06-15

## 배경

`Paper-AIDetox` 웹앱은 홈(`/`)과 세션 상세(`/sessions/[id]`) 페이지에서
"최근 스터디" 카드(`SessionReadingsCard`)를 통해 각 멤버가 읽은 논문과
**한줄평(Review)**을 보여준다.

현재는 한줄평이 **추가(생성)만** 가능하다. 한 번 작성하면 읽기 전용으로만
펼쳐 볼 수 있고, **수정·삭제 기능이 없다**. 작성 권한도 제어가 없어
누구나 아무 멤버 칸에 한줄평을 추가할 수 있다.

## 목표

한줄평을 **추가·수정·삭제** 가능하게 한다. 세 동작 모두
**작성자 본인만** 수행할 수 있다. "본인"은 앱이 localStorage에 보관하는
현재 선택된 멤버(`currentMemberId`)가 해당 행의 멤버와 일치하는 경우다.

## 비목표 (YAGNI)

- 인증/로그인 시스템 (앱은 localStorage 기반 소프트 식별을 그대로 사용)
- Supabase RLS 정책 변경 (이미 anon 공개, 권한은 UI에서 제어)
- 멤버당 여러 한줄평 (스키마의 `(session_id, member_id)` 유니크 제약 유지 →
  멤버당 세션별 1개)
- 한줄평 작성 이력/감사 로그

## 데이터 모델

변경 없음. 기존 `reviews` 테이블을 그대로 사용한다.

```
reviews(id, session_id, member_id, text, created_at)
unique(session_id, member_id)
```

## 컴포넌트별 변경

### 1. `lib/db.ts` — DB 함수 2개 추가

`createReview`는 이미 존재한다. 다음 두 함수를 추가한다.

- `updateReview(id: string, text: string): Promise<Review>`
  - `reviews` 테이블에서 `id` 행의 `text`를 갱신하고 갱신된 행을 반환.
- `deleteReview(id: string): Promise<void>`
  - `reviews` 테이블에서 `id` 행을 삭제.

### 2. `components/SessionReadingsCard.tsx` — 상태 모델 정리 + 권한 + UI

**상태 모델**: 현재는 서버 `reviews` prop과 `localReviews`(추가분만 누적)를
`byMember` Map으로 병합한다. 수정·삭제를 반영하려면 단일 소스가 필요하다.

- 멤버별 한줄평을 담는 `reviewMap` 상태(`Map<member_id, Review>`)를 둔다.
- `reviews` prop으로 초기화하고, prop이 바뀌면 동기화한다(useEffect).
- 추가/수정 → 해당 member_id 항목을 set, 삭제 → 항목을 delete.

**권한**: `useCurrentMemberId()`로 현재 사용자 id를 읽어
`canEdit = currentMemberId === memberId`를 각 행에 전달한다.

**`MemberReadingRow` UI**:

- **추가**: `canEdit && !review`일 때만 `＋ 한줄평` 버튼 노출(기존엔 항상 노출).
  본인이 아니면 버튼 없음.
- **읽기**: review가 있으면 `✓ 한줄평` 토글로 펼쳐 본다(본인/타인 공통).
- **수정**: 펼친 패널에서 `canEdit`이면 **수정** 버튼 → textarea 프리필 →
  `updateReview`로 저장 → `reviewMap` 갱신.
- **삭제**: `canEdit`이면 **삭제** 버튼 → `confirm()` 확인 →
  `deleteReview` → `reviewMap`에서 제거 → 패널 닫힘, `＋ 한줄평` 복귀.
- 타인의 한줄평: 지금처럼 읽기 전용(수정·삭제 버튼 없음).

상태가 추가·수정·삭제로 늘어나므로, 인라인 작성/수정 폼을
하나의 편집 상태(`editing`)로 통합해 add와 edit가 같은 textarea 폼을
재사용하도록 정리한다.

## 에러 처리

- `updateReview`/`deleteReview` 실패 시 해당 폼에 한국어 에러 메시지 표시
  (기존 `createReview` 패턴과 동일). 실패하면 로컬 상태는 되돌린다(낙관적
  갱신을 쓰지 않고, 성공 후에만 상태를 반영).
- 삭제는 `confirm()`으로 실수 방지.

## 테스트

- 자동화 테스트 인프라가 없는 프로젝트이므로, 수동 검증으로 확인한다:
  1. 현재 사용자 = 멤버 A로 설정 → A 칸에 추가/수정/삭제 동작.
  2. 현재 사용자 = 다른 멤버 → A의 한줄평은 읽기만, 버튼 없음.
  3. 삭제 후 `＋ 한줄평`이 다시 보이고 재작성 가능.
  4. 홈(`/`)과 세션 상세(`/sessions/[id]`) 양쪽에서 동일하게 동작.
