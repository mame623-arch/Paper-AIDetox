/**
 * 기존 논문의 분야·발행연도를 채운다. 몇 번을 다시 돌려도 안전하다.
 *
 * 파싱 코드를 두 벌로 갈라놓지 않으려고 실행 중인 앱의 /api/arxiv 를 부른다.
 * 그래서 앱이 떠 있어야 한다:
 *
 *   npm run build && npx next start -p 3200 &
 *   BASE=http://localhost:3200 node scripts/backfill-arxiv.mjs
 *
 * --dry-run 을 주면 대상만 세고 아무것도 쓰지 않는다. 공유 DB 를 건드리기
 * 전에 규모를 먼저 보는 용도다. arXiv 도 부르지 않으므로 즉시 끝난다.
 *
 * NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 가 필요하다
 * (.env.local 에서도 읽는다).
 */
import { readFileSync } from "node:fs";

const DRY_RUN = process.argv.includes("--dry-run");
const BASE = process.env.BASE ?? "http://localhost:3000";

const env = { ...process.env };
try {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m) env[m[1]] ??= m[2];
  }
} catch {}

const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!URL_ || !KEY) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY 가 필요합니다.");
  process.exit(1);
}
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const res = await fetch(
  `${URL_}/rest/v1/papers?select=id,title,pdf_url,category,published_year&pdf_url=neq.`,
  { headers }
);
// res.ok 를 안 보면 401/404 응답도 그냥 json() 을 타서, papers 가 에러
// 객체가 된 채로 아래 filter 에서 알아볼 수 없는 에러로 죽는다. 쓰기 전에
// 죽는 건 같지만, 운영 DB 를 건드리기 직전인 사람에게는 원인을 알려줘야 한다.
if (!res.ok) {
  console.error(`papers 조회 실패: HTTP ${res.status} ${await res.text()}`);
  process.exit(1);
}
const papers = await res.json();
if (!Array.isArray(papers)) {
  console.error("papers 응답이 배열이 아닙니다:", papers);
  process.exit(1);
}

// 필드마다 따로 판단한다. "둘 다 비었을 때만" 으로 하면 부분적으로 빈 행이
// 영영 안 채워진다.
const todo = papers.filter((p) => p.pdf_url && (!p.category || p.published_year == null));
console.log(`대상 ${todo.length}편 / 전체 ${papers.length}편 (pdf_url 있는 것만)`);

if (DRY_RUN) {
  // 어느 필드가 비어서 대상이 됐는지까지 보여준다 — 둘 중 하나만 빈 행도 대상이다.
  for (const p of todo) {
    const missing = [!p.category && "분야", p.published_year == null && "발행연도"]
      .filter(Boolean)
      .join("·");
    console.log(`  - ${missing.padEnd(9)} ${p.title.slice(0, 60)}`);
  }
  console.log("\n--dry-run 이라 아무것도 쓰지 않았습니다.");
  process.exit(0);
}

const failed = [];
for (const p of todo) {
  try {
    const r = await fetch(`${BASE}/api/arxiv?url=${encodeURIComponent(p.pdf_url)}`);
    if (!r.ok) {
      failed.push([p.title, `HTTP ${r.status}`]);
      await sleep(3000);
      continue;
    }
    const meta = await r.json();

    // 이미 값이 있는 필드는 덮어쓰지 않는다.
    const patch = {};
    if (!p.category && meta.category) patch.category = meta.category;
    if (p.published_year == null && meta.published_year != null)
      patch.published_year = meta.published_year;
    if (Object.keys(patch).length === 0) {
      await sleep(3000);
      continue;
    }

    const w = await fetch(`${URL_}/rest/v1/papers?id=eq.${p.id}`, {
      method: "PATCH",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!w.ok) failed.push([p.title, `PATCH ${w.status}`]);
    else console.log(`  ✓ ${JSON.stringify(patch)}  ${p.title.slice(0, 50)}`);
  } catch (e) {
    failed.push([p.title, String(e)]);
  }
  await sleep(3000); // arXiv API 권고: 요청 사이에 간격을 둔다
}

console.log(`\n완료. 실패 ${failed.length}편`);
for (const [t, why] of failed) console.log(`  - ${t.slice(0, 50)} : ${why}`);
