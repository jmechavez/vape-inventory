import type { ReactNode } from "react";

type PageHeaderProps = {
  label: string;
  title: string;
  description: string;
  actions?: ReactNode;
};

export function PageHeader({ label, title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 shrink-0">
      <div>
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-zinc-500">
          {label}
        </p>
        <h1 className="mt-1.5 text-4xl font-black tracking-tight text-zinc-950 sm:text-5xl">
          {title}
        </h1>
        <p className="mt-1.5 text-xl text-zinc-500">{description}</p>
      </div>
      {actions && (
        <div className="flex flex-wrap gap-3 items-center">
          {actions}
        </div>
      )}
    </header>
  );
}
