"use client";

import { useState } from "react";
import { CATEGORY_CODES, categoryLabel, isKnownCategory } from "@/lib/arxivCategories";

const CUSTOM = "__custom";

/**
 * 분야 선택. arXiv 링크면 자동으로 채워지지만, arXiv 가 아닌 논문(학회
 * proceedings, 백서 등)은 자동 채움이 안 되므로 직접 고르거나 입력한다.
 *
 * 목록에서 고르게 하는 이유: 자유 입력만 두면 같은 분야가 "보안"·"cs.CR"·
 * "security" 로 흩어져 아카이브의 분야 막대가 쪼개진다. 목록에 없는 분야를
 * 위해 직접 입력도 남겨 둔다.
 *
 * `custom` 은 value 에서 파생한다 — mount 시점에 고정하면 다른 논문을 편집할 때
 * 이전 상태가 남는다.
 */
export default function CategorySelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  // 직접 입력을 명시적으로 고른 상태. value 가 아직 비어 있어도 칸을 열어 둔다.
  const [customChosen, setCustomChosen] = useState(false);
  const custom = customChosen || (Boolean(value) && !isKnownCategory(value));

  return (
    <div className="space-y-1.5">
      <select
        value={custom ? CUSTOM : value}
        onChange={(e) => {
          const v = e.target.value;
          if (v === CUSTOM) {
            setCustomChosen(true);
            // 목록의 값이 남아 있으면 지운다 — 직접 입력 칸이 빈 채로 열려야 한다.
            if (isKnownCategory(value)) onChange("");
            return;
          }
          setCustomChosen(false);
          onChange(v);
        }}
        className="field"
      >
        <option value="">분야 없음</option>
        {CATEGORY_CODES.map((code) => (
          <option key={code} value={code}>
            {categoryLabel(code)} ({code})
          </option>
        ))}
        <option value={CUSTOM}>직접 입력…</option>
      </select>

      {custom && (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="field"
          placeholder="예: 블록체인"
          autoFocus
        />
      )}
    </div>
  );
}
