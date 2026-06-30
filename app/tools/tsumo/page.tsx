"use client";

import { useMemo, useState } from "react";

type Language = "en" | "ja";
type Mode = "single" | "multiple";

type CaseConfig = {
  key: "live" | "dead" | "all";
  includeDeadWall: boolean;
  includeOthersHands: boolean;
};

const MAX_REMAINING_AFTER_RIICHI = 69;
const DEAD_WALL_UNKNOWN = 13;
const OTHERS_HAND_UNKNOWN = 39;
const REPORT_URL = "https://github.com/riichi-mahjong/riichi-mahjong-tools/issues";

const CASES: CaseConfig[] = [
  { key: "live", includeDeadWall: false, includeOthersHands: false },
  { key: "dead", includeDeadWall: true, includeOthersHands: false },
  { key: "all", includeDeadWall: true, includeOthersHands: true },
];

const playerLabels = {
  en: [
    "You",
    "Shimocha / player after you",
    "Toimen / across",
    "Kamicha / player before you",
  ],
  ja: ["自分", "下家", "対面", "上家"],
};

const text = {
  en: {
    title: "Tsumo Win Probability Calculator v0.1",
    subtitle:
      "Estimate single-riichi tsumo probability and multiple-riichi outcomes such as win, tsumo, ron win, deal-in, and no-win rates.",
    languageButton: "日本語",
    single: "Single riichi",
    multiple: "Multiple riichi",
    inputs: "Inputs",
    remaining: "Remaining live-wall tiles",
    remainingHelp: "Enter an integer from 0 to 69.",
    waits: "Winning tiles",
    futureDraws: "Your remaining self-draws",
    approxTurn: "Approx. current turn",
    nextDraw: "Next draw",
    results: "Results",
    case: "Case",
    overall: "Tsumo before exhaustive draw",
    ippatsuTsumo: "Ippatsu tsumo",
    live: "All winning tiles are in the live wall",
    dead: "Winning tiles are randomly spread between live wall and dead wall",
    all: "Winning tiles are randomly spread between live wall, dead wall, and other players' hands",
    riichiPlayers: "Riichi players",
    player: "Player",
    waitCount: "Winning tiles",
    winRate: "Win rate",
    tsumo: "Tsumo",
    ronWin: "Ron win",
    gotRonned: "Deal in",
    noWin: "No win",
    invalidRemaining: "Remaining live-wall tiles must be an integer from 0 to 69.",
    invalidWait: "Winning tiles must be a non-negative integer.",
    invalidInputs: "Please fix the input values above.",
    invalidShort: "Invalid",
    caseImpossible:
      "Winning tiles exceed the number of tiles covered by this case.",
    invalidMultiple:
      "For multiple riichi, you need at least one other riichi player.",
    modelNotesTitle: "Calculation warning",
    modelNotes:
      "This tool is under development. The calculation logic may contain mistakes, including simulation or implementation bugs, so the displayed values may not match the intended probabilities. The calculation also assumes no calls are made by any player.",
    multipleNotes: "For multiple riichi, non-riichi players are assumed not to deal in.",
    reportTitle: "GitHub / Issues / Pull requests",
    reportPrefix: "Pull requests, bug reports, and improvement suggestions are welcome ",
    reportLink: "here",
    reportSuffix: ".",
  },
  ja: {
    title: "ツモ率計算ツール v0.1",
    subtitle:
      "一人リーチ時のツモ率と、複数リーチ時の和了・ツモ・ロン和了・放銃・流局率を計算します。",
    languageButton: "English",
    single: "一人リーチ",
    multiple: "複数リーチ",
    inputs: "入力",
    remaining: "残りツモ牌数",
    remainingHelp: "0〜69の整数を入力してください。",
    waits: "待ち枚数",
    futureDraws: "自分の残りツモ回数",
    approxTurn: "おおよその現在の巡目",
    nextDraw: "次のツモ番",
    results: "結果",
    case: "ケース",
    overall: "流局までのツモ率",
    ippatsuTsumo: "一発ツモ率",
    live: "待ち牌がすべて山にある場合",
    dead: "待ち牌が山と王牌にランダムに散らばっている場合",
    all: "待ち牌が山・王牌・他家手牌にランダムに散らばっている場合",
    riichiPlayers: "リーチ者",
    player: "プレイヤー",
    waitCount: "待ち枚数",
    winRate: "和了率",
    tsumo: "ツモ",
    ronWin: "ロン和了",
    gotRonned: "放銃",
    noWin: "流局",
    invalidRemaining: "残りツモ牌数は0〜69の整数で入力してください。",
    invalidWait: "待ち枚数は0以上の整数で入力してください。",
    invalidInputs: "入力値を確認してください。",
    invalidShort: "計算不可",
    caseImpossible:
      "このケースで対象になる牌数より待ち枚数が多いため計算できません。",
    invalidMultiple:
      "複数リーチでは、少なくとも1人の他家もリーチしている必要があります。",
    modelNotesTitle: "計算上の注意",
    modelNotes:
      "このツールは開発中です。計算ロジックやシミュレーションの実装に誤りが含まれる可能性があり、表示結果が意図した確率と一致しない場合があります。また、誰も副露しないと仮定しています。",
    multipleNotes: "複数リーチでは、非リーチ者は放銃しないと仮定しています。",
    reportTitle: "GitHub・不具合報告・Pull Request",
    reportPrefix: "Pull Request、不具合報告、改善提案は",
    reportLink: "こちら",
    reportSuffix: "。",
  },
};

