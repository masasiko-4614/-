// アプリ全体で使う型定義。
// データの出所(実測・参考値・予測値)は必ず DataQuality で明示する。

// ---------------- 地域 ----------------

export type Area =
  | "伊予市"
  | "双海"
  | "長浜"
  | "大洲市沿岸"
  | "八幡浜"
  | "保内"
  | "伊方"
  | "瀬戸"
  | "三崎"
  | "佐田岬"
  | "三瓶"
  | "明浜"
  | "宇和"
  | "吉田"
  | "宇和島"
  | "三浦半島"
  | "津島"
  | "内海"
  | "御荘"
  | "愛南"
  | "西海";

/** 地域をまとめた広域ブロック */
export type Region =
  | "伊予・双海・長浜"
  | "八幡浜・保内"
  | "佐田岬半島"
  | "宇和海北部"
  | "宇和島・三浦"
  | "南予南部(愛南)";

// ---------------- 釣り場 ----------------

export type SpotType =
  | "漁港"
  | "波止"
  | "堤防"
  | "地磯"
  | "沖磯"
  | "サーフ"
  | "河口"
  | "離島"
  | "その他";

export type Season = "春" | "初夏" | "夏" | "秋" | "初冬" | "冬";

/** 足場の良さ */
export type Footing = "良好" | "やや悪い" | "悪い";

/** 危険度 1(低) 〜 3(高) */
export type DangerLevel = 1 | 2 | 3;

export interface FishingSpot {
  id: string;
  name: string;
  area: Area;
  type: SpotType;
  lat: number;
  lng: number;
  /** 海が開けている方位(度・0=北, 90=東)。風向き判定に使う */
  facing: number;
  /** 狙える魚(FishKey) */
  fish: FishKey[];
  bestSeasons: Season[];
  /** おすすめ時間帯の説明 */
  bestHours: string;
  /** 有利な潮 */
  bestTide: string;
  /** おおよその水深 */
  depth: string;
  /** おすすめルアー・仕掛けの要点 */
  lureHint: string;
  rigHint: string;
  parking: "あり" | "近隣にあり" | "少ない" | "なし";
  toilet: boolean;
  /** 常夜灯 */
  nightLight: boolean;
  footing: Footing;
  /** 初心者向きか */
  beginner: boolean;
  danger: DangerLevel;
  /** 潮汐の参照地点 */
  tideStation: TideStationId;
  notes: string;
  /** 立入禁止・釣り禁止・私有地などの注意 */
  caution?: string;
  isCustom?: boolean;
}

// ---------------- 魚種 ----------------

export type FishKey =
  | "アジ"
  | "メバル"
  | "シーバス"
  | "チヌ"
  | "アオリイカ"
  | "青物"
  | "タチウオ"
  | "カサゴ"
  | "ハタ類"
  | "マダイ"
  | "ヒラメ"
  | "キス";

export type TidePreference =
  | "上げ潮"
  | "下げ潮"
  | "満潮前後"
  | "干潮前後"
  | "動いている潮";

export interface LureSuggestion {
  /** ルアー種別 */
  type: string;
  /** サイズ */
  size: string;
  /** 重量 */
  weight: string;
  /** カラー */
  color: string;
  /** レンジ */
  range: string;
  /** アクション */
  action: string;
}

export interface FishProfile {
  key: FishKey;
  emoji: string;
  /** 良く釣れる月(1-12) */
  seasonMonths: number[];
  seasonNote: string;
  /** 時間帯ごとの相性(0〜1)。24要素 */
  hourAffinity: number[];
  hourNote: string;
  tidePref: TidePreference[];
  depth: string;
  /** 適水温(℃) */
  waterTemp: [number, number];
  /** 得意な釣り場タイプ */
  spotTypes: SpotType[];
  /** 風に対する強さ(0.5〜1.5。大きいほど風に強い) */
  windTolerance: number;
  lures: LureSuggestion[];
  tackle: TackleSuggestion;
  /** ルアー以外の仕掛け */
  rig: string;
}

export interface TackleSuggestion {
  rod: string;
  reel: string;
  line: string;
  leader: string;
  lureWeight: string;
  note?: string;
}

// ---------------- 気象・海況 ----------------

/** データの出所。架空値を実データとして出さないための表示用 */
export type DataQuality = "実データ" | "参考値" | "予測値" | "データ未取得";

export interface HourlyWeather {
  /** 0-23 */
  hour: number;
  tempC: number;
  precipProb: number;
  precipMm: number;
  /** 天気の要約 */
  label: string;
  weatherCode: number;
  windSpeedMs: number;
  windGustMs: number;
  /** 風が吹いてくる方位(度) */
  windDirDeg: number;
  /** 有義波高(m)。取得できない場合は null */
  waveHeightM: number | null;
  /** 海面気圧(hPa) */
  pressureHpa: number | null;
}

export interface DayWeather {
  date: string; // YYYY-MM-DD
  label: string;
  tempMinC: number;
  tempMaxC: number;
  precipProb: number;
  windSpeedMaxMs: number;
  windDirDeg: number;
  waveMaxM: number | null;
  hourly: HourlyWeather[];
  quality: DataQuality;
  /** 波データの出所は別管理(Marine APIが落ちることがある) */
  waveQuality: DataQuality;
  source: string;
}

// ---------------- 潮汐 ----------------

