"use client";

import { useEffect, useRef, useState } from "react";
import {
  AreaHighlight,
  Highlight,
  PdfHighlighter,
  PdfLoader,
  Popup,
  Tip,
  type IHighlight,
} from "react-pdf-highlighter";
import "react-pdf-highlighter/dist/style.css";
import type { Highlight as DBHighlight, Member } from "@/lib/types";
import {
  createHighlight,
  deleteHighlight,
  fetchHighlights,
} from "@/lib/db";

const WORKER_SRC =
  "https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js";

const resetHash = () => {
  if (typeof window !== "undefined") window.location.hash = "";
};

function toIHighlight(h: DBHighlight): IHighlight {
  return {
    id: h.id,
    position: h.position,
    content: { text: h.text },
    comment: { text: h.note, emoji: "" },
  };
}

export default function PdfHighlighterView({
  paperId,
  pdfUrl,
  members,
  currentMemberId,
}: {
  paperId: string;
  pdfUrl: string;
  members: Member[];
  currentMemberId: string | null;
}) {
  const [dbHighlights, setDbHighlights] = useState<DBHighlight[]>([]);
  const [loadError, setLoadError] = useState<string>("");
  const scrollToRef = useRef<((h: IHighlight) => void) | null>(null);

  const proxied = `/api/pdf?url=${encodeURIComponent(pdfUrl)}`;

  const authorName = (memberId: string | null) =>
    members.find((m) => m.id === memberId)?.name ?? "익명";

  useEffect(() => {
    fetchHighlights(paperId)
      .then(setDbHighlights)
      .catch((e) => {
        console.error(e);
        setLoadError("하이라이트를 불러오지 못했습니다.");
      });
  }, [paperId]);

  const highlights = dbHighlights.map(toIHighlight);

  const addHighlight = async (
    position: IHighlight["position"],
    content: IHighlight["content"],
    note: string
  ) => {
    try {
      const saved = await createHighlight({
        paper_id: paperId,
        member_id: currentMemberId,
        text: content.text ?? "",
        position,
        note,
      });
      setDbHighlights((prev) => [...prev, saved]);
    } catch (e) {
      console.error(e);
      alert("하이라이트 저장에 실패했습니다.");
    }
  };

  const removeHighlight = async (id: string) => {
    try {
      await deleteHighlight(id);
      setDbHighlights((prev) => prev.filter((h) => h.id !== id));
    } catch (e) {
      console.error(e);
      alert("삭제에 실패했습니다.");
    }
  };

  const scrollToId = (id: string) => {
    const h = highlights.find((x) => x.id === id);
    if (h) scrollToRef.current?.(h);
  };

  return (
    <div className="flex h-full min-h-0">
      {/* PDF + highlights */}
      <div className="relative min-w-0 flex-1 bg-[#525659]">
        <PdfLoader
          url={proxied}
          workerSrc={WORKER_SRC}
          beforeLoad={
            <div className="flex h-full items-center justify-center text-sm text-white">
              PDF 불러오는 중…
            </div>
          }
          errorMessage={
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-white">
              PDF를 불러오지 못했습니다. 링크가 올바른지 확인하세요.
            </div>
          }
        >
          {(pdfDocument) => (
            <PdfHighlighter
              pdfDocument={pdfDocument}
              enableAreaSelection={(event) => event.altKey}
              onScrollChange={resetHash}
              pdfScaleValue="page-width"
              scrollRef={(scrollTo) => {
                scrollToRef.current = scrollTo;
              }}
              onSelectionFinished={(
                position,
                content,
                hideTipAndSelection
              ) => (
                <Tip
                  onOpen={() => {}}
                  onConfirm={(comment) => {
                    addHighlight(position, content, comment.text);
                    hideTipAndSelection();
                  }}
                />
              )}
              highlightTransform={(
                highlight,
                index,
                setTip,
                hideTip,
                _viewportToScaled,
                _screenshot,
                isScrolledTo
              ) => {
                const isText = !highlight.content?.image;
                const db = dbHighlights.find((h) => h.id === highlight.id);
                const popup = (
                  <div className="max-w-xs rounded-lg bg-[#2b2b2b] px-3 py-2 text-xs text-white shadow-lg">
                    <div className="mb-1 font-semibold text-[#ffd479]">
                      ✍️ {authorName(db?.member_id ?? null)}
                    </div>
                    {highlight.comment?.text ? (
                      <div className="whitespace-pre-wrap">
                        {highlight.comment.text}
                      </div>
                    ) : (
                      <div className="text-white/60">메모 없음</div>
                    )}
                  </div>
                );

                const component = isText ? (
                  <Highlight
                    isScrolledTo={isScrolledTo}
                    position={highlight.position}
                    comment={highlight.comment}
                  />
                ) : (
                  <AreaHighlight
                    isScrolledTo={isScrolledTo}
                    highlight={highlight}
                    onChange={() => {}}
                  />
                );

                return (
                  <Popup
                    popupContent={popup}
                    onMouseOver={(p) => setTip(highlight, () => p)}
                    onMouseOut={hideTip}
                    key={index}
                  >
                    {component}
                  </Popup>
                );
              }}
              highlights={highlights}
            />
          )}
        </PdfLoader>
      </div>

      {/* 메모 패널 */}
      <aside className="flex w-72 shrink-0 flex-col border-l border-line bg-panel">
        <div className="border-b border-line px-4 py-3">
          <div className="text-sm font-semibold text-ink">
            하이라이트 · 메모
          </div>
          <div className="text-[11px] text-muted">
            문장을 드래그하면 메모를 남길 수 있어요. (Alt+드래그: 영역 선택)
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {loadError && (
            <p className="px-4 py-3 text-xs text-red-600">{loadError}</p>
          )}
          {dbHighlights.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted">
              아직 하이라이트가 없습니다.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {dbHighlights.map((h) => (
                <li key={h.id} className="group px-4 py-3 hover:bg-[#faf9f8]">
                  <button
                    onClick={() => scrollToId(h.id)}
                    className="block w-full text-left"
                  >
                    {h.text && (
                      <blockquote className="border-l-2 border-[#ffd479] pl-2 text-xs italic text-[#5f5e5b]">
                        {h.text.length > 140
                          ? h.text.slice(0, 140) + "…"
                          : h.text}
                      </blockquote>
                    )}
                    {h.note && (
                      <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink">
                        {h.note}
                      </p>
                    )}
                  </button>
                  <div className="mt-1.5 flex items-center justify-between">
                    <span className="text-[11px] text-muted">
                      ✍️ {authorName(h.member_id)}
                    </span>
                    <button
                      onClick={() => removeHighlight(h.id)}
                      className="text-[11px] text-muted opacity-0 transition group-hover:opacity-100 hover:text-red-600"
                    >
                      삭제
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}
