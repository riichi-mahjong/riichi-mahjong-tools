"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useState } from "react";

type GameType = "East-South" | "East-Only";
type Locale = "ja" | "en";

const DEFAULT_SIMULATION_COUNT = 100_000;
const MAX_SIMULATION_COUNT = 100_000;
const RANDOM_SEED = 123;
const CEILING_CORRECTION = 0.45;
const SETTINGS_STORAGE_KEY = "mahjong-soul-rank-simulator-v0.1-settings";
const LANGUAGE_STORAGE_KEY = "riichi-mahjong-tools-language";
const GITHUB_URL = "https://github.com/riichi-mahjong/riichi-mahjong-tools";

const RANK_NAMES = [
  "Expert 1",
  "Expert 2",
  "Expert 3",
  "Master 1",
  "Master 2",
  "Master 3",
  "Saint 1",
  "Saint 2",
  "Saint 3",
  "Celestial",
] as const;

const RANK_DISPLAY_NAMES: Record<Locale, string[]> = {
  en: [
    "Expert 1",
    "Expert 2",
    "Expert 3",
    "Master 1",
    "Master 2",
    "Master 3",
    "Saint 1",
    "Saint 2",
    "Saint 3",
    "Celestial",
  ],
  ja: [
    "雀傑1",
    "雀傑2",
    "雀傑3",
    "雀豪1",
    "雀豪2",
    "雀豪3",
    "雀聖1",
    "雀聖2",
    "雀聖3",
    "魂天",
  ],
};

const MIN_RANK = 0;
const CELESTIAL_RANK_INDEX = RANK_NAMES.length - 1;
const GOLD_RANK_COUNT = 3;

const INITIAL_POINTS_COLUMN = 0;
const PROMOTION_POINTS_COLUMN = 1;
const PLACEMENT_POINTS_START_COLUMN = 2;

const EAST_SOUTH_RANK_TABLE: number[][] = [
  [600, 1200, 95, 45, -5, -95],
  [700, 1400, 95, 45, -5, -115],
  [1000, 2000, 95, 45, -5, -135],
  [1400, 2800, 125, 60, -5, -180],
  [1600, 3200, 125, 60, -5, -195],
  [1800, 3600, 125, 60, -5, -210],
  [2000, 4000, 125, 60, -5, -225],
  [3000, 6000, 125, 60, -5, -240],
  [4500, 9000, 125, 60, -5, -255],
];

const EAST_ONLY_RANK_TABLE: number[][] = [
  [600, 1200, 55, 25, -5, -55],
  [700, 1400, 55, 25, -5, -65],
  [1000, 2000, 55, 25, -5, -75],
  [1400, 2800, 70, 35, -5, -95],
  [1600, 3200, 70, 35, -5, -105],
  [1800, 3600, 70, 35, -5, -115],
  [2000, 4000, 70, 35, -5, -125],
  [3000, 6000, 70, 35, -5, -135],
  [4500, 9000, 70, 35, -5, -145],
];

type SimulationInput = {
  gameType: GameType;
  initialRankIndex: number;
  initialPoints: number;
  numGames: number;
  simulationCount: number;
  goldPlacementRates: number[];
  jadePlacementRates: number[];
  goldGlPerRound: number;
  jadeGlPerRound: number;
};

type StoredSettings = {
  gameType: GameType;
  initialRankIndex: number;
  initialPoints: number;
  numGames: number;
  simulationCount: number;
  goldFirst: number;
  goldSecond: number;
  goldThird: number;
  goldFourth: number;
  goldGlPerRound: number;
  jadeFirst: number;
  jadeSecond: number;
  jadeThird: number;
  jadeFourth: number;
  jadeGlPerRound: number;
};

type CountRow = {
  label: string;
  count: number;
  percentage: number;
};

type CountDistributionRow = {
  value: number;
  count: number;
  percentage: number;
};

type FirstReachRow = {
  rankName: string;
  reached: number;
  percentage: number;
  min: number | null;
  p25: number | null;
  median: number | null;
  mean: number | null;
  p75: number | null;
  max: number | null;
};

type ExpectedChangeRow = {
  rankName: string;
  room: "Gold" | "Jade";
  expectedChange: number;
};

type StableRankSummary = {
  usedCount: number;
  min: number;
  p25: number;
  median: number;
  mean: number;
  p75: number;
  max: number;
};

type SimulationOutput = {
  simulationCount: number;
  finalRankDistribution: CountRow[];
  highestRankDistribution: CountRow[];
  lowestRankDistribution: CountRow[];
  rankUpDistribution: CountDistributionRow[];
  rankDownDistribution: CountDistributionRow[];
  firstReachRows: FirstReachRow[];
  expectedChangeRows: ExpectedChangeRow[];
  stableRankSummary: StableRankSummary | null;
};

