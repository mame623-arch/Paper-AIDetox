"use client";

import { PURPOSE_PRESETS } from "@/lib/highlightPurposes";
import { OTHER_PURPOSE } from "@/lib/archive";

/**
 * 용도로 수집 문장을 거르는 칩 줄.
 *
 * 칩은 프리셋 셋 + 기타로 고정한다. PurposeSelect 가 자유 입력 문자열을 그대로
 * 저장하므로 값마다 칩을 만들면 줄이 무한정 길어진다. 문장에 붙는 라벨에는
 * 실제 입력값을 그대로 보인다(그건 이 컴포넌트가 아니라 논문 줄이 그린다).
 */
export default function PurposeFilter({
  counts,
  total,
  value,
  onChange,
}: {
  /** ArchiveStats["purposes"] 를 그대로 받는다 — 이미 기타로 묶이고 정렬돼 있다 */
  counts: { purpose: string; count: number }[];
  total: number;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const chip = "rounded-full border px-2.5 py-1 text-[0.78rem] transition whitespace-nowrap";
  const on = "border-accent bg-accent text-white font-semibold";
  const off = "border-line text-muted hover:border-accent hover:text-accent";

  const options: (string | null)[] = [null, ...PURPOSE_PRESETS, OTHER_PURPOSE];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="mr-0.5 text-[0.74rem] text-faint">용도</span>
      {options.map((opt) => {
        const n =
          opt === null ? total : counts.find((c) => c.purpose === opt)?.count ?? 0;
        // 한 번도 쓰인 적 없는 용도는 칩을 만들지 않는다 — 전체는 항상 남긴다.
        if (opt !== null && n === 0) return null;
        return (
          <button
            key={opt ?? "all"}
            type="button"
            onClick={() => onChange(opt)}
            className={`${chip} ${value === opt ? on : off}`}
          >
            {opt ?? "전체"}
            <span className="ml-1 opacity-70 tabular-nums">{n}</span>
          </button>
        );
      })}
    </div>
  );
}
