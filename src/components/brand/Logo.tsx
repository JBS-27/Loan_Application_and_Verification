import { cn } from "@/lib/utils";

export function Logo({
  className,
  markOnly = false,
  light = false,
}: {
  className?: string;
  markOnly?: boolean;
  light?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex size-8 items-center justify-center rounded-lg text-sm font-semibold tracking-tight",
          light ? "bg-white/10 text-white" : "bg-primary text-primary-foreground"
        )}
        aria-hidden
      >
        LF
      </span>
      {!markOnly && (
        <span className={cn("text-base font-semibold tracking-tight", light ? "text-white" : "text-foreground")}>
          LendFlow
        </span>
      )}
    </div>
  );
}
