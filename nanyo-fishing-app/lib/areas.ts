// 対象地域の定義。愛媛県全域を対象としつつ、南予を重点エリアとする。

import type { Area, Region, TideStationId } from "./types";

export interface AreaInfo {
  name: Area;
  region: Region;
  /**
   * 地域の代表地点(その地域の主な釣り場付近)。天気・風・波の取得に使う。
   * 宇和は内陸の拠点のため卯之町を指す。
   */
  lat: number;
  lng: number;
  /** 潮汐の参照地点 */
  tideStation: TideStationId;
  /** 南予の重点地域か */
  key: boolean;
  /** 特に情報量を厚くする最重点地域か */
  primary: boolean;
  description: string;
}

export const AREA_INFOS: AreaInfo[] = [
  // ---- 伊予・双海・長浜(南予の入口) ----
  {
    name: "伊予市",
    region: "伊予・双海・長浜",
    lat: 33.76019,
    lng: 132.69383,
    tideStation: "nagahama",
    key: true,
    primary: false,
    description: "伊予港・郡中港を中心とした穏やかな内海。アジ・キス・チヌが手軽に狙える。",
  },
  {
    name: "双海",
    region: "伊予・双海・長浜",
    lat: 33.66295,
    lng: 132.60136,
    tideStation: "nagahama",
    key: true,
    primary: false,
    description: "下灘・上灘。夕日で有名なエリア。伊予灘に面し、青物の回遊もある。",
  },
  {
    name: "長浜",
    region: "伊予・双海・長浜",
    lat: 33.61824,
    lng: 132.48283,
    tideStation: "nagahama",
    key: true,
    primary: true,
    description: "肱川河口と長浜港。シーバス・チヌ・アジの好フィールド。潮通しが良い。",
  },
  {
    name: "大洲市沿岸",
    region: "伊予・双海・長浜",
    lat: 33.60998,
    lng: 132.47973,
    tideStation: "nagahama",
    key: true,
    primary: false,
    description: "肱川水系の汽水域。増水・ダム放流時は危険。シーバス・チヌ狙い。",
  },

  // ---- 八幡浜・保内 ----
  {
    name: "八幡浜",
    region: "八幡浜・保内",
    lat: 33.45775,
    lng: 132.41343,
    tideStation: "yawatahama",
    key: true,
    primary: true,
    description: "南予随一の港町。港内は常夜灯が多くアジング・メバリングの一級エリア。",
  },
  {
    name: "保内",
    region: "八幡浜・保内",
    lat: 33.47475,
    lng: 132.39437,
    tideStation: "yawatahama",
    key: true,
    primary: false,
    description: "川之石湾。奥まった湾内で風に強く、悪天候時の逃げ場になる。",
  },

  // ---- 佐田岬半島 ----
  {
    name: "伊方",
    region: "佐田岬半島",
    lat: 33.48636,
    lng: 132.35132,
    tideStation: "yawatahama",
    key: true,
    primary: false,
    description: "半島付け根。北岸(伊予灘)と南岸(宇和海)の使い分けができる。",
  },
  {
    name: "瀬戸",
    region: "佐田岬半島",
    lat: 33.41388,
    lng: 132.19135,
    tideStation: "misaki",
    key: true,
    primary: false,
    description: "潮通し抜群。青物・アオリイカの実績が高いが風の影響を受けやすい。",
  },
  {
    name: "三崎",
    region: "佐田岬半島",
    lat: 33.38870,
    lng: 132.11966,
    tideStation: "misaki",
    key: true,
    primary: false,
    description: "三崎港を中心とした半島先端部。豊予海峡の激流で大型回遊魚が狙える。",
  },
  {
    name: "佐田岬",
    region: "佐田岬半島",
    lat: 33.34317,
    lng: 132.01464,
    tideStation: "misaki",
    key: true,
    primary: true,
    description: "日本一細長い半島の先端。屈指の潮通しだが、地磯は上級者向け。",
  },

  // ---- 宇和海北部 ----
  {
    name: "三瓶",
    region: "宇和海北部",
    lat: 33.37343,
    lng: 132.41268,
    tideStation: "mikame",
    key: true,
    primary: true,
    description: "三瓶湾。リアス式の穏やかな湾内。アジ・メバル・アオリイカが安定。",
  },
  {
    name: "明浜",
    region: "宇和海北部",
    lat: 33.31305,
    lng: 132.47075,
    tideStation: "mikame",
    key: true,
    primary: false,
    description: "宇和海に面した段々畑の海岸線。地磯・小場所が多くグレ・アオリイカ。",
  },
  {
    name: "宇和",
    region: "宇和海北部",
    lat: 33.37080,
    lng: 132.51300,
    tideStation: "mikame",
    key: true,
    primary: false,
    description: "西予市宇和町。内陸のため海釣り場はなく、明浜・三瓶へのアクセス拠点。",
  },

  // ---- 宇和島・三浦 ----
  {
    name: "吉田",
    region: "宇和島・三浦",
    lat: 33.27101,
    lng: 132.54105,
    tideStation: "uwajima",
    key: true,
    primary: false,
    description: "吉田湾。みかんの産地。湾奥はチヌ・シーバス、湾口はアジ・青物。",
  },
  {
    name: "宇和島",
    region: "宇和島・三浦",
    lat: 33.22210,
    lng: 132.55441,
    tideStation: "uwajima",
    key: true,
    primary: true,
    description: "南予最大の市街地。港・九島・河口と選択肢が多く、夜釣りの実績も高い。",
  },
  {
    name: "三浦半島",
    region: "宇和島・三浦",
    lat: 33.20592,
    lng: 132.45772,
    tideStation: "uwajima",
    key: true,
    primary: false,
    description: "遊子・蒋淵など小さな漁港が点在。潮通しが良くアオリイカ・青物。",
  },
  {
    name: "津島",
    region: "宇和島・三浦",
    lat: 33.12009,
    lng: 132.51123,
    tideStation: "uwajima",
    key: true,
    primary: false,
    description: "岩松川河口と由良半島北岸。汽水のシーバス・チヌが面白い。",
  },

  // ---- 南予南部(愛南) ----
  {
    name: "内海",
    region: "南予南部(愛南)",
    lat: 33.01620,
    lng: 132.49414,
    tideStation: "ainan",
    key: true,
    primary: false,
    description: "愛南町北部。柏崎・家串など養殖筏の多い静かな湾。メバル・アジ。",
  },
  {
    name: "御荘",
    region: "南予南部(愛南)",
    lat: 32.96573,
    lng: 132.54425,
    tideStation: "mishou",
    key: true,
    primary: false,
    description: "御荘湾。遠浅で穏やか。チヌ・キス・シーバスのファミリー向けエリア。",
  },
  {
    name: "愛南",
    region: "南予南部(愛南)",
    lat: 32.94331,
    lng: 132.58566,
    tideStation: "ainan",
    key: true,
    primary: true,
    description: "深浦・船越など。黒潮の影響を受け、南予で最も魚種が豊富。",
  },
  {
    name: "西海",
    region: "南予南部(愛南)",
    lat: 32.91487,
    lng: 132.50189,
    tideStation: "ainan",
    key: true,
    primary: false,
    description: "高茂岬・鹿島周辺。外洋に面した大場所。青物・大型回遊魚の実績。",
  },
];

export const AREAS: Area[] = AREA_INFOS.map((a) => a.name);

export const REGIONS: Region[] = [
  "伊予・双海・長浜",
  "八幡浜・保内",
  "佐田岬半島",
  "宇和海北部",
  "宇和島・三浦",
  "南予南部(愛南)",
];

const AREA_MAP = new Map<Area, AreaInfo>(AREA_INFOS.map((a) => [a.name, a]));

export function getAreaInfo(area: Area): AreaInfo | undefined {
  return AREA_MAP.get(area);
}

export function areasInRegion(region: Region): AreaInfo[] {
  return AREA_INFOS.filter((a) => a.region === region);
}

/** ランキング画面で比較する代表エリア */
export const RANKING_AREAS: Area[] = [
  "長浜",
  "八幡浜",
  "佐田岬",
  "三瓶",
  "宇和島",
  "愛南",
];
