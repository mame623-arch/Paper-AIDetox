import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 외부 PDF를 서버가 받아 동일 출처로 스트리밍 → pdf.js의 CORS 문제 우회.
export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("url");
  if (!target) {
    return NextResponse.json({ error: "url 파라미터가 필요합니다." }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(target);
  } catch {
    return NextResponse.json({ error: "잘못된 URL." }, { status: 400 });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ error: "http(s) URL만 허용됩니다." }, { status: 400 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25_000);

  try {
    const upstream = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        // 일부 서버(arXiv 등)는 기본 fetch UA를 차단하므로 브라우저처럼 위장
        "User-Agent":
          "Mozilla/5.0 (compatible; AIDetoxStudy/1.0; +https://vercel.app)",
        Accept: "application/pdf,*/*",
      },
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        { error: `원본 응답 오류 (${upstream.status})` },
        { status: 502 }
      );
    }

    const contentType = upstream.headers.get("content-type") ?? "application/pdf";

    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        "Content-Type": contentType.includes("pdf")
          ? contentType
          : "application/pdf",
        "Cache-Control": "public, max-age=3600",
        "Content-Disposition": "inline",
      },
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return NextResponse.json(
      { error: aborted ? "원본 PDF 요청 시간 초과" : "PDF를 가져오지 못했습니다." },
      { status: 502 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
