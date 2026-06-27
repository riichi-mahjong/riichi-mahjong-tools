"use client";

 

/* eslint-disable react-hooks/set-state-in-effect */

import Link from "next/link";
import { useEffect, useState } from "react";

type Locale = "ja" | "en";

const LANGUAGE_STORAGE_KEY = "riichi-mahjong-tools-language";
const GITHUB_URL = "https://github.com/riichi-mahjong/riichi-mahjong-tools";

const TEXT = {
  en: {
    languageButton: "日本語",
    title: "Riichi Mahjong Tools",
    description:
      "Public web tools for riichi mahjong calculation and analysis.",
    toolsTitle: "Tools",
    rankSimulatorTitle: "Mahjong Soul Rank Simulator v0.1",
    rankSimulatorDescription:
      "Estimate Mahjong Soul rank progression using game type, room placement distribution, G/L per round, and rank-point rules.",
    tsumoTitle: "Tsumo Win Probability Calculator v0.1",
    tsumoDescription:
      "Estimate single-riichi tsumo probability and multiple-riichi outcomes.",
    openTool: "Open tool",
    notesTitle: "Notes",
    notesText:
      "These tools are under development. Please report bugs or calculation issues through GitHub.",
    githubLink: "GitHub / Issues / Pull requests",
    githubDescription:
      "Pull requests, bug reports, and improvement suggestions are welcome.",
  },
  ja: {
    languageButton: "English",
    title: "Riichi Mahjong Tools",
    description: "リーチ麻雀の計算・分析用Webツール集です。",
    toolsTitle: "ツール",
    rankSimulatorTitle: "雀魂段位シミュレーター v0.1",
    rankSimulatorDescription:
      "ゲーム形式、部屋ごとの順位分布、局収支、段位ptルールを使って、雀魂の段位推移をシミュレーションします。",
    tsumoTitle: "ツモ率計算ツール v0.1",
    tsumoDescription:
      "一人リーチ時のツモ率と、複数リーチ時の和了・ツモ・ロン和了・放銃・流局率を計算します。",
    openTool: "ツールを開く",
    notesTitle: "注意点",
    notesText:
      "これらのツールは開発中です。不具合や計算ミスがあればGitHubで報告してください。",
    githubLink: "GitHub・不具合報告・Pull Request",
    githubDescription: "Pull Request、不具合報告、改善提案はこちら。",
  },
} as const;

const TOOLS = [
  {
    key: "rank-simulator",
    href: "/tools/rank-simulator/",
    titleKey: "rankSimulatorTitle",
    descriptionKey: "rankSimulatorDescription",
  },
  {
    key: "tsumo",
    href: "/tools/tsumo/",
    titleKey: "tsumoTitle",
    descriptionKey: "tsumoDescription",
  },
] as const;

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
  const [hasLoadedLocale, setHasLoadedLocale] = useState(false);
  const text = TEXT[locale];

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

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-8 text-neutral-100">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="space-y-4">
          <div className="flex justify-end">
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
          <h2 className="mb-5 text-xl font-semibold">{text.toolsTitle}</h2>

          <div className="grid gap-4 md:grid-cols-2">
            {TOOLS.map((tool) => (
              <article
                key={tool.key}
                className="rounded-2xl border border-neutral-800 bg-neutral-950 p-5"
              >
                <h3 className="text-lg font-semibold">
                  {text[tool.titleKey]}
                </h3>
                <p className="mt-3 text-sm leading-6 text-neutral-300">
                  {text[tool.descriptionKey]}
                </p>
                <Link
                  className="mt-5 inline-block rounded-lg border border-neutral-700 px-4 py-2 text-sm font-medium text-neutral-100 hover:bg-neutral-800"
                  href={tool.href}
                >
                  {text.openTool}
                </Link>
              </article>
            ))}
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
