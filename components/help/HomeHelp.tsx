"use client";

import {
  HelpBody,
  HelpSection,
  K,
  KeyPoint,
  Note,
  P,
  PickMeNote,
  Step,
  Steps,
} from "./HelpParts";

/** 홈 화면의 도움말. 이 화면에서 실제로 할 수 있는 것만 적는다. */
export default function HomeHelp() {
  return (
    <HelpBody>
      <KeyPoint>
        이번 차시에는 내 이름을 고른 뒤 논문을 등록하거나 불참만 남기면 됩니다.
        논문 등록이 곧 참석입니다.
      </KeyPoint>

      <HelpSection
        title="이번 차시 기록 남기기"
        where="예정 스터디의 「＋ 이번 차시 기록」"
      >
        <Steps>
          <Step>
            <K>＋ 이번 차시 기록</K> 을 누릅니다.
          </Step>
          <Step>
            참여하면 <K>논문 등록</K>, 못 나가면 <K>불참</K> 을 고릅니다.
          </Step>
          <Step>PDF 링크와 읽기 상태를 넣고 저장합니다.</Step>
        </Steps>
        <P>
          arXiv 링크는 제목·저자·분야·발행연도가 자동으로 채워집니다. 다른 링크는
          안내가 뜨고, 그때는 직접 채웁니다.
        </P>
        <PickMeNote />
      </HelpSection>

      <HelpSection title="지난 차시 기록 보기" where="최근 스터디의 「보고서 보기 →」">
        <P>
          그 차시의 주간 보고서가 열립니다. 누가 무엇을 읽고 어떤 문장을 모았는지
          한눈에 보입니다.
        </P>
        <P>
          같은 화면의 <K>＋ 이번 차시 기록</K> 으로 지난 차시도 나중에 채울 수
          있습니다.
        </P>
        <Note>
          보고서의 응답 없음은 불참이 아니라 아직 기록을 남기지 않았다는 뜻입니다.
        </Note>
      </HelpSection>

      <HelpSection title="한줄평 남기기" where="참석자 줄 오른쪽의 「＋ 한줄평」">
        <P>
          논문마다가 아니라 차시마다 하나이고, 본인 것만 쓰고 고칠 수 있습니다.
          비워 둬도 됩니다.
        </P>
        <Note>입력창은 Enter 로 저장하고 Shift+Enter 로 줄을 바꿉니다.</Note>
      </HelpSection>
    </HelpBody>
  );
}
