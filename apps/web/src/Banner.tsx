type BannerVariant = "info" | "warning" | "error" | "success";

type BannerProps = {
  variant?: BannerVariant;
  children: React.ReactNode;
  onDismiss?: () => void;
  testId?: string;
};

const variantClasses: Record<BannerVariant, string> = {
  info: "border-sky-400/30 bg-sky-950/40 text-sky-100",
  warning: "border-amber-400/30 bg-amber-950/40 text-amber-100",
  error: "border-rose-400/30 bg-rose-950/40 text-rose-100",
  success: "border-emerald-400/30 bg-emerald-950/40 text-emerald-100",
};

export function Banner({
  variant = "info",
  children,
  onDismiss,
  testId,
}: BannerProps) {
  return (
    <div
      data-testid={testId}
      role={variant === "error" ? "alert" : "status"}
      className={`flex items-start justify-between gap-3 border-b px-4 py-2 text-sm ${variantClasses[variant]}`}
    >
      <div className="min-w-0 flex-1">{children}</div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded px-2 py-0.5 text-xs text-white/70 hover:bg-white/10"
          aria-label="Dismiss"
        >
          Dismiss
        </button>
      ) : null}
    </div>
  );
}
