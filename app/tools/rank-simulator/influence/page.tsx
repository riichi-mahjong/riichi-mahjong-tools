"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useEffect, useState } from "react";

type GameType = "East-South" | "East-Only";
type Locale = "ja" | "en";

const LANGUAGE_STORAGE_KEY = "riichi-mahjong-tools-language";
const GITHUB_URL = "https://github.com/riichi-mahjong/riichi-mahjong-tools";
const CEILING_CORRECTION = 0.5;

const TEXT = {
  en: {
    languageButton: "日本語",
    mainPage: "Main page",
    rankSimulator: "Rank simulator",
    title: "G/L and Rounding Impact Checker",
    description:
      "Compare the stable-rank estimate used by the rank simulator with comparison cases that remove G/L per round or rounding correction.",
    gameType: "Game type",
    eastSouth: "East-South",
    eastOnly: "East-Only",
    placementRates: "Jade Room placement distribution",
    first: "1st (%)",
    second: "2nd (%)",
    third: "3rd (%)",
    fourth: "4th (%)",
    glPerRound: "Jade G/L per round",
    sum: "Sum",
    scenario: "Scenario",
    stableRank: "Stable-rank estimate",
    withGlWithRounding:
      "Used by the rank simulator: with G/L and rounding correction",
    withGlWithoutRounding:
      "Comparison only: with G/L, without rounding correction",
    withoutGlWithRounding:
      "Comparison only: without G/L, with rounding correction",
    withoutGlWithoutRounding:
      "Comparison only: without G/L and rounding correction",
    invalidInput:
      "Enter valid placement rates that sum to 100%. Fourth-place rate must be greater than 0%.",
    githubLink: "GitHub / Issues / Pull requests",
    githubDescription:
      "Pull requests, bug reports, and improvement suggestions are welcome.",
  },
  ja: {
    languageButton: "English",
    mainPage: "メインページ",
    rankSimulator: "段位シミュレーター",
    title: "局収支・切り上げ補正の影響チェック",
    description:
      "段位シミュレーターで使っている安定段位推定と、局収支や切り上げ補正を外した比較用の推定を比べます。",
    gameType: "ゲーム形式",
    eastSouth: "半荘戦",
    eastOnly: "東風戦",
    placementRates: "玉の間の順位分布",
    first: "1位率 (%)",
    second: "2位率 (%)",
    third: "3位率 (%)",
    fourth: "4位率 (%)",
    glPerRound: "玉の間 局収支",
    sum: "合計",
    scenario: "条件",
    stableRank: "安定段位推定",
    withGlWithRounding:
      "段位シミュレーターで使用：局収支あり・切り上げ補正あり",
    withGlWithoutRounding:
      "比較用：局収支あり・切り上げ補正なし",
    withoutGlWithRounding:
      "比較用：局収支なし・切り上げ補正あり",
    withoutGlWithoutRounding:
      "比較用：局収支なし・切り上げ補正なし",
    invalidInput:
      "順位率の合計が100%になるように入力してください。4位率は0%より大きい必要があります。",
    githubLink: "GitHub・不具合報告・Pull Request",
    githubDescription: "Pull Request、不具合報告、改善提案はこちら。",
  },
} as const;

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

function getRoundMultiplier(gameType: GameType) {
  return gameType === "East-South" ? 10.5 : 5.6;
}

