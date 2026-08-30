import type { ReactNode } from "react";

type EmptyStateProps = {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
};

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex-1 rounded-2xl border border-zinc-200 bg-white shadow-sm flex flex-col items-center justify-center p-12">
      {icon && (
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-linear-to-br from-zinc-900 to-zinc-700 shadow-sm animate-bounce-slow">
          {icon}
        </div>
      )}
      <h2 className="mt-6 text-3xl font-black text-zinc-950">{title}</h2>
      <p className="mt-1.5 text-xl text-zinc-500">{description}</p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-5 rounded-xl bg-black px-8 py-3.5 text-lg font-bold text-white hover:bg-zinc-800 hover:scale-[1.02] active:scale-95 tap-target touch-feedback gpu"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
