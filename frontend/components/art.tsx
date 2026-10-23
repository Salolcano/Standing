/** Hand-drawn style marks: a tangle of scribbles that resolves into one clean line and a red spark. */

export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M10 46h44" stroke="#1b1916" strokeWidth="6" strokeLinecap="round" />
      <circle cx="32" cy="25" r="10" fill="#e5432b" />
    </svg>
  );
}

export function Spark({ size = 22, color = "#e5432b" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="pulse">
      <path d="M12 1l2.2 7.3L22 11l-7.8 2.7L12 23l-2.2-9.3L2 11l7.8-2.7z" fill={color} />
    </svg>
  );
}

export function HeroArt() {
  return (
    <svg viewBox="0 0 640 360" role="img" aria-label="Many tangled documents resolve into one clean line that ends in a red spark" className="w-full h-auto">
      <g fill="none" stroke="#1b1916" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path className="draw" d="M14 170c40-110 70 80 104-8s60-120 92-20-40 110-6 60 70-150 108-40-20 90 22 30 40-60 58 8" />
        <path className="draw draw-2" d="M20 210c46-60 66 30 96-30s58 60 92 0 38-70 78 4-30 60 8 24 54-50 74-12" opacity=".55" />
        <path className="draw draw-3" d="M10 120c34 40 64-60 98-10s46 70 86 12 60-44 88-6" opacity=".35" />
        <path className="draw" d="M338 168c60-4 110 4 190 0" strokeWidth="3.4" style={{ animationDelay: "1.4s" }} />
      </g>
      <g className="float">
        <rect x="64" y="262" width="54" height="54" rx="6" fill="#fffdf9" stroke="#1b1916" strokeWidth="2" transform="rotate(-8 91 289)" />
        <path d="M168 316l30-52 30 52z" fill="#fffdf9" stroke="#1b1916" strokeWidth="2" strokeLinejoin="round" />
        <path d="M268 276c-12-20 14-40 36-30s26 38 6 52-38 6-42-22z" fill="#fffdf9" stroke="#1b1916" strokeWidth="2" />
      </g>
      <g transform="translate(540 168)">
        <circle r="26" fill="#fbe3dd" className="pulse" />
        <path d="M0-20l5 14.6L20 0l-15 5.4L0 20-5 5.4-20 0l15-5.4z" fill="#e5432b" />
      </g>
    </svg>
  );
}

export function Squiggle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 12" className={className} aria-hidden="true" preserveAspectRatio="none">
      <path d="M2 7c18-8 30 6 52-1s32-6 54 0 36 6 54-1 28-4 56 1" fill="none" stroke="#e5432b" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}
