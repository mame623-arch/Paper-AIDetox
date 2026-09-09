import { NextRequest, NextResponse } from "next/server";
import { extractArxivId, parseArxivAtom } from "@/lib/arxiv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// arXiv 메타데이터를 서버가 받아 돌려준다 → 브라우저의 CORS 제약 우회.
export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("url");
  if (!target) {
    return NextResponse.json({ error: "url 파라미터가 필요합니다." }, { status: 400 });
  }

  const id = extractArxivId(target);
  if (!id) {
    return NextResponse.json({ error: "arXiv 링크가 아닙니다." }, { status: 422 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  try {
    const upstream = await fetch(
      `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(id)}`,
      {
        signal: controller.signal,
        headers: { "User-Agent": "AIDetoxStudy/1.0 (+https://vercel.app)" },
      }
    );
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `arXiv 응답 오류 (${upstream.status})` },
        { status: 502 }
      );
    }

    const meta = parseArxivAtom(await upstream.text());
    if (!meta || !meta.title) {
      return NextResponse.json({ error: "메타데이터를 찾지 못했습니다." }, { status: 422 });
    }

    return NextResponse.json(meta, {
      headers: { "Cache-Control": "public, max-age=86400" },
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return NextResponse.json(
      { error: aborted ? "arXiv 요청 시간 초과" : "arXiv 조회에 실패했습니다." },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
