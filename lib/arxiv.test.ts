import { describe, expect, it } from "vitest";
import { extractArxivId, parseArxivAtom } from "./arxiv";

describe("extractArxivId", () => {
  it("pdf 링크에서 id 를 뽑는다", () => {
    expect(extractArxivId("https://arxiv.org/pdf/2402.08787")).toBe("2402.08787");
  });

  it("버전이 붙어도 버전을 뗀다", () => {
    expect(extractArxivId("https://arxiv.org/pdf/2402.08787v4")).toBe("2402.08787");
  });

  it("abs 링크도 받는다", () => {
    expect(extractArxivId("https://arxiv.org/abs/2402.08787")).toBe("2402.08787");
  });

  it("arXiv 가 아니면 null", () => {
    expect(extractArxivId("https://openreview.net/pdf?id=abc")).toBeNull();
  });

  it("빈 문자열이면 null", () => {
    expect(extractArxivId("")).toBeNull();
  });

  it(".pdf 확장자가 붙어도 뗀다", () => {
    expect(extractArxivId("https://arxiv.org/pdf/2402.08787.pdf")).toBe("2402.08787");
  });

  it("버전과 확장자가 함께 붙어도 뗀다", () => {
    expect(extractArxivId("https://arxiv.org/pdf/2402.08787v4.pdf")).toBe("2402.08787");
  });
});

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <published>2024-02-13T21:59:56Z</published>
    <title>Rethinking Machine Unlearning
  for Large Language Models</title>
    <author><name>Sijia Liu</name></author>
    <author><name>Yuanshun Yao</name></author>
    <arxiv:primary_category xmlns:arxiv="http://arxiv.org/schemas/atom" term="cs.CL" scheme="http://arxiv.org/schemas/atom"/>
  </entry>
</feed>`;

describe("parseArxivAtom", () => {
  it("제목의 줄바꿈을 한 칸으로 접는다", () => {
    expect(parseArxivAtom(SAMPLE)?.title).toBe(
      "Rethinking Machine Unlearning for Large Language Models"
    );
  });

  it("저자를 쉼표로 잇는다", () => {
    expect(parseArxivAtom(SAMPLE)?.authors).toBe("Sijia Liu, Yuanshun Yao");
  });

  it("발행연도를 숫자로 뽑는다", () => {
    expect(parseArxivAtom(SAMPLE)?.published_year).toBe(2024);
  });

  it("분류 코드를 뽑는다", () => {
    expect(parseArxivAtom(SAMPLE)?.category).toBe("cs.CL");
  });

  it("entry 가 없으면 null", () => {
    expect(parseArxivAtom("<feed></feed>")).toBeNull();
  });

  // arXiv 는 잘못된 id 에 대해 404 가 아니라 200 으로 "Error" entry 를 돌려준다.
  // 이걸 거르지 않으면 제목이 "Error" 인 논문이 저장된다.
  it("arXiv 오류 응답은 null", () => {
    const err = `<feed xmlns="http://www.w3.org/2005/Atom">
      <entry>
        <id>http://arxiv.org/api/errors#incorrect_id_format_for_zzz</id>
        <title>Error</title>
        <summary>incorrect id format for zzz</summary>
      </entry>
    </feed>`;
    expect(parseArxivAtom(err)).toBeNull();
  });
});
