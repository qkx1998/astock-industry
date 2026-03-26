/**
 * A股行业走势数据 tRPC 路由
 * 使用纯 TypeScript 直接调用新浪财经 HTTP 接口，无需 Python 依赖
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import {
  getIndustryList,
  fetchOverview,
  fetchSubIndustry,
  type Period,
  type OverviewResult,
  type SubIndustryResult,
} from "../stockData";

// ─── 内存缓存 ─────────────────────────────────────────────────────────────────
interface CacheEntry<T> {
  data: T;
  fetchedAt: number;
  loading: boolean;
  error?: string;
}

const overviewCache = new Map<Period, CacheEntry<OverviewResult>>();
const subIndustryCache = new Map<string, CacheEntry<SubIndustryResult>>();

// Cache TTL: 30 minutes
const CACHE_TTL_MS = 30 * 60 * 1000;

function isCacheValid<T>(entry: CacheEntry<T> | undefined): boolean {
  if (!entry) return false;
  if (entry.loading) return false;
  if (entry.error) return false;
  return Date.now() - entry.fetchedAt < CACHE_TTL_MS;
}

// Background fetch for overview
function triggerOverviewFetch(period: Period) {
  const existing = overviewCache.get(period);
  if (existing?.loading) return; // Already fetching

  const entry: CacheEntry<OverviewResult> = {
    data: { dates: [], series: [], rawSeries: [], hs300Returns: [], period, updatedAt: new Date().toISOString() },
    fetchedAt: 0,
    loading: true,
  };
  overviewCache.set(period, entry);

  fetchOverview(period)
    .then(result => {
      overviewCache.set(period, {
        data: result,
        fetchedAt: Date.now(),
        loading: false,
      });
      console.log(`[Stock] Overview cache updated for period=${period}, series=${result.series.length}, dates=${result.dates.length}`);
    })
    .catch(err => {
      overviewCache.set(period, {
        data: { dates: [], series: [], rawSeries: [], hs300Returns: [], period, updatedAt: new Date().toISOString() },
        fetchedAt: 0,
        loading: false,
        error: String(err?.message ?? err),
      });
      console.error(`[Stock] Overview fetch failed for period=${period}:`, err);
    });
}

// Background fetch for sub-industry
function triggerSubIndustryFetch(parentName: string, period: Period) {
  const key = `${parentName}__${period}`;
  const existing = subIndustryCache.get(key);
  if (existing?.loading) return;

  const entry: CacheEntry<SubIndustryResult> = {
    data: { parentName, dates: [], series: [], period, updatedAt: new Date().toISOString() },
    fetchedAt: 0,
    loading: true,
  };
  subIndustryCache.set(key, entry);

  fetchSubIndustry(parentName, period)
    .then(result => {
      subIndustryCache.set(key, {
        data: result,
        fetchedAt: Date.now(),
        loading: false,
      });
      console.log(`[Stock] SubIndustry cache updated for ${parentName}/${period}, series=${result.series.length}`);
    })
    .catch(err => {
      subIndustryCache.set(key, {
        data: { parentName, dates: [], series: [], period, updatedAt: new Date().toISOString() },
        fetchedAt: 0,
        loading: false,
        error: String(err?.message ?? err),
      });
      console.error(`[Stock] SubIndustry fetch failed for ${parentName}/${period}:`, err);
    });
}

// ─── tRPC Router ──────────────────────────────────────────────────────────────
const periodSchema = z.enum(["7d", "1m", "3m", "6m", "1y"]);

export const stockRouter = router({
  // Get industry list (static, no network call)
  industryList: publicProcedure.query(() => {
    return getIndustryList();
  }),

  // Get overview status (polling endpoint)
  overviewStatus: publicProcedure
    .input(z.object({ period: periodSchema }))
    .query(({ input }) => {
      const period = input.period as Period;
      const entry = overviewCache.get(period);

      if (!entry) {
        triggerOverviewFetch(period);
        return { loading: true, ready: false, error: null as string | null, progress: 5 };
      }

      if (entry.loading) {
        return { loading: true, ready: false, error: null as string | null, progress: 50 };
      }

      if (entry.error) {
        return { loading: false, ready: false, error: entry.error, progress: 0 };
      }

      if (!isCacheValid(entry)) {
        triggerOverviewFetch(period);
        return { loading: true, ready: entry.data.series.length > 0, error: null as string | null, progress: 80 };
      }

      return { loading: false, ready: true, error: null as string | null, progress: 100 };
    }),

  // Get overview data (returns cached data)
  overview: publicProcedure
    .input(z.object({ period: periodSchema }))
    .query(({ input }) => {
      const period = input.period as Period;
      const entry = overviewCache.get(period);

      if (!entry) {
        triggerOverviewFetch(period);
        return {
          loading: true,
          series: [] as OverviewResult["series"],
          rawSeries: [] as OverviewResult["rawSeries"],
          hs300Returns: [] as OverviewResult["hs300Returns"],
          dates: [] as string[],
          period,
          updatedAt: "",
          error: null as string | null,
        };
      }

      return {
        loading: entry.loading,
        series: entry.data.series,
        rawSeries: entry.data.rawSeries,
        hs300Returns: entry.data.hs300Returns,
        dates: entry.data.dates,
        period: entry.data.period,
        updatedAt: entry.data.updatedAt,
        error: entry.error ?? null,
      };
    }),

  // Get sub-industry status (polling endpoint)
  subIndustryStatus: publicProcedure
    .input(z.object({ parentName: z.string(), period: periodSchema }))
    .query(({ input }) => {
      const { parentName, period } = input;
      const key = `${parentName}__${period}`;
      const entry = subIndustryCache.get(key);

      if (!entry) {
        triggerSubIndustryFetch(parentName, period as Period);
        return { loading: true, ready: false, error: null as string | null, progress: 5 };
      }

      if (entry.loading) {
        return { loading: true, ready: false, error: null as string | null, progress: 50 };
      }

      if (entry.error) {
        return { loading: false, ready: false, error: entry.error, progress: 0 };
      }

      if (!isCacheValid(entry)) {
        triggerSubIndustryFetch(parentName, period as Period);
        return { loading: true, ready: entry.data.series.length > 0, error: null as string | null, progress: 80 };
      }

      return { loading: false, ready: true, error: null as string | null, progress: 100 };
    }),

  // Get sub-industry data
  subIndustry: publicProcedure
    .input(z.object({ parentName: z.string(), period: periodSchema }))
    .query(({ input }) => {
      const { parentName, period } = input;
      const key = `${parentName}__${period}`;
      const entry = subIndustryCache.get(key);

      if (!entry) {
        triggerSubIndustryFetch(parentName, period as Period);
        return {
          loading: true,
          series: [] as SubIndustryResult["series"],
          dates: [] as string[],
          parentName,
          period,
          updatedAt: "",
          error: null as string | null,
        };
      }

      return {
        loading: entry.loading,
        series: entry.data.series,
        dates: entry.data.dates,
        parentName: entry.data.parentName,
        period: entry.data.period,
        updatedAt: entry.data.updatedAt,
        error: entry.error ?? null,
      };
    }),

  // Force refresh cache
  refreshCache: publicProcedure
    .input(z.object({ period: periodSchema, parentName: z.string().optional() }))
    .mutation(({ input }) => {
      const period = input.period as Period;
      if (input.parentName) {
        const key = `${input.parentName}__${period}`;
        subIndustryCache.delete(key);
        triggerSubIndustryFetch(input.parentName, period);
      } else {
        overviewCache.delete(period);
        triggerOverviewFetch(period);
      }
      return { success: true };
    }),
});
