"use client";

import { useEffect, useState } from "react";
import { Segmented } from "../Segmented";
import { useFiles } from "../useFiles";
import { useRun } from "../useRun";
import { Workspace } from "../Workspace";
import { formatTime } from "@/lib/files";
import { probe, resizeVideoForSocial, SOCIAL_SHAPES, socialSize, type SocialFit, type SocialShape } from "@/lib/media";
import { TOOL_BY_SLUG } from "@/lib/tools";

const tool = TOOL_BY_SLUG["resize-video"];

const FIT_HINT: Record<SocialFit, string> = {
  blur: "Your whole video stays visible, with a soft blurred copy filling the empty space. The most popular look.",
  bars: "Your whole video stays visible, with black bars filling the empty space.",
  crop: "The video fills the frame; the edges that don't fit are cut off.",
};

export default function ResizeVideo() {
  const f = useFiles("video", false);
  const r = useRun();
  const [shape, setShape] = useState<SocialShape>("9:16");
  const [fit, setFit] = useState<SocialFit>("blur");
  const [hd, setHd] = useState(false);
  const [meta, setMeta] = useState<{ duration: number } | null>(null);
  const item = f.items[0];
  const { setDetail } = f;

  useEffect(() => {
    setMeta(null);
    if (!item) return;
    probe(item.file).then((m) => {
      setMeta({ duration: m.duration });
      if (m.duration) setDetail(item.id, `${formatTime(m.duration)}${m.width ? `, ${m.width} × ${m.height}` : ""}`);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id]);

  const { reset } = r;
  useEffect(() => reset(), [f.items, shape, fit, hd, reset]);
  const size = socialSize(shape, hd);

  return (
    <Workspace
      tool={tool}
      {...f}
      {...r}
      listHeading="Your video"
      options={
        <>
          <Segmented
            legend="Shape"
            name="vshape"
            value={shape}
            onChange={setShape}
            options={(Object.keys(SOCIAL_SHAPES) as SocialShape[]).map((k) => ({ value: k, label: SOCIAL_SHAPES[k].label }))}
            hint={`For ${SOCIAL_SHAPES[shape].for}. ${size.width} × ${size.height} pixels.`}
          />
          <Segmented
            legend="Fill the space with"
            name="vfit"
            value={fit}
            onChange={setFit}
            options={[
              { value: "blur", label: "Blurred background" },
              { value: "bars", label: "Black bars" },
              { value: "crop", label: "Crop to fill" },
            ]}
            hint={FIT_HINT[fit]}
          />
          <Segmented
            legend="Quality"
            name="vhd"
            value={hd ? "hd" : "sd"}
            onChange={(v) => setHd(v === "hd")}
            options={[
              { value: "sd", label: "720p (faster)" },
              { value: "hd", label: "1080p (sharper)" },
            ]}
          />
          {(meta?.duration ?? 0) > 120 && <p className="hint">This video is over 2 minutes, so it may take several minutes on your device. Keep this tab open.</p>}
        </>
      }
      actionLabel="Resize video"
      busyLabel="Resizing video"
      canRun={!!item && !!meta}
      blockedReason="Reading the video…"
      onRun={() => r.run(async (report) => [await resizeVideoForSocial(item.file, { shape, fit, hd, duration: meta!.duration }, report)])}
      zipName="readily-video.zip"
      next={["compress-video", "auto-subtitles", "trim-video"]}
      onRestart={() => {
        f.setItems([]);
        r.reset();
      }}
    />
  );
}
