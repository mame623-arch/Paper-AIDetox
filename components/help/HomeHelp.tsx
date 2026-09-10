"use client";

import {
  HelpBody,
  HelpCard,
  K,
  Note,
  P,
  PickMeCard,
  Step,
  Steps,
} from "./HelpParts";

/** 홈 화면의 도움말. 이 화면에서 실제로 할 수 있는 것만 적는다. */
export default function HomeHelp() {
  return (
    <HelpBody>
      <div className="space-y-4">
        <PickMeCard />

        <HelpCard title="이번 차시 기록 남기기" where="예정 스터디 카드의 「＋ 이번 차시 기록」">
          <Steps>
            <Step n={1}>
              <K>＋ 이번 차시 기록</K> 을 누릅니다.
            </Step>
            <Step n={2}>
              읽을(또는 읽은) 논문이 있으면 <K>논문 등록</K>, 못 나가면 <K>불참</K>.
            </Step>
            <Step n={3}>
              PDF 링크를 넣습니다. <b>arXiv 링크면 제목·저자·분야·발행연도가 자동으로
              채워집니다.</b> arXiv 가 아니면 안내가 뜨고, 그때는 직접 채웁니다.
            </Step>
            <Step n={4}>
              상태를 고릅니다 — 아직 안 읽었으면 <K>읽을 예정</K>, 다 읽었으면{" "}
              <K>읽음</K>. 나중에 언제든 바꿀 수 있습니다.
            </Step>
          </Steps>
          <Note>
            <b>논문을 등록하면 그게 곧 참석입니다.</b> 참석을 따로 누르는 곳은
            없습니다.
          </Note>
          <Note>
            불참은 사유를 같이 적을 수 있습니다(생략 가능). 마음이 바뀌면 같은 자리를
            다시 열어 <K>불참 취소</K> 하거나 논문을 등록하면 됩니다.
          </Note>
        </HelpCard>
      </div>

      <div className="space-y-4">
        <HelpCard title="최근 스터디 읽기" where="위쪽 「최근 스터디」 카드">
          <P>
            지난 차시에 누가 무엇을 읽었는지 요약해 보여줍니다. 이름을 누르면 그
            사람의 아카이브로, 논문 제목을 누르면 그 논문의 PDF 화면으로 갑니다.
          </P>
          <P>
            오른쪽 위 <K>보고서 보기 →</K> 를 누르면 그 차시의 <b>주간 보고서</b>가
            열립니다. 거기서 스터디원이 <K>참석자</K> / <K>불참자</K> /{" "}
            <K>응답 없음</K> 으로 나뉘고, 참석자마다 읽은 논문·한줄평·수집 문장이
            붙습니다.
          </P>
          <Note>
            <K>응답 없음</K> 은 빠졌다는 뜻이 아니라 <b>아직 아무것도 기록하지
            않았다</b>는 뜻입니다. 깜빡한 차시는 그 보고서 화면에서 <K>＋ 이번 차시
            기록</K> 으로 나중에 채울 수 있습니다.
          </Note>
        </HelpCard>

        <HelpCard title="한줄평 남기기" where="참석자 줄 오른쪽 「＋ 한줄평」">
          <P>
            그 차시에 대해 한 줄로 남기는 감상입니다. 논문마다가 아니라{" "}
            <b>차시마다 하나</b>이고, 본인 것만 쓰고 고칠 수 있습니다. 선택이라
            비워 둬도 됩니다.
          </P>
          <Note>
            입력창은 <b>Enter 로 저장, Shift+Enter 로 줄바꿈</b> 입니다.
          </Note>
        </HelpCard>
      </div>
    </HelpBody>
  );
}
