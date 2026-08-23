import Link from "next/link";
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md";

const variants: Record<ButtonVariant, string> = {
  primary: "border-admin-primary bg-admin-primary text-white hover:bg-admin-primary-hover",
  secondary:
    "border-admin-line-strong bg-admin-surface text-admin-body hover:bg-admin-hover",
  danger: "border-admin-danger bg-admin-danger text-white hover:bg-admin-danger/90",
  ghost: "border-transparent bg-transparent text-admin-muted hover:bg-admin-hover hover:text-admin-heading",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 py-1.5 text-sm",
  md: "min-h-10 px-4 py-2 text-sm",
};

export function buttonClassName({
  variant = "primary",
  size = "md",
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return `inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-admin-focus focus-visible:ring-offset-2 focus-visible:ring-offset-admin-surface disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    icon,
    className = "",
    children,
    type = "button",
    ...props
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClassName({ variant, size, className })}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
});

interface ButtonLinkProps {
  href: string;
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  className?: string;
  "aria-label"?: string;
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  size = "md",
  icon,
  className = "",
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={buttonClassName({ variant, size, className })}
      {...props}
    >
      {icon}
      {children}
    </Link>
  );
}
