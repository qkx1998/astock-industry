/**
 * A股行业走势数据获取模块
 * 使用新浪财经 HTTP 接口，无需 Python 依赖
 */

import axios from "axios";

// ─── 申万一级行业代码映射（申万代码 -> 新浪代码）───────────────────────────────
// 新浪代码格式：sz39XXXX，对应申万行业指数
export const SW_L1_INDUSTRIES = [
  { code: "801010", name: "农林牧渔",  sinaCode: "sz399437" },
  { code: "801030", name: "基础化工",  sinaCode: "sz399433" },
  { code: "801040", name: "钢铁",      sinaCode: "sz399408" },
  { code: "801050", name: "有色金属",  sinaCode: "sz399409" },
  { code: "801080", name: "电子",      sinaCode: "sz399415" },
  { code: "801880", name: "汽车",      sinaCode: "sz399422" },
  { code: "801110", name: "家用电器",  sinaCode: "sz399412" },
  { code: "801120", name: "食品饮料",  sinaCode: "sz399418" },
  { code: "801130", name: "纺织服饰",  sinaCode: "sz399420" },
  { code: "801140", name: "轻工制造",  sinaCode: "sz399421" },
  { code: "801150", name: "医药生物",  sinaCode: "sz399441" },
  { code: "801160", name: "公用事业",  sinaCode: "sz399425" },
  { code: "801170", name: "交通运输",  sinaCode: "sz399424" },
  { code: "801180", name: "房地产",    sinaCode: "sz399423" },
  { code: "801200", name: "商贸零售",  sinaCode: "sz399426" },
  { code: "801780", name: "银行",      sinaCode: "sz399431" },
  { code: "801790", name: "非银金融",  sinaCode: "sz399432" },
  { code: "801710", name: "建筑材料",  sinaCode: "sz399406" },
  { code: "801720", name: "建筑装饰",  sinaCode: "sz399407" },
  { code: "801730", name: "电力设备",  sinaCode: "sz399414" },
  { code: "801890", name: "机械设备",  sinaCode: "sz399411" },
  { code: "801740", name: "国防军工",  sinaCode: "sz399416" },
  { code: "801750", name: "计算机",    sinaCode: "sz399417" },
  { code: "801760", name: "传媒",      sinaCode: "sz399419" },
  { code: "801770", name: "通信",      sinaCode: "sz399428" },
  { code: "801950", name: "煤炭",      sinaCode: "sz399998" },
  { code: "801960", name: "石油石化",  sinaCode: "sz399997" },
  { code: "801970", name: "环保",      sinaCode: "sz399429" },
  { code: "801980", name: "美容护理",  sinaCode: "sz399996" },
] as const;

