import { useState } from "react";

type TooltipProps = {
  children: React.ReactNode;
  text: string;
  position?: "top" | "bottom" | "left" | "right";
};

export function Tooltip({ children, text, position = "top" }: TooltipProps) {
  const [show, setShow] = useState(false);

  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowClasses = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-zinc-900",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-zinc-900",
    left: "left-full top-1/2 -translate-y-1/2 border-l-zinc-900",
    right: "right-full top-1/2 -translate-y-1/2 border-r-zinc-900",
  };

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onTouchStart={() => setShow(true)}
      onTouchEnd={() => setTimeout(() => setShow(false), 1500)}
    >
      {children}
      {show && (
        <div className={`absolute z-50 ${positionClasses[position]} pointer-events-none animate-fade-in`}>
          <div className="px-3 py-1.5 text-sm font-medium text-white bg-zinc-900 rounded-lg whitespace-nowrap shadow-lg">
            {text}
          </div>
          <div className={`absolute w-0 h-0 border-4 border-transparent ${arrowClasses[position]}`} />
        </div>
      )}
    </div>
  );
}
