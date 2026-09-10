"use client";

import type { ReactNode } from "react";

/**
 * 페이지 안 `도움말` 탭에서 쓰는 조각들.
 *
 * 도움말을 별도 페이지로 두지 않는 이유: 아무도 안 들어간다. 헷갈리는 그 화면
 * 안에 두어야 읽는다.
 *
 * 본문은 **넓은 한 열**이다. 2열로 두면 왼쪽을 끝까지 읽고 다시 화면 위로
 * 올라가 오른쪽을 읽어야 하고, 카드 높이가 달라 다음이 어디인지 안 보인다.
 * 구획은 카드가 아니라 구분선으로 나눈다 — 테두리를 겹쳐 두면 내용보다
 * 컨테이너가 더 눈에 띄고 모든 문단이 똑같이 중요해 보인다.
 */

/** 탭 줄. 멤버 페이지가 이미 쓰던 모양을 그대로 따른다. */
export function TabBar<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: readonly (readonly [T, string])[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="mt-5 flex gap-1 border-b border-line">
      {tabs.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`-mb-px border-b-2 px-3 py-2 text-sm transition ${
            value === key
              ? "border-accent font-semibold text-accent"
              : "border-transparent text-muted hover:text-ink"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/** 도움말은 넓은 한 열에서 위에서 아래로 읽는다. */
export function HelpBody({ children }: { children: ReactNode }) {
  return <div className="mt-6 max-w-3xl space-y-8">{children}</div>;
}

/**
 * 그 탭에서 반드시 기억해야 할 행동 하나. **탭마다 정확히 하나**만 둔다.
 * 둘이 되는 순간 어느 쪽도 가장 중요하지 않게 된다.
 */
export function KeyPoint({ children }: { children: ReactNode }) {
  return (
    <section
      aria-label="가장 중요한 것"
      className="rounded-xl border border-linestrong bg-accentsoft px-5 py-4"
    >
      <p className="text-sm font-bold text-ink">가장 중요한 것</p>
      <p className="mt-2 text-sm leading-6 text-body">{children}</p>
    </section>
  );
}

/** 도움말의 기본 구획. 카드가 아니라 구분선으로 읽기 흐름만 나눈다. */
export function HelpSection({
  title,
  where,
  children,
}: {
  title: string;
  /** 그 조작이 화면 어디에 있는지 */
  where?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-line pb-7 last:border-b-0 last:pb-0">
      <h2 className="text-base font-bold text-ink">{title}</h2>
      {where ? <p className="mt-1 text-sm text-faint">위치: {where}</p> : null}
      {children}
    </section>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-sm leading-6 text-body">{children}</p>;
}

/**
 * 반드시 순서대로 해야 하는 행동에만 쓴다.
 * 조건·배경·예외 설명은 Steps 밖의 P 나 Note 에 둔다.
 */
export function Steps({ children }: { children: ReactNode }) {
  return (
    <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-body marker:font-semibold marker:text-accent">
      {children}
    </ol>
  );
}

export function Step({ children }: { children: ReactNode }) {
  return <li className="pl-1">{children}</li>;
}

/**
 * 화면에서 실제로 찾아 눌러야 하는 **정확한 UI 라벨**에만 쓴다.
 *
 * 쓴다:      「＋ 이번 차시 기록」 「논문 등록」 「내 참여만」 「영역 선택」
 * 쓰지 않는다: 수집 용도 · 응답 없음 · 읽은 논문 같은 설명용 개념,
 *              일반 문장 강조, 한 문장 안에 상태·분류를 늘어놓는 것.
 *
 * 문장마다 배지가 여럿 끼면 글이 끊겨 버튼 목록처럼 읽힌다.
 */
export function K({ children }: { children: ReactNode }) {
  return (
    <span className="rounded bg-surface px-1 py-0.5 text-[0.78rem] font-medium text-ink">
      {children}
    </span>
  );
}

/**
 * 예외·오해 방지 한 줄에만. 회색 박스 대신 왼쪽 선으로 구분한다.
 * 한 HelpSection 안에 최대 하나.
 */
export function Note({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 border-l-2 border-accent pl-3 text-sm leading-6 text-muted">
      {children}
    </p>
  );
}

/**
 * 내 이름 선택이 필요한 조작 **바로 뒤**에만 둔다.
 * 도움말 첫머리나 KeyPoint 에는 넣지 않는다 — 아직 막히지도 않은 사람에게
 * 계정 이야기부터 하는 꼴이 된다.
 */
export function PickMeNote() {
  return (
    <Note>
      편집·기록 버튼이 보이지 않으면 왼쪽 사이드바에서 내 이름을 고르세요.
    </Note>
  );
}