// ─── 申万二级行业代码映射 ─────────────────────────────────────────────────────
export const SW_L2_INDUSTRIES = [
  // 农林牧渔
  { code: "801016", name: "种植业",     parent: "农林牧渔", sinaCode: "sz399481" },
  { code: "801015", name: "渔业",       parent: "农林牧渔", sinaCode: "sz399482" },
  { code: "801014", name: "饲料",       parent: "农林牧渔", sinaCode: "sz399483" },
  { code: "801012", name: "农产品加工", parent: "农林牧渔", sinaCode: "sz399484" },
  { code: "801017", name: "养殖业",     parent: "农林牧渔", sinaCode: "sz399485" },
  { code: "801018", name: "动物保健Ⅱ", parent: "农林牧渔", sinaCode: "sz399486" },
  // 基础化工
  { code: "801033", name: "化学原料",   parent: "基础化工", sinaCode: "sz399490" },
  { code: "801034", name: "化学制品",   parent: "基础化工", sinaCode: "sz399491" },
  { code: "801032", name: "化学纤维",   parent: "基础化工", sinaCode: "sz399492" },
  { code: "801036", name: "塑料",       parent: "基础化工", sinaCode: "sz399493" },
  { code: "801037", name: "橡胶",       parent: "基础化工", sinaCode: "sz399494" },
  { code: "801038", name: "农化制品",   parent: "基础化工", sinaCode: "sz399495" },
  { code: "801039", name: "非金属材料Ⅱ",parent: "基础化工", sinaCode: "sz399496" },
  // 钢铁
  { code: "801043", name: "冶钢原料",   parent: "钢铁", sinaCode: "sz399500" },
  { code: "801044", name: "普钢",       parent: "钢铁", sinaCode: "sz399501" },
  { code: "801045", name: "特钢Ⅱ",     parent: "钢铁", sinaCode: "sz399502" },
  // 有色金属
  { code: "801051", name: "金属新材料", parent: "有色金属", sinaCode: "sz399505" },
  { code: "801055", name: "工业金属",   parent: "有色金属", sinaCode: "sz399506" },
  { code: "801053", name: "贵金属",     parent: "有色金属", sinaCode: "sz399507" },
  { code: "801054", name: "小金属",     parent: "有色金属", sinaCode: "sz399508" },
  { code: "801056", name: "能源金属",   parent: "有色金属", sinaCode: "sz399509" },
  // 电子
  { code: "801081", name: "半导体",         parent: "电子", sinaCode: "sz399513" },
  { code: "801083", name: "元件",           parent: "电子", sinaCode: "sz399514" },
  { code: "801084", name: "光学光电子",     parent: "电子", sinaCode: "sz399515" },
  { code: "801082", name: "其他电子Ⅱ",     parent: "电子", sinaCode: "sz399516" },
  { code: "801085", name: "消费电子",       parent: "电子", sinaCode: "sz399517" },
  { code: "801086", name: "电子化学品Ⅱ",   parent: "电子", sinaCode: "sz399518" },
  // 汽车
  { code: "801093", name: "汽车零部件",     parent: "汽车", sinaCode: "sz399521" },
  { code: "801092", name: "汽车服务",       parent: "汽车", sinaCode: "sz399522" },
  { code: "801881", name: "摩托车及其他",   parent: "汽车", sinaCode: "sz399523" },
  { code: "801095", name: "乘用车",         parent: "汽车", sinaCode: "sz399524" },
  { code: "801096", name: "商用车",         parent: "汽车", sinaCode: "sz399525" },
  // 家用电器
  { code: "801111", name: "白色家电",       parent: "家用电器", sinaCode: "sz399528" },
  { code: "801112", name: "黑色家电",       parent: "家用电器", sinaCode: "sz399529" },
  { code: "801113", name: "小家电",         parent: "家用电器", sinaCode: "sz399530" },
  { code: "801114", name: "厨卫电器",       parent: "家用电器", sinaCode: "sz399531" },
  { code: "801115", name: "照明设备Ⅱ",     parent: "家用电器", sinaCode: "sz399532" },
  { code: "801116", name: "家电零部件Ⅱ",   parent: "家用电器", sinaCode: "sz399533" },
  // 食品饮料
  { code: "801124", name: "食品加工",       parent: "食品饮料", sinaCode: "sz399536" },
  { code: "801125", name: "白酒Ⅱ",         parent: "食品饮料", sinaCode: "sz399537" },
  { code: "801126", name: "啤酒Ⅱ",         parent: "食品饮料", sinaCode: "sz399538" },
  { code: "801127", name: "其他酒Ⅱ",       parent: "食品饮料", sinaCode: "sz399539" },
  { code: "801128", name: "软饮料Ⅱ",       parent: "食品饮料", sinaCode: "sz399540" },
  // 纺织服饰
  { code: "801131", name: "纺织制造",       parent: "纺织服饰", sinaCode: "sz399543" },
  { code: "801132", name: "服装家纺",       parent: "纺织服饰", sinaCode: "sz399544" },
  // 轻工制造
  { code: "801141", name: "造纸",           parent: "轻工制造", sinaCode: "sz399547" },
  { code: "801143", name: "包装印刷",       parent: "轻工制造", sinaCode: "sz399548" },
  { code: "801142", name: "家居用品",       parent: "轻工制造", sinaCode: "sz399549" },
  { code: "801145", name: "文娱用品",       parent: "轻工制造", sinaCode: "sz399550" },
  // 医药生物
  { code: "801151", name: "化学制药",       parent: "医药生物", sinaCode: "sz399553" },
  { code: "801155", name: "中药Ⅱ",         parent: "医药生物", sinaCode: "sz399554" },
  { code: "801152", name: "生物制品",       parent: "医药生物", sinaCode: "sz399555" },
  { code: "801154", name: "医药商业",       parent: "医药生物", sinaCode: "sz399556" },
  { code: "801153", name: "医疗器械",       parent: "医药生物", sinaCode: "sz399557" },
  { code: "801156", name: "医疗服务",       parent: "医药生物", sinaCode: "sz399558" },
  // 公用事业
  { code: "801161", name: "电力",           parent: "公用事业", sinaCode: "sz399561" },
  { code: "801163", name: "燃气Ⅱ",         parent: "公用事业", sinaCode: "sz399562" },
  // 交通运输
  { code: "801178", name: "物流",           parent: "交通运输", sinaCode: "sz399565" },
  { code: "801179", name: "铁路公路",       parent: "交通运输", sinaCode: "sz399566" },
  { code: "801991", name: "航空机场",       parent: "交通运输", sinaCode: "sz399567" },
  { code: "801992", name: "航运港口",       parent: "交通运输", sinaCode: "sz399568" },
  // 房地产
  { code: "801181", name: "房地产开发",     parent: "房地产", sinaCode: "sz399571" },
  { code: "801183", name: "房地产服务",     parent: "房地产", sinaCode: "sz399572" },
  // 商贸零售
  { code: "801202", name: "贸易Ⅱ",         parent: "商贸零售", sinaCode: "sz399575" },
  { code: "801203", name: "一般零售",       parent: "商贸零售", sinaCode: "sz399576" },
  { code: "801204", name: "专业连锁Ⅱ",     parent: "商贸零售", sinaCode: "sz399577" },
  { code: "801206", name: "互联网电商",     parent: "商贸零售", sinaCode: "sz399578" },
  // 社会服务
  { code: "801218", name: "专业服务",       parent: "社会服务", sinaCode: "sz399581" },
  { code: "801219", name: "酒店餐饮",       parent: "社会服务", sinaCode: "sz399582" },
  { code: "801993", name: "旅游及景区",     parent: "社会服务", sinaCode: "sz399583" },
  { code: "801994", name: "教育",           parent: "社会服务", sinaCode: "sz399584" },
  // 银行
  { code: "801782", name: "国有大型银行Ⅱ", parent: "银行", sinaCode: "sz399587" },
  { code: "801783", name: "股份制银行Ⅱ",   parent: "银行", sinaCode: "sz399588" },
  { code: "801784", name: "城商行Ⅱ",       parent: "银行", sinaCode: "sz399589" },
  { code: "801785", name: "农商行Ⅱ",       parent: "银行", sinaCode: "sz399590" },
  // 非银金融
  { code: "801193", name: "证券Ⅱ",         parent: "非银金融", sinaCode: "sz399593" },
  { code: "801194", name: "保险Ⅱ",         parent: "非银金融", sinaCode: "sz399594" },
  { code: "801191", name: "多元金融",       parent: "非银金融", sinaCode: "sz399595" },
  // 综合
  { code: "801231", name: "综合Ⅱ",         parent: "综合", sinaCode: "sz399598" },
  // 建筑材料
  { code: "801711", name: "水泥",           parent: "建筑材料", sinaCode: "sz399601" },
  { code: "801712", name: "玻璃玻纤",       parent: "建筑材料", sinaCode: "sz399602" },
  { code: "801713", name: "装修建材",       parent: "建筑材料", sinaCode: "sz399603" },
  // 建筑装饰
  { code: "801721", name: "房屋建设Ⅱ",     parent: "建筑装饰", sinaCode: "sz399606" },
  { code: "801722", name: "装修装饰Ⅱ",     parent: "建筑装饰", sinaCode: "sz399607" },
  { code: "801723", name: "基础建设",       parent: "建筑装饰", sinaCode: "sz399608" },
  { code: "801724", name: "专业工程",       parent: "建筑装饰", sinaCode: "sz399609" },
  { code: "801726", name: "工程咨询服务Ⅱ", parent: "建筑装饰", sinaCode: "sz399610" },
  // 电力设备
  { code: "801731", name: "电机Ⅱ",         parent: "电力设备", sinaCode: "sz399613" },
  { code: "801733", name: "其他电源设备Ⅱ", parent: "电力设备", sinaCode: "sz399614" },
  { code: "801735", name: "光伏设备",       parent: "电力设备", sinaCode: "sz399615" },
  { code: "801736", name: "风电设备",       parent: "电力设备", sinaCode: "sz399616" },
  { code: "801737", name: "电池",           parent: "电力设备", sinaCode: "sz399617" },
  { code: "801738", name: "电网设备",       parent: "电力设备", sinaCode: "sz399618" },
  // 机械设备
  { code: "801072", name: "通用设备",       parent: "机械设备", sinaCode: "sz399621" },
  { code: "801074", name: "专用设备",       parent: "机械设备", sinaCode: "sz399622" },
  { code: "801076", name: "轨交设备Ⅱ",     parent: "机械设备", sinaCode: "sz399623" },
  { code: "801077", name: "工程机械",       parent: "机械设备", sinaCode: "sz399624" },
  { code: "801078", name: "自动化设备",     parent: "机械设备", sinaCode: "sz399625" },
  // 国防军工
  { code: "801741", name: "航天装备Ⅱ",     parent: "国防军工", sinaCode: "sz399628" },
  { code: "801742", name: "航空装备Ⅱ",     parent: "国防军工", sinaCode: "sz399629" },
  { code: "801743", name: "地面兵装Ⅱ",     parent: "国防军工", sinaCode: "sz399630" },
  { code: "801744", name: "航海装备Ⅱ",     parent: "国防军工", sinaCode: "sz399631" },
  { code: "801745", name: "军工电子Ⅱ",     parent: "国防军工", sinaCode: "sz399632" },
  // 计算机
  { code: "801101", name: "计算机设备",     parent: "计算机", sinaCode: "sz399635" },
  { code: "801103", name: "IT服务Ⅱ",       parent: "计算机", sinaCode: "sz399636" },
  { code: "801104", name: "软件开发",       parent: "计算机", sinaCode: "sz399637" },
  // 传媒
  { code: "801764", name: "游戏Ⅱ",         parent: "传媒", sinaCode: "sz399640" },
  { code: "801765", name: "广告营销",       parent: "传媒", sinaCode: "sz399641" },
  { code: "801766", name: "影视院线",       parent: "传媒", sinaCode: "sz399642" },
  { code: "801767", name: "数字媒体",       parent: "传媒", sinaCode: "sz399643" },
  { code: "801769", name: "出版",           parent: "传媒", sinaCode: "sz399644" },
  { code: "801995", name: "电视广播Ⅱ",     parent: "传媒", sinaCode: "sz399645" },
  // 通信
  { code: "801223", name: "通信服务",       parent: "通信", sinaCode: "sz399648" },
  { code: "801102", name: "通信设备",       parent: "通信", sinaCode: "sz399649" },
  // 煤炭
  { code: "801951", name: "煤炭开采",       parent: "煤炭", sinaCode: "sz399652" },
  { code: "801952", name: "焦炭Ⅱ",         parent: "煤炭", sinaCode: "sz399653" },
  // 石油石化
  { code: "801962", name: "油服工程",       parent: "石油石化", sinaCode: "sz399656" },
  { code: "801963", name: "炼化及贸易",     parent: "石油石化", sinaCode: "sz399657" },
  // 环保
  { code: "801971", name: "环境治理",       parent: "环保", sinaCode: "sz399660" },
  { code: "801972", name: "环保设备Ⅱ",     parent: "环保", sinaCode: "sz399661" },
  // 美容护理
  { code: "801981", name: "个护用品",       parent: "美容护理", sinaCode: "sz399664" },
  { code: "801982", name: "化妆品",         parent: "美容护理", sinaCode: "sz399665" },
] as const;