const TEXT = {
  en: {
    languageButton: "日本語",
    title: "Mahjong Soul Rank Simulator v0.1",
    description:
      "This simulator uses both placement distribution and average score gain/loss per round, so it can estimate rank movement more precisely than a placement-only simulator.",
    currentSettings: "Current settings",
    gameType: "Game type",
    eastSouth: "East-South",
    eastOnly: "East-Only",
    currentRank: "Current rank",
    currentPoints: "Current points",
    numberOfGames: "Number of games",
    simulatedPlayers: "Simulated players",
    rankReference: "Rank reference",
    choose: "Choose",
    selected: "Selected",
    rank: "Rank",
    initialPt: "Initial pt",
    rankUpPt: "Rank-up pt",
    goldPlacementDistribution: "Gold Room placement distribution",
    jadePlacementDistribution: "Jade Room placement distribution",
    autoFillButton: "Auto-fill missing rate",
    autoMissingRateNote:
      "Enter any three placement rates, then click auto-fill to calculate the remaining one.",
    sum: "Sum",
    averagePlacement: "Average placement",
    goldGlPerRound: "Gold G/L per round",
    jadeGlPerRound: "Jade G/L per round",
    correctionTitle: "G/L and rounding correction",
    correctionNote:
      "Mahjong Soul converts score gain/loss into rank points and rounds up the score-derived points. This simulator converts G/L per round into rank points and adds a fixed +0.45 pt/game rounding correction.",
    influenceLink: "Check the influence of G/L and rounding",
    influenceLinkDescription:
      "Compare stable-rank estimates with and without G/L per round and rounding correction.",
    notesTitle: "Notes",
    notesText:
      "This simulator assumes Expert 3 and below play in Gold Room, and Master 1 and above play in Jade Room. If a simulated player reaches Celestial, that player stops playing and no later games are counted. If a simulated player drops below Expert 1, it approximates lower virtual ranks as Expert 0, Expert -1, and so on, using the same placement-point rule as Expert 1.",
    stableRankEstimate: "Stable-rank estimate",
    stableRankUnavailable:
      "Enter valid Jade Room placement rates that sum to 100%.",
    runSimulation: "Run simulation",
    runningSimulation: "Running simulation...",
    inputErrors: "Input errors",
    stableRankSampleStatsTitle: "Stable-rank sample statistics",
    stableRankSampleStatsNoData:
      "Not enough Jade Room games to compute stable-rank sample statistics.",
    usedPlayers: "Used players",
    finalRankDistribution: "Final rank distribution",
    highestRankReached: "Highest rank reached",
    lowestRankReached: "Lowest rank reached",
    rankUpCountDistribution: "Rank-up count distribution",
    rankDownCountDistribution: "Rank-down count distribution",
    expectedPointChangeByRank: "Expected point change by rank",
    expectedPtPerGame: "Expected pt / game",
    gamesToFirstReach: "Games to first reach each rank",
    firstReachNote:
      "Game-count statistics are calculated only among simulated players who reached the rank.",
    players: "Players",
    rate: "Rate",
    count: "Count",
    reached: "Reached",
    room: "Room",
    gold: "Gold",
    jade: "Jade",
    rankUps: "rank-ups",
    rankDowns: "rank-downs",
    githubLink: "GitHub / Report an issue",
    githubDescription: "Fork the code, report bugs, or suggest improvements.",
  },
  ja: {
    languageButton: "English",
    title: "雀魂段位シミュレーター v0.1",
    description:
      "順位分布だけでなく素点も考慮するため、順位のみのシミュレーターよりも精度の高い段位推移の推定ができます。",
    currentSettings: "現在の設定",
    gameType: "ゲーム形式",
    eastSouth: "半荘戦",
    eastOnly: "東風戦",
    currentRank: "現在の段位",
    currentPoints: "現在のポイント",
    numberOfGames: "対戦数",
    simulatedPlayers: "シミュレーション人数",
    rankReference: "段位ポイント早見表",
    choose: "選ぶ",
    selected: "選択中",
    rank: "段位",
    initialPt: "初期pt",
    rankUpPt: "昇段pt",
    goldPlacementDistribution: "金の間の順位分布",
    jadePlacementDistribution: "玉の間の順位分布",
    autoFillButton: "不足分を自動入力",
    autoMissingRateNote:
      "順位率を3つ入力してから押すと、残り1つを自動計算します。",
    sum: "合計",
    averagePlacement: "平均順位",
    goldGlPerRound: "金の間 局収支",
    jadeGlPerRound: "玉の間 局収支",
    correctionTitle: "局収支と切り上げ補正について",
    correctionNote:
      "雀魂では素点由来の段位ポイントが加算され、計算時に切り上げが入るため、このシミュレーターでは局収支から計算したptと切り上げ補正 +0.45 pt/戦 を段位ポイントに加えています。",
    influenceLink: "局収支・切り上げ補正の影響を見る",
    influenceLinkDescription:
      "局収支と切り上げ補正を入れた場合・入れない場合の安定段位を比較できます。",
    notesTitle: "注意点",
    notesText:
      "このシミュレーターでは、雀傑3以下は金の間、雀豪1以上は玉の間で打つものとして計算します。魂天に到達したシミュレーションはそこで対戦を終了し、それ以降の対戦は数えません。雀傑1未満に落ちた場合は、近似として雀傑0、雀傑-1、… の仮想段位を置き、雀傑1と同じ順位ptで計算します。",
    stableRankEstimate: "安定段位推定",
    stableRankUnavailable: "玉の間の順位率が100%になると表示されます。",
    runSimulation: "シミュレーションする",
    runningSimulation: "計算中...",
    inputErrors: "入力エラー",
    stableRankSampleStatsTitle: "安定段位サンプル統計",
    stableRankSampleStatsNoData:
      "玉の間の対戦数が不足しているため、安定段位サンプル統計を計算できません。",
    usedPlayers: "対象人数",
    finalRankDistribution: "最終段位分布",
    highestRankReached: "最高到達段位",
    lowestRankReached: "最低到達段位",
    rankUpCountDistribution: "昇段回数分布",
    rankDownCountDistribution: "降段回数分布",
    expectedPointChangeByRank: "段位別の期待pt変化",
    expectedPtPerGame: "期待pt / 1戦",
    gamesToFirstReach: "各段位に初到達するまでの対戦数",
    firstReachNote:
      "対戦数の統計は、その段位に到達したシミュレーションのみを対象に計算しています。",
    players: "人数",
    rate: "割合",
    count: "回数",
    reached: "到達",
    room: "部屋",
    gold: "金",
    jade: "玉",
    rankUps: "昇段",
    rankDowns: "降段",
    githubLink: "GitHub・不具合報告",
    githubDescription: "コードのフォーク、不具合報告、改善提案はこちら。",
  },
} as const;

function getRankTable(gameType: GameType) {
  return gameType === "East-South" ? EAST_SOUTH_RANK_TABLE : EAST_ONLY_RANK_TABLE;
}

function getRoundMultiplier(gameType: GameType) {
  return gameType === "East-South" ? 10.5 : 5.6;
}

function getStableRankOffset(gameType: GameType) {
  return gameType === "East-South" ? 10 : 7.5;
}

function getRankName(rankIndex: number, locale: Locale) {
  if (rankIndex < 0) {
    return locale === "ja" ? `雀傑${rankIndex + 1}` : `Expert ${rankIndex + 1}`;
  }

  return RANK_DISPLAY_NAMES[locale][rankIndex] ?? RANK_NAMES[rankIndex];
}

function getRankTableIndex(rankIndex: number) {
  if (rankIndex < MIN_RANK) {
    return MIN_RANK;
  }

  return rankIndex;
}

function getInitialPointsForRank(rankIndex: number, rankTable: number[][]) {
  if (rankIndex >= CELESTIAL_RANK_INDEX) {
    return 0;
  }

  return rankTable[getRankTableIndex(rankIndex)][INITIAL_POINTS_COLUMN];
}

