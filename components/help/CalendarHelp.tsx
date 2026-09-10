"use client";

import { HelpBody, HelpCard, K, Note, P } from "./HelpParts";

/**
 * 캘린더의 도움말. 일정 추가·수정·삭제는 스터디를 굴리는 사람 몫이라 여기서
 * 다루지 않는다 — 참여자가 이 화면에서 할 일만 적는다.
 */
export default function CalendarHelp() {
  return (
    <HelpBody>
      <div className="space-y-4">
        <HelpCard title="지난 차시 기록 채우기" where="달력의 일정, 또는 아래 「지난 일정」">
          <P>
            일정을 누르면 그 차시의 <b>주간 보고서</b>가 열립니다. 거기서{" "}
            <K>＋ 이번 차시 기록</K> 으로 <b>지난 차시도 나중에 채울 수 있습니다.</b>{" "}
            깜빡한 주가 있으면 여기로 들어가 메우면 됩니다.
          </P>
          <Note>
            보고서에서 내 이름이 <K>응답 없음</K> 에 있다면 그 차시에 아직 아무것도
            기록하지 않았다는 뜻입니다. 빠졌다는 뜻이 아닙니다.
          </Note>
        </HelpCard>
      </div>

      <div className="space-y-4">
        <HelpCard title="내가 참여한 차시만 보기" where="달력 오른쪽 위 「내 참여만」">
          <P>
            켜면 <b>내가 기록을 남긴 차시만</b> 달력과 목록에 남습니다. 내가 언제
            참여했는지 훑을 때 씁니다. 다시 누르면 전체로 돌아옵니다.
          </P>
          <Note>
            사이드바에서 내 이름을 고르지 않았으면 기준이 없어 걸러지지 않습니다.
          </Note>
        </HelpCard>

        <HelpCard title="달력에서 옮겨 다니기">
          <P>
            제목 양옆 <K>←</K> <K>→</K> 로 달을 넘깁니다. 아래에는 <b>예정 일정</b>과{" "}
            <b>지난 일정</b>이 나뉘어 있고, 각 줄의 <K>기록 보기 →</K> 로도 그 차시
            보고서에 들어갑니다.
          </P>
        </HelpCard>
      </div>
    </HelpBody>
  );
}
