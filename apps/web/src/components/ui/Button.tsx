import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: "sm" | "md" | "lg";
  icon?: ReactNode;
  iconPosition?: "left" | "right";
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-black text-white hover:bg-zinc-800 shadow-sm",
  secondary: "border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100 shadow-sm",
  danger: "bg-red-600 text-white hover:bg-red-700 shadow-sm",
  ghost: "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
};

const sizeClasses = {
  sm: "min-h-11 px-4 text-base",
  md: "min-h-13 px-6 text-lg",
  lg: "min-h-16 px-8 text-xl",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  iconPosition = "left",
  className = "",
  disabled = false,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`
        touch-feedback inline-flex items-center justify-center gap-2 rounded-xl font-bold
        transition-all duration-200
        hover:scale-[1.02] active:scale-95
        disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
      disabled={disabled}
      {...props}
    >
      {icon && iconPosition === "left" && icon}
      {children}
      {icon && iconPosition === "right" && icon}
    </button>
  );
}
