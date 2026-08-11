// 魚種プロファイル。
// シーズン・時間帯・潮・水深・ルアー・タックルの一般的な目安をまとめたもの。
// 地域や年により状況は変わるため、あくまで「参考値」として扱うこと。

import type { FishKey, FishProfile } from "./types";

export const FISH_KEYS: FishKey[] = [
  "アジ",
  "メバル",
  "シーバス",
  "チヌ",
  "アオリイカ",
  "青物",
  "タチウオ",
  "カサゴ",
  "ハタ類",
  "マダイ",
  "ヒラメ",
  "キス",
];

// 24時間の相性(0〜1)。index = 時
// 夜行性/日中型など、魚種本来の活性パターン。まづめ補正は予測エンジン側で加算する。
const NIGHT_STRONG = [
  0.85, 0.8, 0.7, 0.65, 0.75, 0.85, 0.8, 0.6, 0.4, 0.3, 0.25, 0.25, 0.25, 0.3,
  0.35, 0.45, 0.6, 0.8, 0.95, 1.0, 1.0, 0.95, 0.9, 0.9,
];
const NIGHT_MID = [
  0.7, 0.6, 0.5, 0.5, 0.7, 0.85, 0.9, 0.7, 0.5, 0.4, 0.35, 0.35, 0.35, 0.35,
  0.4, 0.5, 0.7, 0.85, 1.0, 1.0, 0.95, 0.9, 0.85, 0.8,
];
const TWILIGHT = [
  0.4, 0.35, 0.3, 0.35, 0.6, 0.85, 1.0, 0.9, 0.7, 0.6, 0.5, 0.45, 0.45, 0.5,
  0.6, 0.7, 0.85, 1.0, 0.95, 0.75, 0.6, 0.5, 0.45, 0.4,
];
const DAWN_STRONG = [
  0.2, 0.2, 0.2, 0.3, 0.6, 0.9, 1.0, 0.95, 0.8, 0.65, 0.55, 0.5, 0.5, 0.55,
  0.6, 0.7, 0.85, 0.95, 0.8, 0.5, 0.3, 0.25, 0.2, 0.2,
];
const DAY = [
  0.15, 0.15, 0.15, 0.2, 0.35, 0.6, 0.8, 0.9, 0.95, 1.0, 1.0, 0.95, 0.9, 0.9,
  0.95, 1.0, 0.95, 0.8, 0.55, 0.3, 0.2, 0.15, 0.15, 0.15,
];
const DUSK_NIGHT = [
  0.6, 0.5, 0.4, 0.35, 0.4, 0.5, 0.55, 0.4, 0.25, 0.2, 0.2, 0.2, 0.2, 0.2,
  0.25, 0.35, 0.6, 0.9, 1.0, 1.0, 0.9, 0.8, 0.7, 0.65,
];

