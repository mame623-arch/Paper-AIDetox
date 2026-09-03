"use client";

import { useEffect, useRef, useState } from "react";
import {
  PdfHighlighter,
  PdfLoader,
  Popup,
  type IHighlight,
  type LTWHP,
} from "react-pdf-highlighter";
import "react-pdf-highlighter/dist/style.css";
import type { Highlight as DBHighlight } from "@/lib/types";
import {
  createHighlight,
  deleteHighlight,
  fetchHighlights,
  updateHighlight,
} from "@/lib/db";
import {
  DEFAULT_HIGHLIGHT_COLOR,
  HIGHLIGHT_COLORS,
  SCROLLED_TO_FILL,
  highlightColor,
  type HighlightColor,
} from "@/lib/highlightColors";

// react-pdf-highlighter가 쓰는 pdfjs(4.x)와 버전이 일치하는 워커를
// 동일 출처(public/)에서 서빙한다. (scripts/copy-pdf-worker.mjs 로 복사)
const WORKER_SRC = "/pdf.worker.min.mjs";

// 확대/축소 — 한 번에 20%씩, 40%~400% 범위
const ZOOM_STEP = 1.2;
const MIN_SCALE = 0.4;
const MAX_SCALE = 4;

const resetHash = () => {
  if (typeof window !== "undefined") window.location.hash = "";
};

function toIHighlight(h: DBHighlight): IHighlight {
  return {
    id: h.id,
    position: h.position,
    content: { text: h.text },
    // emoji는 쓰지 않는다(색으로 구분). 타입을 맞추려고 빈 문자열만 둔다.
    comment: { text: h.note, emoji: "" },
  };
}

/**
 * 영역(area) 하이라이트는 rects 가 비어 있고 boundingRect 만 있다.
 * 문장 하이라이트를 그리는 코드로는 화면에 아무것도 안 그려지므로 따로 판별한다.
 */
function isAreaPosition(position?: { rects?: unknown[] } | null): boolean {
  return !position?.rects || position.rects.length === 0;
}

/** 문장 하이라이트 — 줄마다 사각형을 색으로 칠한다. */
function TextHighlightBox({
  rects,
  color,
  isScrolledTo,
}: {
  rects: LTWHP[];
  color: HighlightColor;
  isScrolledTo: boolean;
}) {
  return (
    <div className="Highlight" style={{ position: "absolute" }}>
      {rects.map((rect, i) => (
        <div
          key={i}
          className="Highlight__part"
          style={{
            position: "absolute",
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
            background: isScrolledTo ? SCROLLED_TO_FILL : color.fill,
            mixBlendMode: "multiply",
            borderRadius: 2,
            transition: "background 0.3s",
          }}
        />
      ))}
    </div>
  );
}

/** 영역 하이라이트 — 테두리 있는 색 박스로 그린다. */
function AreaHighlightBox({
  rect,
  color,
  isScrolledTo,
}: {
  rect: LTWHP;
  color: HighlightColor;
  isScrolledTo: boolean;
}) {
  return (
    <div className="Highlight" style={{ position: "absolute" }}>
      <div
        className="Highlight__part"
        style={{
          position: "absolute",
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          background: isScrolledTo ? SCROLLED_TO_FILL : color.fill,
          border: `2px solid ${color.dot}`,
          borderRadius: 4,
          mixBlendMode: "multiply",
          transition: "background 0.3s",
        }}
      />
    </div>
  );
}

/** 색 고르기 스와치 한 줄 */
function ColorSwatches({
  value,
  onChange,
  size = 20,
}: {
  value: string;
  onChange: (key: string) => void;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {HIGHLIGHT_COLORS.map((c) => (
        <button
          key={c.key}
          type="button"
          title={c.label}
          aria-label={c.label}
          onClick={() => onChange(c.key)}
          className="rounded-full transition"
          style={{
            width: size,
            height: size,
            background: c.fill,
            border: `2px solid ${value === c.key ? c.dot : "transparent"}`,
            boxShadow: value === c.key ? `0 0 0 1.5px ${c.dot}` : "none",
          }}
        />
      ))}
    </div>
  );
}

