type MLPrediction = {
  risk_probability: number;
  business_decision: "Auto-Approve" | "Manual Review" | "Auto-Reject";
  key_factors: string[];
};

export async function fetchRiskPrediction(features: {
  annualIncome: number;
  employmentLengthMonths: number;
  debtToIncomeRatio: number;
  creditScore: number;
}): Promise<MLPrediction | null> {
  const url = process.env.ML_SERVICE_URL;
  if (!url) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${url}/predict-risk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(features),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    return (await res.json()) as MLPrediction;
  } catch {
    return null;
  }
}
