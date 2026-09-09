"use client";

import { useState } from "react";
import { NO_PURPOSE, PURPOSE_PRESETS, isPreset } from "@/lib/highlightPurposes";

/**
 * 용도 선택. 기본값은 "없음" 이다 — 기록을 남기는 데 마찰을 더하지 않는다.
 * "기타" 를 고르면 자유 입력 칸이 열리고, 입력한 문자열이 그대로 purpose 가 된다.
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
  // 프리셋이 아니면서 값이 있으면 이미 "기타" 를 쓴 것이다.
  const [custom, setCustom] = useState(Boolean(value) && !isPreset(value));

  const text = size === "sm" ? "text-[11px]" : "text-xs";
  const chip = `rounded-full border px-2 py-0.5 ${text} transition`;
  const on = "border-accent bg-accent text-white";
  const off = "border-line text-muted hover:border-accent hover:text-accent";

  const pick = (v: string) => {
    setCustom(false);
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

      <button type="button" onClick={() => { setCustom(true); onChange(NO_PURPOSE); }}
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
