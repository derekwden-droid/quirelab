import { useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";

interface TooltipState {
  x: number;
  y: number;
  content: ReactNode;
}

const M = { top: 14, right: 90, bottom: 34, left: 52 };
const W = 720;
const H = 300;

function useTooltip() {
  const [tip, setTip] = useState<TooltipState | null>(null);
  const node = tip ? (
    <div className="chart-tooltip" style={{ left: tip.x, top: tip.y }}>
      {tip.content}
    </div>
  ) : null;
  return { tip, setTip, node };
}

/* ---------------- Multi-series line chart (linear or log-log) ------------- */

export interface Series {
  name: string;
  color: string;
  points: { x: number; y: number; meta?: string }[];
}

export function LineChart({
  series,
  logLog = false,
  xLabel,
  yLabel,
  yFmt = (v: number) => v.toPrecision(3),
  xFmt = (v: number) => String(v),
}: {
  series: Series[];
  logLog?: boolean;
  xLabel: string;
  yLabel: string;
  yFmt?: (v: number) => string;
  xFmt?: (v: number) => string;
}) {
  const { setTip, node } = useTooltip();
  const wrapRef = useRef<HTMLDivElement>(null);

  const { xTicks, yTicks, sx, sy, xMin, xMax } = useMemo(() => {
    const all = series.flatMap((s) => s.points);
    const t = logLog ? Math.log10 : (v: number) => v;
    const xs = all.map((p) => t(p.x));
    const ys = all.map((p) => t(p.y));
    const xMin = Math.min(...xs);
    const xMax = Math.max(...xs);
    const yMin = Math.min(...ys);
    const yMax = Math.max(...ys);
    const plotW = W - M.left - M.right;
    const plotH = H - M.top - M.bottom;
    const sx = (v: number) =>
      M.left + ((t(v) - xMin) / (xMax - xMin || 1)) * plotW;
    const sy = (v: number) =>
      M.top + plotH - ((t(v) - yMin) / (yMax - yMin || 1)) * plotH;
    let xTicks: number[];
    let yTicks: number[];
    if (logLog) {
      xTicks = [];
      for (let e = Math.floor(xMin); e <= Math.ceil(xMax); e++) xTicks.push(10 ** e);
      yTicks = [];
      for (let e = Math.floor(yMin); e <= Math.ceil(yMax); e++) yTicks.push(10 ** e);
    } else {
      const n = 5;
      xTicks = Array.from({ length: n + 1 }, (_, i) => xMin + ((xMax - xMin) / n) * i);
      yTicks = Array.from({ length: n }, (_, i) => yMin + ((yMax - yMin) / (n - 1)) * i);
    }
    return { xTicks, yTicks, sx, sy, xMin, xMax };
  }, [series, logLog]);

  function handleMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best: { d: number; s: Series; p: Series["points"][number] } | null = null;
    for (const s of series) {
      for (const p of s.points) {
        const d = Math.abs(sx(p.x) - px);
        if (!best || d < best.d) best = { d, s, p };
      }
    }
    if (best && wrapRef.current) {
      const wrapRect = wrapRef.current.getBoundingClientRect();
      const cx = (sx(best.p.x) / W) * rect.width + rect.left - wrapRect.left;
      const cy = (sy(best.p.y) / H) * rect.height + rect.top - wrapRect.top;
      setTip({
        x: cx,
        y: cy,
        content: (
          <>
            <strong>{best.s.name}</strong>
            <br />
            {xLabel}: {xFmt(best.p.x)} · {yLabel}: {yFmt(best.p.y)}
            {best.p.meta ? (
              <>
                <br />
                <span className="muted">{best.p.meta}</span>
              </>
            ) : null}
          </>
        ),
      });
    }
  }

  return (
    <div>
      <div className="chart-wrap" ref={wrapRef}>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: "100%", height: "auto", display: "block" }}
          onMouseMove={handleMove}
          onMouseLeave={() => setTip(null)}
          role="img"
          aria-label={`${yLabel} vs ${xLabel} line chart`}
        >
          {yTicks.map((v, i) => {
            const y = logLog ? sy(v) : M.top + (H - M.top - M.bottom) - ((v - yTicks[0]) / (yTicks[yTicks.length - 1] - yTicks[0] || 1)) * (H - M.top - M.bottom);
            const val = logLog ? v : v;
            return (
              <g key={i}>
                <line x1={M.left} x2={W - M.right} y1={y} y2={y} stroke="var(--grid)" strokeWidth={1} />
                <text x={M.left - 8} y={y + 4} textAnchor="end" fontSize={11} fill="var(--text-muted)">
                  {yFmt(val)}
                </text>
              </g>
            );
          })}
          {xTicks.map((v, i) => {
            const x = logLog ? sx(v) : M.left + ((v - xMin) / (xMax - xMin || 1)) * (W - M.left - M.right);
            return (
              <text key={i} x={x} y={H - M.bottom + 18} textAnchor="middle" fontSize={11} fill="var(--text-muted)">
                {xFmt(v)}
              </text>
            );
          })}
          <line x1={M.left} x2={W - M.right} y1={H - M.bottom} y2={H - M.bottom} stroke="var(--baseline)" strokeWidth={1} />
          {series.map((s) => (
            <g key={s.name}>
              <path
                d={s.points.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ")}
                fill="none"
                stroke={s.color}
                strokeWidth={2}
                strokeLinejoin="round"
              />
              <text
                x={sx(s.points[s.points.length - 1].x) + 6}
                y={sy(s.points[s.points.length - 1].y) + 4}
                fontSize={11}
                fontWeight={600}
                fill="var(--text-secondary)"
              >
                {s.name}
              </text>
            </g>
          ))}
          <text x={W - M.right} y={H - 6} textAnchor="end" fontSize={11} fill="var(--text-muted)">
            {xLabel}
          </text>
          <text x={14} y={M.top + 2} fontSize={11} fill="var(--text-muted)">
            {yLabel}
          </text>
        </svg>
        {node}
      </div>
      {series.length > 1 && (
        <div className="legend">
          {series.map((s) => (
            <span className="item" key={s.name}>
              <span className="swatch" style={{ background: s.color }} />
              {s.name}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Bar chart (vertical) ------------------------------------ */

export function BarChart({
  data,
  color,
  yLabel,
  yFmt = (v: number) => v.toPrecision(3),
  height = 240,
}: {
  data: { label: string; value: number }[];
  color: string;
  yLabel: string;
  yFmt?: (v: number) => string;
  height?: number;
}) {
  const { setTip, node } = useTooltip();
  const wrapRef = useRef<HTMLDivElement>(null);
  const m = { top: 12, right: 10, bottom: 26, left: 48 };
  const h = height;
  const max = Math.max(...data.map((d) => d.value));
  const plotW = W - m.left - m.right;
  const plotH = h - m.top - m.bottom;
  const band = plotW / data.length;
  const barW = Math.max(2, band - 2); // 2px surface gap between bars
  const yTicks = [0, max / 2, max];

  return (
    <div className="chart-wrap" ref={wrapRef}>
      <svg
        viewBox={`0 0 ${W} ${h}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        onMouseLeave={() => setTip(null)}
        role="img"
        aria-label={`${yLabel} bar chart`}
      >
        {yTicks.map((v, i) => {
          const y = m.top + plotH - (v / max) * plotH;
          return (
            <g key={i}>
              <line x1={m.left} x2={W - m.right} y1={y} y2={y} stroke="var(--grid)" strokeWidth={1} />
              <text x={m.left - 8} y={y + 4} textAnchor="end" fontSize={11} fill="var(--text-muted)">
                {yFmt(v)}
              </text>
            </g>
          );
        })}
        {data.map((d, i) => {
          const x = m.left + i * band + (band - barW) / 2;
          const barH = (d.value / max) * plotH;
          const y = m.top + plotH - barH;
          return (
            <g key={d.label + i}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={barH}
                fill={color}
                rx={Math.min(4, barW / 2)}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
                  const wrapRect = wrapRef.current!.getBoundingClientRect();
                  setTip({
                    x: ((x + barW / 2) / W) * rect.width + rect.left - wrapRect.left,
                    y: (y / h) * rect.height + rect.top - wrapRect.top,
                    content: (
                      <>
                        <strong>{d.label}</strong>
                        <br />
                        {yLabel}: {yFmt(d.value)}
                      </>
                    ),
                  });
                }}
              />
              {(data.length <= 30 || i % 2 === 0) && (
                <text
                  x={x + barW / 2}
                  y={h - m.bottom + 16}
                  textAnchor="middle"
                  fontSize={data.length > 20 ? 9 : 11}
                  fill="var(--text-muted)"
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}
        <line x1={m.left} x2={W - m.right} y1={m.top + plotH} y2={m.top + plotH} stroke="var(--baseline)" strokeWidth={1} />
      </svg>
      {node}
    </div>
  );
}

/* ---------------- Horizontal bar chart ------------------------------------ */

export function HBarChart({
  data,
  color,
  valueLabel,
  vFmt = (v: number) => String(v),
}: {
  data: { label: string; value: number }[];
  color: string;
  valueLabel: string;
  vFmt?: (v: number) => string;
}) {
  const { setTip, node } = useTooltip();
  const wrapRef = useRef<HTMLDivElement>(null);
  const rowH = 24;
  const m = { top: 4, right: 70, bottom: 4, left: 90 };
  const h = m.top + m.bottom + data.length * rowH;
  const plotW = W - m.left - m.right;
  const max = Math.max(...data.map((d) => d.value));

  return (
    <div className="chart-wrap" ref={wrapRef}>
      <svg
        viewBox={`0 0 ${W} ${h}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        onMouseLeave={() => setTip(null)}
        role="img"
        aria-label={`${valueLabel} horizontal bar chart`}
      >
        {data.map((d, i) => {
          const y = m.top + i * rowH;
          const w = (d.value / max) * plotW;
          return (
            <g key={d.label}>
              <text x={m.left - 8} y={y + rowH / 2 + 4} textAnchor="end" fontSize={12} fill="var(--text-secondary)">
                {d.label}
              </text>
              <rect
                x={m.left}
                y={y + 4}
                width={Math.max(w, 2)}
                height={rowH - 8}
                rx={4}
                fill={color}
                onMouseEnter={(e) => {
                  const rect = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
                  const wrapRect = wrapRef.current!.getBoundingClientRect();
                  setTip({
                    x: ((m.left + w / 2) / W) * rect.width + rect.left - wrapRect.left,
                    y: (y / h) * rect.height + rect.top - wrapRect.top,
                    content: (
                      <>
                        <strong>{d.label}</strong>
                        <br />
                        {valueLabel}: {vFmt(d.value)}
                      </>
                    ),
                  });
                }}
              />
              <text x={m.left + w + 6} y={y + rowH / 2 + 4} fontSize={11} fill="var(--text-muted)">
                {vFmt(d.value)}
              </text>
            </g>
          );
        })}
      </svg>
      {node}
    </div>
  );
}

/* ---------------- Stat tile ------------------------------------------------ */

export function StatTile({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="tile">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {detail && <div className="detail">{detail}</div>}
    </div>
  );
}
