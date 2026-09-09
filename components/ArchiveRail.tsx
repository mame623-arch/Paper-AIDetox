import type { ArchiveStats } from "@/lib/archive";
import { categoryLabel } from "@/lib/arxivCategories";
import { Card } from "./ui";

/** 월 라벨은 12칸이 좁아서 세 칸마다 하나씩만 적는다. */
const MONTH_LABEL_STEP = 3;

/**
 * 아카이브 오른쪽 집계 레일. 읽기 전용 요약이라 소유권 분기가 없다 —
 * 남의 아카이브를 봐도 내가 보는 것과 같은 화면이 그대로 보인다.
 *
 * 차트 넷은 서로 다른 축을 쓴다. "쌓인 문장"은 읽은 날짜(read_date) 기준이고
 * "발행연도"는 논문이 실제로 나온 해다 — 둘을 섞어 보면 차트가 거짓말을
 * 하게 되므로 월별 차트 제목 아래에 기준을 못박아 둔다.
 *
 * 정렬은 stats 를 만든 lib/archive.ts 가 이미 끝내 왔다. 여기서는 다시
 * 정렬하지 않는다.
 */
export default function ArchiveRail({ stats }: { stats: ArchiveStats }) {
  const { monthly, categories, years, purposes } = stats;

  const monthlyTotal = monthly.reduce((sum, m) => sum + m.highlights, 0);
  const isAllEmpty =
    monthlyTotal === 0 &&
    categories.length === 0 &&
    years.length === 0 &&
    purposes.length === 0;

  if (isAllEmpty) {
    return (
      <Card>
        <p className="text-sm text-muted">기록이 쌓이면 여기에 보입니다.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <RailHeader title="쌓인 문장" caption="읽은 날짜 기준 · 최근 12개월" />
        {monthlyTotal === 0 ? (
          <EmptyChart />
        ) : (
          <MonthlyChart data={monthly} />
        )}
      </Card>

      <Card>
        <RailHeader title="분야" />
        {categories.length === 0 ? (
          <EmptyChart />
        ) : (
          <BarList
            items={categories.map((c) => ({
              key: c.code,
              label: categoryLabel(c.code),
              count: c.count,
            }))}
          />
        )}
      </Card>

      <Card>
        <RailHeader title="발행연도" />
        {years.length === 0 ? (
          <EmptyChart />
        ) : (
          <BarList
            items={years.map((y) => ({
              key: String(y.year),
              label: `${y.year}년`,
              count: y.count,
            }))}
          />
        )}
      </Card>

      <Card>
        <RailHeader title="용도" />
        {purposes.length === 0 ? (
          <EmptyChart />
        ) : (
          <BarList
            items={purposes.map((p) => ({
              key: p.purpose,
              label: p.purpose,
              count: p.count,
            }))}
          />
        )}
      </Card>
    </div>
  );
}

function RailHeader({ title, caption }: { title: string; caption?: string }) {
  return (
    <div className="mb-3 border-b border-line pb-3">
      <h3 className="text-sm font-bold text-ink">{title}</h3>
      {caption && (
        <p className="mt-0.5 text-[0.68rem] text-faint">{caption}</p>
      )}
    </div>
  );
}

function EmptyChart() {
  return <p className="text-sm text-muted">아직 없습니다.</p>;
}

/** 월별 쌓인 문장 — 세로 막대. 높이는 이 차트 안 최댓값 대비 비율이다. */
function MonthlyChart({ data }: { data: ArchiveStats["monthly"] }) {
  const max = Math.max(...data.map((d) => d.highlights));
  return (
    <div className="flex h-24 items-end gap-1">
      {data.map((d, i) => {
        const monthNumber = Number(d.month.slice(5, 7));
        const label = `${monthNumber}월`;
        const heightPct = max > 0 ? (d.highlights / max) * 100 : 0;
        return (
          <div
            key={d.month}
            className="flex h-full flex-1 flex-col items-center justify-end gap-1"
          >
            <div className="flex w-full flex-1 items-end">
              <div
                className="w-full rounded-t-sm bg-accent"
                style={{ height: `${heightPct}%` }}
              />
            </div>
            <span
              className={`text-[9px] text-faint ${
                i % MONTH_LABEL_STEP === 0 ? "" : "invisible"
              }`}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** 분야 / 발행연도 / 용도 — 가로 막대. 길이는 이 차트 안 최댓값 대비 비율이다. */
function BarList({
  items,
}: {
  items: { key: string; label: string; count: number }[];
}) {
  const max = Math.max(...items.map((i) => i.count));
  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        // max 가 0 이면 나눗셈이 NaN 이 되므로 0으로 막아 막대를 그리지 않는다.
        const pct = max > 0 ? (item.count / max) * 100 : 0;
        return (
          <li key={item.key}>
            <p className="mb-1 truncate text-xs text-body">{item.label}</p>
            <div className="flex items-center gap-2">
              <div className="h-1.5 flex-1 rounded-full bg-surface2">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="shrink-0 text-xs tabular-nums text-muted">
                {item.count}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
