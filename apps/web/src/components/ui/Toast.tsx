import { useEffect, useState } from "react";

type ToastProps = {
  message: string;
  type?: "success" | "error" | "info";
  duration?: number;
  onDismiss?: () => void;
};

export function Toast({
  message,
  type = "success",
  duration = 3500,
  onDismiss,
}: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (onDismiss) {
        setTimeout(onDismiss, 300);
      }
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  if (!visible) return null;

  const styles = {
    success: "border-emerald-500 bg-emerald-50",
    error: "border-red-500 bg-red-50",
    info: "border-blue-500 bg-blue-50",
  };

  const iconStyles = {
    success: "text-emerald-600",
    error: "text-red-600",
    info: "text-blue-600",
  };

  return (
    <div
      className={`
        fixed bottom-6 right-6 z-[300] max-w-md w-full
        rounded-2xl border-l-8 shadow-lg p-5
        animate-slide-up
        ${styles[type]}
      `}
      role="alert"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className={`text-2xl ${iconStyles[type]}`}>
            {type === "success" && "✅"}
            {type === "error" && "❌"}
            {type === "info" && "ℹ️"}
          </span>
          <p className="text-lg font-bold text-zinc-900 leading-tight">
            {message}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setVisible(false);
            if (onDismiss) setTimeout(onDismiss, 300);
          }}
          className="min-h-[36px] min-w-[36px] flex items-center justify-center text-xl text-zinc-400 hover:text-zinc-600 transition shrink-0"
          aria-label="Dismiss notification"
        >
          ×
        </button>
      </div>
    </div>
  );
}