/** 새 하이라이트 작성 팝업 — 색 선택 + 메모 (이모지 없음) */
function NewHighlightTip({
  onConfirm,
  onCancel,
}: {
  onConfirm: (note: string, color: string) => void;
  onCancel: () => void;
}) {
  const [note, setNote] = useState("");
  const [color, setColor] = useState(DEFAULT_HIGHLIGHT_COLOR);

  return (
    <div className="w-[240px] rounded-lg border border-line bg-white p-2.5 shadow-[0_6px_20px_rgba(28,31,38,0.22)]">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-muted">색</span>
        <ColorSwatches value={color} onChange={setColor} />
      </div>
      <textarea
        autoFocus
        rows={3}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="메모 (선택)"
        className="w-full resize-none rounded-md border border-line px-2 py-1.5 text-[13px] outline-none focus:border-accent"
      />
      <div className="mt-1.5 flex justify-end gap-1.5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-2 py-1 text-[11px] text-muted hover:bg-surface"
        >
          취소
        </button>
        <button
          type="button"
          onClick={() => onConfirm(note.trim(), color)}
          className="rounded-md bg-accent px-2.5 py-1 text-[11px] font-medium text-white"
        >
          저장
        </button>
      </div>
    </div>
  );
}

export default function PdfHighlighterView({
  paperId,
  pdfUrl,
  currentMemberId,
  notesOpen,
  onCloseNotes,
}: {
  paperId: string;
  pdfUrl: string;
  currentMemberId: string | null;
  notesOpen: boolean;
  onCloseNotes: () => void;
}) {
  const [dbHighlights, setDbHighlights] = useState<DBHighlight[]>([]);
  const [loadError, setLoadError] = useState<string>("");
  // 켜면 드래그가 '영역 선택'이 된다. (끄면 평소처럼 문장 드래그)
  const [areaMode, setAreaMode] = useState(false);
  // 메모 수정 — 열려 있는 하이라이트 id 와 임시 입력값
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftNote, setDraftNote] = useState("");
  const [draftColor, setDraftColor] = useState(DEFAULT_HIGHLIGHT_COLOR);
  const [savingEdit, setSavingEdit] = useState(false);
  // 확대·축소 — pdf.js 가 이해하는 값("page-width" 또는 "1.25" 같은 배율 문자열)
  const [scale, setScale] = useState("page-width");
  const [zoomPct, setZoomPct] = useState(100);
  const scrollToRef = useRef<((h: IHighlight) => void) | null>(null);
  const highlighterRef = useRef<PdfHighlighter<IHighlight> | null>(null);

  // 워커 스레드에서도 동일 출처로 정확히 fetch 되도록 절대 URL 사용
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const proxied = `${origin}/api/pdf?url=${encodeURIComponent(pdfUrl)}`;

  useEffect(() => {
    fetchHighlights(paperId)
      .then(setDbHighlights)
      .catch((e) => {
        console.error(e);
        setLoadError("하이라이트를 불러오지 못했습니다.");
      });
  }, [paperId]);

  // 현재 배율(%)을 뷰어에서 받아 온다. 창 크기가 바뀌면 page-width 배율도 바뀌므로
  // 버튼을 누를 때만이 아니라 pdf.js 의 scalechanging 이벤트를 구독한다.
  useEffect(() => {
    let cancelled = false;
    let detach: (() => void) | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let tries = 0;

    const attach = () => {
      if (cancelled) return;
      const viewer = highlighterRef.current?.viewer;
      if (!viewer?.eventBus) {
        // PDF 로딩이 끝나야 뷰어가 생긴다. 잠깐씩 다시 시도.
        if (tries++ < 100) timer = setTimeout(attach, 200);
        return;
      }
      const onScaleChanging = (e: { scale?: number }) => {
        if (typeof e.scale === "number") setZoomPct(Math.round(e.scale * 100));
      };
      viewer.eventBus.on("scalechanging", onScaleChanging);
      detach = () => viewer.eventBus.off("scalechanging", onScaleChanging);
      if (viewer.currentScale) setZoomPct(Math.round(viewer.currentScale * 100));
    };

    attach();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      detach?.();
    };
  }, [pdfUrl]);

  /**
   * 배율 적용. state 로도 들고 있어야 창 크기 변경/패널 토글 뒤에도
   * (PdfHighlighter 가 pdfScaleValue 로 되돌리므로) 배율이 유지된다.
   */
  const applyScale = (value: string) => {
    setScale(value);
    const viewer = highlighterRef.current?.viewer;
    if (!viewer) return;
    try {
      viewer.currentScaleValue = value;
    } catch (e) {
      console.error(e);
    }
  };

  const zoomBy = (factor: number) => {
    const current = highlighterRef.current?.viewer?.currentScale ?? zoomPct / 100;
    const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, current * factor));
    applyScale(next.toFixed(2));
  };

  const highlights = dbHighlights.map(toIHighlight);

  const addHighlight = async (
    position: IHighlight["position"],
    content: IHighlight["content"],
    note: string,
    color: string
  ) => {
    try {
      const saved = await createHighlight({
        paper_id: paperId,
        member_id: currentMemberId,
        text: content.text ?? "",
        position,
        note,
        color,
      });
      setDbHighlights((prev) => [...prev, saved]);
    } catch (e) {
      console.error(e);
      alert("하이라이트 저장에 실패했습니다.");
    }
  };

  const startEdit = (h: DBHighlight) => {
    setEditingId(h.id);
    setDraftNote(h.note ?? "");
    setDraftColor(h.color || DEFAULT_HIGHLIGHT_COLOR);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraftNote("");
  };

  const saveEdit = async (id: string) => {
    setSavingEdit(true);
    try {
      const saved = await updateHighlight(id, {
        note: draftNote.trim(),
        color: draftColor,
      });
      setDbHighlights((prev) => prev.map((x) => (x.id === id ? saved : x)));
      cancelEdit();
    } catch (e) {
      console.error(e);
      alert("메모 수정에 실패했습니다.");
    } finally {
      setSavingEdit(false);
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
    <div className="relative flex h-full min-h-0">
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
              ref={highlighterRef}
              pdfDocument={pdfDocument}
              enableAreaSelection={(event) => areaMode || event.altKey}
              onScrollChange={resetHash}
              pdfScaleValue={scale}
              scrollRef={(scrollTo) => {
                scrollToRef.current = scrollTo;
              }}
              onSelectionFinished={(
                position,
                content,
                hideTipAndSelection
              ) => (
                <NewHighlightTip
                  onCancel={hideTipAndSelection}
                  onConfirm={(note, color) => {
                    addHighlight(position, content, note, color);
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
                const db = dbHighlights.find((h) => h.id === highlight.id);
                const color = highlightColor(db?.color);
                // 저장된 원본 position 으로 판별한다.
                // (페이지별로 잘린 position 은 rects 가 비어 보일 수 있다)
                const isArea = isAreaPosition(db?.position ?? highlight.position);

                const box = isArea ? (
                  <AreaHighlightBox
                    rect={highlight.position.boundingRect}
                    color={color}
                    isScrolledTo={isScrolledTo}
                  />
                ) : (
                  <TextHighlightBox
                    rects={highlight.position.rects}
                    color={color}
                    isScrolledTo={isScrolledTo}
                  />
                );

                const note = highlight.comment?.text?.trim();
                if (!note) return <div key={index}>{box}</div>;

                return (
                  <Popup
                    key={index}
                    popupContent={
                      <div className="max-w-xs whitespace-pre-wrap rounded-lg bg-[#2b2b2b] px-3 py-2 text-xs text-white shadow-lg">
                        {note}
                      </div>
                    }
                    onMouseOver={(p) => setTip(highlight, () => p)}
                    onMouseOut={hideTip}
                  >
                    {box}
                  </Popup>
                );
              }}
              highlights={highlights}
            />
          )}
        </PdfLoader>

        {/* 툴바 — 영역 선택 토글 + 확대/축소 */}
        <div className="absolute left-3 top-3 z-20 flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setAreaMode((v) => !v)}
            title="켜면 드래그로 그림·표 영역을 네모로 하이라이트합니다"
            className={`rounded-full px-3 py-1 text-[11px] font-semibold shadow transition ${
              areaMode
                ? "bg-accent text-white"
                : "bg-white/90 text-muted hover:text-accent"
            }`}
          >
            {areaMode ? "■ 영역 선택 켜짐" : "□ 영역 선택"}
          </button>

          <div className="flex items-center gap-0.5 rounded-full bg-white/90 px-1 py-0.5 shadow">
            <button
              onClick={() => zoomBy(1 / ZOOM_STEP)}
              title="축소"
              aria-label="축소"
              className="h-6 w-6 rounded-full text-[13px] font-bold leading-none text-muted hover:bg-surface2 hover:text-accent"
            >
              −
            </button>
            <button
              onClick={() => applyScale("page-width")}
              title="너비에 맞추기"
              className="min-w-[46px] rounded-full px-1 text-[11px] font-semibold text-muted hover:text-accent"
            >
              {zoomPct}%
            </button>
            <button
              onClick={() => zoomBy(ZOOM_STEP)}
              title="확대"
              aria-label="확대"
              className="h-6 w-6 rounded-full text-[13px] font-bold leading-none text-muted hover:bg-surface2 hover:text-accent"
            >
              ＋
            </button>
          </div>
        </div>
      </div>

      {/* 메모 패널 — 작은 화면에서는 PDF 위에 겹쳐 뜬다 */}
      {notesOpen && (
        <aside className="absolute inset-y-0 right-0 z-30 flex w-[86%] max-w-[320px] flex-col border-l border-line bg-bg shadow-[-8px_0_24px_rgba(28,31,38,0.12)] md:static md:z-auto md:w-72 md:max-w-none md:shadow-none">
          <div className="flex items-start justify-between gap-2 border-b border-line px-4 py-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-ink">
                하이라이트 · 메모
              </div>
              <div className="text-[11px] leading-snug text-muted">
                {areaMode
                  ? "영역 선택 켜짐 — 드래그로 네모를 그리세요. (문장 선택은 잠시 꺼짐)"
                  : "문장을 드래그하면 색과 메모를 남길 수 있어요. 남긴 메모는 아래에서 수정합니다."}
              </div>
            </div>
            <button
              onClick={onCloseNotes}
              aria-label="메모 닫기"
              className="shrink-0 rounded-md border border-line px-1.5 py-0.5 text-xs text-muted hover:border-accent hover:text-accent"
            >
              ✕
            </button>
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
                {dbHighlights.map((h) => {
                  const c = highlightColor(h.color);
                  const isArea = isAreaPosition(h.position);
                  const editing = editingId === h.id;
                  return (
                    <li key={h.id} className="group px-4 py-3 hover:bg-[#faf9f8]">
                      <button
                        onClick={() => scrollToId(h.id)}
                        className="block w-full text-left"
                      >
                        {isArea ? (
                          <span
                            className="inline-block rounded px-1.5 py-0.5 text-[11px] text-[#5f5e5b]"
                            style={{ background: c.fill }}
                          >
                            영역 하이라이트
                          </span>
                        ) : (
                          h.text && (
                            <blockquote
                              className="pl-2 text-xs italic text-[#5f5e5b]"
                              style={{ borderLeft: `3px solid ${c.dot}` }}
                            >
                              {h.text.length > 140
                                ? h.text.slice(0, 140) + "…"
                                : h.text}
                            </blockquote>
                          )
                        )}
                        {!editing && h.note && (
                          <p className="mt-1.5 whitespace-pre-wrap text-sm text-ink">
                            {h.note}
                          </p>
                        )}
                      </button>

                      {editing ? (
                        <div className="mt-2">
                          <ColorSwatches
                            value={draftColor}
                            size={18}
                            onChange={setDraftColor}
                          />
                          <textarea
                            autoFocus
                            rows={3}
                            value={draftNote}
                            onChange={(e) => setDraftNote(e.target.value)}
                            placeholder="메모 (비워 두면 메모 없음)"
                            className="mt-1.5 w-full resize-y rounded-md border border-line bg-bg px-2 py-1.5 text-[13px] outline-none focus:border-accent"
                          />
                          <div className="mt-1 flex justify-end gap-1.5">
                            <button
                              onClick={cancelEdit}
                              className="rounded-md px-2 py-1 text-[11px] text-muted hover:bg-surface"
                            >
                              취소
                            </button>
                            <button
                              onClick={() => saveEdit(h.id)}
                              disabled={savingEdit}
                              className="rounded-md bg-accent px-2.5 py-1 text-[11px] font-medium text-white disabled:opacity-60"
                            >
                              {savingEdit ? "저장 중…" : "저장"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <button
                            onClick={() => startEdit(h)}
                            title="색·메모 수정"
                            className="flex items-center gap-1.5 text-[11px] text-muted hover:text-ink"
                          >
                            <span
                              className="inline-block h-3 w-3 rounded-full"
                              style={{
                                background: c.fill,
                                border: `1.5px solid ${c.dot}`,
                              }}
                            />
                            {c.label}
                          </button>
                          <div className="flex items-center gap-2 transition md:opacity-0 md:group-hover:opacity-100">
                            <button
                              onClick={() => startEdit(h)}
                              className="text-[11px] text-muted hover:text-accent"
                            >
                              {h.note ? "메모 수정" : "메모 추가"}
                            </button>
                            <button
                              onClick={() => removeHighlight(h.id)}
                              className="text-[11px] text-muted hover:text-red-600"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