// ─── 主要指数 ─────────────────────────────────────────────────────────────────
export const MAJOR_INDICES = [
  { code: "sh000001", name: "上证指数",  sinaCode: "sh000001" },
  { code: "sz399001", name: "深证成指",  sinaCode: "sz399001" },
  { code: "sh000300", name: "沪深300",   sinaCode: "sh000300" },
  { code: "sz399006", name: "创业板指",  sinaCode: "sz399006" },
  { code: "sh000688", name: "科创50",    sinaCode: "sh000688" },
] as const;

// ─── 时间段配置 ───────────────────────────────────────────────────────────────
export type Period = "7d" | "1m" | "3m" | "6m" | "1y";

function getPeriodDays(period: Period): number {
  switch (period) {
    case "7d":  return 10;   // 7交易日约10自然日
    case "1m":  return 35;
    case "3m":  return 95;
    case "6m":  return 185;
    case "1y":  return 370;
  }
}

// ─── 新浪财经 K线数据获取（用于主要指数 + 申万一级行业）──────────────────────────
interface SinaKlineItem {
  day: string;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

const sinaAxios = axios.create({
  timeout: 15000,
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://finance.sina.com.cn/",
    "Accept": "application/json, text/plain, */*",
  },
});

async function fetchSinaKline(sinaCode: string, datalen: number, retries = 2): Promise<SinaKlineItem[]> {
  const url = `https://money.finance.sina.com.cn/quotes_service/api/json_v2.php/CN_MarketData.getKLineData?symbol=${sinaCode}&scale=240&ma=no&datalen=${datalen}`;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await sinaAxios.get(url);
      if (!resp.data || resp.data === "null") return [];
      if (Array.isArray(resp.data)) return resp.data as SinaKlineItem[];
      return [];
    } catch (err) {
      if (attempt === retries) {
        console.warn(`[Stock] Failed to fetch ${sinaCode} after ${retries + 1} attempts`);
        return [];
      }
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  return [];
}

