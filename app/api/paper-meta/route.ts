import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Meta {
  title: string;
  authors: string;
  source: string;
}

function formatAuthors(names: string[]): string {
  const clean = names.map((n) => n.trim()).filter(Boolean);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0];
  return `${clean[0]} 외 ${clean.length - 1}인`;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function arxivId(u: URL): string | null {
  if (!/(^|\.)arxiv\.org$/.test(u.hostname)) return null;
  const m = u.pathname.match(/\/(?:abs|pdf)\/(.+?)(?:\.pdf)?$/);
  return m ? m[1] : null;
}

async function fromArxiv(id: string): Promise<Meta | null> {
  const res = await fetch(
    `https://export.arxiv.org/api/query?id_list=${encodeURIComponent(
      id
    )}&max_results=1`,
    { headers: { "User-Agent": "AIDetoxStudy/1.0" } }
  );
  if (!res.ok) return null;
  const xml = await res.text();
  const entry = xml.match(/<entry>([\s\S]*?)<\/entry>/);
  if (!entry) return null;
  const block = entry[1];
  const title = block.match(/<title>([\s\S]*?)<\/title>/);
  const names = [...block.matchAll(/<name>([\s\S]*?)<\/name>/g)].map((m) =>
    decodeEntities(m[1])
  );
  return {
    title: title ? decodeEntities(title[1]) : "",
    authors: formatAuthors(names),
    source: "arxiv",
  };
}

function fromFilename(u: URL): string {
  const last = decodeURIComponent(u.pathname.split("/").filter(Boolean).pop() ?? "");
  return last
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

async function fromPdfMetadata(url: string): Promise<Partial<Meta>> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; AIDetoxStudy/1.0; +https://vercel.app)",
        Accept: "application/pdf,*/*",
      },
    });
    if (!res.ok) return {};
    const buf = new Uint8Array(await res.arrayBuffer());
    // pdfjs는 런타임에만 동적 로드 (Node 환경)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.js");
    const doc = await pdfjs.getDocument({
      data: buf,
      isEvalSupported: false,
      useWorkerFetch: false,
      disableFontFace: true,
    }).promise;
    const meta = await doc.getMetadata();
    const info = meta?.info ?? {};
    const title = typeof info.Title === "string" ? info.Title.trim() : "";
    const author = typeof info.Author === "string" ? info.Author.trim() : "";
    return { title, authors: author };
  } catch {
    return {};
  }
}

export async function GET(req: NextRequest) {
  const target = req.nextUrl.searchParams.get("url");
  if (!target) {
    return NextResponse.json({ error: "url 필요" }, { status: 400 });
  }
  let u: URL;
  try {
    u = new URL(target);
  } catch {
    return NextResponse.json({ error: "잘못된 URL" }, { status: 400 });
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return NextResponse.json({ error: "http(s)만 허용" }, { status: 400 });
  }

  // 1) arXiv면 API로 정확히 취합
  const aid = arxivId(u);
  if (aid) {
    try {
      const meta = await fromArxiv(aid);
      if (meta?.title) return NextResponse.json(meta);
    } catch {
      /* fall through */
    }
  }

  // 2) 일반 PDF: 메타데이터 → 파일명 순으로 폴백
  const pdfMeta = await fromPdfMetadata(target);
  const title = pdfMeta.title || fromFilename(u) || "(제목 미상)";
  return NextResponse.json({
    title,
    authors: pdfMeta.authors ?? "",
    source: pdfMeta.title ? "pdf" : "filename",
  } satisfies Meta);
}
