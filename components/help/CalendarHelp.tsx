"use client";

import { HelpBody, HelpSection, K, KeyPoint, Note, P } from "./HelpParts";

/**
 * 캘린더의 도움말. 일정 추가·수정·삭제는 스터디를 굴리는 사람 몫이라 여기서
 * 다루지 않는다 — 참여자가 이 화면에서 할 일만 적는다.
 */
export default function CalendarHelp() {
  return (
    <HelpBody>
      <KeyPoint>
        지난 차시도 보고서에서 나중에 기록할 수 있습니다. 놓친 주가 있으면 그 일정부터
        여세요.
      </KeyPoint>

      <HelpSection
        title="지난 차시 기록 채우기"
        where="달력의 일정, 또는 아래 「지난 일정」"
      >
        <P>
          일정을 누르거나 <K>기록 보기 →</K> 로 그 차시의 주간 보고서에 들어갑니다.
          거기서 <K>＋ 이번 차시 기록</K> 으로 지난 차시도 채울 수 있습니다.
        </P>
        <Note>
          보고서의 응답 없음은 불참이 아니라 아직 기록을 남기지 않았다는 뜻입니다.
        </Note>
      </HelpSection>

      <HelpSection title="내가 참여한 차시만 보기" where="달력 오른쪽 위의 「내 참여만」">
        <P>
          켜면 내가 기록을 남긴 차시만 달력과 목록에 남습니다. 다시 누르면 전체로
          돌아옵니다.
        </P>
        <Note>
          사이드바에서 내 이름을 고르지 않았으면 기준이 없어 걸러지지 않습니다.
        </Note>
      </HelpSection>

      <HelpSection title="달과 일정 옮겨 보기">
        <P>
          달력 제목 양옆 화살표로 달을 넘깁니다. 아래에는 예정 일정과 지난 일정이
          나뉘어 있습니다.
        </P>
      </HelpSection>
    </HelpBody>
  );
}
