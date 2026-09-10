"use client";

import type { ReactNode } from "react";

/**
 * 페이지 안 `도움말` 탭에서 쓰는 조각들.
 *
 * 도움말을 별도 페이지로 두지 않는 이유: 아무도 안 들어간다. 헷갈리는 그 화면
 * 안에 두어야 읽는다. 그래서 각 페이지가 자기 화면 이야기만 담은 탭을 하나씩 갖는다.
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

export function HelpBody({ children }: { children: ReactNode }) {
  return (
    <div className="mt-6 grid gap-4 lg:grid-cols-2 lg:items-start">{children}</div>
  );
}

/** 도움말 한 덩어리. `where` 는 그 조작이 화면 어디에 있는지다. */
export function HelpCard({
  title,
  where,
  children,
}: {
  title: string;
  where?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-line bg-bg p-5">
      <h2 className="text-base font-bold text-ink">{title}</h2>
      {where ? (
        <p className="mt-1 text-[0.82rem] text-faint">{where}</p>
      ) : null}
      {children}
    </section>
  );
}

export function Steps({ children }: { children: ReactNode }) {
  return <ol className="mt-3 space-y-2 text-sm text-body">{children}</ol>;
}

export function Step({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accentsoft text-[0.7rem] font-bold text-accent">
        {n}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </li>
  );
}

/** 화면에 실제로 적혀 있는 말 — 버튼 이름, 라벨, 배지. */
export function K({ children }: { children: ReactNode }) {
  return (
    <span className="rounded border border-line bg-surface px-1.5 py-0.5 text-[0.78rem] font-medium text-ink">
      {children}
    </span>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return (
    <p className="mt-3 rounded-lg border border-line bg-surface px-3 py-2 text-[0.82rem] text-muted">
      {children}
    </p>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-sm text-body">{children}</p>;
}

/**
 * 어느 화면에서든 같은 이야기 — 사이드바에서 내 이름을 고르지 않으면
 * 조작 버튼이 아예 보이지 않는다. 도움말 탭마다 이 카드가 맨 앞에 선다.
 */
export function PickMeCard() {
  return (
    <HelpCard title="먼저 — 사이드바에서 내 이름 고르기" where="왼쪽 사이드바 위쪽 「나」">
      <P>
        <b>이걸 해야 나머지가 다 됩니다.</b> 이름을 고르지 않으면 기록을 남기거나
        고칠 수 없고, 편집·삭제 버튼 자체가 보이지 않습니다. 이름표를 눌러 파랗게
        되면 된 것입니다.
      </P>
      <Note>
        선택은 이 브라우저에만 저장됩니다. 다른 기기나 시크릿 창에서 열면 다시
        골라야 합니다 — 기록은 그대로 있습니다. 로그인이 아니라 비밀번호는 없습니다.
      </Note>
    </HelpCard>
  );
}
