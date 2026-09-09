/**
 * arXiv 링크·Atom 응답 파싱.
 *
 * XML 파서를 의존성에 추가하지 않는다. 필요한 필드가 넷뿐이고 arXiv Atom 형식이
 * 안정적이라 정규식으로 충분하다. 형식이 바뀌어 파싱이 실패하면 null 을 돌려주고,
 * 호출부는 손 입력으로 넘어가므로 기능이 막히지 않는다.
 */

export interface ArxivMeta {
  title: string;
  /** 저자명을 ", " 로 이어 붙인 문자열 (papers.authors 가 자유 문자열이다) */
  authors: string;
  published_year: number | null;
  /** 분류 코드 원본 (예: "cs.CL") */
  category: string;
}

/**
 * arxiv.org/pdf/<id> · /pdf/<id>v3 · /pdf/<id>.pdf · /pdf/<id>v3.pdf · /abs/<id>
 * 에서 확장자와 버전을 뗀 id 를 뽑는다. 확장자를 먼저 떼야 버전 제거가 걸린다.
 *
 * 옛 형식 id(math.GT/0309136 처럼 슬래시가 들어가는 것)는 문자 집합이 슬래시에서
 * 멈춰 앞부분("math.GT")만 남는다. 그 id 로 물으면 arXiv 가 오류 entry 로 답하고
 * (parseArxivAtom → null) 라우트가 422 를 돌려주므로, 결국 손 입력으로 넘어간다.
 */
export function extractArxivId(url: string): string | null {
  const m = url.match(/arxiv\.org\/(?:pdf|abs)\/([^\s/?#]+)/i);
  if (!m) return null;
  const id = m[1].replace(/\.pdf$/i, "").replace(/v\d+$/i, "");
  return id || null;
}

const textOf = (xml: string, tag: string): string | null => {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return m ? m[1] : null;
};

/** 범위를 벗어난 숫자 참조는 그대로 둔다(String.fromCodePoint 가 던진다). */
const codePoint = (n: number, original: string) => {
  try {
    return String.fromCodePoint(n);
  } catch {
    return original;
  }
};

/**
 * XML 엔티티를 원래 문자로 되돌린다. arXiv 는 제목·저자에 &amp; 같은 엔티티를
 * 그대로 실어 보내는데, 풀지 않으면 "Q&amp;A over ..." 가 그대로 DB 에 저장되고
 * 화면·보고서에도 그대로 나온다.
 *
 * &amp; 를 맨 나중에 푼다 — 먼저 풀면 "&amp;lt;" 처럼 이미 이스케이프된 문자열이
 * 한 단계 더 풀려 "<" 가 된다.
 */
const decodeEntities = (s: string) =>
  s
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&#(\d+);/g, (m, dec) => codePoint(Number(dec), m))
    .replace(/&#x([0-9a-f]+);/gi, (m, hex) => codePoint(parseInt(hex, 16), m))
    .replace(/&amp;/gi, "&");

/**
 * 줄바꿈과 연속 공백을 한 칸으로 접고 XML 엔티티를 푼다. arXiv 제목은 여러 줄로
 * 온다. 엔티티를 먼저 풀어야 &#10; 같이 공백으로 풀리는 것도 함께 접힌다.
 */
const squash = (s: string) => decodeEntities(s).replace(/\s+/g, " ").trim();

export function parseArxivAtom(xml: string): ArxivMeta | null {
  const entry = textOf(xml, "entry");
  if (!entry) return null;

  // arXiv 는 잘못된 id 에도 200 으로 응답하고 "Error" entry 를 돌려준다.
  // 거르지 않으면 제목이 "Error" 인 논문이 저장된다.
  if (/arxiv\.org\/api\/errors/i.test(textOf(entry, "id") ?? "")) return null;

  const title = squash(textOf(entry, "title") ?? "");

  const authors = [...entry.matchAll(/<name[^>]*>([\s\S]*?)<\/name>/gi)]
    .map((m) => squash(m[1]))
    .filter(Boolean)
    .join(", ");

  const published = textOf(entry, "published") ?? "";
  const year = Number(published.slice(0, 4));

  const cat = entry.match(/primary_category[^>]*term="([^"]+)"/i);

  return {
    title,
    authors,
    published_year: Number.isFinite(year) && year > 0 ? year : null,
    category: cat ? cat[1] : "",
  };
}
