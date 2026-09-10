import type { ReactNode } from "react";

/**
 * 사용법 안내. 데이터를 읽지 않는 정적 페이지다 — 로딩도 빈 상태도 없다.
 *
 * 구성은 기능 목록이 아니라 **실제로 쓰는 순서**다. 처음 보는 사람이 위에서부터
 * 읽으면 한 바퀴가 되고, 나중에 특정 화면만 다시 볼 사람은 그 절만 보면 된다.
 */
export const metadata = { title: "도움말 · 논문 AI 디톡스 스터디" };

function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accentsoft text-[0.7rem] font-bold text-accent">
        {n}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </li>
  );
}

function Steps({ children }: { children: ReactNode }) {
  return <ol className="mt-3 space-y-2 text-sm text-body">{children}</ol>;
}

/** 한 화면에 대한 절. `where` 는 그 화면에 어떻게 가는지다. */
function Screen({
  title,
  where,
  children,
}: {
  title: string;
  /** 그 화면에 어떻게 가는지. 특정 화면에 매이지 않는 절은 생략한다 */
  where?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-bg p-5">
      <h2 className="text-base font-bold text-ink">{title}</h2>
      {where ? <p className="mt-1 text-[0.82rem] text-faint">{where}</p> : null}
      {children}
    </section>
  );
}

/** 본문 안에서 강조하는 짧은 조각 — 버튼 이름이나 화면의 라벨. */
function K({ children }: { children: ReactNode }) {
  return (
    <span className="rounded border border-line bg-surface px-1.5 py-0.5 text-[0.78rem] font-medium text-ink">
      {children}
    </span>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 rounded-lg border border-line bg-surface px-3 py-2 text-[0.82rem] text-muted">
      {children}
    </p>
  );
}