function getPromotionPointsForRank(rankIndex: number, rankTable: number[][]) {
  return rankTable[getRankTableIndex(rankIndex)][PROMOTION_POINTS_COLUMN];
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function roundRate(value: number) {
  return Math.round(value * 10000) / 10000;
}

function isBlankNumber(value: number) {
  return !Number.isFinite(value);
}

function getAutoFillIndex(values: number[], touched: boolean[]) {
  const blankIndices = values
    .map((value, index) => (isBlankNumber(value) ? index : -1))
    .filter((index) => index >= 0);

  if (blankIndices.length === 1) {
    return blankIndices[0];
  }

  const untouchedIndices = touched
    .map((isTouched, index) => (!isTouched ? index : -1))
    .filter((index) => index >= 0);

  if (untouchedIndices.length === 1) {
    return untouchedIndices[0];
  }

  return null;
}

function autoFillPlacementValues(values: number[], touched: boolean[]) {
  const fillIndex = getAutoFillIndex(values, touched);

  if (fillIndex === null) {
    return {
      nextValues: values,
      nextTouched: touched,
      didFill: false,
    };
  }

  const otherValues = values.filter((_, index) => index !== fillIndex);

  if (otherValues.some((value) => !Number.isFinite(value))) {
    return {
      nextValues: values,
      nextTouched: touched,
      didFill: false,
    };
  }

  const nextValues = [...values];
  const nextTouched = [...touched];

  nextValues[fillIndex] = roundRate(100 - sum(otherValues));
  nextTouched[fillIndex] = false;

  return {
    nextValues,
    nextTouched,
    didFill: true,
  };
}

function isCloseTo100(value: number) {
  return Math.abs(value - 100) < 0.000001;
}

function areValidPlacementRates(values: number[]) {
  return (
    values.length === 4 &&
    values.every((value) => Number.isFinite(value) && value >= 0) &&
    isCloseTo100(sum(values))
  );
}

function toProbabilities(percentages: number[]) {
  return percentages.map((value) => value / 100);
}

function averagePlacement(percentages: number[]) {
  if (percentages.some((value) => !Number.isFinite(value))) {
    return Number.NaN;
  }

  const probabilities = toProbabilities(percentages);

  return (
    probabilities[0] * 1 +
    probabilities[1] * 2 +
    probabilities[2] * 3 +
    probabilities[3] * 4
  );
}

function validatePlacementRates(values: number[], label: string) {
  const errors: string[] = [];

  if (values.length !== 4) {
    return [`${label} must contain exactly four placement rates.`];
  }

  values.forEach((value, index) => {
    if (!Number.isFinite(value)) {
      errors.push(`${label} ${index + 1}th-place rate must be a number.`);
    }

    if (Number.isFinite(value) && value < 0) {
      errors.push(`${label} ${index + 1}th-place rate cannot be negative.`);
    }
  });

  const total = sum(values);

  if (Number.isFinite(total) && !isCloseTo100(total)) {
    errors.push(
      `${label} placement rates must sum to 100%. Current sum: ${total.toFixed(
        4
      )}%.`
    );
  }

  return errors;
}

function validateInput(input: SimulationInput) {
  const errors: string[] = [];
  const rankTable = getRankTable(input.gameType);

  if (
    !Number.isInteger(input.initialRankIndex) ||
    input.initialRankIndex < MIN_RANK ||
    input.initialRankIndex >= CELESTIAL_RANK_INDEX
  ) {
    errors.push("Current rank must be between Expert 1 and Saint 3.");
  } else {
    const promotionPoints =
      rankTable[input.initialRankIndex][PROMOTION_POINTS_COLUMN];

    if (!Number.isFinite(input.initialPoints)) {
      errors.push("Current points must be a number.");
    } else if (input.initialPoints < 0) {
      errors.push("Current points cannot be negative.");
    } else if (input.initialPoints >= promotionPoints) {
      errors.push(
        `Current points must be smaller than the rank-up requirement for ${
          RANK_NAMES[input.initialRankIndex]
        } (${promotionPoints}).`
      );
    }
  }

  if (!Number.isInteger(input.numGames)) {
    errors.push("Number of games must be an integer.");
  } else if (input.numGames <= 0) {
    errors.push("Number of games must be positive.");
  } else if (input.numGames > 20_000) {
    errors.push(
      "Number of games is too large for the browser version. Use 20,000 or less for now."
    );
  }

  if (!Number.isInteger(input.simulationCount)) {
    errors.push("Simulated players must be an integer.");
  } else if (input.simulationCount <= 0) {
    errors.push("Simulated players must be positive.");
  } else if (input.simulationCount > MAX_SIMULATION_COUNT) {
    errors.push(
      `Simulated players must be ${MAX_SIMULATION_COUNT.toLocaleString()} or less.`
    );
  }

  if (!Number.isFinite(input.goldGlPerRound)) {
    errors.push("Gold G/L per round must be a number.");
  }

  if (!Number.isFinite(input.jadeGlPerRound)) {
    errors.push("Jade G/L per round must be a number.");
  }

  return [
    ...errors,
    ...validatePlacementRates(input.goldPlacementRates, "Gold"),
    ...validatePlacementRates(input.jadePlacementRates, "Jade"),
  ];
}

function buildRankParameters(input: SimulationInput) {
  const goldRates = toProbabilities(input.goldPlacementRates);
  const jadeRates = toProbabilities(input.jadePlacementRates);
  const multiplier = getRoundMultiplier(input.gameType);

  const goldGlBonus = (input.goldGlPerRound * multiplier) / 1000;
  const jadeGlBonus = (input.jadeGlPerRound * multiplier) / 1000;

  return {
    goldRates,
    jadeRates,
    goldGlBonus,
    jadeGlBonus,
  };
}

function getPlacementRatesForRank(
  rankIndex: number,
  parameters: ReturnType<typeof buildRankParameters>
) {
  return rankIndex < GOLD_RANK_COUNT ? parameters.goldRates : parameters.jadeRates;
}

function getGlBonusForRank(
  rankIndex: number,
  parameters: ReturnType<typeof buildRankParameters>
) {
  return rankIndex < GOLD_RANK_COUNT
    ? parameters.goldGlBonus
    : parameters.jadeGlBonus;
}

function expectedPointChangeByRank(
  input: SimulationInput,
  locale: Locale
): ExpectedChangeRow[] {
  const rankTable = getRankTable(input.gameType);
  const parameters = buildRankParameters(input);

  return rankTable.map((row, rankIndex) => {
    const placementPoints = row.slice(PLACEMENT_POINTS_START_COLUMN);
    const placementRates = getPlacementRatesForRank(rankIndex, parameters);

    const expectedPlacementPoints =
      placementRates[0] * placementPoints[0] +
      placementRates[1] * placementPoints[1] +
      placementRates[2] * placementPoints[2] +
      placementRates[3] * placementPoints[3];

    return {
      rankName: getRankName(rankIndex, locale),
      room: rankIndex < GOLD_RANK_COUNT ? "Gold" : "Jade",
      expectedChange:
        expectedPlacementPoints +
        getGlBonusForRank(rankIndex, parameters) +
        CEILING_CORRECTION,
    };
  });
}

function getStableRankRawLevelFromRates({
  gameType,
  jadePlacementRates,
  jadeGlPerRound,
}: {
  gameType: GameType;
  jadePlacementRates: number[];
  jadeGlPerRound: number;
}) {
  const rates = toProbabilities(jadePlacementRates);
  const p1 = rates[0];
  const p2 = rates[1];
  const p3 = rates[2];
  const p4 = rates[3];

  if (p4 <= 0) {
    return null;
  }

  const averageRoundsPerGame = getRoundMultiplier(gameType);
  const scorePoint = (jadeGlPerRound * averageRoundsPerGame) / 1000;

  let placementPoint = 0;
  let roomPoint = 0;
  let fourthPenaltyStep = 0;

  if (gameType === "East-South") {
    placementPoint = 15 * p1 + 5 * p2 - 5 * p3 - 15 * p4;
    roomPoint = 110 * p1 + 55 * p2;
    fourthPenaltyStep = 15 * p4;
  } else {
    placementPoint = 10 * p1 + 5 * p2 - 5 * p3 - 10 * p4;
    roomPoint = 60 * p1 + 30 * p2;
    fourthPenaltyStep = 10 * p4;
  }

  const estimatedPointGain =
    scorePoint + placementPoint + roomPoint + CEILING_CORRECTION;

  return estimatedPointGain / fourthPenaltyStep - getStableRankOffset(gameType);
}

function getStableRankRawLevelFromCounts({
  gameType,
  firstCount,
  secondCount,
  thirdCount,
  fourthCount,
  jadeGlPerRound,
}: {
  gameType: GameType;
  firstCount: number;
  secondCount: number;
  thirdCount: number;
  fourthCount: number;
  jadeGlPerRound: number;
}) {
  const total = firstCount + secondCount + thirdCount + fourthCount;

  if (total <= 0 || fourthCount <= 0) {
    return null;
  }

  return getStableRankRawLevelFromRates({
    gameType,
    jadeGlPerRound,
    jadePlacementRates: [
      (100 * firstCount) / total,
      (100 * secondCount) / total,
      (100 * thirdCount) / total,
      (100 * fourthCount) / total,
    ],
  });
}

function truncate2(value: number) {
  return (Math.trunc(value * 100) / 100).toFixed(2);
}

function estimateStableRank(input: SimulationInput, locale: Locale) {
  const rawLevel = getStableRankRawLevelFromRates({
    gameType: input.gameType,
    jadePlacementRates: input.jadePlacementRates,
    jadeGlPerRound: input.jadeGlPerRound,
  });

  if (rawLevel === null) {
    return locale === "ja"
      ? "玉の間4着率が0%のため推定不可"
      : "Cannot estimate because Jade 4th-place rate is 0%.";
  }

  return formatStableRankDetailed(rawLevel, locale);
}

function createSeededRandom(seed: number) {
  let value = seed >>> 0;

  return function random() {
    value += 0x6d2b79f5;
    let result = Math.imul(value ^ (value >>> 15), 1 | value);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);

    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function choosePlacement(probabilities: number[], random: () => number) {
  const value = random();
  let cumulative = 0;

  for (let index = 0; index < 4; index += 1) {
    cumulative += probabilities[index];

    if (value < cumulative) {
      return index;
    }
  }

  return 3;
}

function countRanks(ranks: Int32Array, locale: Locale) {
  const counts = new Map<number, number>();

  for (let index = 0; index < ranks.length; index += 1) {
    const rankIndex = ranks[index];
    counts.set(rankIndex, (counts.get(rankIndex) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort(([rankA], [rankB]) => rankA - rankB)
    .map(([rankIndex, count]) => ({
      label: getRankName(rankIndex, locale),
      count,
      percentage: (100 * count) / ranks.length,
    }));
}

function countValueDistribution(values: Int32Array) {
  let maxValue = 0;

  for (let index = 0; index < values.length; index += 1) {
    maxValue = Math.max(maxValue, values[index]);
  }

  const counts = new Array(maxValue + 1).fill(0);

  for (let index = 0; index < values.length; index += 1) {
    counts[values[index]] += 1;
  }

  return counts
    .map((count, value) => ({
      value,
      count,
      percentage: (100 * count) / values.length,
    }))
    .filter((row) => row.count > 0);
}

function percentile(sortedValues: number[], p: number) {
  if (sortedValues.length === 0) {
    return null;
  }

  const position = (sortedValues.length - 1) * p;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);

  if (lower === upper) {
    return sortedValues[lower];
  }

  const weight = position - lower;

  return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
}

function buildStableRankSummary(rawStableRanks: number[]) {
  if (rawStableRanks.length === 0) {
    return null;
  }

  const sortedValues = [...rawStableRanks].sort((a, b) => a - b);
  const mean =
    sortedValues.reduce((total, value) => total + value, 0) /
    sortedValues.length;

  return {
    usedCount: sortedValues.length,
    min: sortedValues[0],
    p25: percentile(sortedValues, 0.25) ?? sortedValues[0],
    median: percentile(sortedValues, 0.5) ?? sortedValues[0],
    mean,
    p75: percentile(sortedValues, 0.75) ?? sortedValues[sortedValues.length - 1],
    max: sortedValues[sortedValues.length - 1],
  };
}

function runSimulation(
  input: SimulationInput,
  locale: Locale
): SimulationOutput {
  const rankTable = getRankTable(input.gameType);
  const parameters = buildRankParameters(input);
  const random = createSeededRandom(RANDOM_SEED);

  const totalSimulations = input.simulationCount;

  const ranks = new Int32Array(totalSimulations);
  const highestRanks = new Int32Array(totalSimulations);
  const lowestRanks = new Int32Array(totalSimulations);
  const points = new Float64Array(totalSimulations);
  const rankUpCounts = new Int32Array(totalSimulations);
  const rankDownCounts = new Int32Array(totalSimulations);

  const jadeFirstCounts = new Int32Array(totalSimulations);
  const jadeSecondCounts = new Int32Array(totalSimulations);
  const jadeThirdCounts = new Int32Array(totalSimulations);
  const jadeFourthCounts = new Int32Array(totalSimulations);

  const firstReachByRank = RANK_NAMES.map(() => {
    const values = new Int32Array(totalSimulations);
    values.fill(-1);
    return values;
  });

  ranks.fill(input.initialRankIndex);
  highestRanks.fill(input.initialRankIndex);
  lowestRanks.fill(input.initialRankIndex);
  points.fill(input.initialPoints);

  for (let player = 0; player < totalSimulations; player += 1) {
    firstReachByRank[input.initialRankIndex][player] = 0;
  }

  for (let gameNumber = 1; gameNumber <= input.numGames; gameNumber += 1) {
    for (let player = 0; player < totalSimulations; player += 1) {
      const rankIndex = ranks[player];

      if (rankIndex >= CELESTIAL_RANK_INDEX) {
        continue;
      }

      const placementRates = getPlacementRatesForRank(rankIndex, parameters);
      const placement = choosePlacement(placementRates, random);

      if (rankIndex >= GOLD_RANK_COUNT) {
        if (placement === 0) jadeFirstCounts[player] += 1;
        if (placement === 1) jadeSecondCounts[player] += 1;
        if (placement === 2) jadeThirdCounts[player] += 1;
        if (placement === 3) jadeFourthCounts[player] += 1;
      }

      const tableIndex = getRankTableIndex(rankIndex);
      const placementPoint =
        rankTable[tableIndex][PLACEMENT_POINTS_START_COLUMN + placement];

      points[player] +=
        placementPoint +
        getGlBonusForRank(rankIndex, parameters) +
        CEILING_CORRECTION;
    }

    for (let player = 0; player < totalSimulations; player += 1) {
      const rankIndex = ranks[player];

      if (rankIndex < CELESTIAL_RANK_INDEX) {
        const promotionRequirement = getPromotionPointsForRank(
          rankIndex,
          rankTable
        );

        if (points[player] >= promotionRequirement) {
          const newRank = rankIndex + 1;

          ranks[player] = newRank;
          rankUpCounts[player] += 1;
          points[player] = getInitialPointsForRank(newRank, rankTable);

          if (
            newRank >= 0 &&
            newRank < RANK_NAMES.length &&
            firstReachByRank[newRank][player] < 0
          ) {
            firstReachByRank[newRank][player] = gameNumber;
          }
        }
      }

      if (ranks[player] < CELESTIAL_RANK_INDEX && points[player] <= 0) {
        const newRank = ranks[player] - 1;

        ranks[player] = newRank;
        rankDownCounts[player] += 1;
        points[player] = getInitialPointsForRank(newRank, rankTable);

        if (
          newRank >= 0 &&
          newRank < RANK_NAMES.length &&
          firstReachByRank[newRank][player] < 0
        ) {
          firstReachByRank[newRank][player] = gameNumber;
        }
      }

      highestRanks[player] = Math.max(highestRanks[player], ranks[player]);
      lowestRanks[player] = Math.min(lowestRanks[player], ranks[player]);
    }
  }

  const rawStableRanks: number[] = [];

  for (let player = 0; player < totalSimulations; player += 1) {
    const rawLevel = getStableRankRawLevelFromCounts({
      gameType: input.gameType,
      firstCount: jadeFirstCounts[player],
      secondCount: jadeSecondCounts[player],
      thirdCount: jadeThirdCounts[player],
      fourthCount: jadeFourthCounts[player],
      jadeGlPerRound: input.jadeGlPerRound,
    });

    if (rawLevel !== null && Number.isFinite(rawLevel)) {
      rawStableRanks.push(rawLevel);
    }
  }

  const firstReachRows = RANK_NAMES.map((_, rankIndex): FirstReachRow | null => {
    if (rankIndex <= input.initialRankIndex) {
      return null;
    }

    const reachedTimes: number[] = [];

    for (let player = 0; player < totalSimulations; player += 1) {
      const value = firstReachByRank[rankIndex][player];

      if (value >= 0) {
        reachedTimes.push(value);
      }
    }

    reachedTimes.sort((a, b) => a - b);

    const reached = reachedTimes.length;

    if (reached === 0) {
      return {
        rankName: getRankName(rankIndex, locale),
        reached,
        percentage: 0,
        min: null,
        p25: null,
        median: null,
        mean: null,
        p75: null,
        max: null,
      };
    }

    const mean =
      reachedTimes.reduce((total, value) => total + value, 0) / reached;

    return {
      rankName: getRankName(rankIndex, locale),
      reached,
      percentage: (100 * reached) / totalSimulations,
      min: reachedTimes[0],
      p25: percentile(reachedTimes, 0.25),
      median: percentile(reachedTimes, 0.5),
      mean,
      p75: percentile(reachedTimes, 0.75),
      max: reachedTimes[reachedTimes.length - 1],
    };
  }).filter((row): row is FirstReachRow => row !== null);

  return {
    simulationCount: totalSimulations,
    finalRankDistribution: countRanks(ranks, locale),
    highestRankDistribution: countRanks(highestRanks, locale),
    lowestRankDistribution: countRanks(lowestRanks, locale),
    rankUpDistribution: countValueDistribution(rankUpCounts),
    rankDownDistribution: countValueDistribution(rankDownCounts),
    firstReachRows,
    expectedChangeRows: expectedPointChangeByRank(input, locale),
    stableRankSummary: buildStableRankSummary(rawStableRanks),
  };
}

function formatNumber(value: number, digits = 2) {
  if (!Number.isFinite(value)) {
    return "--";
  }

  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatRate(value: number) {
  return `${formatNumber(value, 3)}%`;
}

function formatCountOutOfTotal(count: number, total: number) {
  return `${count.toLocaleString()} / ${total.toLocaleString()}`;
}

function formatNullable(value: number | null, digits = 1) {
  if (value === null) {
    return "--";
  }

  return formatNumber(value, digits);
}

function formatSigned(value: number, digits = 3) {
  const sign = value >= 0 ? "+" : "";

  return `${sign}${formatNumber(value, digits)}`;
}

function queryNumber(value: number) {
  return Number.isFinite(value) ? String(value) : "";
}

function formatStableRankDetailed(rawLevel: number, locale: Locale) {
  if (locale === "ja") {
    if (rawLevel < 1) {
      return `雀豪1未満 (${truncate2(rawLevel)})`;
    }

    if (rawLevel < 4) {
      return `雀豪 ${truncate2(rawLevel)}`;
    }

    return `雀聖 ${truncate2(rawLevel - 3)}`;
  }

  if (rawLevel < 1) {
    return `Below Master 1 (${truncate2(rawLevel)})`;
  }

  if (rawLevel < 4) {
    return `Master ${truncate2(rawLevel)}`;
  }

  return `Saint ${truncate2(rawLevel - 3)}`;
}

function numberOrDefault(value: unknown, defaultValue: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : defaultValue;
}

function integerOrDefault(value: unknown, defaultValue: number) {
  return Math.trunc(numberOrDefault(value, defaultValue));
}

function readStoredSettings() {
  if (typeof window === "undefined") {
    return null;
  }

  const rawValue = window.localStorage.getItem(SETTINGS_STORAGE_KEY);

  if (rawValue === null) {
    return null;
  }

  try {
    return JSON.parse(rawValue) as Partial<StoredSettings>;
  } catch {
    return null;
  }
}

function readStoredLocale(): Locale | null {
  if (typeof window === "undefined") {
    return null;
  }

  const storedLocale = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);

  if (storedLocale === "ja" || storedLocale === "en") {
    return storedLocale;
  }

  return null;
}

export default function Home() {
  const [locale, setLocale] = useState<Locale>("ja");
  const text = TEXT[locale];

  const [gameType, setGameType] = useState<GameType>("East-South");
  const [initialRankIndex, setInitialRankIndex] = useState(3);
  const [initialPoints, setInitialPoints] = useState(1400);
  const [numGames, setNumGames] = useState(1000);
  const [simulationCount, setSimulationCount] = useState(
    DEFAULT_SIMULATION_COUNT
  );

  const [goldFirst, setGoldFirst] = useState(25);
  const [goldSecond, setGoldSecond] = useState(25);
  const [goldThird, setGoldThird] = useState(25);
  const [goldFourth, setGoldFourth] = useState(25);
  const [goldTouched, setGoldTouched] = useState([false, false, false, false]);
  const [goldGlPerRound, setGoldGlPerRound] = useState(0);

  const [jadeFirst, setJadeFirst] = useState(25);
  const [jadeSecond, setJadeSecond] = useState(25);
  const [jadeThird, setJadeThird] = useState(25);
  const [jadeFourth, setJadeFourth] = useState(25);
  const [jadeTouched, setJadeTouched] = useState([false, false, false, false]);
  const [jadeGlPerRound, setJadeGlPerRound] = useState(0);

  const [errors, setErrors] = useState<string[]>([]);
  const [result, setResult] = useState<SimulationOutput | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [hasLoadedStoredSettings, setHasLoadedStoredSettings] = useState(false);
  const [hasLoadedLocale, setHasLoadedLocale] = useState(false);

  useEffect(() => {
    const storedLocale = readStoredLocale();

    if (storedLocale !== null) {
      setLocale(storedLocale);
    }

    setHasLoadedLocale(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedLocale) {
      return;
    }

    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
  }, [hasLoadedLocale, locale]);

  useEffect(() => {
    const storedSettings = readStoredSettings();

    if (storedSettings !== null) {
      if (
        storedSettings.gameType === "East-South" ||
        storedSettings.gameType === "East-Only"
      ) {
        setGameType(storedSettings.gameType);
      }

      setInitialRankIndex(
        Math.min(
          CELESTIAL_RANK_INDEX - 1,
          Math.max(MIN_RANK, integerOrDefault(storedSettings.initialRankIndex, 3))
        )
      );
      setInitialPoints(numberOrDefault(storedSettings.initialPoints, 1400));
      setNumGames(integerOrDefault(storedSettings.numGames, 1000));
      setSimulationCount(
        integerOrDefault(storedSettings.simulationCount, DEFAULT_SIMULATION_COUNT)
      );

      setGoldFirst(numberOrDefault(storedSettings.goldFirst, 25));
      setGoldSecond(numberOrDefault(storedSettings.goldSecond, 25));
      setGoldThird(numberOrDefault(storedSettings.goldThird, 25));
      setGoldFourth(numberOrDefault(storedSettings.goldFourth, 25));
      setGoldGlPerRound(numberOrDefault(storedSettings.goldGlPerRound, 0));

      setJadeFirst(numberOrDefault(storedSettings.jadeFirst, 25));
      setJadeSecond(numberOrDefault(storedSettings.jadeSecond, 25));
      setJadeThird(numberOrDefault(storedSettings.jadeThird, 25));
      setJadeFourth(numberOrDefault(storedSettings.jadeFourth, 25));
      setJadeGlPerRound(numberOrDefault(storedSettings.jadeGlPerRound, 0));
    }

    setHasLoadedStoredSettings(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedStoredSettings) {
      return;
    }

    const settings: StoredSettings = {
      gameType,
      initialRankIndex,
      initialPoints,
      numGames,
      simulationCount,
      goldFirst,
      goldSecond,
      goldThird,
      goldFourth,
      goldGlPerRound,
      jadeFirst,
      jadeSecond,
      jadeThird,
      jadeFourth,
      jadeGlPerRound,
    };

    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [
    hasLoadedStoredSettings,
    gameType,
    initialRankIndex,
    initialPoints,
    numGames,
    simulationCount,
    goldFirst,
    goldSecond,
    goldThird,
    goldFourth,
    goldGlPerRound,
    jadeFirst,
    jadeSecond,
    jadeThird,
    jadeFourth,
    jadeGlPerRound,
  ]);

  const input: SimulationInput = {
    gameType,
    initialRankIndex,
    initialPoints,
    numGames,
    simulationCount,
    goldPlacementRates: [goldFirst, goldSecond, goldThird, goldFourth],
    jadePlacementRates: [jadeFirst, jadeSecond, jadeThird, jadeFourth],
    goldGlPerRound,
    jadeGlPerRound,
  };

  const rankTable = getRankTable(gameType);
  const goldSum = sum(input.goldPlacementRates);
  const jadeSum = sum(input.jadePlacementRates);

  const liveStableRankEstimate =
    areValidPlacementRates(input.jadePlacementRates) &&
    Number.isFinite(input.jadeGlPerRound)
      ? estimateStableRank(input, locale)
      : text.stableRankUnavailable;

  const influenceHref = `/influence?gameType=${encodeURIComponent(
    gameType
  )}&p1=${encodeURIComponent(queryNumber(jadeFirst))}&p2=${encodeURIComponent(
    queryNumber(jadeSecond)
  )}&p3=${encodeURIComponent(queryNumber(jadeThird))}&p4=${encodeURIComponent(
    queryNumber(jadeFourth)
  )}&gl=${encodeURIComponent(queryNumber(jadeGlPerRound))}`;

  function clearResult() {
    setResult(null);
    setErrors([]);
  }

  function handleGameTypeChange(nextGameType: GameType) {
    const nextRankTable = getRankTable(nextGameType);

    setGameType(nextGameType);
    setInitialPoints(nextRankTable[initialRankIndex][INITIAL_POINTS_COLUMN]);
    clearResult();
  }

  function handleRankChange(nextRankIndex: number) {
    setInitialRankIndex(nextRankIndex);
    setInitialPoints(rankTable[nextRankIndex][INITIAL_POINTS_COLUMN]);
    clearResult();
  }

  function handleChooseReferenceRank(rankIndex: number) {
    setInitialRankIndex(rankIndex);
    setInitialPoints(rankTable[rankIndex][INITIAL_POINTS_COLUMN]);
    clearResult();
  }

  function updateGoldRate(index: number, value: number) {
    const nextTouched = [...goldTouched];
    nextTouched[index] = true;

    if (index === 0) setGoldFirst(value);
    if (index === 1) setGoldSecond(value);
    if (index === 2) setGoldThird(value);
    if (index === 3) setGoldFourth(value);

    setGoldTouched(nextTouched);
    clearResult();
  }

  function updateJadeRate(index: number, value: number) {
    const nextTouched = [...jadeTouched];
    nextTouched[index] = true;

    if (index === 0) setJadeFirst(value);
    if (index === 1) setJadeSecond(value);
    if (index === 2) setJadeThird(value);
    if (index === 3) setJadeFourth(value);

    setJadeTouched(nextTouched);
    clearResult();
  }

  function autoFillGoldRate() {
    const currentValues = [goldFirst, goldSecond, goldThird, goldFourth];
    const { nextValues, nextTouched, didFill } = autoFillPlacementValues(
      currentValues,
      goldTouched
    );

    if (!didFill) return;

    setGoldFirst(nextValues[0]);
    setGoldSecond(nextValues[1]);
    setGoldThird(nextValues[2]);
    setGoldFourth(nextValues[3]);
    setGoldTouched(nextTouched);
    clearResult();
  }

  function autoFillJadeRate() {
    const currentValues = [jadeFirst, jadeSecond, jadeThird, jadeFourth];
    const { nextValues, nextTouched, didFill } = autoFillPlacementValues(
      currentValues,
      jadeTouched
    );

    if (!didFill) return;

    setJadeFirst(nextValues[0]);
    setJadeSecond(nextValues[1]);
    setJadeThird(nextValues[2]);
    setJadeFourth(nextValues[3]);
    setJadeTouched(nextTouched);
    clearResult();
  }

  function handleRunSimulation() {
    const nextErrors = validateInput(input);
    setErrors(nextErrors);

    if (nextErrors.length > 0) {
      setResult(null);
      return;
    }

    setIsRunning(true);
    setResult(null);

    window.setTimeout(() => {
      const nextResult = runSimulation(input, locale);
      setResult(nextResult);
      setIsRunning(false);
    }, 20);
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-neutral-100">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-4">
          <div className="flex flex-wrap items-center justify-end gap-4">
            <button
              className="rounded-xl border border-neutral-700 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-900"
              onClick={() => {
                setLocale(locale === "ja" ? "en" : "ja");
                setResult(null);
              }}
            >
              {text.languageButton}
            </button>
          </div>

          <h1 className="text-3xl font-bold">{text.title}</h1>
          <p className="max-w-3xl text-neutral-300">{text.description}</p>
        </header>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="mb-4 text-xl font-semibold">{text.currentSettings}</h2>

          <div className="grid gap-4 md:grid-cols-5">
            <label className="space-y-2">
              <span className="block text-sm text-neutral-300">
                {text.gameType}
              </span>
              <select
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-2 text-neutral-100"
                value={gameType}
                onChange={(event) =>
                  handleGameTypeChange(event.target.value as GameType)
                }
              >
                <option value="East-South">{text.eastSouth}</option>
                <option value="East-Only">{text.eastOnly}</option>
              </select>
            </label>

            <label className="space-y-2">
              <span className="block text-sm text-neutral-300">
                {text.currentRank}
              </span>
              <select
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-2 text-neutral-100"
                value={initialRankIndex}
                onChange={(event) => handleRankChange(Number(event.target.value))}
              >
                {RANK_NAMES.slice(0, CELESTIAL_RANK_INDEX).map(
                  (_, rankIndex) => (
                    <option key={rankIndex} value={rankIndex}>
                      {getRankName(rankIndex, locale)}
                    </option>
                  )
                )}
              </select>
            </label>

            <NumberInput
              label={text.currentPoints}
              value={initialPoints}
              onChange={(value) => {
                setInitialPoints(value);
                clearResult();
              }}
            />

            <NumberInput
              label={text.numberOfGames}
              value={numGames}
              onChange={(value) => {
                setNumGames(value);
                clearResult();
              }}
            />

            <NumberInput
              label={text.simulatedPlayers}
              value={simulationCount}
              onChange={(value) => {
                setSimulationCount(value);
                clearResult();
              }}
            />
          </div>

          <div className="mt-6 border-t border-neutral-800 pt-6">
            <h3 className="mb-4 text-lg font-semibold">{text.rankReference}</h3>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] border-collapse text-sm">
                <thead className="text-neutral-300">
                  <tr className="border-b border-neutral-800">
                    <th className="py-2 text-left">{text.rank}</th>
                    <th className="py-2 text-right">{text.initialPt}</th>
                    <th className="py-2 text-right">{text.rankUpPt}</th>
                    <th className="py-2 text-right">1st</th>
                    <th className="py-2 text-right">2nd</th>
                    <th className="py-2 text-right">3rd</th>
                    <th className="py-2 text-right">4th</th>
                    <th className="py-2 text-right"></th>
                  </tr>
                </thead>
                <tbody>
                  {rankTable.map((row, rankIndex) => (
                    <tr
                      key={rankIndex}
                      className="border-b border-neutral-800/70"
                    >
                      <td className="py-2">{getRankName(rankIndex, locale)}</td>
                      <td className="py-2 text-right">{row[0]}</td>
                      <td className="py-2 text-right">{row[1]}</td>
                      <td className="py-2 text-right">{row[2]}</td>
                      <td className="py-2 text-right">{row[3]}</td>
                      <td className="py-2 text-right">{row[4]}</td>
                      <td className="py-2 text-right">{row[5]}</td>
                      <td className="py-2 text-right">
                        <button
                          className="rounded-lg border border-neutral-700 px-3 py-1 text-xs hover:bg-neutral-800 disabled:cursor-default disabled:opacity-50"
                          disabled={rankIndex === initialRankIndex}
                          onClick={() => handleChooseReferenceRank(rankIndex)}
                        >
                          {rankIndex === initialRankIndex
                            ? text.selected
                            : text.choose}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <PlacementInputCard
            title={text.goldPlacementDistribution}
            autoFillButton={text.autoFillButton}
            autoMissingRateNote={text.autoMissingRateNote}
            sumLabel={text.sum}
            averagePlacementLabel={text.averagePlacement}
            roomGlLabel={text.goldGlPerRound}
            sumValue={goldSum}
            firstValue={goldFirst}
            secondValue={goldSecond}
            thirdValue={goldThird}
            fourthValue={goldFourth}
            glValue={goldGlPerRound}
            setFirstValue={(value) => updateGoldRate(0, value)}
            setSecondValue={(value) => updateGoldRate(1, value)}
            setThirdValue={(value) => updateGoldRate(2, value)}
            setFourthValue={(value) => updateGoldRate(3, value)}
            setGlValue={(value) => {
              setGoldGlPerRound(value);
              clearResult();
            }}
            onAutoFillMissingRate={autoFillGoldRate}
            placementRates={input.goldPlacementRates}
          />

          <PlacementInputCard
            title={text.jadePlacementDistribution}
            autoFillButton={text.autoFillButton}
            autoMissingRateNote={text.autoMissingRateNote}
            sumLabel={text.sum}
            averagePlacementLabel={text.averagePlacement}
            roomGlLabel={text.jadeGlPerRound}
            sumValue={jadeSum}
            firstValue={jadeFirst}
            secondValue={jadeSecond}
            thirdValue={jadeThird}
            fourthValue={jadeFourth}
            glValue={jadeGlPerRound}
            setFirstValue={(value) => updateJadeRate(0, value)}
            setSecondValue={(value) => updateJadeRate(1, value)}
            setThirdValue={(value) => updateJadeRate(2, value)}
            setFourthValue={(value) => updateJadeRate(3, value)}
            setGlValue={(value) => {
              setJadeGlPerRound(value);
              clearResult();
            }}
            onAutoFillMissingRate={autoFillJadeRate}
            placementRates={input.jadePlacementRates}
          />
        </section>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="mb-3 text-xl font-semibold">
            {text.stableRankEstimate}
          </h2>
          <p className="text-2xl font-bold text-neutral-100">
            {liveStableRankEstimate}
          </p>
        </section>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <h2 className="mb-3 text-xl font-semibold">{text.correctionTitle}</h2>
          <p className="max-w-4xl text-sm text-neutral-300">
            {text.correctionNote}
          </p>

          <div className="mt-5 rounded-xl border border-neutral-800 bg-neutral-950 p-4">
            <p className="mb-3 text-sm text-neutral-400">
              {text.influenceLinkDescription}
            </p>
            <a
              className="inline-block rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-100 hover:bg-neutral-800"
              href={influenceHref}
            >
              {text.influenceLink}
            </a>
          </div>
        </section>

        <section className="rounded-2xl border border-amber-900 bg-amber-950/30 p-6">
          <h2 className="mb-3 text-xl font-semibold text-amber-100">
            {text.notesTitle}
          </h2>
          <p className="max-w-4xl text-sm text-amber-100/90">
            {text.notesText}
          </p>
        </section>

        {errors.length > 0 && (
          <section className="rounded-2xl border border-red-800 bg-red-950/40 p-6">
            <h2 className="mb-3 text-xl font-semibold text-red-200">
              {text.inputErrors}
            </h2>
            <ul className="list-disc space-y-1 pl-6 text-red-100">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </section>
        )}

        <button
          className="rounded-xl bg-neutral-100 px-6 py-3 font-semibold text-neutral-950 hover:bg-neutral-300 disabled:cursor-wait disabled:opacity-60"
          onClick={handleRunSimulation}
          disabled={isRunning}
        >
          {isRunning ? text.runningSimulation : text.runSimulation}
        </button>

        {result && (
          <section className="space-y-6">
            <DistributionTable
              title={text.finalRankDistribution}
              rows={result.finalRankDistribution}
              text={text}
              total={result.simulationCount}
            />
            <DistributionTable
              title={text.highestRankReached}
              rows={result.highestRankDistribution}
              text={text}
              total={result.simulationCount}
            />
            <DistributionTable
              title={text.lowestRankReached}
              rows={result.lowestRankDistribution}
              text={text}
              total={result.simulationCount}
            />

            <CountTable
              title={text.rankUpCountDistribution}
              rows={result.rankUpDistribution}
              countLabel={text.count}
              playersLabel={text.players}
              rateLabel={text.rate}
              label={text.rankUps}
              total={result.simulationCount}
            />
            <CountTable
              title={text.rankDownCountDistribution}
              rows={result.rankDownDistribution}
              countLabel={text.count}
              playersLabel={text.players}
              rateLabel={text.rate}
              label={text.rankDowns}
              total={result.simulationCount}
            />

            <FirstReachTable
              rows={result.firstReachRows}
              text={text}
              total={result.simulationCount}
            />

            <StableRankSampleStatsTable
              title={text.stableRankSampleStatsTitle}
              noDataText={text.stableRankSampleStatsNoData}
              usedPlayersLabel={text.usedPlayers}
              playersLabel={text.players}
              summary={result.stableRankSummary}
              total={result.simulationCount}
              locale={locale}
            />

            <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
              <h2 className="mb-4 text-xl font-semibold">
                {text.expectedPointChangeByRank}
              </h2>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] border-collapse text-sm">
                  <thead className="text-neutral-300">
                    <tr className="border-b border-neutral-800">
                      <th className="py-2 text-left">{text.rank}</th>
                      <th className="py-2 text-left">{text.room}</th>
                      <th className="py-2 text-right">
                        {text.expectedPtPerGame}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.expectedChangeRows.map((row) => (
                      <tr
                        key={row.rankName}
                        className="border-b border-neutral-800/70"
                      >
                        <td className="py-2">{row.rankName}</td>
                        <td className="py-2">
                          {row.room === "Gold" ? text.gold : text.jade}
                        </td>
                        <td className="py-2 text-right">
                          {formatSigned(row.expectedChange, 3)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </section>
        )}

        <footer className="border-t border-neutral-800 pt-6 text-center text-sm text-neutral-400">
          <a
            className="font-medium text-neutral-200 hover:text-neutral-100"
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
          >
            {text.githubLink}
          </a>
          <p className="mt-2">{text.githubDescription}</p>
        </footer>
      </div>
    </main>
  );
}

function NumberInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const displayValue = Number.isFinite(value) ? String(value) : "";

  return (
    <label className="space-y-2">
      <span className="block text-sm text-neutral-300">{label}</span>
      <input
        className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-2 text-neutral-100"
        type="number"
        step="any"
        value={displayValue}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => {
          const rawValue = event.target.value;
          onChange(rawValue === "" ? Number.NaN : Number(rawValue));
        }}
      />
    </label>
  );
}

function PlacementInputCard({
  title,
  autoFillButton,
  autoMissingRateNote,
  sumLabel,
  averagePlacementLabel,
  roomGlLabel,
  sumValue,
  firstValue,
  secondValue,
  thirdValue,
  fourthValue,
  glValue,
  setFirstValue,
  setSecondValue,
  setThirdValue,
  setFourthValue,
  setGlValue,
  onAutoFillMissingRate,
  placementRates,
}: {
  title: string;
  autoFillButton: string;
  autoMissingRateNote: string;
  sumLabel: string;
  averagePlacementLabel: string;
  roomGlLabel: string;
  sumValue: number;
  firstValue: number;
  secondValue: number;
  thirdValue: number;
  fourthValue: number;
  glValue: number;
  setFirstValue: (value: number) => void;
  setSecondValue: (value: number) => void;
  setThirdValue: (value: number) => void;
  setFourthValue: (value: number) => void;
  setGlValue: (value: number) => void;
  onAutoFillMissingRate: () => void;
  placementRates: number[];
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
      <div className="mb-2 flex items-center justify-between gap-4">
        <h2 className="text-xl font-semibold">{title}</h2>
        <span
          className={
            isCloseTo100(sumValue)
              ? "text-sm text-emerald-400"
              : "text-sm text-red-400"
          }
        >
          {sumLabel}: {formatNumber(sumValue, 2)}%
        </span>
      </div>

      <p className="mb-4 text-sm text-neutral-400">{autoMissingRateNote}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberInput
          label="1st (%)"
          value={firstValue}
          onChange={setFirstValue}
        />
        <NumberInput
          label="2nd (%)"
          value={secondValue}
          onChange={setSecondValue}
        />
        <NumberInput
          label="3rd (%)"
          value={thirdValue}
          onChange={setThirdValue}
        />
        <NumberInput
          label="4th (%)"
          value={fourthValue}
          onChange={setFourthValue}
        />
        <NumberInput label={roomGlLabel} value={glValue} onChange={setGlValue} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-neutral-400">
          {averagePlacementLabel}:{" "}
          {formatNumber(averagePlacement(placementRates), 4)}
        </p>

        <button
          className="rounded-lg border border-neutral-700 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
          type="button"
          onClick={onAutoFillMissingRate}
        >
          {autoFillButton}
        </button>
      </div>
    </div>
  );
}

function StableRankSampleStatsTable({
  title,
  noDataText,
  usedPlayersLabel,
  playersLabel,
  summary,
  total,
  locale,
}: {
  title: string;
  noDataText: string;
  usedPlayersLabel: string;
  playersLabel: string;
  summary: StableRankSummary | null;
  total: number;
  locale: Locale;
}) {
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>

      {summary === null ? (
        <p className="text-sm text-neutral-400">{noDataText}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-sm">
            <thead className="text-neutral-300">
              <tr className="border-b border-neutral-800">
                <th className="py-2 text-right">{usedPlayersLabel}</th>
                <th className="py-2 text-right">Min</th>
                <th className="py-2 text-right">25th</th>
                <th className="py-2 text-right">Median</th>
                <th className="py-2 text-right">Mean</th>
                <th className="py-2 text-right">75th</th>
                <th className="py-2 text-right">Max</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-neutral-800/70">
                <td className="py-2 text-right">
                  {formatCountOutOfTotal(summary.usedCount, total)}{" "}
                  {playersLabel}
                </td>
                <td className="py-2 text-right">
                  {formatStableRankDetailed(summary.min, locale)}
                </td>
                <td className="py-2 text-right">
                  {formatStableRankDetailed(summary.p25, locale)}
                </td>
                <td className="py-2 text-right">
                  {formatStableRankDetailed(summary.median, locale)}
                </td>
                <td className="py-2 text-right">
                  {formatStableRankDetailed(summary.mean, locale)}
                </td>
                <td className="py-2 text-right">
                  {formatStableRankDetailed(summary.p75, locale)}
                </td>
                <td className="py-2 text-right">
                  {formatStableRankDetailed(summary.max, locale)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function DistributionTable({
  title,
  rows,
  text,
  total,
}: {
  title: string;
  rows: CountRow[];
  text: typeof TEXT.en | typeof TEXT.ja;
  total: number;
}) {
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead className="text-neutral-300">
            <tr className="border-b border-neutral-800">
              <th className="py-2 text-left">{text.rank}</th>
              <th className="py-2 text-right">{text.players}</th>
              <th className="py-2 text-right">{text.rate}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-b border-neutral-800/70">
                <td className="py-2">{row.label}</td>
                <td className="py-2 text-right">
                  {formatCountOutOfTotal(row.count, total)}
                </td>
                <td className="py-2 text-right">{formatRate(row.percentage)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function CountTable({
  title,
  rows,
  countLabel,
  playersLabel,
  rateLabel,
  label,
  total,
}: {
  title: string;
  rows: CountDistributionRow[];
  countLabel: string;
  playersLabel: string;
  rateLabel: string;
  label: string;
  total: number;
}) {
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
      <h2 className="mb-4 text-xl font-semibold">{title}</h2>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead className="text-neutral-300">
            <tr className="border-b border-neutral-800">
              <th className="py-2 text-left">{countLabel}</th>
              <th className="py-2 text-right">{playersLabel}</th>
              <th className="py-2 text-right">{rateLabel}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.value} className="border-b border-neutral-800/70">
                <td className="py-2">
                  {row.value} {label}
                </td>
                <td className="py-2 text-right">
                  {formatCountOutOfTotal(row.count, total)}
                </td>
                <td className="py-2 text-right">{formatRate(row.percentage)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FirstReachTable({
  rows,
  text,
  total,
}: {
  rows: FirstReachRow[];
  text: typeof TEXT.en | typeof TEXT.ja;
  total: number;
}) {
  return (
    <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
      <h2 className="mb-2 text-xl font-semibold">{text.gamesToFirstReach}</h2>
      <p className="mb-4 text-sm text-neutral-400">{text.firstReachNote}</p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[940px] border-collapse text-sm">
          <thead className="text-neutral-300">
            <tr className="border-b border-neutral-800">
              <th className="py-2 text-left">{text.rank}</th>
              <th className="py-2 text-right">{text.reached}</th>
              <th className="py-2 text-right">{text.rate}</th>
              <th className="py-2 text-right">Min</th>
              <th className="py-2 text-right">25th</th>
              <th className="py-2 text-right">Median</th>
              <th className="py-2 text-right">Mean</th>
              <th className="py-2 text-right">75th</th>
              <th className="py-2 text-right">Max</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.rankName} className="border-b border-neutral-800/70">
                <td className="py-2">{row.rankName}</td>
                <td className="py-2 text-right">
                  {formatCountOutOfTotal(row.reached, total)}
                </td>
                <td className="py-2 text-right">{formatRate(row.percentage)}</td>
                <td className="py-2 text-right">{formatNullable(row.min, 0)}</td>
                <td className="py-2 text-right">{formatNullable(row.p25, 1)}</td>
                <td className="py-2 text-right">
                  {formatNullable(row.median, 1)}
                </td>
                <td className="py-2 text-right">{formatNullable(row.mean, 1)}</td>
                <td className="py-2 text-right">{formatNullable(row.p75, 1)}</td>
                <td className="py-2 text-right">{formatNullable(row.max, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}