"use client";

import { useState } from "react";
import { NO_PURPOSE, PURPOSE_PRESETS, isPreset } from "@/lib/highlightPurposes";

/**
 * 용도 선택. 기본값은 "없음" 이다 — 기록을 남기는 데 마찰을 더하지 않는다.
 * "기타" 를 고르면 자유 입력 칸이 열리고, 입력한 문자열이 그대로 purpose 가 된다.
 *
 * 주의: 같은 instance 를 여러 edit target 에 재사용할 때는 `key` 로 remount 해야 한다.
 * e.g. `<PurposeSelect key={highlightId} ... />`
 */
export default function PurposeSelect({
  value,
  onChange,
  size = "md",
}: {
  value: string;
  onChange: (v: string) => void;
  size?: "sm" | "md";
}) {
  // 사용자가 기타를 명시적으로 고른 상태. value 가 아직 비어 있어도 입력칸을 열어 둔다.
  const [customChosen, setCustomChosen] = useState(false);
  // 값이 프리셋이 아니면서 비어 있지 않으면 그 자체로 기타다 — prop 이 바뀌어도 따라간다.
  const custom = customChosen || (Boolean(value) && !isPreset(value));

  const text = size === "sm" ? "text-[11px]" : "text-xs";
  const chip = `rounded-full border px-2 py-0.5 ${text} transition`;
  const on = "border-accent bg-accent text-white";
  const off = "border-line text-muted hover:border-accent hover:text-accent";

  const pick = (v: string) => {
    setCustomChosen(false);
    onChange(v);
  };

  return (
    <div className="flex flex-wrap items-center gap-1">
      <button type="button" onClick={() => pick(NO_PURPOSE)}
        className={`${chip} ${!custom && !value ? on : off}`}>
        없음
      </button>

      {PURPOSE_PRESETS.map((p) => (
        <button key={p} type="button" onClick={() => pick(p)}
          className={`${chip} ${!custom && value === p ? on : off}`}>
          {p}
        </button>
      ))}

      <button type="button" onClick={() => { if (!custom) { setCustomChosen(true); onChange(NO_PURPOSE); } }}
        className={`${chip} ${custom ? on : off}`}>
        기타
      </button>

      {custom && (
        <input
          value={isPreset(value) ? "" : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="용도 직접 입력"
          autoFocus
          className={`w-32 rounded-md border border-line bg-bg px-2 py-0.5 ${text} outline-none focus:border-accent`}
        />
      )}
    </div>
  );
}
