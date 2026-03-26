import { useState } from "react";
import { runSmartWorkflow } from "./api";
import type { HistoryItem, ModePreference, ResponseMode, ToneOption } from "./types";

const HISTORY_LIMIT = 10;
const LOADING_STEPS = ["Thinking...", "Analyzing context...", "Generating response..."];
const MIN_LOADING_MS = 1200;

interface ExecuteOptions {
  context?: string;
  question?: string;
  modePreference?: ModePreference;
  tone?: ToneOption;
}

function nowLabel(): string {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeOutput(raw: string): string {
  const clean = raw.trim();
  if (clean) return clean;
  throw new Error("Model returned an empty response.");
}

function toUserFacingError(error: unknown): string {
  const raw =
    error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown error";
  const text = raw.toLowerCase();

  if (text.includes("quota") || text.includes("resource_exhausted") || text.includes("429")) {
    return "AI quota is exhausted. Retry later or switch to a key/project with available quota.";
  }
  if (text.includes("network") || text.includes("timeout")) {
    return "Network issue while contacting the AI service. Check backend/API connectivity.";
  }

  return raw;
}

export function useAssistantState() {
  const [contextInput, setContextInput] = useState("");
  const [questionInput, setQuestionInput] = useState("");
  const [modePreference, setModePreference] = useState<ModePreference>("auto");
  const [tone, setTone] = useState<ToneOption>("formal");

  const [output, setOutput] = useState("");
  const [outputMode, setOutputMode] = useState<ResponseMode>("summary");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingText, setLoadingText] = useState(LOADING_STEPS[0]);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const canGenerate = contextInput.trim().length > 0 && !isLoading;

  function clearInputs() {
    setContextInput("");
    setQuestionInput("");
  }

  function clearHistory() {
    setHistory([]);
  }

  function clearWorkspace() {
    clearInputs();
    setOutput("");
    setOutputMode("summary");
  }

  function addHistory(item: Omit<HistoryItem, "id" | "createdAt">) {
    const next: HistoryItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: nowLabel(),
      ...item,
    };
    setHistory((current) => [next, ...current].slice(0, HISTORY_LIMIT));
  }

  async function execute(options?: ExecuteOptions) {
    const context = (options?.context ?? contextInput).trim();
    const question = (options?.question ?? questionInput).trim();
    const selectedMode = options?.modePreference ?? modePreference;
    const selectedTone = options?.tone ?? tone;
    if (!context) return;

    setIsLoading(true);
    setLoadingText(LOADING_STEPS[0]);
    const startedAt = Date.now();

    let loadingStep = 0;
    const timer = window.setInterval(() => {
      loadingStep = (loadingStep + 1) % LOADING_STEPS.length;
      setLoadingText(LOADING_STEPS[loadingStep]);
    }, 800);

    try {
      const result = await runSmartWorkflow({
        context,
        question,
        modePreference: selectedMode,
        tone: selectedTone,
      });

      const elapsed = Date.now() - startedAt;
      if (elapsed < MIN_LOADING_MS) {
        await new Promise((resolve) => window.setTimeout(resolve, MIN_LOADING_MS - elapsed));
      }

      const finalMode = result.mode;
      const finalOutput = normalizeOutput(result.output);

      setOutput(finalOutput);
      setOutputMode(finalMode);

      addHistory({
        context,
        question: question || undefined,
        output: finalOutput,
        mode: finalMode,
        tone: selectedTone,
      });
    } catch (error) {
      console.error("Generation failed", error);
      const failureOutput = [
        "Unable to generate a live AI response.",
        "",
        `Reason: ${toUserFacingError(error)}`,
      ].join("\n");

      setOutput(failureOutput);
      setOutputMode("summary");
    } finally {
      window.clearInterval(timer);
      setIsLoading(false);
      setLoadingText(LOADING_STEPS[0]);
    }
  }

  async function runExampleInput() {
    const exampleContext = [
      "Track-1 project daily update:",
      "The team launched a new AI workspace prototype.",
      "Generate API is stable, while summarize and ask routes are still inconsistent.",
      "Goal is to present a polished demo to stakeholders tomorrow.",
    ].join(" ");
    const exampleQuestion = "What should we prioritize before the stakeholder demo?";

    setContextInput(exampleContext);
    setQuestionInput(exampleQuestion);
    setTone("formal");
    setModePreference("auto");

    await execute({
      context: exampleContext,
      question: exampleQuestion,
      modePreference: "auto",
      tone: "formal",
    });
  }

  function useHistoryItem(item: HistoryItem) {
    setContextInput(item.context);
    setQuestionInput(item.question ?? "");
    setOutput(item.output);
    setOutputMode(item.mode);
    setTone(item.tone);
    setModePreference(item.mode === "key_points" ? "key_points" : "auto");
  }

  return {
    contextInput,
    setContextInput,
    questionInput,
    setQuestionInput,
    modePreference,
    setModePreference,
    tone,
    setTone,
    output,
    outputMode,
    isLoading,
    loadingText,
    history,
    canGenerate,
    execute,
    clearInputs,
    clearWorkspace,
    clearHistory,
    useHistoryItem,
    runExampleInput,
  };
}