export default function HelpPage() {
  return (
    <div className="mx-auto max-w-[1100px] px-5 py-7 md:px-10">
      <h1>도움말</h1>
      <p className="mt-1 text-muted">
        화면마다 무엇을 어떻게 하는지 정리했습니다. 쓰는 순서대로 적었습니다.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="space-y-4">
          <Screen title="0. 시작하기 전에 — 사이드바에서 내 이름 고르기" where="왼쪽 사이드바 위쪽">
            <p className="mt-3 text-sm text-body">
              <b>이걸 먼저 해야 나머지가 다 됩니다.</b> 이름을 고르지 않으면 어느
              화면에서도 논문을 등록하거나 고칠 수 없고, 편집·삭제 버튼 자체가
              보이지 않습니다.
            </p>
            <Steps>
              <Step n={1}>
                사이드바 위쪽 <K>나</K> 옆의 이름표 중에서 내 이름을 누릅니다.
              </Step>
              <Step n={2}>파랗게 표시되면 된 것입니다.</Step>
            </Steps>
            <Note>
              선택은 이 브라우저에만 저장됩니다. 다른 기기나 시크릿 창에서 열면
              다시 골라야 합니다. 로그인이 아니라서 비밀번호는 없습니다.
            </Note>
          </Screen>

          <Screen title="1. 이번 차시에 내 기록 남기기" where="홈, 또는 차시 보고서 화면">
            <Steps>
              <Step n={1}>
                예정 스터디 아래의 <K>＋ 이번 차시 기록</K> 을 누릅니다.
              </Step>
              <Step n={2}>
                읽을(또는 읽은) 논문이 있으면 <K>논문 등록</K>, 못 나가면{" "}
                <K>불참</K> 을 고릅니다.
              </Step>
              <Step n={3}>
                PDF 링크를 넣습니다. <b>arXiv 링크면 제목·저자·분야·발행연도가
                자동으로 채워집니다.</b> arXiv 가 아니면 안내가 뜨고, 그때는 직접
                채웁니다.
              </Step>
              <Step n={4}>
                상태를 고릅니다 — 아직 안 읽었으면 <K>읽을 예정</K>, 다 읽었으면{" "}
                <K>읽음</K>. 나중에 언제든 바꿀 수 있습니다.
              </Step>
            </Steps>
            <Note>
              <b>논문을 등록하면 그게 곧 참석입니다.</b> 참석을 따로 누르는 곳은
              없습니다. 불참은 사유를 같이 적을 수 있고, 나중에 <K>불참 취소</K> 로
              되돌릴 수 있습니다.
            </Note>
          </Screen>

          <Screen
            title="2. 논문 읽고 문장 수집하기"
            where="논문 제목을 누르면 열리는 PDF 화면"
          >
            <Steps>
              <Step n={1}>본문에서 남기고 싶은 문장을 드래그합니다.</Step>
              <Step n={2}>색을 고릅니다. 눈에 보이는 표시일 뿐입니다.</Step>
              <Step n={3}>
                <b>수집 용도를 고릅니다</b> — <K>좋은 표현</K> <K>문단 구조</K>{" "}
                <K>논리 연결</K>, 셋 다 아니면 <K>기타</K> 에 직접 적습니다.
              </Step>
              <Step n={4}>왜 골랐는지 메모를 남깁니다. 선택입니다.</Step>
            </Steps>
            <Note>
              <b>여기가 제일 중요합니다.</b> 수집 용도를 고른 문장만 주간 보고서와
              내 아카이브에 올라갑니다. 용도 없이 남긴 하이라이트는 나만 보는 개인
              표시로 남습니다 — 그것도 쓸모가 있지만, 스터디 기록으로는 잡히지
              않습니다.
            </Note>
            <Note>
              그림·표를 남기려면 위쪽 <K>영역 선택</K> 을 켜고 드래그합니다. 오른쪽
              메모 패널은 <K>메모</K> 버튼으로 접었다 펼 수 있고, 남긴 메모는 그
              패널에서 고칩니다.
            </Note>
          </Screen>

          <Screen
            title="3. 그 주에 다 같이 뭘 했나 보기"
            where="홈의 보고서 보기 →, 또는 캘린더에서 일정 클릭"
          >
            <p className="mt-3 text-sm text-body">
              차시마다 스터디원을 셋으로 나눠 보여줍니다.
            </p>
            <ul className="mt-3 space-y-1.5 text-sm text-body">
              <li>
                <K>참석자</K> — 그 차시에 논문을 등록한 사람
              </li>
              <li>
                <K>불참자</K> — 불참을 직접 표시한 사람
              </li>
              <li>
                <K>응답 없음</K> — 아직 아무것도 기록하지 않은 사람. 빠졌다는 뜻이
                아니라 <b>기록이 없다는 뜻</b>입니다
              </li>
            </ul>
            <p className="mt-3 text-sm text-body">
              참석자마다 <b>읽은 논문 · 한줄평 · 수집 문장</b>이 붙습니다. 아직 안
              남긴 항목은 <K>기록 전</K> 으로 표시됩니다.
            </p>
            <Note>
              지난 차시도 같은 화면의 <K>＋ 이번 차시 기록</K> 으로 나중에 채울 수
              있습니다. 깜빡한 주가 있으면 여기서 메우면 됩니다.
            </Note>
          </Screen>
        </div>

        <div className="space-y-4">
          <Screen title="4. 내가 쌓은 것 보기" where="사이드바 멤버 → 이름 클릭">
            <p className="mt-3 text-sm text-body">
              <K>기록</K> 탭에 읽은 논문이 최신순으로 서고, 논문마다 그 논문에서
              수집한 문장이 이유와 함께 붙습니다. 위쪽 용도 칩으로 걸러볼 수 있고,
              10편씩 넘어갑니다.
            </p>
            <p className="mt-3 text-sm text-body">
              오른쪽 차트 넷이 세는 단위가 서로 다릅니다:
            </p>
            <ul className="mt-2 space-y-1.5 text-sm text-body">
              <li>
                <K>분야</K> <K>발행연도</K> — <b>논문</b> 수
              </li>
              <li>
                <K>쌓인 문장</K> <K>용도</K> — <b>문장</b> 수
              </li>
            </ul>
            <Note>
              <K>쌓인 문장</K> 은 <b>논문을 읽은 날짜</b> 기준이고 <K>발행연도</K> 는{" "}
              <b>논문이 나온 해</b>입니다. 다른 축이라 서로 비교하면 안 됩니다.
            </Note>
            <p className="mt-3 text-sm text-body">
              제목·저자·PDF 링크·분야·발행연도는 논문 줄의 <K>편집</K> 으로 고칩니다.{" "}
              <K>↩︎ 예정</K> / <K>✓ 읽음</K> 으로 상태를 바꾸고, <K>✕</K> 로
              지웁니다.
            </p>
            <Note>
              남의 아카이브도 똑같이 다 보입니다. 다만 조작 버튼은 본인에게만
              보입니다. <K>읽기 경향</K> 탭은 아직 준비 중입니다.
            </Note>
          </Screen>

          <Screen title="5. 일정 추가하기" where="사이드바 캘린더">
            <Steps>
              <Step n={1}>
                <K>＋ 일정 추가</K> 로 날짜·시간·장소·차시 제목을 넣습니다.
              </Step>
              <Step n={2}>추가한 일정은 홈의 최근·예정 스터디에 바로 반영됩니다.</Step>
              <Step n={3}>
                오른쪽 위 <K>내 참여만</K> 을 켜면 내가 기록을 남긴 차시만 보입니다.
              </Step>
            </Steps>
          </Screen>

          <Screen title="자주 막히는 것">
            <dl className="mt-3 space-y-3 text-sm">
              <div>
                <dt className="font-semibold text-ink">편집·삭제 버튼이 안 보여요</dt>
                <dd className="mt-0.5 text-body">
                  사이드바에서 내 이름을 골랐는지 보세요. 남의 페이지에서는 원래
                  안 보입니다.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">
                  수집 문장이 보고서에 안 올라와요
                </dt>
                <dd className="mt-0.5 text-body">
                  문장에 <b>수집 용도</b>를 골랐는지 보세요. 색과 메모만 남긴
                  하이라이트는 올라가지 않습니다.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">PDF 가 안 열려요</dt>
                <dd className="mt-0.5 text-body">
                  링크가 만료됐을 수 있습니다. 특히 학회·저널 사이트에서 복사한
                  링크는 시간이 지나면 죽습니다. <K>편집</K> 으로 링크를 바꿔
                  주세요.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">분야·발행연도가 비어 있어요</dt>
                <dd className="mt-0.5 text-body">
                  arXiv 가 아닌 논문은 자동으로 안 채워집니다. <K>편집</K> 에서
                  직접 고르거나 넣어 주세요.
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-ink">
                  다른 기기에서 열었더니 내 이름이 풀렸어요
                </dt>
                <dd className="mt-0.5 text-body">
                  선택은 브라우저마다 따로 저장됩니다. 다시 고르면 됩니다 — 기록은
                  그대로 있습니다.
                </dd>
              </div>
            </dl>
          </Screen>
        </div>
      </div>
    </div>
  );
}