export type TideStationId =
  | "nagahama"
  | "yawatahama"
  | "misaki"
  | "mikame"
  | "uwajima"
  | "mishou"
  | "ainan";

export interface TideStation {
  id: TideStationId;
  name: string;
  lat: number;
  lng: number;
  /** 平均潮位(cm) */
  meanLevelCm: number;
  /** 大潮時の振幅(cm) */
  springAmplitudeCm: number;
  /** 月の南中から満潮までの遅れ(時間) */
  lunitidalIntervalH: number;
}

export type ShioMawari = "大潮" | "中潮" | "小潮" | "長潮" | "若潮";

export type TideState = "上げ潮" | "下げ潮" | "潮止まり";

export interface TideEvent {
  /** 0〜24 の小数時 */
  hour: number;
  time: string; // HH:mm
  type: "満潮" | "干潮";
  levelCm: number;
}

export interface TidePoint {
  hour: number;
  levelCm: number;
}

export interface TideInfo {
  date: string;
  stationId: TideStationId;
  stationName: string;
  shio: ShioMawari;
  moonAge: number;
  events: TideEvent[];
  /** 10分刻みの潮位カーブ */
  curve: TidePoint[];
  quality: DataQuality;
  source: string;
}

// ---------------- 天文 ----------------

export interface SunMoonTimes {
  sunrise: string; // HH:mm
  sunset: string;
  sunriseH: number;
  sunsetH: number;
  /** 朝まづめ */
  dawnStart: string;
  dawnEnd: string;
  /** 夕まづめ */
  duskStart: string;
  duskEnd: string;
  moonAge: number;
  moonName: string;
}

// ---------------- 予測 ----------------

export interface HourlyForecast {
  hour: number;
  /** 0〜100 の期待度 */
  score: number;
  tideState: TideState;
  tideLevelCm: number;
  windSpeedMs: number;
  windDirDeg: number;
  /** 期待度に効いた主な理由 */
  reasons: string[];
  /** 安全上の減点があるか */
  unsafe: boolean;
}

export interface ScoreBreakdown {
  tide: number;
  timeOfDay: number;
  wind: number;
  weather: number;
  wave: number;
  season: number;
  spotFish: number;
  personal: number;
}

export interface BestTime {
  startHour: number;
  endHour: number;
  start: string;
  end: string;
  score: number;
  reasons: string[];
}

export type ExpectationRank = "爆釣期待" | "かなり期待" | "期待できる" | "普通" | "厳しい";

export interface SpotForecast {
  spotId: string;
  spotName: string;
  area: Area;
  date: string;
  /** 日中の代表スコア(ベストタイムのスコア) */
  score: number;
  /** 指定時刻のスコア(現在時刻など) */
  nowScore: number;
  rank: ExpectationRank;
  stars: number;
  hourly: HourlyForecast[];
  best: BestTime | null;
  windows: BestTime[];
  breakdown: ScoreBreakdown;
  /** おすすめ魚種(スコア順) */
  topFish: { fish: FishKey; score: number }[];
  wind: WindJudgement;
  warnings: SafetyWarning[];
}

// ---------------- 風 ----------------

export type WindRelation = "向かい風" | "追い風" | "横風" | "ほぼ無風";

export interface WindJudgement {
  relation: WindRelation;
  speedMs: number;
  dirDeg: number;
  dirName: string;
  /** 釣りやすさの評価文 */
  comment: string;
  /** 0(危険)〜1(最適) */
  factor: number;
  danger: boolean;
}

// ---------------- 安全 ----------------

export type WarningLevel = "注意" | "警戒" | "危険";

export interface SafetyWarning {
  level: WarningLevel;
  title: string;
  detail: string;
}

// ---------------- 釣果記録 ----------------

export interface CatchRecord {
  id: string;
  date: string; // YYYY-MM-DD
  spotId: string;
  spotName: string;
  startTime: string; // HH:mm
  endTime: string;
  species: string;
  count: number;
  sizeCm?: number;
  lure?: string;
  lureColor?: string;
  lureWeightG?: number;
  tide?: ShioMawari;
  tideState?: TideState;
  weather?: string;
  windDir?: string;
  windSpeedMs?: number;
  photo?: string; // dataURL
  memo?: string;
  createdAt: string;
}

// ---------------- タックル ----------------

export type TackleCategory = "ロッド" | "リール" | "ライン" | "リーダー" | "ルアー";

export const TACKLE_CATEGORIES: TackleCategory[] = [
  "ロッド",
  "リール",
  "ライン",
  "リーダー",
  "ルアー",
];

export interface TackleItem {
  id: string;
  category: TackleCategory;
  name: string;
  spec?: string;
}

export interface TackleSet {
  id: string;
  name: string;
  itemIds: string[];
  isCurrent?: boolean;
}

// ---------------- 個人分析 ----------------

export interface PersonalInsight {
  title: string;
  detail: string;
  /** 根拠になった記録数 */
  sampleSize: number;
}

export interface PersonalProfile {
  totalRecords: number;
  insights: PersonalInsight[];
  /** 釣り場ID -> 補正値(-1〜1) */
  spotBias: Record<string, number>;
  /** 時間帯(0-23) -> 補正値 */
  hourBias: number[];
  /** 潮回り -> 補正値 */
  shioBias: Partial<Record<ShioMawari, number>>;
}
