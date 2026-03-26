interface HeaderProps {
  isLoading: boolean;
}

function Header({ isLoading }: HeaderProps) {
  return (
    <header className="panel-surface sticky top-4 z-20 mb-6 rounded-2xl px-4 py-4 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Track-1
          </p>
          <h1 className="text-xl font-semibold text-slate-900">Gen AI Workspace</h1>
          <p className="text-sm text-slate-600">Paste context, optionally ask a question, and generate.</p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">
          <span
            title="Automatically adapts between Summary, Q&A, and Key Points."
            className="cursor-help"
          >
            {"\u26A1 Smart Mode"}
          </span>
          {isLoading && <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />}
        </div>
      </div>
    </header>
  );
}

export default Header;