// ─── 申万研究所官方 API（用于申万二级行业）────────────────────────────────────────
interface SwsItem {
  swindexcode: string;
  bargaindate: string;
  closeindex: number;
  openindex: number;
}

const swsAxios = axios.create({
  timeout: 20000,
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Referer": "https://www.swsresearch.com/",
    "Accept": "application/json, text/plain, */*",
  },
});

// 计算 N 天前的日期字符串
function daysAgoStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

async function fetchSwsHistory(swCode: string, period: Period, retries = 2): Promise<Array<{ day: string; close: number }>> {
  const url = `https://www.swsresearch.com/institute-sw/api/index_publish/trend/?swindexcode=${swCode}&period=DAY`;
  const cutoffDate = daysAgoStr(getPeriodDays(period) + 5); // 多取5天确保足够

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const resp = await swsAxios.get<{ code: string; data: SwsItem[] }>(url);
      if (!resp.data?.data || !Array.isArray(resp.data.data)) return [];
      // 过滤到指定时间段，只取 cutoffDate 之后的数据
      const filtered = resp.data.data
        .filter(item => item.bargaindate >= cutoffDate)
        .map(item => ({ day: item.bargaindate, close: item.closeindex }));
      return filtered;
    } catch (err) {
      if (attempt === retries) {
        console.warn(`[Stock] SWS failed to fetch ${swCode} after ${retries + 1} attempts`);
        return [];
      }
      await new Promise(r => setTimeout(r, 1500 * (attempt + 1)));
    }
  }
  return [];
}

