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
    language: "Language",
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
    reportTitle: "GitHub / Bug reports",
    reportPrefix: "Fork the code, report bugs, or suggest improvements ",
    reportLink: "here",
    reportSuffix: ".",
  },
  ja: {
    title: "ツモ率計算ツール v0.1",
    subtitle:
      "一人リーチ時のツモ率と、複数リーチ時の和了・ツモ・ロン和了・放銃・流局率を計算します。",
    language: "言語",
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
    reportTitle: "GitHub・不具合報告",
    reportPrefix: "コードのフォーク、不具合報告、改善提案は",
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

function stepInput(value: string, delta: number, fallback: number, min: number, max: number): string {
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

function chooseRatio(topN: number, topR: number, bottomN: number, bottomR: number): number {
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

  if (remainingLiveWallTiles <= 0 || winningTiles <= 0 || selfDraws <= 0) return 0;
  if (winningTiles > totalUnknown) return null;

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
      const remainingUnknown = state.waits.reduce((sum, wait) => sum + wait, 0) + state.neutral;

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

  const noWin = Array.from(states.values()).reduce((sum, state) => sum + state.prob, 0);

  return { tsumo, ronWin, gotRonned, noWin };
}

function pct(value: number | null | undefined): string {
  if (value === null || value === undefined) return "-";

  return `${(100 * value).toFixed(2)}%`;
}

function addProb(a: number | null | undefined, b: number | null | undefined): number | undefined {
  if (a === null || a === undefined || b === null || b === undefined) return undefined;

  return a + b;
}

export default function TsumoPage() {
  const [language, setLanguage] = useState<Language>("en");
  const [mode, setMode] = useState<Mode>("single");

  const [remainingLiveWallTilesInput, setRemainingLiveWallTilesInput] = useState("20");
  const [yourWinningTilesInput, setYourWinningTilesInput] = useState("6");

  const [opponentRiichi, setOpponentRiichi] = useState([true, false, false]);
  const [waitsByPlayerInput, setWaitsByPlayerInput] = useState(["4", "4", "4", "4"]);
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

  const remainingLiveWallTiles = readIntegerInput(remainingLiveWallTilesInput) ?? 0;
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

  const ippatsuDrawCount = isRemainingValid && remainingLiveWallTiles >= 4 ? 1 : 0;

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
    <main className="page">
      <section className="hero">
        <div className="topbar">
          <label className="language">
            <span>{t.language}</span>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value as Language)}
            >
              <option value="en">English</option>
              <option value="ja">日本語</option>
            </select>
          </label>
        </div>

        <h1>{t.title}</h1>
        <p className="subtitle">{t.subtitle}</p>
      </section>

      <section className="card">
        <div className="modeButtons">
          <button className={mode === "single" ? "active" : ""} onClick={() => setMode("single")}>
            {t.single}
          </button>
          <button
            className={mode === "multiple" ? "active" : ""}
            onClick={() => setMode("multiple")}
          >
            {t.multiple}
          </button>
        </div>
      </section>

      <section className={mode === "single" ? "grid singleGrid" : "grid"}>
        <div className="card">
          <h2>{t.inputs}</h2>

          <label className="field">
            <span>{t.remaining}</span>
            <div className="numberControl">
              <button
                type="button"
                className="stepButton"
                onClick={() =>
                  setRemainingLiveWallTilesInput(
                    stepInput(remainingLiveWallTilesInput, -1, 0, 0, MAX_REMAINING_AFTER_RIICHI)
                  )
                }
              >
                −
              </button>
              <input
                className={!isRemainingValid ? "invalidInput" : ""}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={remainingLiveWallTilesInput}
                onChange={(event) => setRemainingLiveWallTilesInput(event.target.value)}
                onBlur={() =>
                  setRemainingLiveWallTilesInput(
                    normalizedInput(remainingLiveWallTilesInput, 0, MAX_REMAINING_AFTER_RIICHI)
                  )
                }
              />
              <button
                type="button"
                className="stepButton"
                onClick={() =>
                  setRemainingLiveWallTilesInput(
                    stepInput(remainingLiveWallTilesInput, 1, 0, 0, MAX_REMAINING_AFTER_RIICHI)
                  )
                }
              >
                +
              </button>
            </div>
            <small>{t.remainingHelp}</small>
            {!isRemainingValid && <small className="errorText">{t.invalidRemaining}</small>}
          </label>

          {mode === "single" && (
            <label className="field">
              <span>{t.waits}</span>
              <div className="numberControl">
                <button
                  type="button"
                  className="stepButton"
                  onClick={() =>
                    setYourWinningTilesInput(stepInput(yourWinningTilesInput, -1, 0, 0, 99))
                  }
                >
                  −
                </button>
                <input
                  className={!isYourWaitValid ? "invalidInput" : ""}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={yourWinningTilesInput}
                  onChange={(event) => setYourWinningTilesInput(event.target.value)}
                  onBlur={() =>
                    setYourWinningTilesInput(normalizedInput(yourWinningTilesInput, 0, 99))
                  }
                />
                <button
                  type="button"
                  className="stepButton"
                  onClick={() =>
                    setYourWinningTilesInput(stepInput(yourWinningTilesInput, 1, 0, 0, 99))
                  }
                >
                  +
                </button>
              </div>
              {!isYourWaitValid && <small className="errorText">{t.invalidWait}</small>}
            </label>
          )}

          {mode === "multiple" && (
            <label className="field">
              <span>{t.nextDraw}</span>
              <select
                value={nextDrawPlayer}
                onChange={(event) => setNextDrawPlayer(Number(event.target.value))}
              >
                {[0, 1, 2, 3].map((player) => (
                  <option key={player} value={player}>
                    {labels[player]}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="summary">
            <div>
              <span>{t.futureDraws}</span>
              <strong>{selfDraws === null ? "-" : selfDraws}</strong>
            </div>
            <div>
              <span>{t.approxTurn}</span>
              <strong>{approxTurn === null ? "-" : approxTurn.toFixed(1)}</strong>
            </div>
          </div>
        </div>

        {mode === "multiple" && (
          <div className="card">
            <h2>{t.riichiPlayers}</h2>

            {[0, 1, 2, 3].map((player) => {
              const isWaitValid = isValidIntegerInput(waitsByPlayerInput[player], 0, 99);

              return (
                <div className="playerRow" key={player}>
                  <label>
                    <input
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
                    <div className="numberControl compactNumberControl">
                      <button
                        type="button"
                        className="stepButton"
                        onClick={() => {
                          const next = [...waitsByPlayerInput];
                          next[player] = stepInput(waitsByPlayerInput[player], -1, 0, 0, 99);
                          setWaitsByPlayerInput(next);
                        }}
                      >
                        −
                      </button>
                      <input
                        className={!isWaitValid ? "invalidInput" : ""}
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
                          next[player] = normalizedInput(waitsByPlayerInput[player], 0, 99);
                          setWaitsByPlayerInput(next);
                        }}
                      />
                      <button
                        type="button"
                        className="stepButton"
                        onClick={() => {
                          const next = [...waitsByPlayerInput];
                          next[player] = stepInput(waitsByPlayerInput[player], 1, 0, 0, 99);
                          setWaitsByPlayerInput(next);
                        }}
                      >
                        +
                      </button>
                    </div>
                    {!isWaitValid && <small className="errorText">{t.invalidWait}</small>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {mode === "single" && (
        <section className="card">
          <h2>{t.results}</h2>

          {!canCalculateSingle && <p className="error">{t.invalidInputs}</p>}

          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>{t.case}</th>
                  <th>{t.overall}</th>
                  <th>{t.ippatsuTsumo}</th>
                </tr>
              </thead>
              <tbody>
                {singleResults.map((result) => (
                  <tr key={result.key}>
                    <td>
                      {caseLabel(result.key)}
                      {result.error && <small className="caseError">{result.error}</small>}
                    </td>
                    <td>{result.error ? t.invalidShort : pct(result.overall)}</td>
                    <td>{result.error ? t.invalidShort : pct(result.ippatsuTsumo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {mode === "multiple" && (
        <section className="card">
          <h2>{t.results}</h2>

          {!canCalculateMultiple && <p className="error">{t.invalidInputs}</p>}

          {multipleResults.map((caseResult) => (
            <div className="caseBlock" key={caseResult.key}>
              <h3>{caseLabel(caseResult.key)}</h3>

              {caseResult.error && <p className="error">{caseResult.error}</p>}

              {caseResult.result !== null && (
                <div className="tableWrap">
                  <table>
                    <thead>
                      <tr>
                        <th>{t.player}</th>
                        <th>{t.winRate}</th>
                        <th>{t.tsumo}</th>
                        <th>{t.ronWin}</th>
                        <th>{t.gotRonned}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {riichiPlayers.map((player) => {
                        const tsumoProb = caseResult.result?.tsumo[player];
                        const ronProb = caseResult.result?.ronWin[player];
                        const winProb = addProb(tsumoProb, ronProb);

                        return (
                          <tr key={player}>
                            <td>{labels[player]}</td>
                            <td>{pct(winProb)}</td>
                            <td>{pct(tsumoProb)}</td>
                            <td>{pct(ronProb)}</td>
                            <td>{pct(caseResult.result?.gotRonned[player])}</td>
                          </tr>
                        );
                      })}
                      <tr>
                        <td>
                          <strong>{t.noWin}</strong>
                        </td>
                        <td colSpan={4}>
                          <strong>{pct(caseResult.result.noWin)}</strong>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      <section className="card">
        <h2>{t.modelNotesTitle}</h2>
        <p>{t.modelNotes}</p>
        {mode === "multiple" && <p>{t.multipleNotes}</p>}
      </section>

      <section className="card reportCard">
        <h2>{t.reportTitle}</h2>
        <p>
          {t.reportPrefix}
          <a href={REPORT_URL} target="_blank" rel="noreferrer">
            {t.reportLink}
          </a>
          {t.reportSuffix}
        </p>
      </section>

      <style>{`
        .page {
          min-height: 100vh;
          padding: 40px 20px;
          color: #172033;
          background:
            radial-gradient(circle at top left, rgba(47, 117, 86, 0.14), transparent 32rem),
            linear-gradient(180deg, #f7faf8 0%, #edf4ef 100%);
          font-family:
            Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
            "Segoe UI", sans-serif;
        }

        .hero,
        .card,
        .grid {
          width: min(1120px, 100%);
          margin-left: auto;
          margin-right: auto;
        }

        .topbar {
          display: flex;
          justify-content: flex-end;
          gap: 16px;
          align-items: center;
        }

        h1 {
          margin: 16px 0 12px;
          font-size: clamp(2rem, 5vw, 4rem);
          line-height: 1.05;
          letter-spacing: -0.04em;
        }

        h2 {
          margin: 0 0 18px;
          font-size: 1.25rem;
        }

        h3 {
          margin: 0 0 10px;
          font-size: 1.05rem;
        }

        .subtitle {
          max-width: 820px;
          margin: 0;
          color: #4c5b52;
          font-size: 1.05rem;
          line-height: 1.7;
        }

        .language {
          display: flex;
          gap: 8px;
          align-items: center;
          font-weight: 700;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 18px;
        }

        .singleGrid {
          grid-template-columns: minmax(0, 560px);
          justify-content: center;
        }

        .card {
          box-sizing: border-box;
          margin-top: 18px;
          padding: 22px;
          border: 1px solid rgba(23, 32, 51, 0.1);
          border-radius: 22px;
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 18px 50px rgba(30, 62, 45, 0.08);
        }

        .modeButtons {
          display: flex;
          justify-content: center;
          gap: 12px;
          flex-wrap: wrap;
        }

        button {
          font: inherit;
        }

        .modeButtons button {
          padding: 12px 16px;
          border: 1px solid rgba(23, 32, 51, 0.16);
          border-radius: 999px;
          background: #ffffff;
          cursor: pointer;
          color: #172033;
          font-weight: 800;
        }

        .modeButtons button.active {
          color: white;
          background: #2f7556;
          border-color: #2f7556;
        }

        .field {
          display: grid;
          gap: 8px;
          margin-bottom: 16px;
          font-weight: 700;
        }

        small {
          color: #607167;
          font-weight: 500;
          line-height: 1.5;
        }

        input,
        select {
          box-sizing: border-box;
          width: 100%;
          padding: 12px 14px;
          border: 1px solid rgba(23, 32, 51, 0.16);
          border-radius: 12px;
          background: #ffffff;
          color: #172033;
          font: inherit;
        }

        input:disabled {
          background: #eef3ef;
          color: #6a766f;
        }

        .invalidInput {
          border-color: #b94034;
          background: #fff8f7;
        }

        .errorText,
        .caseError {
          color: #a33a2f;
          font-weight: 700;
        }

        .caseError {
          display: block;
          margin-top: 6px;
        }

        .numberControl {
          display: grid;
          grid-template-columns: 44px minmax(0, 1fr) 44px;
          gap: 8px;
          align-items: center;
        }

        .compactNumberControl {
          grid-template-columns: 36px minmax(0, 80px) 36px;
        }

        .stepButton {
          height: 44px;
          border: 1px solid rgba(23, 32, 51, 0.16);
          border-radius: 12px;
          background: #f4f8f5;
          color: #172033;
          cursor: pointer;
          font-size: 1.2rem;
          font-weight: 900;
          line-height: 1;
        }

        .stepButton:hover {
          border-color: #2f7556;
          background: #edf6f1;
        }

        .summary {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .summary div {
          padding: 16px;
          border-radius: 16px;
          background: #f0f6f2;
        }

        .summary span {
          display: block;
          color: #5f6f66;
          font-size: 0.9rem;
          font-weight: 700;
        }

        .summary strong {
          display: block;
          margin-top: 6px;
          font-size: 1.45rem;
        }

        .playerRow {
          display: grid;
          grid-template-columns: 1fr 160px;
          gap: 12px;
          align-items: center;
          margin-bottom: 12px;
        }

        .playerRow label {
          display: flex;
          gap: 8px;
          align-items: center;
          font-weight: 700;
          line-height: 1.35;
        }

        .playerRow input[type="checkbox"] {
          width: auto;
          flex: 0 0 auto;
        }

        .tableWrap {
          overflow-x: auto;
        }

        table {
          width: 100%;
          min-width: 720px;
          border-collapse: collapse;
          margin-top: 12px;
        }

        th,
        td {
          padding: 12px;
          border-bottom: 1px solid rgba(23, 32, 51, 0.1);
          text-align: left;
          vertical-align: top;
        }

        th {
          background: #f4f8f5;
          color: #415249;
          font-size: 0.86rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .caseBlock {
          margin-top: 24px;
        }

        .error {
          color: #a33a2f;
          font-weight: 700;
        }

        p {
          color: #4c5b52;
          line-height: 1.7;
        }

        a {
          color: #2f7556;
          font-weight: 800;
        }

        .reportCard {
          margin-bottom: 20px;
        }

        @media (max-width: 780px) {
          .page {
            padding: 28px 14px;
          }

          .topbar,
          .grid {
            display: block;
          }

          .language {
            margin-top: 14px;
          }

          .summary {
            grid-template-columns: 1fr;
          }

          .playerRow {
            grid-template-columns: 1fr;
          }

          .compactNumberControl {
            grid-template-columns: 44px minmax(0, 1fr) 44px;
          }
        }
      `}</style>
    </main>
  );
}