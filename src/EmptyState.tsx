interface EmptyStateProps {
  title: string;
  description: string;
}

function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/80 p-8 text-center">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className="mt-2 max-w-md text-sm text-slate-500">{description}</p>
    </div>
  );
}

export default EmptyState;
