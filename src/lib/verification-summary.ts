import type { CheckResult } from "./types";

export function categorySummary(checks: { category: string; result: CheckResult }[]) {
  const categories = ["Identity", "Contact", "Financial", "Documents", "Consistency"] as const;
  return categories.map((category) => {
    const items = checks.filter((check) => check.category === category);
    const failed = items.some((item) => item.result === "FAIL");
    const warning = items.some((item) => item.result === "WARNING");
    const pending = items.some((item) => item.result === "PENDING");
    const result: CheckResult = failed
      ? "FAIL"
      : warning
        ? "WARNING"
        : pending || items.length === 0
          ? "PENDING"
          : "PASS";
    return { category, result };
  });
}