// ─── 归一化处理 ───────────────────────────────────────────────────────────────
function normalizeToPercent(closes: number[]): number[] {
  if (closes.length === 0) return [];
  const base = closes[0];
  if (base === 0) return closes.map(() => 0);
  return closes.map(v => parseFloat(((v - base) / base * 100).toFixed(2)));
}

// ─── 对齐日期序列 ─────────────────────────────────────────────────────────────
function alignToDateSet(
  dates: string[],
  seriesData: Array<{ code: string; name: string; type: string; rawDates: string[]; rawCloses: number[] }>
) {
  // 过滤掉没有数据的序列
  const validSeries = seriesData.filter(s => s.rawDates.length > 0);
  if (validSeries.length === 0) return { dates: [], series: [] };

  // 使用所有序列日期的交集（intersection），确保每条线都从同一起点开始
  // 这样可以避免某些行业因起始日期不同导致在图表左侧单独出现
  let commonDates: Set<string> = new Set(validSeries[0].rawDates);
  for (const s of validSeries.slice(1)) {
    const sSet = new Set(s.rawDates);
    commonDates = new Set(Array.from(commonDates).filter(d => sSet.has(d)));
  }

  // 如果交集太小（少于3个交易日），退回到并集策略（容错）
  let allDates: string[];
  if (commonDates.size >= 3) {
    allDates = Array.from(commonDates).sort();
  } else {
    const unionSet = new Set<string>();
    for (const s of validSeries) s.rawDates.forEach(d => unionSet.add(d));
    allDates = Array.from(unionSet).sort();
  }

  const aligned = seriesData.map(s => {
    const map = new Map<string, number>();
    s.rawDates.forEach((d, i) => map.set(d, s.rawCloses[i]));
    
    // 只取公共日期范围内的数据
    const values: (number | null)[] = allDates.map(d => map.has(d) ? map.get(d)! : null);
    
    // 以第一个有效值（公共起始日）为基准归一化
    const firstNonNull = values.find(v => v !== null);
    if (firstNonNull === undefined || firstNonNull === null || firstNonNull === 0) {
      return { code: s.code, name: s.name, type: s.type, data: values.map(() => null) };
    }
    
    const normalized = values.map(v => v === null ? null : parseFloat(((v - firstNonNull) / firstNonNull * 100).toFixed(2)));
    return { code: s.code, name: s.name, type: s.type, data: normalized };
  });

  return { dates: allDates, series: aligned };
}

