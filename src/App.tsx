import { useEffect, useRef, useState } from "react";
import Header from "./Header";
import InputPanel from "./InputPanel";
import OutputPanel from "./OutputPanel";
import { useAssistantState } from "./index";

function App() {
  const {
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
    execute,
    clearInputs,
    clearWorkspace,
    clearHistory,
    useHistoryItem,
    runExampleInput,
  } = useAssistantState();

  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const outputSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (copyState === "idle") return undefined;
    const timeout = window.setTimeout(() => setCopyState("idle"), 1800);
    return () => window.clearTimeout(timeout);
  }, [copyState]);

  useEffect(() => {
    setCopyState("idle");
  }, [output]);

  useEffect(() => {
    if (!output || isLoading) return;
    outputSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [output, isLoading]);

  async function handleCopy() {
    if (!output || isLoading) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopyState("copied");
    } catch (error) {
      console.error("Failed to copy output", error);
      setCopyState("failed");
    }
  }

  function handleReset() {
    clearWorkspace();
    setCopyState("idle");
  }

  return (
    <div className="relative min-h-screen overflow-hidden px-4 py-4 sm:px-6 lg:px-8">
      <div className="hero-glow hero-glow-left" aria-hidden />
      <div className="hero-glow hero-glow-right" aria-hidden />

      <main className="relative mx-auto max-w-6xl pb-8">
        <Header isLoading={isLoading} />

        <div className="grid gap-7 lg:grid-cols-[1.2fr_0.8fr]">
          <InputPanel
            contextInput={contextInput}
            questionInput={questionInput}
            modePreference={modePreference}
            tone={tone}
            isLoading={isLoading}
            onContextChange={setContextInput}
            onQuestionChange={setQuestionInput}
            onModePreferenceChange={setModePreference}
            onToneChange={setTone}
            onGenerate={() => void execute()}
            onClearInputs={clearInputs}
            onExampleInput={() => void runExampleInput()}
          />

          <div ref={outputSectionRef}>
            <OutputPanel
              output={output}
              outputMode={outputMode}
              isLoading={isLoading}
              loadingText={loadingText}
              copyState={copyState}
              history={history}
              onCopy={() => void handleCopy()}
              onReset={handleReset}
              onUseHistory={useHistoryItem}
              onClearHistory={clearHistory}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
