import { describe, expect, it } from "vitest";
import { calculateRankRotation, RS_WINDOW_BY_PERIOD } from "@/lib/industryAnalytics";
import { SW_L1_INDUSTRIES, getIndustryList } from "./stockData";
import type { Period } from "./stockData";

describe("industry universe constraint", () => {
  it("keeps the first-level industry universe fixed at 29 without 社会服务 and 综合", () => {
    expect(SW_L1_INDUSTRIES).toHaveLength(29);
    expect(SW_L1_INDUSTRIES.map(item => item.name)).not.toContain("社会服务");
    expect(SW_L1_INDUSTRIES.map(item => item.name)).not.toContain("综合");
  });

  it("returns the same 29-industry universe from getIndustryList", () => {
    const list = getIndustryList();
    expect(list.firstLevel).toHaveLength(29);
    expect(list.firstLevel.map(item => item.name)).not.toContain("社会服务");
    expect(list.firstLevel.map(item => item.name)).not.toContain("综合");
  });
});

describe("rank rotation analytics", () => {
  it("maps each display period to the expected RS momentum window", () => {
    const expected: Record<Period, number> = {
      "7d": 3,
      "1m": 5,
      "3m": 20,
      "6m": 20,
      "1y": 60,
    };

    expect(RS_WINDOW_BY_PERIOD).toEqual(expected);
  });

  it("ranks industries by the slope of excess return versus HS300", () => {
    const dates = [
      "2026-01-01",
      "2026-01-02",
      "2026-01-03",
      "2026-01-04",
      "2026-01-05",
      "2026-01-06",
    ];

    const series = [
      {
        code: "A",
        name: "行业A",
        type: "industry",
        data: [0, 1, 2, 3, 4, 5],
      },
      {
        code: "B",
        name: "行业B",
        type: "industry",
        data: [0, 0.4, 0.8, 1.1, 1.5, 1.9],
      },
      {
        code: "C",
        name: "行业C",
        type: "industry",
        data: [0, -0.5, -1, -1.5, -2, -2.5],
      },
    ] as const;

    const hs300Returns = [0, 0, 0, 0, 0, 0];

    const result = calculateRankRotation(dates, [...series], hs300Returns, "1m");

    expect(result.momentumWindow).toBe(5);
    expect(result.industryCount).toBe(3);
    expect(result.latestSnapshot.map(item => item.name)).toEqual(["行业A", "行业B", "行业C"]);
    expect(result.latestSnapshot.map(item => item.rank)).toEqual([1, 2, 3]);
    expect(result.latestSnapshot[0]?.score).toBeGreaterThan(result.latestSnapshot[1]?.score ?? Number.NEGATIVE_INFINITY);
    expect(result.latestSnapshot[1]?.score).toBeGreaterThan(result.latestSnapshot[2]?.score ?? Number.NEGATIVE_INFINITY);
    expect(result.chartData).toHaveLength(dates.length);
    expect(result.chartData.at(-1)).toMatchObject({
      date: "2026-01-06",
      A: 1,
      B: 2,
      C: 3,
    });
  });
});
