import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/** Button variants and sizes, per docs/04_UI_UX_Design_Brief.md. */
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-[var(--radius-control)] font-medium whitespace-nowrap transition-all active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary: "bg-brand-600 text-white hover:bg-brand-700",
        secondary:
          "border border-line bg-surface text-ink-secondary hover:bg-surface-hover hover:text-ink",
        ghost: "text-ink-secondary hover:bg-surface-hover hover:text-ink",
        danger: "bg-danger text-white hover:bg-red-700",
        dangerGhost: "text-danger hover:bg-danger-bg",
      },
      size: {
        sm: "h-8 px-3 text-label",
        md: "h-10 px-4 text-body",
        lg: "h-11 px-6 text-[15px]",
        icon: "size-8 rounded-[var(--radius-badge)]",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    isLoading?: boolean;
    loadingText?: string;
  };

export function Button({
  className,
  variant,
  size,
  isLoading = false,
  loadingText,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 aria-hidden className="size-4 animate-spin" />
          {loadingText ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}