function readIntegerInput(value: string): number | null {
  const trimmed = value.trim();

  if (trimmed === "") return null;
  if (!/^\d+$/.test(trimmed)) return null;

  return Number(trimmed);
}

function isValidIntegerInput(value: string, min: number, max: number): boolean {
  const parsed = readIntegerInput(value);

  if (parsed === null) return false;

  return parsed >= min && parsed <= max;
}

function normalizedInput(value: string, min: number, max: number): string {
  const parsed = readIntegerInput(value);

  if (parsed === null) return value;
  if (parsed < min || parsed > max) return value;

  return String(parsed);
}

function stepInput(
  value: string,
  delta: number,
  fallback: number,
  min: number,
  max: number
): string {
  const parsed = readIntegerInput(value);
  const base = parsed === null ? fallback : Math.max(min, Math.min(max, parsed));
  const next = Math.max(min, Math.min(max, base + delta));

  return String(next);
}

function totalUnknownTilesForCase(
  remainingLiveWallTiles: number,
  includeDeadWall: boolean,
  includeOthersHands: boolean
): number {
  let total = remainingLiveWallTiles;

  if (includeDeadWall) total += DEAD_WALL_UNKNOWN;
  if (includeOthersHands) total += OTHERS_HAND_UNKNOWN;

  return total;
}

function logChoose(n: number, r: number): number {
  if (r < 0 || r > n || n < 0) return Number.NEGATIVE_INFINITY;

  const k = Math.min(r, n - r);
  let total = 0;

  for (let i = 1; i <= k; i += 1) {
    total += Math.log(n - k + i) - Math.log(i);
  }

  return total;
}

function chooseRatio(
  topN: number,
  topR: number,
  bottomN: number,
  bottomR: number
): number {
  const value = logChoose(topN, topR) - logChoose(bottomN, bottomR);

  if (!Number.isFinite(value)) return 0;

  return Math.exp(value);
}

function futureSelfDrawsAfterRiichi(remainingLiveWallTiles: number): number {
  return Math.floor(remainingLiveWallTiles / 4);
}

