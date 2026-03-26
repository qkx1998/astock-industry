/**
 * 方案B：相对沪深300超额收益图
 * 方案C：绝对价格指数图（原始收盘价）
 * 仅展示主行业（type === "industry"）
 */
import { useState, useMemo, useCallback } from "react";
import { getSeriesColor } from "@/lib/chartColors";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

interface SeriesItem {
  code: string;
  name: string;
  type: string;
  data: (number | null)[];
}

// ─── Shared Tooltip ───────────────────────────────────────────────────────────
function SharedTooltip({ active, payload, label, formatter }: any) {
  if (!active || !payload || !payload.length) return null;
  const sorted = [...payload]
    .filter((p) => p.value != null)
    .sort((a, b) => (b.value as number) - (a.value as number));
  return (
    <div
      style={{
        background: "oklch(0.13 0.025 210 / 0.97)",
        border: "1px solid oklch(0.30 0.05 195 / 0.5)",
        backdropFilter: "blur(12px)",
        borderRadius: 8,
        padding: "8px 10px",
        minWidth: 200,
        maxWidth: 260,
        pointerEvents: "none",
      }}
    >
      <p style={{ color: "oklch(0.55 0.15 195)", fontWeight: 700, fontSize: 11, marginBottom: 4 }}>
        {label}
      </p>
      {sorted.map((entry: any) => (
        <div key={entry.dataKey} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "1px 0" }}>
          <span style={{ color: entry.color, fontSize: 10, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {entry.name}
          </span>
          <span style={{
            color: formatter ? formatter(entry.value).color : ((entry.value as number) >= 0 ? "#7CFC00" : "#FF6B35"),
            fontFamily: "monospace", fontWeight: 600, fontSize: 10, flexShrink: 0
          }}>
            {formatter ? formatter(entry.value).text : `${(entry.value as number) >= 0 ? "+" : ""}${(entry.value as number).toFixed(2)}%`}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── 共用图例 + 高亮逻辑 Hook ─────────────────────────────────────────────────
function useLegendHover() {
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  const toggle = useCallback((code: string) => {
    setHiddenSeries(prev => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code); else next.add(code);
      return next;
    });
  }, []);

  const getLineStyle = useCallback((code: string, idx: number) => {
    const color = getSeriesColor(code, "industry", idx);
    if (hiddenSeries.has(code)) return { stroke: color, strokeWidth: 0, strokeOpacity: 0 };
    const hasHover = hoveredCode !== null;
    const isThis = hoveredCode === code;
    if (!hasHover) return { stroke: color, strokeWidth: 1.2, strokeOpacity: 0.85 };
    if (isThis) return { stroke: color, strokeWidth: 3.5, strokeOpacity: 1 };
    return { stroke: color, strokeWidth: 0.5, strokeOpacity: 0.12 };
  }, [hoveredCode, hiddenSeries]);

  return { hoveredCode, setHoveredCode, hiddenSeries, toggle, getLineStyle };
}

// ─── Legend Component ─────────────────────────────────────────────────────────
function Legend({
  series, hoveredCode, setHoveredCode, hiddenSeries, toggle, getColor
}: {
  series: SeriesItem[];
  hoveredCode: string | null;
  setHoveredCode: (c: string | null) => void;
  hiddenSeries: Set<string>;
  toggle: (c: string) => void;
  getColor: (code: string, idx: number) => string;
}) {
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {series.map((s, i) => {
        const color = getColor(s.code, i);
        const isHovered = hoveredCode === s.code;
        return (
          <button key={s.code}
            onClick={() => toggle(s.code)}
            onMouseEnter={() => setHoveredCode(s.code)}
            onMouseLeave={() => setHoveredCode(null)}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-all duration-150"
            style={{
              background: isHovered ? "oklch(0.22 0.04 210)" : "oklch(0.18 0.03 210)",
              border: `1px solid ${color}${isHovered ? "bb" : "40"}`,
              opacity: hiddenSeries.has(s.code) ? 0.35 : 1,
              transform: isHovered ? "scale(1.06)" : "scale(1)",
              boxShadow: isHovered ? `0 0 10px ${color}50` : "none",
            }}>
            <span className="inline-block rounded" style={{ background: color, width: 16, height: isHovered ? 2.5 : 1.5 }} />
            <span style={{ color: isHovered ? "oklch(0.97 0.02 200)" : "oklch(0.85 0.03 200)", fontWeight: isHovered ? 700 : 400 }}>
              {s.name}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ─── 方案B：超额收益图 ─────────────────────────────────────────────────────────
export function ExcessReturnChart({
  dates,
  series,       // 已归一化的 series（方案A的数据）
  hs300Returns, // 沪深300归一化涨跌幅
}: {
  dates: string[];
  series: SeriesItem[];
  hs300Returns: (number | null)[];
}) {
  const { hoveredCode, setHoveredCode, hiddenSeries, toggle, getLineStyle } = useLegendHover();

  // 仅取主行业
  const industrySeries = series.filter(s => s.type === "industry");

  // 计算超额收益 = 行业归一化涨跌幅 - 沪深300归一化涨跌幅
  const excessSeries = useMemo(() => {
    return industrySeries.map(s => ({
      ...s,
      data: s.data.map((v, i) => {
        if (v === null) return null;
        const hs300 = hs300Returns[i];
        if (hs300 === null) return null;
        return parseFloat((v - hs300).toFixed(2));
      }),
    }));
  }, [industrySeries, hs300Returns]);

  const chartData = useMemo(() => {
    return dates.map((date, i) => {
      const point: Record<string, string | number | null> = { date };
      excessSeries.forEach(s => { point[s.code] = s.data[i] ?? null; });
      return point;
    });
  }, [dates, excessSeries]);

  const bgSeries = excessSeries.filter(s => s.code !== hoveredCode && !hiddenSeries.has(s.code));
  const fgSeries = hoveredCode ? excessSeries.filter(s => s.code === hoveredCode && !hiddenSeries.has(s.code)) : [];

  const tooltipFormatter = (v: number) => ({
    text: `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`,
    color: v >= 0 ? "#7CFC00" : "#FF6B35",
  });

  return (
    <div className="rounded-xl p-4"
      style={{ background: "oklch(0.13 0.025 210 / 0.85)", border: "1px solid oklch(0.25 0.04 195 / 0.3)", boxShadow: "0 4px 32px oklch(0.05 0.02 210 / 0.6)" }}>
      <div className="mb-4">
        <h2 className="text-base font-bold" style={{ color: "oklch(0.92 0.05 195)" }}>
          方案B · 相对沪深300超额收益
        </h2>
        <p className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.03 200)" }}>
          纵轴 = 行业涨跌幅 − 沪深300同期涨跌幅；0% 基准线表示"跑平大盘"，正值跑赢，负值跑输
          {hoveredCode && (
            <span className="ml-2 font-semibold" style={{ color: "oklch(0.65 0.18 45)" }}>
              · 高亮：{excessSeries.find(s => s.code === hoveredCode)?.name}
            </span>
          )}
        </p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.03 210)" opacity={0.5} />
          <XAxis dataKey="date"
            tick={{ fill: "oklch(0.50 0.03 200)", fontSize: 11 }} tickLine={false}
            axisLine={{ stroke: "oklch(0.22 0.03 210)" }} interval="preserveStartEnd"
            tickFormatter={(v) => { const d = new Date(v); return `${d.getMonth() + 1}/${d.getDate()}`; }} />
          <YAxis tick={{ fill: "oklch(0.50 0.03 200)", fontSize: 11 }} tickLine={false} axisLine={false}
            tickFormatter={(v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}%`} width={60} />
          <ReferenceLine y={0} stroke="oklch(0.65 0.18 45 / 0.7)" strokeDasharray="4 4" strokeWidth={1.5}
            label={{ value: "沪深300基准", position: "insideTopRight", fill: "oklch(0.65 0.18 45 / 0.7)", fontSize: 10 }} />
          <Tooltip content={<SharedTooltip formatter={tooltipFormatter} />} wrapperStyle={{ pointerEvents: "none" }} isAnimationActive={false} />
          {bgSeries.map((s, _) => {
            const idx = excessSeries.findIndex(x => x.code === s.code);
            const st = getLineStyle(s.code, idx);
            return <Line key={s.code} type="monotone" dataKey={s.code} name={s.name}
              stroke={st.stroke} strokeWidth={st.strokeWidth} strokeOpacity={st.strokeOpacity}
              dot={false} activeDot={false} connectNulls isAnimationActive={false} />;
          })}
          {fgSeries.map((s) => {
            const idx = excessSeries.findIndex(x => x.code === s.code);
            const st = getLineStyle(s.code, idx);
            return <Line key={`fg-${s.code}`} type="monotone" dataKey={s.code} name={s.name}
              stroke={st.stroke} strokeWidth={st.strokeWidth} strokeOpacity={st.strokeOpacity}
              dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: st.stroke }} connectNulls isAnimationActive={false} />;
          })}
        </LineChart>
      </ResponsiveContainer>

      <Legend series={excessSeries} hoveredCode={hoveredCode} setHoveredCode={setHoveredCode}
        hiddenSeries={hiddenSeries} toggle={toggle}
        getColor={(code, idx) => getSeriesColor(code, "industry", idx)} />
    </div>
  );
}

// ─── 方案C：绝对价格指数图 ────────────────────────────────────────────────────
export function AbsolutePriceChart({
  dates,
  rawSeries,
}: {
  dates: string[];
  rawSeries: SeriesItem[];
}) {
  const { hoveredCode, setHoveredCode, hiddenSeries, toggle, getLineStyle } = useLegendHover();

  // 仅取主行业
  const industrySeries = rawSeries.filter(s => s.type === "industry");

  const chartData = useMemo(() => {
    return dates.map((date, i) => {
      const point: Record<string, string | number | null> = { date };
      industrySeries.forEach(s => { point[s.code] = s.data[i] ?? null; });
      return point;
    });
  }, [dates, industrySeries]);

  const bgSeries = industrySeries.filter(s => s.code !== hoveredCode && !hiddenSeries.has(s.code));
  const fgSeries = hoveredCode ? industrySeries.filter(s => s.code === hoveredCode && !hiddenSeries.has(s.code)) : [];

  // 计算Y轴范围（自动适配）
  const allValues = industrySeries.flatMap(s => s.data.filter(v => v !== null) as number[]);
  const minVal = allValues.length > 0 ? Math.min(...allValues) : 0;
  const maxVal = allValues.length > 0 ? Math.max(...allValues) : 1000;
  const padding = (maxVal - minVal) * 0.05;

  const tooltipFormatter = (v: number) => ({
    text: v.toFixed(2),
    color: "oklch(0.85 0.03 200)",
  });

  return (
    <div className="rounded-xl p-4"
      style={{ background: "oklch(0.13 0.025 210 / 0.85)", border: "1px solid oklch(0.25 0.04 195 / 0.3)", boxShadow: "0 4px 32px oklch(0.05 0.02 210 / 0.6)" }}>
      <div className="mb-4">
        <h2 className="text-base font-bold" style={{ color: "oklch(0.92 0.05 195)" }}>
          方案C · 行业指数绝对价格
        </h2>
        <p className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.03 200)" }}>
          纵轴为各行业指数的真实点位（不归一化），可直观看出各行业指数的绝对高低与走势形态
          {hoveredCode && (
            <span className="ml-2 font-semibold" style={{ color: "oklch(0.65 0.18 45)" }}>
              · 高亮：{industrySeries.find(s => s.code === hoveredCode)?.name}
            </span>
          )}
        </p>
      </div>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.03 210)" opacity={0.5} />
          <XAxis dataKey="date"
            tick={{ fill: "oklch(0.50 0.03 200)", fontSize: 11 }} tickLine={false}
            axisLine={{ stroke: "oklch(0.22 0.03 210)" }} interval="preserveStartEnd"
            tickFormatter={(v) => { const d = new Date(v); return `${d.getMonth() + 1}/${d.getDate()}`; }} />
          <YAxis tick={{ fill: "oklch(0.50 0.03 200)", fontSize: 11 }} tickLine={false} axisLine={false}
            domain={[minVal - padding, maxVal + padding]}
            tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)}
            width={60} />
          <Tooltip content={<SharedTooltip formatter={tooltipFormatter} />} wrapperStyle={{ pointerEvents: "none" }} isAnimationActive={false} />
          {bgSeries.map((s) => {
            const idx = industrySeries.findIndex(x => x.code === s.code);
            const st = getLineStyle(s.code, idx);
            return <Line key={s.code} type="monotone" dataKey={s.code} name={s.name}
              stroke={st.stroke} strokeWidth={st.strokeWidth} strokeOpacity={st.strokeOpacity}
              dot={false} activeDot={false} connectNulls isAnimationActive={false} />;
          })}
          {fgSeries.map((s) => {
            const idx = industrySeries.findIndex(x => x.code === s.code);
            const st = getLineStyle(s.code, idx);
            return <Line key={`fg-${s.code}`} type="monotone" dataKey={s.code} name={s.name}
              stroke={st.stroke} strokeWidth={st.strokeWidth} strokeOpacity={st.strokeOpacity}
              dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: st.stroke }} connectNulls isAnimationActive={false} />;
          })}
        </LineChart>
      </ResponsiveContainer>

      <Legend series={industrySeries} hoveredCode={hoveredCode} setHoveredCode={setHoveredCode}
        hiddenSeries={hiddenSeries} toggle={toggle}
        getColor={(code, idx) => getSeriesColor(code, "industry", idx)} />
    </div>
  );
}