export const FISH_PROFILES: Record<FishKey, FishProfile> = {
  アジ: {
    key: "アジ",
    emoji: "🐟",
    seasonMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    seasonNote:
      "春(3〜6月)と秋〜初冬(9〜12月)がハイシーズン。真夏は小型(豆アジ)中心、真冬は深場へ落ちて難しくなる。",
    hourAffinity: NIGHT_MID,
    hourNote: "夕まづめ〜21時が最も安定。常夜灯があれば夜通し狙える。",
    tidePref: ["上げ潮", "動いている潮", "満潮前後"],
    depth: "表層〜中層(1〜5m)。日中は底付近",
    waterTemp: [14, 26],
    spotTypes: ["漁港", "波止", "堤防"],
    windTolerance: 0.75,
    lures: [
      {
        type: "ジグヘッド + ワーム",
        size: "1.5〜2.5インチ",
        weight: "0.6〜1.5g",
        color: "クリア・グロー系(常夜灯下)、ケイムラ",
        range: "表層〜中層",
        action: "ただ巻き + カーブフォール。フォール中のアタリを取る",
      },
      {
        type: "キャロ・フロートリグ",
        size: "2インチ前後",
        weight: "3〜10g",
        color: "クリア・ホワイト",
        range: "中層",
        action: "遠投してゆっくり漂わせる。風が強い日や沖の潮目狙いに",
      },
      {
        type: "メタルジグ(マイクロ)",
        size: "30〜45mm",
        weight: "3〜7g",
        color: "シルバー・ブルーピンク",
        range: "中層〜ボトム",
        action: "リフト&フォール。日中や深場のアジに有効",
      },
    ],
    tackle: {
      rod: "5.5〜7.0ft アジングロッド(ソリッドティップ)",
      reel: "1000〜2000番",
      line: "エステル0.3号 または PE0.2〜0.3号",
      leader: "フロロ0.8〜1.5号(3〜6lb)",
      lureWeight: "0.4〜3g",
      note: "軽量ジグヘッドを扱うため、風の弱い日ほど有利。",
    },
    rig: "サビキ釣り(アミエビ)、ウキ釣り、飲ませ釣りの餌取りにも",
  },

  メバル: {
    key: "メバル",
    emoji: "🐠",
    seasonMonths: [11, 12, 1, 2, 3, 4, 5],
    seasonNote: "晩秋〜春(11〜5月)。冬の代表的なターゲット。夏は深場へ落ちる。",
    hourAffinity: NIGHT_STRONG,
    hourNote: "完全な夜行性。日没後〜深夜が本番。月明かりの少ない夜が有利。",
    tidePref: ["上げ潮", "満潮前後", "動いている潮"],
    depth: "表層〜中層(0.5〜3m)。常夜灯の明暗が要",
    waterTemp: [10, 20],
    spotTypes: ["漁港", "波止", "堤防", "地磯"],
    windTolerance: 0.7,
    lures: [
      {
        type: "ジグヘッド + ワーム",
        size: "1.5〜2インチ",
        weight: "0.6〜1.5g",
        color: "クリア・ホワイト・グロー",
        range: "表層〜1m",
        action: "デッドスロー巻き。止めずに一定速度で",
      },
      {
        type: "小型プラグ(フローティング/シンキング)",
        size: "40〜50mm",
        weight: "2〜3g",
        color: "クリア系・パール",
        range: "表層",
        action: "ただ巻き + 時々ストップ。明暗の境目を通す",
      },
    ],
    tackle: {
      rod: "7.0〜8.0ft メバリングロッド",
      reel: "2000番",
      line: "PE0.3号 または エステル0.4号",
      leader: "フロロ1.0〜1.5号",
      lureWeight: "0.5〜5g",
      note: "常夜灯の明暗を丁寧に探るのがコツ。",
    },
    rig: "ウキ釣り(青イソメ)、探り釣り",
  },

  シーバス: {
    key: "シーバス",
    emoji: "🐡",
    seasonMonths: [3, 4, 5, 6, 9, 10, 11, 12],
    seasonNote:
      "春(3〜6月)のバチ抜け・稚鮎、秋(9〜12月)のベイト追いが2大シーズン。",
    hourAffinity: NIGHT_MID,
    hourNote: "夜がメイン。特に日没後2〜3時間と、明け方の薄暗い時間帯。",
    tidePref: ["下げ潮", "動いている潮"],
    depth: "表層〜中層(0.3〜3m)",
    waterTemp: [12, 26],
    spotTypes: ["河口", "漁港", "堤防", "サーフ"],
    windTolerance: 1.1,
    lures: [
      {
        type: "ミノー(フローティング/シンキング)",
        size: "90〜120mm",
        weight: "10〜20g",
        color: "夜はパール・チャート、月夜はナチュラル",
        range: "表層〜1.5m",
        action: "ただ巻き。流れに乗せてドリフトさせる",
      },
      {
        type: "シンキングペンシル",
        size: "90〜110mm",
        weight: "12〜20g",
        color: "クリア・パール",
        range: "表層直下",
        action: "流れに漂わせるドリフト。河口の下げ潮で強い",
      },
      {
        type: "バイブレーション",
        size: "60〜80mm",
        weight: "15〜28g",
        color: "シルバー・レッドヘッド",
        range: "中層〜ボトム",
        action: "ただ巻き・リフト&フォール。濁りや深場に",
      },
    ],
    tackle: {
      rod: "8.6〜9.6ft シーバスロッド(ML〜M)",
      reel: "3000〜4000番",
      line: "PE0.8〜1.2号",
      leader: "フロロ16〜25lb",
      lureWeight: "10〜30g",
      note: "河口の流れを釣る意識が最重要。",
    },
    rig: "ヘチ釣り、電気ウキ釣り(活きアジ・イソメ)",
  },

  チヌ: {
    key: "チヌ",
    emoji: "🐟",
    seasonMonths: [3, 4, 5, 6, 7, 8, 9, 10, 11],
    seasonNote: "春の乗っ込み(4〜6月)が最盛期。夏〜秋もトップゲームで狙える。",
    hourAffinity: TWILIGHT,
    hourNote: "朝夕まづめが中心。夏場は夜のトップゲームも成立する。",
    tidePref: ["上げ潮", "満潮前後", "動いている潮"],
    depth: "ボトム中心。夏はトップも",
    waterTemp: [15, 28],
    spotTypes: ["漁港", "河口", "堤防", "地磯", "サーフ"],
    windTolerance: 1.0,
    lures: [
      {
        type: "チニング用ラバージグ / フリーリグ",
        size: "2〜3インチワーム",
        weight: "5〜14g",
        color: "オレンジ・チャート・グリパン",
        range: "ボトム",
        action: "ボトムをズル引き + 時々シェイク",
      },
      {
        type: "トップウォーター(ポッパー)",
        size: "60〜80mm",
        weight: "7〜12g",
        color: "チャート・ホワイト",
        range: "表層",
        action: "小刻みなドッグウォーク。夏の朝夕・シャローで",
      },
    ],
    tackle: {
      rod: "7.6〜8.6ft チニングロッド(ML)",
      reel: "2500〜3000番",
      line: "PE0.6〜0.8号",
      leader: "フロロ12〜16lb",
      lureWeight: "5〜21g",
      note: "根掛かりが多いのでリグの予備を多めに。",
    },
    rig: "フカセ釣り、落とし込み(カニ・イガイ)、ダンゴ釣り",
  },

  アオリイカ: {
    key: "アオリイカ",
    emoji: "🦑",
    seasonMonths: [4, 5, 6, 9, 10, 11, 12],
    seasonNote:
      "春(4〜6月)は親イカの大型狙い、秋(9〜12月)は新子の数釣り。南予は秋が特に好調。",
    hourAffinity: TWILIGHT,
    hourNote: "朝夕まづめが最も反応が良い。夜は常夜灯周りで狙える。",
    tidePref: ["動いている潮", "上げ潮", "満潮前後"],
    depth: "中層〜ボトム(3〜10m)",
    waterTemp: [16, 27],
    spotTypes: ["漁港", "波止", "堤防", "地磯", "沖磯"],
    windTolerance: 0.8,
    lures: [
      {
        type: "エギ(春・親イカ)",
        size: "3.5号(90mm)",
        weight: "18〜22g",
        color: "下地はマーブル・金、布はピンク・オレンジ",
        range: "ボトム〜中層",
        action: "2〜3段シャクリ + 長めのフォール(10〜20秒)",
      },
      {
        type: "エギ(秋・新子)",
        size: "2.5〜3.0号",
        weight: "10〜16g",
        color: "オレンジ・ピンク・ナチュラル",
        range: "中層",
        action: "テンポの速いシャクリ + 短いフォール",
      },
    ],
    tackle: {
      rod: "8.0〜8.6ft エギングロッド(ML)",
      reel: "2500〜3000番",
      line: "PE0.6〜0.8号",
      leader: "フロロ2.0〜2.5号",
      lureWeight: "エギ2.5〜3.5号",
      note: "藻場・海藻の際が一級ポイント。",
    },
    rig: "ヤエン釣り、ウキ釣り(活きアジ)",
  },

  青物: {
    key: "青物",
    emoji: "🐬",
    seasonMonths: [5, 6, 7, 8, 9, 10, 11, 12],
    seasonNote:
      "初夏〜初冬。特に秋(9〜11月)が最盛期。佐田岬・愛南は黒潮の影響で期待度が高い。",
    hourAffinity: DAWN_STRONG,
    hourNote: "朝まづめが圧倒的。日の出前後1〜2時間に回遊が集中する。",
    tidePref: ["動いている潮", "上げ潮"],
    depth: "表層〜中層。潮目・ナブラを狙う",
    waterTemp: [18, 28],
    spotTypes: ["堤防", "地磯", "沖磯", "漁港", "サーフ"],
    windTolerance: 1.2,
    lures: [
      {
        type: "メタルジグ",
        size: "80〜130mm",
        weight: "20〜60g(沖磯は80g以上)",
        color: "シルバー・ブルピン・ゼブラグロー",
        range: "表層〜ボトム",
        action: "ワンピッチジャーク、ただ巻き",
      },
      {
        type: "ミノー(シンキング)",
        size: "100〜140mm",
        weight: "25〜45g",
        color: "イワシ・ブルーバック",
        range: "表層〜2m",
        action: "速めのただ巻き + トゥイッチ",
      },
      {
        type: "トップウォーター(ペンシル)",
        size: "120〜160mm",
        weight: "30〜60g",
        color: "ピンク・クリア・チャート",
        range: "表層",
        action: "ドッグウォーク。ナブラ撃ちに",
      },
    ],
    tackle: {
      rod: "9.0〜10.0ft ショアジギングロッド(MH〜H)",
      reel: "4000〜6000番",
      line: "PE1.5〜3号",
      leader: "フロロ30〜50lb",
      lureWeight: "20〜80g",
      note: "ドラグ設定と足場の確保が重要。ランディングツールも必携。",
    },
    rig: "飲ませ釣り(活きアジ)、カゴ釣り",
  },

  タチウオ: {
    key: "タチウオ",
    emoji: "🗡️",
    seasonMonths: [7, 8, 9, 10, 11, 12],
    seasonNote: "夏〜初冬(7〜12月)。秋(9〜11月)が最も安定して釣れる。",
    hourAffinity: DUSK_NIGHT,
    hourNote: "日没直前〜21時頃が最大のチャンス。夜通しでも狙える。",
    tidePref: ["上げ潮", "動いている潮"],
    depth: "中層〜表層(2〜8m)。時間とともに浮いてくる",
    waterTemp: [18, 28],
    spotTypes: ["漁港", "波止", "堤防"],
    windTolerance: 0.9,
    lures: [
      {
        type: "ワインド(ジグヘッド + ワーム)",
        size: "3〜4インチ",
        weight: "14〜28g",
        color: "グロー・ケイムラ・チャート",
        range: "中層",
        action: "ダート(2回シャクリ + フォール)",
      },
      {
        type: "メタルジグ",
        size: "80〜110mm",
        weight: "20〜40g",
        color: "グロー・シルバー",
        range: "中層〜ボトム",
        action: "リフト&フォール。フォール中に食う",
      },
    ],
    tackle: {
      rod: "8.0〜9.0ft ライトショアジギング/ワインドロッド",
      reel: "2500〜3000番",
      line: "PE0.8〜1.2号",
      leader: "フロロ20〜30lb + ワイヤーリーダー",
      lureWeight: "14〜40g",
      note: "歯が鋭いので必ずワイヤーまたは太めのリーダーを使用。",
    },
    rig: "電気ウキ釣り、引き釣り(キビナゴ)",
  },

  カサゴ: {
    key: "カサゴ",
    emoji: "🐡",
    seasonMonths: [1, 2, 3, 4, 5, 10, 11, 12],
    seasonNote: "一年中狙えるが、水温の下がる晩秋〜春が特に好調。",
    hourAffinity: NIGHT_STRONG,
    hourNote: "夜行性。日没後の探り釣りが効率的。",
    tidePref: ["動いている潮", "上げ潮"],
    depth: "ボトム(足元の敷石・テトラ際)",
    waterTemp: [10, 24],
    spotTypes: ["漁港", "波止", "堤防", "地磯"],
    windTolerance: 1.0,
    lures: [
      {
        type: "ジグヘッド + ワーム",
        size: "2〜3インチ",
        weight: "3〜7g",
        color: "オレンジ・チャート・グロー",
        range: "ボトム",
        action: "リフト&フォール。障害物の際を丁寧に",
      },
      {
        type: "テキサスリグ / フリーリグ",
        size: "2〜3インチ",
        weight: "5〜14g",
        color: "レッド・グリパン",
        range: "ボトム",
        action: "根の中を落とし込む",
      },
    ],
    tackle: {
      rod: "7.0〜8.0ft ライトロックロッド",
      reel: "2000〜2500番",
      line: "PE0.4〜0.8号",
      leader: "フロロ8〜12lb",
      lureWeight: "3〜14g",
      note: "根掛かり前提。仕掛けの予備を多めに。",
    },
    rig: "ブラクリ、探り釣り(青イソメ・オキアミ)",
  },

  ハタ類: {
    key: "ハタ類",
    emoji: "🐟",
    seasonMonths: [5, 6, 7, 8, 9, 10, 11],
    seasonNote:
      "初夏〜秋(5〜11月)。オオモンハタ・アカハタなど。南予南部(愛南)で実績が高い。",
    hourAffinity: TWILIGHT,
    hourNote: "朝夕まづめが中心。日中でもボトムを丁寧に探れば反応がある。",
    tidePref: ["動いている潮", "上げ潮"],
    depth: "ボトム(5〜20m)",
    waterTemp: [18, 28],
    spotTypes: ["地磯", "沖磯", "堤防", "漁港"],
    windTolerance: 1.0,
    lures: [
      {
        type: "ジグヘッド + シャッドワーム",
        size: "3〜4インチ",
        weight: "10〜21g",
        color: "チャート・パール・オレンジ",
        range: "ボトム〜ボトム上1m",
        action: "ボトムを取り直しながらのただ巻き",
      },
      {
        type: "メタルジグ",
        size: "80〜100mm",
        weight: "20〜40g",
        color: "シルバー・ゼブラグロー",
        range: "ボトム",
        action: "リフト&フォール",
      },
    ],
    tackle: {
      rod: "8.0〜9.0ft ロックフィッシュ/ライトショアジギングロッド",
      reel: "3000〜4000番",
      line: "PE0.8〜1.5号",
      leader: "フロロ20〜30lb",
      lureWeight: "10〜40g",
      note: "根に潜られる前に浮かせるパワーが必要。",
    },
    rig: "泳がせ釣り、ブッコミ釣り",
  },

  マダイ: {
    key: "マダイ",
    emoji: "🎏",
    seasonMonths: [3, 4, 5, 6, 10, 11, 12],
    seasonNote: "春の乗っ込み(4〜6月)と秋(10〜12月)。潮通しの良い場所で。",
    hourAffinity: TWILIGHT,
    hourNote: "朝夕まづめ。夜間のフカセ・ぶっこみでも実績あり。",
    tidePref: ["動いている潮", "上げ潮", "下げ潮"],
    depth: "中層〜ボトム(5〜20m)",
    waterTemp: [15, 25],
    spotTypes: ["地磯", "沖磯", "堤防", "漁港", "離島"],
    windTolerance: 0.9,
    lures: [
      {
        type: "メタルジグ",
        size: "80〜120mm",
        weight: "30〜60g",
        color: "ピンク・オレンジ・シルバー",
        range: "ボトム〜中層",
        action: "ゆっくりしたただ巻き、スロージャーク",
      },
      {
        type: "タイラバ(陸っぱり用)",
        size: "—",
        weight: "30〜60g",
        color: "オレンジ・レッド",
        range: "ボトム",
        action: "等速巻き。アタリがあっても巻き続ける",
      },
    ],
    tackle: {
      rod: "9.0〜10.0ft ショアジギング/磯竿1.5〜2号",
      reel: "3000〜4000番",
      line: "PE1.0〜2.0号",
      leader: "フロロ25〜40lb",
      lureWeight: "30〜60g",
      note: "潮通しの良い場所ほどチャンスが増える。",
    },
    rig: "フカセ釣り、カゴ釣り、ぶっこみ釣り",
  },

  ヒラメ: {
    key: "ヒラメ",
    emoji: "🐟",
    seasonMonths: [4, 5, 6, 9, 10, 11, 12],
    seasonNote: "春(4〜6月)と秋〜初冬(9〜12月)。ベイトが接岸するタイミングが鍵。",
    hourAffinity: DAWN_STRONG,
    hourNote: "朝まづめが最も有望。日中でも潮が動けばチャンスあり。",
    tidePref: ["上げ潮", "動いている潮"],
    depth: "ボトム〜ボトム上1m",
    waterTemp: [15, 25],
    spotTypes: ["サーフ", "河口", "堤防", "漁港"],
    windTolerance: 1.1,
    lures: [
      {
        type: "メタルジグ",
        size: "80〜110mm",
        weight: "25〜40g",
        color: "シルバー・ピンクバック",
        range: "ボトム",
        action: "ただ巻き + リフト&フォール",
      },
      {
        type: "シンキングミノー",
        size: "100〜130mm",
        weight: "20〜30g",
        color: "イワシ・ピンク",
        range: "ボトム上0.5〜1m",
        action: "ボトムを感じながらのただ巻き",
      },
      {
        type: "ジグヘッド + シャッドワーム",
        size: "4〜5インチ",
        weight: "14〜28g",
        color: "パール・チャート",
        range: "ボトム",
        action: "スローなただ巻き",
      },
    ],
    tackle: {
      rod: "9.6〜10.6ft サーフ/シーバスロッド(M〜MH)",
      reel: "4000番",
      line: "PE1.0〜1.5号",
      leader: "フロロ20〜30lb",
      lureWeight: "20〜40g",
      note: "広範囲を探るランガンが基本。",
    },
    rig: "泳がせ釣り(活きアジ・イワシ)",
  },

  キス: {
    key: "キス",
    emoji: "🐠",
    seasonMonths: [5, 6, 7, 8, 9, 10],
    seasonNote: "初夏〜秋(5〜10月)。真夏の日中でも数釣りができる数少ない魚種。",
    hourAffinity: DAY,
    hourNote: "完全な日中型。朝から夕方まで幅広くチャンスがある。",
    tidePref: ["上げ潮", "動いている潮"],
    depth: "砂地のボトム(1〜5m)",
    waterTemp: [18, 28],
    spotTypes: ["サーフ", "漁港", "河口"],
    windTolerance: 0.9,
    lures: [
      {
        type: "メタルジグ(キス用) / ジグヘッド",
        size: "小型",
        weight: "5〜15g",
        color: "シルバー・ピンク",
        range: "ボトム",
        action: "ズル引き + 小刻みなリフト",
      },
    ],
    tackle: {
      rod: "投げ竿 or 8〜9ft ライトロッド",
      reel: "2500〜3000番",
      line: "PE0.6〜0.8号 または ナイロン2号",
      leader: "フロロ8〜12lb",
      lureWeight: "5〜20g",
      note: "ルアーより天秤+ジェット天秤の投げ釣りが効率的。",
    },
    rig: "投げ釣り(天秤 + キス仕掛け、青イソメ)",
  },
};

/** 釣果記録で選べる魚種(プロファイル外の魚も含む) */
export const RECORD_SPECIES: string[] = [
  ...FISH_KEYS,
  "サバ",
  "カマス",
  "グレ",
  "マゴチ",
  "コウイカ",
  "その他",
];

export function getFishProfile(key: FishKey): FishProfile {
  return FISH_PROFILES[key];
}

/** その月に狙える魚種を返す */
export function fishInSeason(month: number): FishKey[] {
  return FISH_KEYS.filter((k) => FISH_PROFILES[k].seasonMonths.includes(month));
}
