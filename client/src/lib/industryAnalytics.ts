import type { Period } from "@/types/stock";

export interface SeriesLike {
  code: string;
  name: string;
  type: "index" | "industry" | "sub_industry" | string;
  data: (number | null)[];
}

export interface RankedSnapshotItem {
  code: string;
  name: string;
  rank: number;
  score: number | null;
  latestValue: number | null;
}

export const RS_WINDOW_BY_PERIOD: Record<Period, number> = {
  "7d": 3,
  "1m": 5,
  "3m": 20,
  "6m": 20,
  "1y": 60,
};

export function getLastValidValue(values: (number | null)[]): number | null {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = values[index];
    if (value !== null && Number.isFinite(value)) {
      return value;
    }
  }
  return null;
}

export function buildLineChartData(dates: string[], series: SeriesLike[]) {
  return dates.map((date, index) => {
    const point: Record<string, string | number | null> = { date };
    series.forEach(item => {
      point[item.code] = item.data[index] ?? null;
    });
    return point;
  });
}

export function calculateExcessSeries(series: SeriesLike[], hs300Returns: (number | null)[]) {
  return series
    .filter(item => item.type === "industry")
    .map(item => ({
      ...item,
      data: item.data.map((value, index) => {
        const base = hs300Returns[index];
        if (value === null || base === null || !Number.isFinite(value) || !Number.isFinite(base)) {
          return null;
        }
        return Number((value - base).toFixed(2));
      }),
    }));
}

function calculateSlope(values: (number | null)[], endIndex: number, window: number): number | null {
  const startIndex = Math.max(0, endIndex - window + 1);
  const points: Array<{ x: number; y: number }> = [];

  for (let index = startIndex; index <= endIndex; index += 1) {
    const value = values[index];
    if (value === null || !Number.isFinite(value)) continue;
    points.push({ x: index - startIndex, y: value });
  }

  if (points.length < 2) {
    return null;
  }

  const meanX = points.reduce((sum, point) => sum + point.x, 0) / points.length;
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / points.length;

  let numerator = 0;
  let denominator = 0;

  points.forEach(point => {
    numerator += (point.x - meanX) * (point.y - meanY);
    denominator += (point.x - meanX) ** 2;
  });

  if (denominator === 0) {
    return null;
  }

  return Number((numerator / denominator).toFixed(4));
}

export function calculateRankRotation(
  dates: string[],
  series: SeriesLike[],
  hs300Returns: (number | null)[],
  period: Period,
) {
  const industrySeries = series.filter(item => item.type === "industry");
  const excessSeries = calculateExcessSeries(industrySeries, hs300Returns);
  const momentumWindow = RS_WINDOW_BY_PERIOD[period];

  const scoreByIndustry: Record<string, Array<number | null>> = {};
  excessSeries.forEach(item => {
    scoreByIndustry[item.code] = item.data.map((_, index) => calculateSlope(item.data, index, momentumWindow));
  });

  const rankByIndustry: Record<string, Array<number | null>> = {};
  excessSeries.forEach(item => {
    rankByIndustry[item.code] = [];
  });

  dates.forEach((_, index) => {
    const ranked = excessSeries
      .map(item => ({
        code: item.code,
        score: scoreByIndustry[item.code]?.[index] ?? null,
      }))
      .sort((left, right) => {
        const leftValue = left.score ?? Number.NEGATIVE_INFINITY;
        const rightValue = right.score ?? Number.NEGATIVE_INFINITY;
        return rightValue - leftValue;
      });

    ranked.forEach((item, rankIndex) => {
      rankByIndustry[item.code]?.push(rankIndex + 1);
    });
  });

  const chartSeries = excessSeries.map(item => ({
    ...item,
    data: rankByIndustry[item.code] ?? [],
  }));

  const chartData = dates.map((date, index) => {
    const point: Record<string, string | number | null> = { date };
    chartSeries.forEach(item => {
      point[item.code] = item.data[index] ?? null;
    });
    return point;
  });

  const latestIndex = Math.max(0, dates.length - 1);
  const latestSnapshot: RankedSnapshotItem[] = excessSeries
    .map(item => ({
      code: item.code,
      name: item.name,
      rank: rankByIndustry[item.code]?.[latestIndex] ?? industrySeries.length,
      score: scoreByIndustry[item.code]?.[latestIndex] ?? null,
      latestValue: getLastValidValue(item.data),
    }))
    .sort((left, right) => left.rank - right.rank);

  return {
    momentumWindow,
    industryCount: industrySeries.length,
    excessSeries,
    chartSeries,
    chartData,
    latestSnapshot,
  };
}
