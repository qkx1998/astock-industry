/**
 * Color palette for 31 industries + 5 main indices
 * Indices: bright, distinct colors (teal/orange family)
 * Industries: varied hues, lower saturation to avoid visual noise
 */

// Main indices - high contrast, memorable colors
export const INDEX_COLORS: Record<string, string> = {
  sh000001: "#00E5FF",  // 上证指数 - bright cyan
  sz399001: "#FF6B35",  // 深证成指 - burnt orange
  sh000300: "#FFD700",  // 沪深300 - gold
  sz399006: "#7CFC00",  // 创业板指 - lime green
  sh000688: "#FF69B4",  // 科创50 - hot pink
};

// 31 industry colors - spread across hue spectrum
export const INDUSTRY_COLORS: string[] = [
  "#4ECDC4", // 农林牧渔 - teal
  "#45B7D1", // 基础化工 - sky blue
  "#96CEB4", // 钢铁 - sage green
  "#FFEAA7", // 有色金属 - pale yellow
  "#DDA0DD", // 电子 - plum
  "#F0A500", // 汽车 - amber
  "#98D8C8", // 家用电器 - mint
  "#F7DC6F", // 食品饮料 - light yellow
  "#BB8FCE", // 纺织服饰 - lavender
  "#82E0AA", // 轻工制造 - light green
  "#F1948A", // 医药生物 - salmon
  "#85C1E9", // 公用事业 - light blue
  "#F8C471", // 交通运输 - peach
  "#A9CCE3", // 房地产 - steel blue
  "#A3E4D7", // 商贸零售 - aquamarine
  "#FAD7A0", // 社会服务 - light orange
  "#AED6F1", // 银行 - powder blue
  "#F9E79F", // 非银金融 - cream yellow
  "#D5DBDB", // 综合 - light gray
  "#ABEBC6", // 建筑材料 - pale green
  "#D7BDE2", // 建筑装饰 - light purple
  "#A9DFBF", // 电力设备 - mint green
  "#F5CBA7", // 机械设备 - light peach
  "#AED6F1", // 国防军工 - sky
  "#C39BD3", // 计算机 - medium purple
  "#F1948A", // 传媒 - light red
  "#76D7C4", // 通信 - medium teal
  "#F0B27A", // 煤炭 - light brown
  "#D98880", // 石油石化 - dusty rose
  "#A8D8EA", // 环保 - light cyan
  "#F7CAC9", // 美容护理 - blush
];

export function getSeriesColor(code: string, type: "index" | "industry" | "sub_industry", index: number): string {
  if (type === "index") {
    return INDEX_COLORS[code] || "#FFFFFF";
  }
  return INDUSTRY_COLORS[index % INDUSTRY_COLORS.length];
}

// Sub-industry colors - 15 distinct colors for sub-industry charts
export const SUB_INDUSTRY_COLORS: string[] = [
  "#00E5FF", "#FF6B35", "#FFD700", "#7CFC00", "#FF69B4",
  "#4ECDC4", "#DDA0DD", "#F0A500", "#82E0AA", "#85C1E9",
  "#F1948A", "#FAD7A0", "#C39BD3", "#76D7C4", "#F8C471",
];

export function getSubIndustryColor(index: number): string {
  return SUB_INDUSTRY_COLORS[index % SUB_INDUSTRY_COLORS.length];
}
