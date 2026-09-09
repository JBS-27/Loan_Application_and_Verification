"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Brain,
  Sparkles,
  Loader2,
  Info,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LoanForRisk {
  status: string;
  aiRiskScore?: number;
  aiRecommendation?: "Auto-Approve" | "Manual Review" | "Auto-Reject";
  aiExplanations?: string[];
  aiAssessedAt?: string;
}

interface RiskAssessmentCardProps {
  loan: LoanForRisk;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/** Map recommendation → colour tokens */
const palette = {
  "Auto-Approve": {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    ring: "ring-emerald-100",
    text: "text-emerald-700",
    icon: ShieldCheck,
    barColor: "bg-emerald-500",
    gradientFrom: "from-emerald-50",
    gradientTo: "to-teal-50",
    badgeBg: "bg-emerald-100",
    badgeText: "text-emerald-800",
    iconBg: "bg-emerald-100",
    label: "Auto-Approve",
    subtitle: "Low risk — eligible for automated approval",
  },
  "Manual Review": {
    bg: "bg-amber-50",
    border: "border-amber-200",
    ring: "ring-amber-100",
    text: "text-amber-700",
    icon: ShieldAlert,
    barColor: "bg-amber-500",
    gradientFrom: "from-amber-50",
    gradientTo: "to-yellow-50",
    badgeBg: "bg-amber-100",
    badgeText: "text-amber-800",
    iconBg: "bg-amber-100",
    label: "Manual Review",
    subtitle: "Moderate risk — requires human verification",
  },
  "Auto-Reject": {
    bg: "bg-red-50",
    border: "border-red-200",
    ring: "ring-red-100",
    text: "text-red-700",
    icon: ShieldX,
    barColor: "bg-red-500",
    gradientFrom: "from-red-50",
    gradientTo: "to-rose-50",
    badgeBg: "bg-red-100",
    badgeText: "text-red-800",
    iconBg: "bg-red-100",
    label: "Auto-Reject",
    subtitle: "High risk — recommended for automatic rejection",
  },
} as const;

/** Determine progress-bar colour from risk score */
function scoreBarColor(score: number): string {
  if (score <= 0.3) return "bg-emerald-500";
  if (score <= 0.6) return "bg-amber-500";
  return "bg-red-500";
}

function scoreTrackColor(score: number): string {
  if (score <= 0.3) return "bg-emerald-100";
  if (score <= 0.6) return "bg-amber-100";
  return "bg-red-100";
}

function scoreLabelColor(score: number): string {
  if (score <= 0.3) return "text-emerald-700";
  if (score <= 0.6) return "text-amber-700";
  return "text-red-700";
}

function riskLabel(score: number): string {
  if (score <= 0.3) return "Low Risk";
  if (score <= 0.6) return "Moderate Risk";
  return "High Risk";
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function RiskAssessmentCard({ loan }: RiskAssessmentCardProps) {
  /* ── Fallback: ML not yet assessed ─────────────────────────── */
  if (
    loan.status === "Pending ML Assessment" ||
    loan.aiRiskScore === undefined ||
    loan.aiRiskScore === null
  ) {
    return (
      <Card className="shadow-lg border-gray-200/50 overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-100 pb-4">
          <CardTitle className="text-lg font-bold flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-500" />
            AI Risk Assessment
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="relative mb-4">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-100 border-2 border-white flex items-center justify-center">
                <Info className="w-3.5 h-3.5 text-amber-600" />
              </div>
            </div>
            <p className="font-semibold text-white text-base mb-1">
              AI Assessment Pending
            </p>
            <p className="text-sm text-white-300 max-w-xs leading-relaxed">
              Microservice Unreachable — The risk engine has not yet scored this
              application. It will be assessed automatically when the service
              recovers.
            </p>
            <div className="mt-5 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-xs font-medium text-slate-600">
                Waiting for ML microservice
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  /* ── Happy path: AI assessment available ────────────────────── */
  const recommendation = loan.aiRecommendation ?? "Manual Review";
  const p = palette[recommendation];
  const Icon = p.icon;
  const pct = Math.round(loan.aiRiskScore * 100);

  return (
    <Card
      className={`shadow-xl overflow-hidden border ${p.border} ring-1 ${p.ring}`}
    >
      {/* ── Header: Decision Banner ─────────────────────────────── */}
      <CardHeader
        className={`bg-gradient-to-r ${p.gradientFrom} ${p.gradientTo} border-b ${p.border} pb-4`}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2 text-white">
            <Brain className="w-5 h-5 text-indigo-500" />
            AI Risk Assessment
          </CardTitle>
          {loan.aiAssessedAt && (
            <span className="text-[11px] font-medium text-gray-400">
              {new Date(loan.aiAssessedAt).toLocaleString()}
            </span>
          )}
        </div>

        {/* Decision badge */}
        <div className="mt-4 flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-xl ${p.iconBg} flex items-center justify-center shadow-sm`}
          >
            <Icon className={`w-6 h-6 ${p.text}`} />
          </div>
          <div>
            <span
              className={`inline-block text-sm font-bold px-3 py-1 rounded-full ${p.badgeBg} ${p.badgeText} tracking-wide`}
            >
              {p.label}
            </span>
            <p className="text-xs text-white-300 mt-1 ml-0.5">{p.subtitle}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-6 space-y-6">
        {/* ── Risk Score Progress Bar ───────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-white-200">
              Default Probability
            </span>
            <span className={`text-sm font-black ${scoreLabelColor(loan.aiRiskScore)}`}>
              {pct}% — {riskLabel(loan.aiRiskScore)}
            </span>
          </div>

          <div className={`w-full h-3 rounded-full ${scoreTrackColor(loan.aiRiskScore)} overflow-hidden`}>
            <div
              className={`h-full rounded-full ${scoreBarColor(loan.aiRiskScore)} transition-all duration-700 ease-out`}
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Tick marks */}
          <div className="flex justify-between mt-1.5 px-0.5">
            <span className="text-[10px] font-medium text-gray-400">0%</span>
            <span className="text-[10px] font-medium text-gray-400">30%</span>
            <span className="text-[10px] font-medium text-gray-400">60%</span>
            <span className="text-[10px] font-medium text-gray-400">100%</span>
          </div>
        </div>

        {/* ── SHAP Explanations ─────────────────────────────────── */}
        {loan.aiExplanations && loan.aiExplanations.length > 0 && (
          <div>
            <h4 className="text-sm font-bold text-white-100 mb-3 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              Key Risk Factors
            </h4>

            <ul className="space-y-2">
              {loan.aiExplanations.map((explanation, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-sm text-white-200 leading-relaxed hover:bg-gray-100/70 transition-colors"
                >
                  <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                    {idx + 1}
                  </span>
                  <span>{explanation}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Footer note ──────────────────────────────────────── */}
        <div className="bg-blue-50/60 border border-blue-100 rounded-lg px-4 py-3">
          <p className="text-xs font-medium text-blue-700 leading-relaxed">
            <span className="font-bold">Note:</span> This assessment is
            generated by a machine-learning model and should be used as a
            decision-support tool only. Final approval authority rests with
            the reviewing officer.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