// ─── 公开 API ─────────────────────────────────────────────────────────────────

export interface IndustryListResult {
  firstLevel: Array<{ code: string; name: string; level: 1 }>;
  secondLevel: Array<{ code: string; name: string; parent: string; level: 2 }>;
}

export function getIndustryList(): IndustryListResult {
  return {
    firstLevel: SW_L1_INDUSTRIES.map(x => ({ code: x.code, name: x.name, level: 1 as const })),
    secondLevel: SW_L2_INDUSTRIES.map(x => ({ code: x.code, name: x.name, parent: x.parent, level: 2 as const })),
  };
}

export interface OverviewResult {
  dates: string[];
  // 方案A：归一化相对涨跌幅
  series: Array<{ code: string; name: string; type: string; data: (number | null)[] }>;
  // 方案C：原始收盘价（仅主行业 + 指数）
  rawSeries: Array<{ code: string; name: string; type: string; data: (number | null)[] }>;
  // 方案B：沪深300每日归一化涨跌幅（用于计算超额收益）
  hs300Returns: (number | null)[];
  period: Period;
  updatedAt: string;
}

export async function fetchOverview(period: Period): Promise<OverviewResult> {
  const datalen = getPeriodDays(period);
  
  // Fetch all indices and L1 industries in parallel (batched to avoid rate limiting)
  const allItems = [
    ...MAJOR_INDICES.map(x => ({ code: x.code, name: x.name, type: "index", sinaCode: x.sinaCode })),
    ...SW_L1_INDUSTRIES.map(x => ({ code: x.code, name: x.name, type: "industry", sinaCode: x.sinaCode })),
  ];

  // Batch requests: 8 at a time
  const BATCH_SIZE = 8;
  const rawResults: Array<{ code: string; name: string; type: string; rawDates: string[]; rawCloses: number[] }> = [];
  
  for (let i = 0; i < allItems.length; i += BATCH_SIZE) {
    const batch = allItems.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async item => {
        const klines = await fetchSinaKline(item.sinaCode, datalen);
        return {
          code: item.code,
          name: item.name,
          type: item.type,
          rawDates: klines.map(k => k.day),
          rawCloses: klines.map(k => parseFloat(k.close)),
        };
      })
    );
    rawResults.push(...batchResults);
    // Small delay between batches
    if (i + BATCH_SIZE < allItems.length) {
      await new Promise(r => setTimeout(r, 200));
    }
  }

  const { dates, series } = alignToDateSet([], rawResults);

  // 方案C：原始收盘价（仅主行业 + 指数，不归一化）
  const rawSeries = rawResults.map(s => {
    const map = new Map<string, number>();
    s.rawDates.forEach((d, i) => map.set(d, s.rawCloses[i]));
    const data: (number | null)[] = dates.map(d => map.has(d) ? map.get(d)! : null);
    return { code: s.code, name: s.name, type: s.type, data };
  });

  // 方案B：提取沪深300的归一化涨跌幅序列（用于计算超额收益）
  const hs300Series = series.find(s => s.code === "sh000300");
  const hs300Returns: (number | null)[] = hs300Series ? hs300Series.data : dates.map(() => null);

  return {
    dates,
    series,
    rawSeries,
    hs300Returns,
    period,
    updatedAt: new Date().toISOString(),
  };
}

