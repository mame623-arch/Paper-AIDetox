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

/**
 * 개인 아카이브의 도움말. 이 화면에서 보는 것과, 여기서 논문으로 들어가
 * 하는 일(문장 수집)까지 담는다 — PDF 화면은 뷰어라 탭을 붙일 자리가 없다.
 *
 * 순서가 색보다 용도를 앞세운다. 색은 기록에 아무 영향이 없고 용도는 있다.
 */
export default function MemberHelp() {
  return (
    <HelpBody>
      <KeyPoint>
        하이라이트만으로는 기록에 남지 않습니다. 문장을 고른 뒤 반드시 수집 용도를
        선택하세요.
      </KeyPoint>

      <HelpSection title="문장 수집하기" where="논문 제목을 눌러 여는 PDF 화면">
        <Steps>
          <Step>본문에서 남길 문장을 드래그합니다.</Step>
          <Step>
            <b>수집 용도</b>를 고릅니다. 맞는 항목이 없으면 <K>기타</K> 에 직접
            적습니다.
          </Step>
          <Step>필요하면 색을 고르고, 고른 이유를 메모합니다.</Step>
        </Steps>
        <P>
          수집 용도를 고른 문장만 이 아카이브와 주간 보고서에 올라갑니다.
        </P>
        <Note>
          용도 없이 남긴 하이라이트는 나만 보는 개인 표시로 남고 스터디 기록에는
          들어가지 않습니다.
        </Note>
      </HelpSection>

      <HelpSection
        title="수집한 것과 논문 고치기"
        where="PDF 화면의 「영역 선택」·「메모」, 논문 줄 오른쪽 버튼"
      >
        <P>
          그림이나 표는 <K>영역 선택</K> 을 켜고 드래그해 남깁니다. 남긴 메모·색·용도는{" "}
          <K>메모</K> 패널에서 나중에 고칩니다.
        </P>
        <P>
          논문 줄에서는 <K>편집</K> 으로 제목·저자·PDF 링크·분야·발행연도를 고치고,
          상태를 바꾸거나 지울 수 있습니다.
        </P>
        <PickMeNote />
      </HelpSection>

      <HelpSection title="기록 탭 보기" where="이 화면">
        <P>
          읽은 논문이 최근에 읽은 순서로 서고, 논문마다 그 논문에서 수집한 문장이
          이유와 함께 붙습니다. 검색창으로 제목·저자를 찾습니다.
        </P>
        <P>
          위쪽 용도 칩을 고르면 그 용도로 수집한 문장이 있는 논문만 남습니다.
        </P>
        <P>
          아직 안 읽은 논문은 아래 <b>읽을 예정</b> 목록에 따로 있습니다. 다 읽으면
          상태를 읽음으로 올려 주세요.
        </P>
        <Note>
          오른쪽 차트에서 <b>쌓인 문장</b>은 논문을 읽은 날짜 기준이고,{" "}
          <b>발행연도</b>는 논문이 나온 해입니다. 서로 다른 축입니다.
        </Note>
      </HelpSection>
    </HelpBody>
  );
}
