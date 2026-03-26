import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  Layers3,
  Loader2,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ExcessReturnChart } from "@/components/IndustryCharts";
import { getSeriesColor } from "@/lib/chartColors";
import {
  buildLineChartData,
  calculateRankRotation,
  getLastValidValue,
  RS_WINDOW_BY_PERIOD,
  type SeriesLike,
} from "@/lib/industryAnalytics";
import { trpc } from "@/lib/trpc";
import type { IndustryListData, Period } from "@/types/stock";

const PERIODS: Period[] = ["7d", "1m", "3m", "6m", "1y"];

const PERIOD_LABELS: Record<Period, string> = {
  "7d": "7天",
  "1m": "1个月",
  "3m": "3个月",
  "6m": "6个月",
  "1y": "1年",
};

interface OverviewQueryResult {
  loading: boolean;
  series: SeriesLike[];
  rawSeries: SeriesLike[];
  hs300Returns: (number | null)[];
  dates: string[];
  period: string;
  updatedAt: string;
  error: string | null;
}

function formatAxisDate(value: string) {
  const date = new Date(value);
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function percentText(value: number | null, digits = 2) {
  if (value === null || !Number.isFinite(value)) return "--";
  return `${value >= 0 ? "+" : ""}${value.toFixed(digits)}%`;
}

function PeriodButton({ period, active, onClick }: { period: Period; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-4 py-2 text-sm font-semibold transition-all duration-200"
      style={
        active
          ? {
              background: "linear-gradient(135deg, oklch(0.65 0.18 45), oklch(0.58 0.14 195))",
              color: "oklch(0.08 0.02 210)",
              boxShadow: "0 8px 24px oklch(0.62 0.16 45 / 0.35)",
            }
          : {
              background: "oklch(0.17 0.03 210 / 0.9)",
              color: "oklch(0.74 0.03 200)",
              border: "1px solid oklch(0.27 0.04 210)",
            }
      }
    >
      {PERIOD_LABELS[period]}
    </button>
  );
}

function LoadingPanel({ message, progress }: { message: string; progress: number }) {
  return (
    <div className="flex h-[420px] flex-col items-center justify-center gap-5 rounded-2xl border"
      style={{ borderColor: "oklch(0.25 0.04 210)", background: "oklch(0.12 0.02 210 / 0.78)" }}>
      <div className="relative flex h-16 w-16 items-center justify-center rounded-full border"
        style={{ borderColor: "oklch(0.55 0.14 195 / 0.25)" }}>
        <Loader2 className="h-7 w-7 animate-spin" style={{ color: "oklch(0.62 0.15 195)" }} />
        <span className="absolute -bottom-6 text-xs font-semibold" style={{ color: "oklch(0.66 0.16 45)" }}>{progress}%</span>
      </div>
      <div className="w-full max-w-sm space-y-2 px-6 text-center">
        <div className="h-2 overflow-hidden rounded-full" style={{ background: "oklch(0.18 0.03 210)" }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(progress, 8)}%`, background: "linear-gradient(90deg, oklch(0.55 0.15 195), oklch(0.66 0.16 45))" }} />
        </div>
        <p className="text-sm font-medium" style={{ color: "oklch(0.84 0.03 195)" }}>{message}</p>
        <p className="text-xs" style={{ color: "oklch(0.52 0.03 200)" }}>首次拉取在线行情可能需要几十秒，完成后会命中缓存。</p>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex h-[320px] flex-col items-center justify-center gap-3 rounded-2xl border"
      style={{ borderColor: "oklch(0.25 0.04 210)", background: "oklch(0.12 0.02 210 / 0.7)" }}>
      <AlertCircle className="h-8 w-8" style={{ color: "oklch(0.64 0.22 28)" }} />
      <p className="text-sm" style={{ color: "oklch(0.78 0.02 200)" }}>{text}</p>
    </div>
  );
}

function SharedTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const sorted = [...payload]
    .filter(item => item.value !== null && item.value !== undefined)
    .sort((left, right) => Number(right.value) - Number(left.value));

  return (
    <div
      className="min-w-[220px] rounded-xl border px-3 py-2 shadow-2xl"
      style={{
        background: "oklch(0.13 0.025 210 / 0.98)",
        borderColor: "oklch(0.30 0.05 195 / 0.45)",
        backdropFilter: "blur(14px)",
      }}
    >
      <p className="mb-2 text-xs font-bold" style={{ color: "oklch(0.58 0.13 195)" }}>{label}</p>
      <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
        {sorted.map((entry: any) => (
          <div key={entry.dataKey} className="flex items-center justify-between gap-3 text-xs">
            <span className="truncate" style={{ color: entry.color }}>{entry.name}</span>
            <span className="shrink-0 font-mono font-semibold" style={{ color: Number(entry.value) >= 0 ? "#9DFF7A" : "#FF8A65" }}>
              {percentText(Number(entry.value), 2)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RankingTooltip({ active, payload, label, latestMap }: any) {
  if (!active || !payload?.length) return null;
  const sorted = [...payload].sort((left, right) => Number(left.value) - Number(right.value));

  return (
    <div
      className="min-w-[220px] rounded-xl border px-3 py-2 shadow-2xl"
      style={{
        background: "oklch(0.13 0.025 210 / 0.98)",
        borderColor: "oklch(0.30 0.05 195 / 0.45)",
        backdropFilter: "blur(14px)",
      }}
    >
      <p className="mb-2 text-xs font-bold" style={{ color: "oklch(0.58 0.13 195)" }}>{label}</p>
      <div className="space-y-1">
        {sorted.slice(0, 12).map((entry: any) => {
          const latest = latestMap[entry.dataKey] ?? null;
          return (
            <div key={entry.dataKey} className="flex items-center justify-between gap-3 text-xs">
              <span className="truncate" style={{ color: entry.color }}>{entry.name}</span>
              <span className="shrink-0 font-mono font-semibold" style={{ color: "oklch(0.88 0.03 195)" }}>
                第{entry.value}名 · {percentText(latest, 2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function IndustryToggleGroup({
  series,
  hiddenSeries,
  hoveredCode,
  onToggle,
  onHover,
}: {
  series: SeriesLike[];
  hiddenSeries: Set<string>;
  hoveredCode: string | null;
  onToggle: (code: string) => void;
  onHover: (code: string | null) => void;
}) {
  return (
    <div className="rounded-2xl border p-4"
      style={{ borderColor: "oklch(0.25 0.04 210)", background: "oklch(0.12 0.02 210 / 0.76)" }}>
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold" style={{ color: "oklch(0.88 0.04 195)" }}>申万一级行业按钮</p>
          <p className="mt-1 text-xs leading-5" style={{ color: "oklch(0.56 0.03 200)" }}>点击切换显示/隐藏，悬停高亮走势线。按钮数量与图中行业数量保持同一口径。</p>
        </div>
        <div className="rounded-full px-3 py-1 text-xs font-semibold"
          style={{ background: "oklch(0.20 0.03 210)", color: "oklch(0.68 0.14 45)" }}>
          共 {series.length} 个行业
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {series.map((item, index) => {
          const color = getSeriesColor(item.code, "industry", index);
          const isHovered = hoveredCode === item.code;
          const isHidden = hiddenSeries.has(item.code);
          return (
            <button
              key={item.code}
              onClick={() => onToggle(item.code)}
              onMouseEnter={() => onHover(item.code)}
              onMouseLeave={() => onHover(null)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs transition-all duration-150"
              style={{
                background: isHovered ? "oklch(0.22 0.04 210)" : "oklch(0.17 0.03 210)",
                border: `1px solid ${color}${isHovered ? "cc" : "55"}`,
                boxShadow: isHovered ? `0 0 14px ${color}40` : "none",
                opacity: isHidden ? 0.38 : 1,
                transform: isHovered ? "translateY(-1px)" : "translateY(0)",
              }}
            >
              <span className="inline-block h-1.5 w-4 rounded-full" style={{ background: color }} />
              <span style={{ color: isHovered ? "oklch(0.97 0.02 200)" : "oklch(0.85 0.02 200)", fontWeight: isHovered ? 700 : 500 }}>{item.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RankRotationChart({
  dates,
  series,
  hs300Returns,
  period,
  hoveredCode,
  hiddenSeries,
  onHover,
}: {
  dates: string[];
  series: SeriesLike[];
  hs300Returns: (number | null)[];
  period: Period;
  hoveredCode: string | null;
  hiddenSeries: Set<string>;
  onHover: (code: string | null) => void;
}) {
  const rotation = useMemo(() => calculateRankRotation(dates, series, hs300Returns, period), [dates, hs300Returns, period, series]);
  const latestMap = useMemo(() => {
    const result: Record<string, number | null> = {};
    rotation.excessSeries.forEach(item => {
      result[item.code] = getLastValidValue(item.data);
    });
    return result;
  }, [rotation.excessSeries]);

  const latestRankMap = useMemo(() => {
    const result: Record<string, number> = {};
    rotation.latestSnapshot.forEach(item => {
      result[item.code] = item.rank;
    });
    return result;
  }, [rotation.latestSnapshot]);

  const renderSeries = rotation.chartSeries.filter(item => !hiddenSeries.has(item.code));

  return (
    <section className="rounded-[28px] border p-5 md:p-6"
      style={{ borderColor: "oklch(0.25 0.04 210)", background: "linear-gradient(180deg, oklch(0.12 0.025 210 / 0.88), oklch(0.10 0.02 210 / 0.96))", boxShadow: "0 20px 60px oklch(0.04 0.01 210 / 0.35)" }}>
      <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          <div className="mb-2 flex items-center gap-2">
            <Layers3 className="h-4 w-4" style={{ color: "oklch(0.62 0.15 195)" }} />
            <h2 className="text-lg font-black" style={{ color: "oklch(0.93 0.03 195)" }}>行业排名轮动</h2>
          </div>
          <p className="text-sm leading-6" style={{ color: "oklch(0.62 0.03 200)" }}>
            纵轴为行业排名，<span style={{ color: "oklch(0.84 0.03 195)" }}>第 1 名在最上方</span>；横轴与上方走势图对齐。排名依据为
            <span style={{ color: "oklch(0.68 0.16 45)" }}>行业涨幅 − 沪深300涨幅</span> 的相对强度序列斜率，并按当前时间窗自动映射 RS 动量窗口。
            图中默认强调<span style={{ color: "oklch(0.84 0.03 195)" }}>最新排名前 8 的行业</span>，其余轨迹弱化显示，悬停或在下方按钮区选择后可进一步查看。
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:w-[360px]">
          <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "oklch(0.24 0.04 210)", background: "oklch(0.16 0.03 210 / 0.88)" }}>
            <p className="text-xs" style={{ color: "oklch(0.52 0.03 200)" }}>当前时间窗</p>
            <p className="mt-1 text-sm font-bold" style={{ color: "oklch(0.90 0.03 195)" }}>{PERIOD_LABELS[period]}</p>
          </div>
          <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "oklch(0.24 0.04 210)", background: "oklch(0.16 0.03 210 / 0.88)" }}>
            <p className="text-xs" style={{ color: "oklch(0.52 0.03 200)" }}>RS 动量窗口</p>
            <p className="mt-1 text-sm font-bold" style={{ color: "oklch(0.90 0.03 195)" }}>{RS_WINDOW_BY_PERIOD[period]} 日</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="rounded-2xl border p-3 md:p-4" style={{ borderColor: "oklch(0.23 0.03 210)", background: "oklch(0.11 0.02 210 / 0.76)" }}>
          <ResponsiveContainer width="100%" height={360}>
            <LineChart data={rotation.chartData} margin={{ top: 10, right: 12, left: 0, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.03 210)" opacity={0.45} />
              <XAxis
                dataKey="date"
                tick={{ fill: "oklch(0.52 0.03 200)", fontSize: 11 }}
                tickLine={false}
                axisLine={{ stroke: "oklch(0.24 0.03 210)" }}
                interval="preserveStartEnd"
                tickFormatter={formatAxisDate}
              />
              <YAxis
                reversed
                allowDecimals={false}
                domain={[1, rotation.industryCount]}
                tickCount={Math.min(rotation.industryCount, 8)}
                tick={{ fill: "oklch(0.52 0.03 200)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip content={<RankingTooltip latestMap={latestMap} />} wrapperStyle={{ pointerEvents: "none" }} isAnimationActive={false} />
              {[1, 5, 10, 20]
                .filter(level => level <= rotation.industryCount)
                .map(level => (
                  <ReferenceLine
                    key={`rank-${level}`}
                    y={level}
                    stroke={level === 1 ? "oklch(0.68 0.16 45 / 0.55)" : "oklch(0.36 0.04 195 / 0.35)"}
                    strokeDasharray="4 4"
                    ifOverflow="extendDomain"
                  />
                ))}
              {renderSeries.map((item, index) => {
                const color = getSeriesColor(item.code, "industry", index);
                const isHovered = hoveredCode === item.code;
                const dimmed = hoveredCode !== null && !isHovered;
                const latestRank = latestRankMap[item.code] ?? rotation.industryCount;
                const isTopTier = latestRank <= Math.min(8, rotation.industryCount);
                return (
                  <Line
                    key={item.code}
                    type="stepAfter"
                    dataKey={item.code}
                    name={item.name}
                    stroke={color}
                    strokeWidth={isHovered ? 3.4 : isTopTier ? 2.1 : 1.0}
                    strokeOpacity={dimmed ? 0.08 : isTopTier ? 0.88 : 0.24}
                    dot={false}
                    activeDot={{ r: 4, strokeWidth: 0, fill: color }}
                    connectNulls
                    isAnimationActive={false}
                    onMouseOver={() => onHover(item.code)}
                    onMouseOut={() => onHover(null)}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <aside className="rounded-2xl border p-4" style={{ borderColor: "oklch(0.23 0.03 210)", background: "oklch(0.11 0.02 210 / 0.76)" }}>
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-sm font-bold" style={{ color: "oklch(0.89 0.03 195)" }}>最新轮动排名</p>
            <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: "oklch(0.20 0.03 210)", color: "oklch(0.68 0.16 45)" }}>
              {rotation.industryCount} 个行业
            </span>
          </div>
          <div className="space-y-2">
            {rotation.latestSnapshot.slice(0, 12).map((item, index) => {
              const color = getSeriesColor(item.code, "industry", index);
              return (
                <div
                  key={item.code}
                  onMouseEnter={() => onHover(item.code)}
                  onMouseLeave={() => onHover(null)}
                  className="flex items-center justify-between rounded-xl border px-3 py-2 transition-colors"
                  style={{ borderColor: `${color}40`, background: hoveredCode === item.code ? "oklch(0.18 0.03 210)" : "oklch(0.15 0.03 210 / 0.92)" }}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold" style={{ background: `${color}30`, color }}>
                      {item.rank}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold" style={{ color: "oklch(0.90 0.03 195)" }}>{item.name}</p>
                      <p className="text-[11px]" style={{ color: "oklch(0.53 0.03 200)" }}>RS 斜率 {item.score === null ? "--" : item.score.toFixed(4)}</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-mono font-semibold" style={{ color: (item.latestValue ?? 0) >= 0 ? "#9DFF7A" : "#FF8A65" }}>
                    {percentText(item.latestValue, 2)}
                  </span>
                </div>
              );
            })}
          </div>
        </aside>
      </div>
    </section>
  );
}

export default function Home() {
  const [period, setPeriod] = useState<Period>("1m");
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const industryListQuery = trpc.stock.industryList.useQuery();
  const industryList = industryListQuery.data as IndustryListData | undefined;

  const statusQuery = trpc.stock.overviewStatus.useQuery(
    { period },
    {
      refetchInterval: query => {
        const data = query.state.data as { ready?: boolean; error?: string | null } | undefined;
        if (data?.ready || data?.error) return false;
        return 3000;
      },
      staleTime: 0,
    },
  );

  const statusData = statusQuery.data as { loading: boolean; ready: boolean; error: string | null; progress: number } | undefined;
  const isReady = statusData?.ready === true;
  const isError = Boolean(statusData?.error);
  const progress = statusData?.progress ?? 5;

  const overviewQuery = trpc.stock.overview.useQuery(
    { period },
    { enabled: isReady, staleTime: 25 * 60 * 1000 },
  );

  const overviewData = overviewQuery.data as OverviewQueryResult | undefined;
  const hasData = Boolean(overviewData && !overviewData.loading && overviewData.series.length > 0 && overviewData.dates.length > 0);
  const isLoading = !isReady && !isError;

  useEffect(() => {
    utils.stock.overviewStatus.invalidate({ period });
  }, [period, utils.stock.overviewStatus]);

  const refreshMutation = trpc.stock.refreshCache.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.stock.overviewStatus.invalidate({ period }),
        utils.stock.overview.invalidate({ period }),
      ]);
    },
  });

  const progressMessage = useMemo(() => {
    if (progress < 20) return "正在连接数据源";
    if (progress < 50) return "正在获取主要指数数据";
    if (progress < 80) return "正在获取申万一级行业数据";
    return "正在整理走势与排名信息";
  }, [progress]);

  const industrySeries = useMemo(() => (overviewData?.series ?? []).filter(item => item.type === "industry"), [overviewData?.series]);
  const indexSeries = useMemo(() => (overviewData?.series ?? []).filter(item => item.type === "index"), [overviewData?.series]);

  const effectiveIndustrySeries = useMemo(() => {
    if (!industrySeries.length) return [];
    const buttonList = industryList?.firstLevel ?? [];
    const actualNames = new Set(industrySeries.map(item => item.name));
    const matchedButtonNames = buttonList.filter(item => actualNames.has(item.name)).map(item => item.name);

    if (!matchedButtonNames.length) {
      return industrySeries;
    }

    const orderMap = new Map(matchedButtonNames.map((name, index) => [name, index]));
    return industrySeries
      .filter(item => matchedButtonNames.includes(item.name))
      .sort((left, right) => (orderMap.get(left.name) ?? 999) - (orderMap.get(right.name) ?? 999));
  }, [industryList?.firstLevel, industrySeries]);

  const effectiveIndustryCount = effectiveIndustrySeries.length;
  const chartData = useMemo(() => buildLineChartData(overviewData?.dates ?? [], [...indexSeries, ...effectiveIndustrySeries]), [effectiveIndustrySeries, indexSeries, overviewData?.dates]);

  const latestChanges = useMemo(() => {
    const map: Record<string, number | null> = {};
    effectiveIndustrySeries.forEach(item => {
      map[item.code] = getLastValidValue(item.data);
    });
    return map;
  }, [effectiveIndustrySeries]);

  const rankingList = useMemo(() => {
    return [...effectiveIndustrySeries]
      .map((item, index) => ({
        ...item,
        latestChange: latestChanges[item.code] ?? null,
        color: getSeriesColor(item.code, "industry", index),
      }))
      .sort((left, right) => (right.latestChange ?? Number.NEGATIVE_INFINITY) - (left.latestChange ?? Number.NEGATIVE_INFINITY));
  }, [effectiveIndustrySeries, latestChanges]);

  const colorIndexMap = useMemo(() => {
    const map: Record<string, number> = {};
    indexSeries.forEach((item, index) => {
      map[item.code] = index;
    });
    effectiveIndustrySeries.forEach((item, index) => {
      map[item.code] = index;
    });
    return map;
  }, [effectiveIndustrySeries, indexSeries]);

  const toggleSeries = useCallback((code: string) => {
    setHiddenSeries(previous => {
      const next = new Set(previous);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  }, []);

  const getLineStyle = useCallback((code: string, type: "index" | "industry") => {
    const color = getSeriesColor(code, type, colorIndexMap[code] ?? 0);
    if (hiddenSeries.has(code)) {
      return { stroke: color, strokeWidth: 0, strokeOpacity: 0 };
    }

    const isHovered = hoveredCode === code;
    const dimmed = hoveredCode !== null && !isHovered;

    return {
      stroke: color,
      strokeWidth: isHovered ? (type === "index" ? 4.4 : 3.2) : type === "index" ? 2.3 : 1.2,
      strokeOpacity: dimmed ? 0.12 : type === "index" ? 0.98 : 0.86,
    };
  }, [colorIndexMap, hiddenSeries, hoveredCode]);

  const bgIndexSeries = indexSeries.filter(item => item.code !== hoveredCode && !hiddenSeries.has(item.code));
  const bgIndustrySeries = effectiveIndustrySeries.filter(item => item.code !== hoveredCode && !hiddenSeries.has(item.code));
  const fgSeries = hoveredCode
    ? [...indexSeries, ...effectiveIndustrySeries].filter(item => item.code === hoveredCode && !hiddenSeries.has(item.code))
    : [];

  return (
    <div className="min-h-screen" style={{ background: "radial-gradient(circle at top, oklch(0.18 0.05 210), oklch(0.07 0.015 210) 45%, oklch(0.05 0.01 210) 100%)" }}>
      <header className="border-b" style={{ borderColor: "oklch(0.20 0.03 210)" }}>
        <div className="container py-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold"
                style={{ background: "oklch(0.17 0.03 210 / 0.9)", color: "oklch(0.67 0.15 195)", border: "1px solid oklch(0.28 0.04 210)" }}>
                <BarChart3 className="h-3.5 w-3.5" />
                A股行业轮动分析
              </div>
              <h1 className="text-3xl font-black tracking-tight md:text-4xl" style={{ color: "oklch(0.96 0.02 195)" }}>申万一级行业走势与排名轮动看板</h1>
              <p className="mt-3 max-w-2xl text-sm leading-7 md:text-base" style={{ color: "oklch(0.62 0.03 200)" }}>
                继续沿用原有的在线数据链路，展示主要指数与申万一级行业的归一化走势、相对沪深300超额收益，以及基于 RS 动量斜率的行业排名轮动。
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:min-w-[430px]">
              <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "oklch(0.25 0.04 210)", background: "oklch(0.13 0.025 210 / 0.84)" }}>
                <p className="text-xs" style={{ color: "oklch(0.50 0.03 200)" }}>行业口径</p>
                <p className="mt-1 text-sm font-bold" style={{ color: "oklch(0.90 0.03 195)" }}>申万一级 {effectiveIndustryCount || industryList?.firstLevel?.length || 0} 个</p>
              </div>
              <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "oklch(0.25 0.04 210)", background: "oklch(0.13 0.025 210 / 0.84)" }}>
                <p className="text-xs" style={{ color: "oklch(0.50 0.03 200)" }}>当前时间窗</p>
                <p className="mt-1 text-sm font-bold" style={{ color: "oklch(0.90 0.03 195)" }}>{PERIOD_LABELS[period]}</p>
              </div>
              <div className="rounded-2xl border px-4 py-3" style={{ borderColor: "oklch(0.25 0.04 210)", background: "oklch(0.13 0.025 210 / 0.84)" }}>
                <p className="text-xs" style={{ color: "oklch(0.50 0.03 200)" }}>RS 动量映射</p>
                <p className="mt-1 text-sm font-bold" style={{ color: "oklch(0.90 0.03 195)" }}>{RS_WINDOW_BY_PERIOD[period]} 日窗口</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container space-y-6 pt-6 pb-28 md:space-y-8 md:pt-8 md:pb-36">
        <section className="rounded-[28px] border p-5 md:p-6"
          style={{ borderColor: "oklch(0.25 0.04 210)", background: "linear-gradient(180deg, oklch(0.12 0.025 210 / 0.88), oklch(0.10 0.02 210 / 0.96))", boxShadow: "0 20px 60px oklch(0.04 0.01 210 / 0.35)" }}>
          <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" style={{ color: "oklch(0.62 0.15 195)" }} />
                <h2 className="text-lg font-black" style={{ color: "oklch(0.93 0.03 195)" }}>行业与指数综合走势对比</h2>
              </div>
              <p className="max-w-3xl text-sm leading-6" style={{ color: "oklch(0.61 0.03 200)" }}>
                纵轴为归一化涨跌幅，以所选时间窗首个交易日收盘价为基准。顶部行业数量与下方行业按钮统一按
                <span style={{ color: "oklch(0.68 0.16 45)" }}>实际可绘制的申万一级行业数量</span> 展示；若数据源与按钮数量存在偏差，则以较少口径为准。
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <div className="flex flex-wrap gap-2">
                {PERIODS.map(item => (
                  <PeriodButton key={item} period={item} active={period === item} onClick={() => setPeriod(item)} />
                ))}
              </div>
              <button
                onClick={() => refreshMutation.mutate({ period })}
                disabled={refreshMutation.isPending || isLoading}
                className="inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-opacity disabled:opacity-60"
                style={{ background: "oklch(0.18 0.03 210)", color: "oklch(0.80 0.03 195)", border: "1px solid oklch(0.28 0.04 210)" }}
              >
                <RefreshCw className={`h-4 w-4 ${refreshMutation.isPending || isLoading ? "animate-spin" : ""}`} />
                刷新数据
              </button>
            </div>
          </div>

          {isLoading && <LoadingPanel message={progressMessage} progress={progress} />}
          {isError && <EmptyState text={statusData?.error || "数据获取失败，请稍后重试。"} />}

          {hasData && overviewData && (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
              <div className="rounded-2xl border p-3 md:p-4" style={{ borderColor: "oklch(0.23 0.03 210)", background: "oklch(0.11 0.02 210 / 0.76)" }}>
                <ResponsiveContainer width="100%" height={460}>
                  <LineChart data={chartData} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.22 0.03 210)" opacity={0.45} />
                    <XAxis
                      dataKey="date"
                      tick={{ fill: "oklch(0.52 0.03 200)", fontSize: 11 }}
                      tickLine={false}
                      axisLine={{ stroke: "oklch(0.24 0.03 210)" }}
                      interval="preserveStartEnd"
                      tickFormatter={formatAxisDate}
                    />
                    <YAxis
                      tick={{ fill: "oklch(0.52 0.03 200)", fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      width={64}
                      tickFormatter={(value: number) => `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`}
                    />
                    <ReferenceLine y={0} stroke="oklch(0.42 0.05 195 / 0.7)" strokeDasharray="4 4" />
                    <Tooltip content={<SharedTooltip />} wrapperStyle={{ pointerEvents: "none" }} isAnimationActive={false} />
                    {bgIndexSeries.map(item => {
                      const style = getLineStyle(item.code, "index");
                      return (
                        <Line
                          key={item.code}
                          type="monotone"
                          dataKey={item.code}
                          name={item.name}
                          stroke={style.stroke}
                          strokeWidth={style.strokeWidth}
                          strokeOpacity={style.strokeOpacity}
                          dot={false}
                          activeDot={false}
                          connectNulls
                          isAnimationActive={false}
                        />
                      );
                    })}
                    {bgIndustrySeries.map(item => {
                      const style = getLineStyle(item.code, "industry");
                      return (
                        <Line
                          key={item.code}
                          type="monotone"
                          dataKey={item.code}
                          name={item.name}
                          stroke={style.stroke}
                          strokeWidth={style.strokeWidth}
                          strokeOpacity={style.strokeOpacity}
                          dot={false}
                          activeDot={false}
                          connectNulls
                          isAnimationActive={false}
                        />
                      );
                    })}
                    {fgSeries.map(item => {
                      const type = item.type === "index" ? "index" : "industry";
                      const style = getLineStyle(item.code, type);
                      return (
                        <Line
                          key={`fg-${item.code}`}
                          type="monotone"
                          dataKey={item.code}
                          name={item.name}
                          stroke={style.stroke}
                          strokeWidth={style.strokeWidth}
                          strokeOpacity={style.strokeOpacity}
                          dot={false}
                          activeDot={{ r: 5, strokeWidth: 0, fill: style.stroke }}
                          connectNulls
                          isAnimationActive={false}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <aside className="rounded-2xl border p-4" style={{ borderColor: "oklch(0.23 0.03 210)", background: "oklch(0.11 0.02 210 / 0.76)" }}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-bold" style={{ color: "oklch(0.89 0.03 195)" }}>最新行业涨幅</p>
                  <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: "oklch(0.20 0.03 210)", color: "oklch(0.68 0.16 45)" }}>
                    {effectiveIndustryCount} 个行业
                  </span>
                </div>
                <div className="max-h-[460px] space-y-2 overflow-y-auto pr-1">
                  {rankingList.map(item => (
                    <div
                      key={item.code}
                      onMouseEnter={() => setHoveredCode(item.code)}
                      onMouseLeave={() => setHoveredCode(null)}
                      className="flex items-center justify-between rounded-xl border px-3 py-2 transition-colors"
                      style={{ borderColor: `${item.color}40`, background: hoveredCode === item.code ? "oklch(0.18 0.03 210)" : "oklch(0.15 0.03 210 / 0.92)" }}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: item.color }} />
                        <span className="truncate text-sm font-medium" style={{ color: "oklch(0.90 0.03 195)" }}>{item.name}</span>
                      </div>
                      <span className="shrink-0 text-xs font-mono font-semibold" style={{ color: (item.latestChange ?? 0) >= 0 ? "#9DFF7A" : "#FF8A65" }}>
                        {percentText(item.latestChange, 2)}
                      </span>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          )}

          {isReady && !hasData && !overviewQuery.isLoading && <EmptyState text="暂无可展示的行业数据，请尝试刷新。" />}
        </section>

        {hasData && overviewData && (
          <IndustryToggleGroup
            series={effectiveIndustrySeries}
            hiddenSeries={hiddenSeries}
            hoveredCode={hoveredCode}
            onToggle={toggleSeries}
            onHover={setHoveredCode}
          />
        )}

        {hasData && overviewData && (
          <RankRotationChart
            dates={overviewData.dates}
            series={effectiveIndustrySeries}
            hs300Returns={overviewData.hs300Returns}
            period={period}
            hoveredCode={hoveredCode}
            hiddenSeries={hiddenSeries}
            onHover={setHoveredCode}
          />
        )}

        {hasData && overviewData && (
          <div className="rounded-[28px] border p-5 md:p-6"
            style={{ borderColor: "oklch(0.25 0.04 210)", background: "linear-gradient(180deg, oklch(0.12 0.025 210 / 0.88), oklch(0.10 0.02 210 / 0.96))", boxShadow: "0 20px 60px oklch(0.04 0.01 210 / 0.35)" }}>
            <ExcessReturnChart dates={overviewData.dates} series={effectiveIndustrySeries} hs300Returns={overviewData.hs300Returns} />
          </div>
        )}

        <footer className="pb-10 text-center">
          <p className="text-xs leading-6" style={{ color: "oklch(0.43 0.03 200)" }}>
            数据来源：新浪财经与申万行业分类口径。页面仅作分析辅助，不构成任何投资建议。
            {overviewData?.updatedAt ? ` 最近更新时间：${new Date(overviewData.updatedAt).toLocaleString("zh-CN")}` : ""}
          </p>
        </footer>
      </main>
    </div>
  );
}