function drawProb(params: {
  remainingLiveWallTiles: number;
  winningTiles: number;
  selfDraws: number;
  includeDeadWall: boolean;
  includeOthersHands: boolean;
}): number | null {
  const {
    remainingLiveWallTiles,
    winningTiles,
    selfDraws,
    includeDeadWall,
    includeOthersHands,
  } = params;

  const totalUnknown = totalUnknownTilesForCase(
    remainingLiveWallTiles,
    includeDeadWall,
    includeOthersHands
  );

  const nonLiveUnknown = totalUnknown - remainingLiveWallTiles;

  if (remainingLiveWallTiles <= 0 || winningTiles <= 0 || selfDraws <= 0) {
    return 0;
  }

  if (winningTiles > totalUnknown) {
    return null;
  }

  let prob = 0;

  const minLiveWinningTiles = Math.max(0, winningTiles - nonLiveUnknown);
  const maxLiveWinningTiles = Math.min(winningTiles, remainingLiveWallTiles);

  for (let k = minLiveWinningTiles; k <= maxLiveWinningTiles; k += 1) {
    const probKLive = Math.exp(
      logChoose(remainingLiveWallTiles, k) +
        logChoose(nonLiveUnknown, winningTiles - k) -
        logChoose(totalUnknown, winningTiles)
    );

    const noWin = chooseRatio(
      remainingLiveWallTiles - k,
      selfDraws,
      remainingLiveWallTiles,
      selfDraws
    );

    prob += probKLive * (1 - noWin);
  }

  return prob;
}

function exactRiichiPlayers(params: {
  remainingLiveWallTiles: number;
  waits: number[];
  riichiPlayers: number[];
  nextDrawPlayer: number;
  includeDeadWall: boolean;
  includeOthersHands: boolean;
}) {
  const {
    remainingLiveWallTiles,
    waits,
    riichiPlayers,
    nextDrawPlayer,
    includeDeadWall,
    includeOthersHands,
  } = params;

  if (riichiPlayers.length < 2 || riichiPlayers.length > 4) return null;
  if (waits.length !== riichiPlayers.length) return null;
  if (waits.some((wait) => wait < 0)) return null;

  const totalUnknown = totalUnknownTilesForCase(
    remainingLiveWallTiles,
    includeDeadWall,
    includeOthersHands
  );

  const totalWaits = waits.reduce((sum, wait) => sum + wait, 0);
  const neutral = totalUnknown - totalWaits;

  if (neutral < 0) return null;

  const tsumo: Record<number, number> = {};
  const ronWin: Record<number, number> = {};
  const gotRonned: Record<number, number> = {};

  for (const player of riichiPlayers) {
    tsumo[player] = 0;
    ronWin[player] = 0;
    gotRonned[player] = 0;
  }

  type State = {
    waits: number[];
    neutral: number;
    prob: number;
  };

  let states = new Map<string, State>();
  states.set(`${waits.join(",")}|${neutral}`, { waits, neutral, prob: 1 });

  for (let drawIndex = 0; drawIndex < remainingLiveWallTiles; drawIndex += 1) {
    const drawer = (nextDrawPlayer + drawIndex) % 4;
    const newStates = new Map<string, State>();

    function addState(newWaits: number[], newNeutral: number, prob: number) {
      const key = `${newWaits.join(",")}|${newNeutral}`;
      const oldState = newStates.get(key);

      if (oldState) {
        oldState.prob += prob;
      } else {
        newStates.set(key, { waits: newWaits, neutral: newNeutral, prob });
      }
    }

    for (const state of states.values()) {
      const remainingUnknown =
        state.waits.reduce((sum, wait) => sum + wait, 0) + state.neutral;

      if (remainingUnknown <= 0) continue;

      for (let i = 0; i < riichiPlayers.length; i += 1) {
        const winner = riichiPlayers[i];
        const count = state.waits[i];

        if (count <= 0) continue;

        const prob = state.prob * (count / remainingUnknown);

        if (drawer === winner) {
          tsumo[winner] += prob;
        } else if (riichiPlayers.includes(drawer)) {
          ronWin[winner] += prob;
          gotRonned[drawer] += prob;
        } else {
          const newWaits = [...state.waits];
          newWaits[i] -= 1;
          addState(newWaits, state.neutral, prob);
        }
      }

      if (state.neutral > 0) {
        const prob = state.prob * (state.neutral / remainingUnknown);
        addState([...state.waits], state.neutral - 1, prob);
      }
    }

    states = newStates;
  }

  const noWin = Array.from(states.values()).reduce(
    (sum, state) => sum + state.prob,
    0
  );

  return { tsumo, ronWin, gotRonned, noWin };
}