function getStableRankOffset(gameType: GameType) {
  return gameType === "East-South" ? 10 : 7.5;
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function isCloseTo100(value: number) {
  return Math.abs(value - 100) < 0.000001;
}

function truncate2(value: number) {
  return (Math.trunc(value * 100) / 100).toFixed(2);
}

function formatNumber(value: number, digits = 3) {
  if (!Number.isFinite(value)) {
    return "--";
  }

  return value.toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

function formatStableRankDetailed(rawLevel: number, locale: Locale) {
  if (!Number.isFinite(rawLevel)) {
    return "--";
  }

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

function getStableRankRawLevel({
  gameType,
  placementRates,
  glPerRound,
  ceilingCorrection,
}: {
  gameType: GameType;
  placementRates: number[];
  glPerRound: number;
  ceilingCorrection: number;
}) {
  const p1 = placementRates[0] / 100;
  const p2 = placementRates[1] / 100;
  const p3 = placementRates[2] / 100;
  const p4 = placementRates[3] / 100;

  if (p4 <= 0) {
    return null;
  }

  const scorePoint = (glPerRound * getRoundMultiplier(gameType)) / 1000;

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
    scorePoint + placementPoint + roomPoint + ceilingCorrection;

  return estimatedPointGain / fourthPenaltyStep - getStableRankOffset(gameType);
}

function numberOrDefault(value: string | null, defaultValue: number) {
  if (value === null || value.trim() === "") {
    return defaultValue;
  }

  const parsedValue = Number(value);

  return Number.isFinite(parsedValue) ? parsedValue : defaultValue;
}

function gameTypeOrDefault(value: string | null): GameType {
  return value === "East-Only" ? "East-Only" : "East-South";
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

export default function InfluencePage() {
  const [locale, setLocale] = useState<Locale>("ja");
  const text = TEXT[locale];

  const [gameType, setGameType] = useState<GameType>("East-South");
  const [firstRate, setFirstRate] = useState(22);
  const [secondRate, setSecondRate] = useState(24);
  const [thirdRate, setThirdRate] = useState(27);
  const [fourthRate, setFourthRate] = useState(27);
  const [glPerRound, setGlPerRound] = useState(-50);
  const [hasLoadedLocale, setHasLoadedLocale] = useState(false);

  useEffect(() => {
    const storedLocale = readStoredLocale();

    if (storedLocale !== null) {
      setLocale(storedLocale);
    }

    const params = new URLSearchParams(window.location.search);

    setGameType(gameTypeOrDefault(params.get("gameType")));
    setFirstRate(numberOrDefault(params.get("p1"), 22));
    setSecondRate(numberOrDefault(params.get("p2"), 24));
    setThirdRate(numberOrDefault(params.get("p3"), 27));
    setFourthRate(numberOrDefault(params.get("p4"), 27));
    setGlPerRound(numberOrDefault(params.get("gl"), -50));

    setHasLoadedLocale(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedLocale) {
      return;
    }

    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, locale);
  }, [hasLoadedLocale, locale]);

  const placementRates = [firstRate, secondRate, thirdRate, fourthRate];
  const rateSum = sum(placementRates);
  const isValidInput =
    placementRates.every((value) => Number.isFinite(value) && value >= 0) &&
    isCloseTo100(rateSum) &&
    fourthRate > 0 &&
    Number.isFinite(glPerRound);

  const rows = [
    {
      label: text.withGlWithRounding,
      value: getStableRankRawLevel({
        gameType,
        placementRates,
        glPerRound,
        ceilingCorrection: CEILING_CORRECTION,
      }),
    },
    {
      label: text.withGlWithoutRounding,
      value: getStableRankRawLevel({
        gameType,
        placementRates,
        glPerRound,
        ceilingCorrection: 0,
      }),
    },
    {
      label: text.withoutGlWithRounding,
      value: getStableRankRawLevel({
        gameType,
        placementRates,
        glPerRound: 0,
        ceilingCorrection: CEILING_CORRECTION,
      }),
    },
    {
      label: text.withoutGlWithoutRounding,
      value: getStableRankRawLevel({
        gameType,
        placementRates,
        glPerRound: 0,
        ceilingCorrection: 0,
      }),
    },
  ];

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-neutral-100">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <nav className="flex flex-wrap gap-3 text-sm">
              <Link
                className="rounded-xl border border-neutral-700 px-4 py-2 text-neutral-200 hover:bg-neutral-900"
                href="/tools/rank-simulator/"
              >
                {text.rankSimulator}
              </Link>
            </nav>

            <button
              className="rounded-xl border border-neutral-700 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-900"
              onClick={() => setLocale(locale === "ja" ? "en" : "ja")}
            >
              {text.languageButton}
            </button>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-bold">{text.title}</h1>
            <p className="max-w-3xl text-neutral-300">{text.description}</p>
          </div>
        </header>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="grid gap-4 md:grid-cols-3">
            <label className="space-y-2">
              <span className="block text-sm text-neutral-300">
                {text.gameType}
              </span>
              <select
                className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-2 text-neutral-100"
                value={gameType}
                onChange={(event) =>
                  setGameType(event.target.value as GameType)
                }
              >
                <option value="East-South">{text.eastSouth}</option>
                <option value="East-Only">{text.eastOnly}</option>
              </select>
            </label>

            <NumberInput
              label={text.glPerRound}
              value={glPerRound}
              onChange={setGlPerRound}
            />
          </div>

          <h2 className="mt-6 mb-4 text-xl font-semibold">
            {text.placementRates}
          </h2>

          <div className="grid gap-4 md:grid-cols-4">
            <NumberInput
              label={text.first}
              value={firstRate}
              onChange={setFirstRate}
            />
            <NumberInput
              label={text.second}
              value={secondRate}
              onChange={setSecondRate}
            />
            <NumberInput
              label={text.third}
              value={thirdRate}
              onChange={setThirdRate}
            />
            <NumberInput
              label={text.fourth}
              value={fourthRate}
              onChange={setFourthRate}
            />
          </div>

          <p
            className={
              isCloseTo100(rateSum)
                ? "mt-4 text-sm text-emerald-400"
                : "mt-4 text-sm text-red-400"
            }
          >
            {text.sum}: {formatNumber(rateSum, 2)}%
          </p>
        </section>

        {!isValidInput && (
          <section className="rounded-2xl border border-red-800 bg-red-950/40 p-6 text-red-100">
            {text.invalidInput}
          </section>
        )}

        {isValidInput && (
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="mb-4 text-xl font-semibold">{text.stableRank}</h2>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead className="text-neutral-300">
                  <tr className="border-b border-neutral-800">
                    <th className="py-2 text-left">{text.scenario}</th>
                    <th className="py-2 text-right">{text.stableRank}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.label}
                      className="border-b border-neutral-800/70"
                    >
                      <td className="py-2">{row.label}</td>
                      <td className="py-2 text-right">
                        {row.value === null
                          ? "--"
                          : formatStableRankDetailed(row.value, locale)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
