import { useEffect, useMemo, useState } from "react";
import EmptyState from "./EmptyState";
import type { HistoryItem, ResponseMode } from "./types";

interface OutputPanelProps {
  output: string;
  outputMode: ResponseMode;
  isLoading: boolean;
  loadingText: string;
  copyState: "idle" | "copied" | "failed";
  history: HistoryItem[];
  onCopy: () => void;
  onReset: () => void;
  onUseHistory: (item: HistoryItem) => void;
  onClearHistory: () => void;
}

function OutputPanel({
  output,
  outputMode,
  isLoading,
  loadingText,
  copyState,
  history,
  onCopy,
  onReset,
  onUseHistory,
  onClearHistory,
}: OutputPanelProps) {
  const [typedOutput, setTypedOutput] = useState("");

  useEffect(() => {
    if (isLoading || !output) {
      setTypedOutput("");
      return undefined;
    }

    let index = 0;
    const chunk = Math.max(4, Math.floor(output.length / 100));
    const timer = window.setInterval(() => {
      index = Math.min(output.length, index + chunk);
      setTypedOutput(output.slice(0, index));
      if (index >= output.length) {
        window.clearInterval(timer);
      }
    }, 12);

    return () => window.clearInterval(timer);
  }, [isLoading, output]);

  const formatted = useMemo(
    () => formatOutput(typedOutput || output, outputMode),
    [typedOutput, output, outputMode],
  );

  return (
    <section className="panel-surface rounded-3xl p-5 sm:p-7">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Output</h2>
          <p
            title="Automatically adapts between Summary, Q&A, and Key Points."
            className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500"
          >
            {"\u26A1 Smart Mode"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCopy}
            disabled={!output || isLoading}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy"}
          </button>
          <button
            type="button"
            onClick={onReset}
            disabled={isLoading}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reset
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-2">
            <span className="spinner" />
            <p className="text-sm font-semibold text-slate-700">{loadingText}</p>
          </div>
          <div className="loading-line h-3 w-11/12 rounded-full" />
          <div className="loading-line h-3 w-10/12 rounded-full" />
          <div className="loading-line h-3 w-9/12 rounded-full" />
          <div className="loading-line h-3 w-8/12 rounded-full" />
        </div>
      ) : output ? (
        <div className="max-h-[420px] space-y-5 overflow-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          {outputMode !== "key_points" && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-700">
                {formatted.primaryHeading}
              </h3>
              <div className="mt-2 h-px w-full bg-slate-200" />
              <div className="mt-3 space-y-3 text-sm leading-7 text-slate-800">
                {formatted.paragraphs.map((paragraph, index) => (
                  <p key={`${paragraph}-${index}`}>{paragraph}</p>
                ))}
              </div>
            </div>
          )}

          {formatted.keyPoints.length > 0 && (
            <div>
              {outputMode !== "key_points" && (
                <>
                  <h4 className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-700">
                    Key Points
                  </h4>
                  <div className="mt-2 h-px w-full bg-slate-200" />
                </>
              )}
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-800">
                {formatted.keyPoints.map((point, index) => (
                  <li key={`${point}-${index}`}>{point}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <EmptyState
            title="No output yet"
            description="Your AI-generated response will appear here."
          />
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
            Example output:
            <br />
            Summary: Your content is condensed with key decisions and action points.
          </div>
        </div>
      )}

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Recent history</h3>
          <button
            type="button"
            onClick={onClearHistory}
            disabled={history.length === 0}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Clear history
          </button>
        </div>

        {history.length === 0 ? (
          <p className="text-sm text-slate-500">History will appear after your first run.</p>
        ) : (
          <div className="space-y-2">
            {history.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onUseHistory(item)}
                className="w-full rounded-xl border border-slate-200 bg-white p-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    {displayMode(item.mode)}
                  </span>
                  <span className="text-xs text-slate-500">{item.createdAt}</span>
                </div>
                <p className="text-sm text-slate-700">
                  {item.output.length > 180 ? `${item.output.slice(0, 180)}...` : item.output}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default OutputPanel;

function displayMode(mode: ResponseMode): string {
  if (mode === "qa") return "Q&A";
  if (mode === "key_points") return "Key Points";
  return "Summary";
}

function formatOutput(rawText: string, mode: ResponseMode) {
  const text = normalizeMarkdown(rawText).trim();
  if (!text) {
    return {
      primaryHeading: displayMode(mode),
      paragraphs: [],
      keyPoints: [] as string[],
    };
  }

  if (isErrorOutput(text)) {
    return {
      primaryHeading: "Status",
      paragraphs: text
        .split("\n")
        .map((line) => cleanLine(line))
        .filter(Boolean),
      keyPoints: [] as string[],
    };
  }

  if (mode === "key_points") {
    const keyPoints = extractCompactKeyPoints(text, 5);
    return {
      primaryHeading: "Key Points",
      paragraphs: [],
      keyPoints,
    };
  }

  const normalizedLines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const keyPoints: string[] = [];
  const paragraphLines: string[] = [];
  let insideKeyPoints = false;
  const seenPointKeys = new Set<string>();

  for (const line of normalizedLines) {
    if (isKeyHeading(line)) {
      insideKeyPoints = true;
      continue;
    }

    if (isPrimaryHeading(line)) {
      insideKeyPoints = false;
      continue;
    }

    const bulletMatch = line.match(/^(?:[-*\u2022])\s+(.*)$/) ?? line.match(/^\d+\.\s+(.*)$/);
    if (bulletMatch) {
      const cleaned = cleanLine(bulletMatch[1]);
      const key = normalizeIdea(cleaned);
      if (cleaned && !seenPointKeys.has(key)) {
        seenPointKeys.add(key);
        keyPoints.push(cleaned);
      }
      continue;
    }

    if (insideKeyPoints) {
      const cleaned = cleanLine(line);
      const key = normalizeIdea(cleaned);
      if (cleaned && !seenPointKeys.has(key)) {
        seenPointKeys.add(key);
        keyPoints.push(cleaned);
      }
      continue;
    }

    if (!isPrimaryHeading(line)) {
      paragraphLines.push(cleanLine(line));
    }
  }

  const paragraphs =
    paragraphLines.length > 0
      ? paragraphLines
      : text
          .split(/\n{2,}/)
          .map((paragraph) => cleanLine(paragraph))
          .filter(Boolean);

  if (keyPoints.length === 0 && paragraphs.length > 0) {
    const derived = paragraphs
      .join(" ")
      .split(/[.!?]\s+/)
      .map((sentence) => sentence.trim())
      .filter(Boolean)
      .slice(0, 4);
    keyPoints.push(...derived);
  }

  return {
    primaryHeading: displayMode(mode),
    paragraphs,
    keyPoints,
  };
}

function extractCompactKeyPoints(text: string, limit: number): string[] {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const candidates: string[] = [];
  for (const line of lines) {
    if (isKeyHeading(line) || isPrimaryHeading(line)) continue;
    const bulletMatch = line.match(/^(?:[-*\u2022])\s+(.*)$/) ?? line.match(/^\d+\.\s+(.*)$/);
    candidates.push(cleanLine(bulletMatch ? bulletMatch[1] : line));
  }

  if (candidates.length === 0) {
    candidates.push(
      ...text
        .split(/[.!?]\s+/)
        .map((part) => cleanLine(part))
        .filter(Boolean),
    );
  }

  const keyPoints: string[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    if (looksLikeIntro(candidate)) continue;
    const compact = limitWords(candidate, 14).replace(/[.!?]+$/, "");
    if (!compact) continue;
    const key = normalizeIdea(compact);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    keyPoints.push(`${compact}.`);
    if (keyPoints.length >= limit) break;
  }

  return keyPoints;
}

function normalizeMarkdown(input: string): string {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}

function cleanLine(line: string): string {
  return line
    .replace(/^\s*[-*]\s+/, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

function isPrimaryHeading(line: string): boolean {
  return /^(summary|quick summary|overview|answer|direct answer|response)\s*:?\s*$/i.test(
    line.trim(),
  );
}

function isKeyHeading(line: string): boolean {
  return /^(key points?|highlights|main takeaways?)\s*:?\s*$/i.test(line.trim());
}

function normalizeIdea(line: string): string {
  return line
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeIntro(line: string): boolean {
  return /^(based on|from the|here (are|is)|the context|considering|analyzing|in summary)/i.test(
    line.trim(),
  );
}

function limitWords(text: string, maxWords: number): string {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  return words.slice(0, maxWords).join(" ");
}

function isErrorOutput(text: string): boolean {
  const compact = text.toLowerCase();
  return (
    compact.includes("unable to generate a live ai response") ||
    compact.includes("reason: ai quota is exhausted") ||
    compact.includes("reason: network issue while contacting the ai service")
  );
}