function pct(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";

  return `${(100 * value).toFixed(2)}%`;
}

function addProb(
  a: number | null | undefined,
  b: number | null | undefined
): number | undefined {
  if (a === null || a === undefined || b === null || b === undefined) {
    return undefined;
  }

  return a + b;
}

function numberInputClasses(isValid: boolean) {
  return isValid
    ? "w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-2 text-neutral-100"
    : "w-full rounded-xl border border-red-700 bg-red-950/40 px-4 py-2 text-red-100";
}

function stepButtonClasses() {
  return "h-11 rounded-xl border border-neutral-700 bg-neutral-950 px-3 text-lg font-bold text-neutral-100 hover:bg-neutral-800";
}

export default function TsumoPage() {
  const [language, setLanguage] = useState<Language>("ja");
  const [mode, setMode] = useState<Mode>("single");

  const [remainingLiveWallTilesInput, setRemainingLiveWallTilesInput] =
    useState("36");
  const [yourWinningTilesInput, setYourWinningTilesInput] = useState("6");

  const [opponentRiichi, setOpponentRiichi] = useState([true, false, false]);
  const [waitsByPlayerInput, setWaitsByPlayerInput] = useState([
    "4",
    "4",
    "4",
    "4",
  ]);
  const [nextDrawPlayer, setNextDrawPlayer] = useState(1);

  const t = text[language];
  const labels = playerLabels[language];

  const isRemainingValid = isValidIntegerInput(
    remainingLiveWallTilesInput,
    0,
    MAX_REMAINING_AFTER_RIICHI
  );

  const isYourWaitValid = isValidIntegerInput(yourWinningTilesInput, 0, 99);

  const isEveryMultipleWaitValid = waitsByPlayerInput.every((value) =>
    isValidIntegerInput(value, 0, 99)
  );

  const remainingLiveWallTiles =
    readIntegerInput(remainingLiveWallTilesInput) ?? 0;
  const yourWinningTiles = readIntegerInput(yourWinningTilesInput) ?? 0;

  const waitsByPlayer = useMemo(() => {
    return waitsByPlayerInput.map((value) => readIntegerInput(value) ?? 0);
  }, [waitsByPlayerInput]);

  const canCalculateSingle = isRemainingValid && isYourWaitValid;
  const canCalculateMultiple = isRemainingValid && isEveryMultipleWaitValid;

  const selfDraws = useMemo(() => {
    if (!isRemainingValid) return null;

    return futureSelfDrawsAfterRiichi(remainingLiveWallTiles);
  }, [isRemainingValid, remainingLiveWallTiles]);

  const approxTurn = useMemo(() => {
    if (!isRemainingValid) return null;

    return (70 - remainingLiveWallTiles) / 4;
  }, [isRemainingValid, remainingLiveWallTiles]);

  const ippatsuDrawCount =
    isRemainingValid && remainingLiveWallTiles >= 4 ? 1 : 0;

  const riichiPlayers = useMemo(() => {
    const players = [0];

    opponentRiichi.forEach((isRiichi, index) => {
      if (isRiichi) players.push(index + 1);
    });

    return players;
  }, [opponentRiichi]);

  const singleResults = useMemo(() => {
    if (!canCalculateSingle || selfDraws === null) {
      return CASES.map((caseConfig) => ({
        ...caseConfig,
        error: t.invalidInputs,
        overall: null,
        ippatsuTsumo: null,
      }));
    }

    return CASES.map((caseConfig) => {
      const totalUnknown = totalUnknownTilesForCase(
        remainingLiveWallTiles,
        caseConfig.includeDeadWall,
        caseConfig.includeOthersHands
      );

      if (yourWinningTiles > totalUnknown) {
        return {
          ...caseConfig,
          error: t.caseImpossible,
          overall: null,
          ippatsuTsumo: null,
        };
      }

      return {
        ...caseConfig,
        error: "",
        overall: drawProb({
          remainingLiveWallTiles,
          winningTiles: yourWinningTiles,
          selfDraws,
          includeDeadWall: caseConfig.includeDeadWall,
          includeOthersHands: caseConfig.includeOthersHands,
        }),
        ippatsuTsumo: drawProb({
          remainingLiveWallTiles,
          winningTiles: yourWinningTiles,
          selfDraws: ippatsuDrawCount,
          includeDeadWall: caseConfig.includeDeadWall,
          includeOthersHands: caseConfig.includeOthersHands,
        }),
      };
    });
  }, [
    canCalculateSingle,
    selfDraws,
    remainingLiveWallTiles,
    yourWinningTiles,
    ippatsuDrawCount,
    t.invalidInputs,
    t.caseImpossible,
  ]);

  const multipleResults = useMemo(() => {
    if (!canCalculateMultiple) {
      return CASES.map((caseConfig) => ({
        ...caseConfig,
        error: t.invalidInputs,
        result: null,
      }));
    }

    const waits = riichiPlayers.map((player) => waitsByPlayer[player]);
    const totalWaits = waits.reduce((sum, wait) => sum + wait, 0);

    return CASES.map((caseConfig) => {
      const totalUnknown = totalUnknownTilesForCase(
        remainingLiveWallTiles,
        caseConfig.includeDeadWall,
        caseConfig.includeOthersHands
      );

      if (riichiPlayers.length < 2) {
        return {
          ...caseConfig,
          error: t.invalidMultiple,
          result: null,
        };
      }

      if (totalWaits > totalUnknown) {
        return {
          ...caseConfig,
          error: t.caseImpossible,
          result: null,
        };
      }

      return {
        ...caseConfig,
        error: "",
        result: exactRiichiPlayers({
          remainingLiveWallTiles,
          waits,
          riichiPlayers,
          nextDrawPlayer,
          includeDeadWall: caseConfig.includeDeadWall,
          includeOthersHands: caseConfig.includeOthersHands,
        }),
      };
    });
  }, [
    canCalculateMultiple,
    remainingLiveWallTiles,
    riichiPlayers,
    waitsByPlayer,
    nextDrawPlayer,
    t.invalidInputs,
    t.invalidMultiple,
    t.caseImpossible,
  ]);

  function caseLabel(key: CaseConfig["key"]) {
    if (key === "live") return t.live;
    if (key === "dead") return t.dead;
    return t.all;
  }

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-neutral-100">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-4">
          <div className="flex flex-wrap items-center justify-end gap-4">
            <button
              className="rounded-xl border border-neutral-700 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-900"
              type="button"
              onClick={() => setLanguage(language === "ja" ? "en" : "ja")}
            >
              {t.languageButton}
            </button>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-bold">{t.title}</h1>
            <p className="max-w-3xl text-neutral-300">{t.subtitle}</p>
          </div>
        </header>

        <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
          <div className="flex flex-wrap gap-3">
            <button
              className={
                mode === "single"
                  ? "rounded-xl bg-neutral-100 px-4 py-2 font-semibold text-neutral-950"
                  : "rounded-xl border border-neutral-700 px-4 py-2 font-semibold text-neutral-200 hover:bg-neutral-800"
              }
              type="button"
              onClick={() => setMode("single")}
            >
              {t.single}
            </button>
            <button
              className={
                mode === "multiple"
                  ? "rounded-xl bg-neutral-100 px-4 py-2 font-semibold text-neutral-950"
                  : "rounded-xl border border-neutral-700 px-4 py-2 font-semibold text-neutral-200 hover:bg-neutral-800"
              }
              type="button"
              onClick={() => setMode("multiple")}
            >
              {t.multiple}
            </button>
          </div>
        </section>

        <section
          className={
            mode === "single"
              ? "grid gap-6 lg:grid-cols-[minmax(0,560px)] lg:justify-center"
              : "grid gap-6 lg:grid-cols-2"
          }
        >
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="mb-4 text-xl font-semibold">{t.inputs}</h2>

            <label className="mb-4 block space-y-2">
              <span className="block text-sm text-neutral-300">
                {t.remaining}
              </span>
              <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] gap-2">
                <button
                  className={stepButtonClasses()}
                  type="button"
                  onClick={() =>
                    setRemainingLiveWallTilesInput(
                      stepInput(
                        remainingLiveWallTilesInput,
                        -1,
                        0,
                        0,
                        MAX_REMAINING_AFTER_RIICHI
                      )
                    )
                  }
                >
                  −
                </button>
                <input
                  className={numberInputClasses(isRemainingValid)}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={remainingLiveWallTilesInput}
                  onChange={(event) =>
                    setRemainingLiveWallTilesInput(event.target.value)
                  }
                  onBlur={() =>
                    setRemainingLiveWallTilesInput(
                      normalizedInput(
                        remainingLiveWallTilesInput,
                        0,
                        MAX_REMAINING_AFTER_RIICHI
                      )
                    )
                  }
                />
                <button
                  className={stepButtonClasses()}
                  type="button"
                  onClick={() =>
                    setRemainingLiveWallTilesInput(
                      stepInput(
                        remainingLiveWallTilesInput,
                        1,
                        0,
                        0,
                        MAX_REMAINING_AFTER_RIICHI
                      )
                    )
                  }
                >
                  +
                </button>
              </div>
              <small className="block text-neutral-400">{t.remainingHelp}</small>
              {!isRemainingValid && (
                <small className="block font-semibold text-red-300">
                  {t.invalidRemaining}
                </small>
              )}
            </label>

            {mode === "single" && (
              <label className="mb-4 block space-y-2">
                <span className="block text-sm text-neutral-300">
                  {t.waits}
                </span>
                <div className="grid grid-cols-[44px_minmax(0,1fr)_44px] gap-2">
                  <button
                    className={stepButtonClasses()}
                    type="button"
                    onClick={() =>
                      setYourWinningTilesInput(
                        stepInput(yourWinningTilesInput, -1, 0, 0, 99)
                      )
                    }
                  >
                    −
                  </button>
                  <input
                    className={numberInputClasses(isYourWaitValid)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={yourWinningTilesInput}
                    onChange={(event) =>
                      setYourWinningTilesInput(event.target.value)
                    }
                    onBlur={() =>
                      setYourWinningTilesInput(
                        normalizedInput(yourWinningTilesInput, 0, 99)
                      )
                    }
                  />
                  <button
                    className={stepButtonClasses()}
                    type="button"
                    onClick={() =>
                      setYourWinningTilesInput(
                        stepInput(yourWinningTilesInput, 1, 0, 0, 99)
                      )
                    }
                  >
                    +
                  </button>
                </div>
                {!isYourWaitValid && (
                  <small className="block font-semibold text-red-300">
                    {t.invalidWait}
                  </small>
                )}
              </label>
            )}

            {mode === "multiple" && (
              <label className="mb-4 block space-y-2">
                <span className="block text-sm text-neutral-300">
                  {t.nextDraw}
                </span>
                <select
                  className="w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-2 text-neutral-100"
                  value={nextDrawPlayer}
                  onChange={(event) =>
                    setNextDrawPlayer(Number(event.target.value))
                  }
                >
                  {[0, 1, 2, 3].map((player) => (
                    <option key={player} value={player}>
                      {labels[player]}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                <span className="block text-sm text-neutral-400">
                  {t.futureDraws}
                </span>
                <strong className="mt-2 block text-2xl">
                  {selfDraws === null ? "-" : selfDraws}
                </strong>
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-4">
                <span className="block text-sm text-neutral-400">
                  {t.approxTurn}
                </span>
                <strong className="mt-2 block text-2xl">
                  {approxTurn === null ? "-" : approxTurn.toFixed(1)}
                </strong>
              </div>
            </div>
          </div>

          {mode === "multiple" && (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
              <h2 className="mb-4 text-xl font-semibold">{t.riichiPlayers}</h2>

              <div className="space-y-4">
                {[0, 1, 2, 3].map((player) => {
                  const isWaitValid = isValidIntegerInput(
                    waitsByPlayerInput[player],
                    0,
                    99
                  );

                  return (
                    <div
                      className="grid gap-3 rounded-xl border border-neutral-800 bg-neutral-950 p-4 sm:grid-cols-[1fr_170px] sm:items-center"
                      key={player}
                    >
                      <label className="flex items-center gap-3 font-semibold">
                        <input
                          className="h-4 w-4"
                          type="checkbox"
                          checked={player === 0 || opponentRiichi[player - 1]}
                          disabled={player === 0}
                          onChange={(event) => {
                            if (player === 0) return;

                            const next = [...opponentRiichi];
                            next[player - 1] = event.target.checked;
                            setOpponentRiichi(next);
                          }}
                        />
                        {labels[player]}
                      </label>

                      <div>
                        <div className="grid grid-cols-[36px_minmax(0,1fr)_36px] gap-2">
                          <button
                            className={stepButtonClasses()}
                            type="button"
                            onClick={() => {
                              const next = [...waitsByPlayerInput];
                              next[player] = stepInput(
                                waitsByPlayerInput[player],
                                -1,
                                0,
                                0,
                                99
                              );
                              setWaitsByPlayerInput(next);
                            }}
                          >
                            −
                          </button>
                          <input
                            className={numberInputClasses(isWaitValid)}
                            aria-label={`${labels[player]} ${t.waitCount}`}
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={waitsByPlayerInput[player]}
                            onChange={(event) => {
                              const next = [...waitsByPlayerInput];
                              next[player] = event.target.value;
                              setWaitsByPlayerInput(next);
                            }}
                            onBlur={() => {
                              const next = [...waitsByPlayerInput];
                              next[player] = normalizedInput(
                                waitsByPlayerInput[player],
                                0,
                                99
                              );
                              setWaitsByPlayerInput(next);
                            }}
                          />
                          <button
                            className={stepButtonClasses()}
                            type="button"
                            onClick={() => {
                              const next = [...waitsByPlayerInput];
                              next[player] = stepInput(
                                waitsByPlayerInput[player],
                                1,
                                0,
                                0,
                                99
                              );
                              setWaitsByPlayerInput(next);
                            }}
                          >
                            +
                          </button>
                        </div>
                        {!isWaitValid && (
                          <small className="mt-1 block font-semibold text-red-300">
                            {t.invalidWait}
                          </small>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </section>

        {mode === "single" && (
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="mb-4 text-xl font-semibold">{t.results}</h2>

            {!canCalculateSingle && (
              <p className="mb-4 font-semibold text-red-300">
                {t.invalidInputs}
              </p>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead className="text-neutral-300">
                  <tr className="border-b border-neutral-800">
                    <th className="py-2 text-left">{t.case}</th>
                    <th className="py-2 text-right">{t.overall}</th>
                    <th className="py-2 text-right">{t.ippatsuTsumo}</th>
                  </tr>
                </thead>
                <tbody>
                  {singleResults.map((result) => (
                    <tr
                      className="border-b border-neutral-800/70"
                      key={result.key}
                    >
                      <td className="py-3 align-top">
                        {caseLabel(result.key)}
                        {result.error && (
                          <small className="mt-1 block font-semibold text-red-300">
                            {result.error}
                          </small>
                        )}
                      </td>
                      <td className="py-3 text-right align-top">
                        {result.error ? t.invalidShort : pct(result.overall)}
                      </td>
                      <td className="py-3 text-right align-top">
                        {result.error
                          ? t.invalidShort
                          : pct(result.ippatsuTsumo)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {mode === "multiple" && (
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900 p-6">
            <h2 className="mb-4 text-xl font-semibold">{t.results}</h2>

            {!canCalculateMultiple && (
              <p className="mb-4 font-semibold text-red-300">
                {t.invalidInputs}
              </p>
            )}

            <div className="space-y-8">
              {multipleResults.map((caseResult) => (
                <div key={caseResult.key}>
                  <h3 className="mb-3 text-lg font-semibold">
                    {caseLabel(caseResult.key)}
                  </h3>

                  {caseResult.error && (
                    <p className="font-semibold text-red-300">
                      {caseResult.error}
                    </p>
                  )}

                  {caseResult.result !== null && (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[840px] border-collapse text-sm">
                        <thead className="text-neutral-300">
                          <tr className="border-b border-neutral-800">
                            <th className="py-2 text-left">{t.player}</th>
                            <th className="py-2 text-right">{t.winRate}</th>
                            <th className="py-2 text-right">{t.tsumo}</th>
                            <th className="py-2 text-right">{t.ronWin}</th>
                            <th className="py-2 text-right">{t.gotRonned}</th>
                            <th className="py-2 text-right">{t.noWin}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {riichiPlayers.map((player) => {
                            const tsumoProb = caseResult.result?.tsumo[player];
                            const ronProb = caseResult.result?.ronWin[player];
                            const winProb = addProb(tsumoProb, ronProb);

                            return (
                              <tr
                                className="border-b border-neutral-800/70"
                                key={player}
                              >
                                <td className="py-3">{labels[player]}</td>
                                <td className="py-3 text-right">
                                  {pct(winProb)}
                                </td>
                                <td className="py-3 text-right">
                                  {pct(tsumoProb)}
                                </td>
                                <td className="py-3 text-right">
                                  {pct(ronProb)}
                                </td>
                                <td className="py-3 text-right">
                                  {pct(caseResult.result?.gotRonned[player])}
                                </td>
                                <td className="py-3 text-right text-neutral-500">
                                  -
                                </td>
                              </tr>
                            );
                          })}
                          <tr className="border-b border-neutral-800/70 bg-neutral-950/40">
                            <td className="py-3" colSpan={5}></td>
                            <td className="py-3 text-right font-semibold">
                              {pct(caseResult.result.noWin)}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-amber-900 bg-amber-950/30 p-6">
          <h2 className="mb-3 text-xl font-semibold text-amber-100">
            {t.modelNotesTitle}
          </h2>
          <p className="max-w-4xl text-sm leading-6 text-amber-100/90">
            {t.modelNotes}
          </p>
          {mode === "multiple" && (
            <p className="mt-3 max-w-4xl text-sm leading-6 text-amber-100/90">
              {t.multipleNotes}
            </p>
          )}
        </section>

        <footer className="border-t border-neutral-800 pt-6 text-center text-sm text-neutral-400">
          <a
            className="font-medium text-neutral-200 hover:text-neutral-100"
            href={REPORT_URL}
            target="_blank"
            rel="noreferrer"
          >
            {t.reportTitle}
          </a>
          <p className="mt-2">
            {t.reportPrefix}
            <a
              className="font-medium text-neutral-200 hover:text-neutral-100"
              href={REPORT_URL}
              target="_blank"
              rel="noreferrer"
            >
              {t.reportLink}
            </a>
            {t.reportSuffix}
          </p>
        </footer>
      </div>
    </main>
  );
}