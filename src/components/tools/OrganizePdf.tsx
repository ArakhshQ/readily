"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, RotateCcw, RotateCw, Trash } from "../Icons";
import { useFiles } from "../useFiles";
import { useRun } from "../useRun";
import { Workspace } from "../Workspace";
import { organizePdf } from "@/lib/pdf-ops";
import { TOOL_BY_SLUG } from "@/lib/tools";

const tool = TOOL_BY_SLUG["organize-pdf"];

interface Card {
  key: string;
  /** Zero-based index in the original PDF. */
  index: number;
  rotate: number;
}

export default function OrganizePdf() {
  const f = useFiles("pdf", false);
  const r = useRun();
  const [cards, setCards] = useState<Card[]>([]);
  const [original, setOriginal] = useState<Card[]>([]);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const dragFrom = useRef<number | null>(null);

  const item = f.items[0];
  useEffect(() => {
    setCards([]);
    setThumbs([]);
    if (!item) return;
    let live = true;
    setLoading(true);
    (async () => {
      try {
        const { pageCount } = await import("@/lib/pdf-ops");
        const n = await pageCount(item.file);
        if (!live) return;
        const start = Array.from({ length: n }, (_, i) => ({ key: `p${i}`, index: i, rotate: 0 }));
        setCards(start);
        setOriginal(start);
        setThumbs(new Array(n).fill(""));
        const { thumbnails } = await import("@/lib/pdf-render");
        await thumbnails(item.file, 150, (i, url) => {
          if (live) setThumbs((prev) => Object.assign(prev.slice(), { [i]: url }));
        });
      } catch (e) {
        if (live) r.setError(e instanceof Error ? e.message : "This PDF couldn't be opened.");
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  const { reset } = r;
  useEffect(() => reset(), [f.items, cards, reset]);

  function update(i: number, fn: (c: Card) => Card | null) {
    setCards((prev) => {
      const next = prev.slice();
      const res = fn(next[i]);
      if (res === null) next.splice(i, 1);
      else next[i] = res;
      return next;
    });
  }
  function move(from: number, to: number) {
    if (to < 0 || to >= cards.length || from === to) return;
    setCards((prev) => {
      const next = prev.slice();
      const [c] = next.splice(from, 1);
      next.splice(to, 0, c);
      return next;
    });
  }

  const changed =
    cards.length !== original.length || cards.some((c, i) => c.index !== original[i]?.index || c.rotate % 360 !== 0);
  const removed = original.length - cards.length;

  return (
    <Workspace
      tool={tool}
      {...f}
      {...r}
      hideList
      reorder={false}
      listHeading="Your PDF"
      options={
        <div>
          <div className="list-head">
            <p>
              {item?.file.name}
              <span>
                {cards.length} {cards.length === 1 ? "page" : "pages"}
                {removed ? `, ${removed} removed` : ""}
              </span>
            </p>
            <span style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              <button type="button" className="btn btn-quiet" onClick={() => setCards((p) => p.map((c) => ({ ...c, rotate: (c.rotate + 90) % 360 })))}>
                Rotate all
              </button>
              {changed && (
                <button type="button" className="btn btn-quiet" onClick={() => setCards(original)}>
                  Undo changes
                </button>
              )}
            </span>
          </div>
          {loading && !cards.length && <p className="hint">Opening pages…</p>}
          <ol className="page-grid">
            {cards.map((c, i) => (
              <li
                key={c.key}
                className="page-card"
                draggable
                onDragStart={() => (dragFrom.current = i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragFrom.current !== null) move(dragFrom.current, i);
                  dragFrom.current = null;
                }}
              >
                <div className="page-thumb">
                  {thumbs[c.index] ? (
                    <img src={thumbs[c.index]} alt={`Page ${c.index + 1}`} style={{ transform: `rotate(${c.rotate}deg)` }} draggable={false} />
                  ) : (
                    <span className="hint">…</span>
                  )}
                </div>
                <p className="page-label">
                  {i + 1}
                  {c.index !== i ? <span> (was {c.index + 1})</span> : null}
                </p>
                <div className="page-tools">
                  <button type="button" className="icon-btn" aria-label={`Move page ${i + 1} earlier`} disabled={i === 0} onClick={() => move(i, i - 1)}>
                    <ArrowLeft size={16} />
                  </button>
                  <button type="button" className="icon-btn" aria-label={`Rotate page ${i + 1} left`} onClick={() => update(i, (x) => ({ ...x, rotate: (x.rotate + 270) % 360 }))}>
                    <RotateCcw size={16} />
                  </button>
                  <button type="button" className="icon-btn" aria-label={`Rotate page ${i + 1} right`} onClick={() => update(i, (x) => ({ ...x, rotate: (x.rotate + 90) % 360 }))}>
                    <RotateCw size={16} />
                  </button>
                  <button type="button" className="icon-btn" aria-label={`Delete page ${i + 1}`} disabled={cards.length === 1} onClick={() => update(i, () => null)}>
                    <Trash size={16} />
                  </button>
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label={`Move page ${i + 1} later`}
                    disabled={i === cards.length - 1}
                    onClick={() => move(i, i + 1)}
                  >
                    <ArrowRight size={16} />
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </div>
      }
      actionLabel="Save PDF"
      busyLabel="Saving your PDF"
      canRun={!!item && cards.length > 0 && changed}
      blockedReason={cards.length ? "Move, rotate or delete a page first." : undefined}
      summary={`${cards.length} pages in the new order`}
      onRun={() => r.run(async () => [await organizePdf(item.file, cards.map((c) => ({ index: c.index, rotate: c.rotate })))])}
      zipName="readily-organized.zip"
      next={["add-page-numbers", "compress-pdf", "merge-pdf"]}
      onRestart={() => {
        f.setItems([]);
        r.reset();
      }}
    />
  );
}