export interface SubIndustryResult {
  parentName: string;
  dates: string[];
  series: Array<{ code: string; name: string; type: string; data: (number | null)[] }>;
  period: Period;
  updatedAt: string;
}

export async function fetchSubIndustry(parentName: string, period: Period): Promise<SubIndustryResult> {
  const subIndustries = SW_L2_INDUSTRIES.filter(x => x.parent === parentName);
  
  if (subIndustries.length === 0) {
    return { parentName, dates: [], series: [], period, updatedAt: new Date().toISOString() };
  }

  // 申万二级行业使用申万研究所官方 API（新浪财经不支持二级行业代码）
  // 批量请求，每批 4 个避免限速
  const BATCH_SIZE = 4;
  const rawResults: Array<{ code: string; name: string; type: string; rawDates: string[]; rawCloses: number[] }> = [];

  for (let i = 0; i < subIndustries.length; i += BATCH_SIZE) {
    const batch = subIndustries.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async item => {
        const klines = await fetchSwsHistory(item.code, period);
        return {
          code: item.code,
          name: item.name,
          type: "sub_industry",
          rawDates: klines.map(k => k.day),
          rawCloses: klines.map(k => k.close),
        };
      })
    );
    rawResults.push(...batchResults);
    if (i + BATCH_SIZE < subIndustries.length) {
      await new Promise(r => setTimeout(r, 300));
    }
  }

  const { dates, series } = alignToDateSet([], rawResults);
  
  return {
    parentName,
    dates,
    series,
    period,
    updatedAt: new Date().toISOString(),
  };
}
