const ProgressRing = ({ percent, size = 88, stroke = 7 }) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div
      role="progressbar"
      aria-label="Weekly completion"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - percent / 100)}
          style={{ transition: "stroke-dashoffset 0.4s ease" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-display text-2xl tabular-nums">
        {percent}
        <span className="text-sm text-muted">%</span>
      </span>
    </div>
  );
};

export default ProgressRing;
