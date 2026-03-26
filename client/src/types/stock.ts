export interface StockSeries {
  code: string;
  name: string;
  type: "index" | "industry" | "sub_industry";
  data: (number | null)[];
}

export interface OverviewData {
  dates: string[];
  series: StockSeries[];
  period: string;
  updatedAt: string;
  error?: string;
}

export interface IndustryInfo {
  code: string;
  name: string;
  level: number;
}

export interface SubIndustryInfo {
  code: string;
  name: string;
  parent: string;
  level: number;
}

export interface IndustryListData {
  firstLevel: IndustryInfo[];
  secondLevel: SubIndustryInfo[];
}

export interface SubIndustryData {
  parentName: string;
  dates: string[];
  series: StockSeries[];
  period: string;
  updatedAt: string;
  error?: string;
}

export type Period = "7d" | "1m" | "3m" | "6m" | "1y";

export const PERIOD_LABELS: Record<Period, string> = {
  "7d": "7天",
  "1m": "1个月",
  "3m": "3个月",
  "6m": "6个月",
  "1y": "1年",
};
