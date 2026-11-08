// Inline icons, drawn on a 24px grid with 2px strokes.
import type { SVGProps } from "react";
import type { ToolSlug } from "@/lib/tools";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 20, children, ...rest }: P) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** The Readily mark: a page with its corner folded and a check across it. */
export function Logo({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <path d="M7 3h13l7 7v15a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V7a4 4 0 0 1 4-4z" fill="#2f5bff" />
      <path d="M20 3v4a3 3 0 0 0 3 3h4z" fill="#9db3ff" />
      <path d="M9.5 17.5l4 4 8.5-9" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export const Check = (p: P) => (
  <Svg {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);
export const Upload = (p: P) => (
  <Svg {...p}>
    <path d="M12 16V4M7 9l5-5 5 5" />
    <path d="M4 15v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </Svg>
);
export const Download = (p: P) => (
  <Svg {...p}>
    <path d="M12 4v12M7 11l5 5 5-5" />
    <path d="M4 18v1a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1" />
  </Svg>
);
export const ArrowRight = (p: P) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);
export const ArrowUp = (p: P) => (
  <Svg {...p}>
    <path d="M12 19V5M6 11l6-6 6 6" />
  </Svg>
);
export const ArrowDown = (p: P) => (
  <Svg {...p}>
    <path d="M12 5v14M6 13l6 6 6-6" />
  </Svg>
);
export const Close = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);
export const Search = (p: P) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </Svg>
);
export const Alert = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5M12 16.5h.01" />
  </Svg>
);
export const Lock = (p: P) => (
  <Svg {...p}>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </Svg>
);
export const Refresh = (p: P) => (
  <Svg {...p}>
    <path d="M20 11a8 8 0 0 0-14.5-4.5L4 8M4 4v4h4" />
    <path d="M4 13a8 8 0 0 0 14.5 4.5L20 16M20 20v-4h-4" />
  </Svg>
);
export const FileIcon = (p: P) => (
  <Svg {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5" />
  </Svg>
);

const glyphs: Record<ToolSlug, (p: P) => React.ReactElement> = {
  "jpg-to-pdf": (p) => (
    <Svg {...p}>
      <rect x="3" y="4" width="11" height="9" rx="1.5" />
      <path d="M3 11l3-3 3 3 2-2 3 3" />
      <path d="M15 9h3l3 3v7a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-3" />
    </Svg>
  ),
  "merge-pdf": (p) => (
    <Svg {...p}>
      <rect x="3" y="3" width="8" height="10" rx="1.5" />
      <rect x="13" y="3" width="8" height="10" rx="1.5" />
      <path d="M7 15v2a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-2M12 19v2" />
    </Svg>
  ),
  "split-pdf": (p) => (
    <Svg {...p}>
      <rect x="7" y="2" width="10" height="7" rx="1.5" />
      <path d="M12 9v3M12 12l-5 3M12 12l5 3" />
      <rect x="2" y="15" width="8" height="7" rx="1.5" />
      <rect x="14" y="15" width="8" height="7" rx="1.5" />
    </Svg>
  ),
  "compress-image": (p) => (
    <Svg {...p}>
      <path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4" />
      <path d="M9 9l-3-3M15 9l3-3M15 15l3 3M9 15l-3 3" />
    </Svg>
  ),
  "resize-image": (p) => (
    <Svg {...p}>
      <rect x="3" y="9" width="12" height="12" rx="1.5" />
      <path d="M13 3h8v8M21 3l-8 8" />
    </Svg>
  ),
  "convert-image": (p) => (
    <Svg {...p}>
      <path d="M4 8h13l-3-3M20 16H7l3 3" />
    </Svg>
  ),
};

export function ToolGlyph({ slug, size = 22 }: { slug: ToolSlug; size?: number }) {
  const G = glyphs[slug];
  return <G size={size} />;
}
