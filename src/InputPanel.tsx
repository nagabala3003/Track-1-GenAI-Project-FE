import type { ModePreference, ToneOption } from "./types";

interface InputPanelProps {
  contextInput: string;
  questionInput: string;
  modePreference: ModePreference;
  tone: ToneOption;
  isLoading: boolean;
  onContextChange: (value: string) => void;
  onQuestionChange: (value: string) => void;
  onModePreferenceChange: (value: ModePreference) => void;
  onToneChange: (value: ToneOption) => void;
  onGenerate: () => void;
  onClearInputs: () => void;
  onExampleInput: () => void;
}

function InputPanel({
  contextInput,
  questionInput,
  modePreference,
  tone,
  isLoading,
  onContextChange,
  onQuestionChange,
  onModePreferenceChange,
  onToneChange,
  onGenerate,
  onClearInputs,
  onExampleInput,
}: InputPanelProps) {
  const canGenerate = contextInput.trim().length > 0 && !isLoading;

  const flowLabel =
    modePreference === "key_points"
      ? "Key Points mode is active."
      : questionInput.trim()
        ? "Q&A mode is active."
        : "Summary mode is active.";

  return (
    <section className="panel-surface rounded-3xl p-5 sm:p-7">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Input</h2>
          <p className="mt-1 text-sm text-slate-600">{flowLabel}</p>
        </div>
        <button
          type="button"
          onClick={onExampleInput}
          disabled={isLoading}
          className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Example Input
        </button>
      </div>

      <div className="space-y-4">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Context
          </span>
          <textarea
            value={contextInput}
            onChange={(event) => onContextChange(event.target.value)}
            rows={10}
            className="h-64 w-full resize-y rounded-2xl border border-slate-300 bg-white px-4 py-4 text-sm leading-relaxed text-slate-900 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
            placeholder="Paste your content and optionally ask a question"
          />
        </label>

        {!contextInput.trim() && (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white/70 px-3 py-2 text-sm text-slate-500">
            Paste your content and optionally ask a question.
          </p>
        )}

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Optional Question
          </span>
          <input
            type="text"
            value={questionInput}
            onChange={(event) => onQuestionChange(event.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
            placeholder="Ask a specific question for Q&A mode"
          />
        </label>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Response Focus
          </span>
          <select
            value={modePreference}
            onChange={(event) => onModePreferenceChange(event.target.value as ModePreference)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
          >
            <option value="auto">Auto (Summary / Q&A)</option>
            <option value="key_points">Key Points</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            Tone
          </span>
          <select
            value={tone}
            onChange={(event) => onToneChange(event.target.value as ToneOption)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
          >
            <option value="formal">Formal</option>
            <option value="casual">Casual</option>
          </select>
        </label>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onGenerate}
          disabled={!canGenerate}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <span className="spinner" />
              Generating response...
            </>
          ) : (
            "\u2728 Generate Response"
          )}
        </button>
        <button
          type="button"
          onClick={onClearInputs}
          disabled={isLoading}
          className="ml-auto rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Clear
        </button>
      </div>
    </section>
  );
}

export default InputPanel;

