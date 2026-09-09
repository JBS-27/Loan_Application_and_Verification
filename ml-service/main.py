"""
main.py — FastAPI Loan Default Prediction Microservice
======================================================
Loads a pre-trained XGBoost model + scaler from disk and exposes a
POST /predict-risk endpoint that returns:
  • risk_probability   (float 0–1)
  • business_decision  (Auto-Approve | Manual Review | Auto-Reject)
  • key_factors        (SHAP-based natural-language explanations)

Run:  uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

import joblib
import numpy as np
import shap
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ── logging ─────────────────────────────────────────────────────────
logging.basicConfig(level=logging.INFO, format="%(asctime)s │ %(message)s")
log = logging.getLogger("ml-service")

# ── paths ───────────────────────────────────────────────────────────
ARTIFACT_DIR = Path(__file__).parent / "artifacts"
MODEL_PATH   = ARTIFACT_DIR / "xgb_loan_model.pkl"
SCALER_PATH  = ARTIFACT_DIR / "scaler.pkl"

# ── global singletons (populated at startup) ────────────────────────
model     = None
scaler    = None
explainer = None

FEATURE_ORDER = [
    "annualIncome",
    "employmentLengthMonths",
    "debtToIncomeRatio",
    "creditScore",
]

FEATURE_LABELS = {
    "annualIncome":           "Annual Income",
    "employmentLengthMonths": "Employment Length",
    "debtToIncomeRatio":      "Debt-to-Income Ratio",
    "creditScore":            "Credit Score",
}


# ── lifespan: load once, serve many ─────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    global model, scaler, explainer

    if not MODEL_PATH.exists() or not SCALER_PATH.exists():
        raise RuntimeError(
            f"Model artifacts missing.  Run `python train_model.py` first.\n"
            f"  Expected: {MODEL_PATH}\n  Expected: {SCALER_PATH}"
        )

    model     = joblib.load(MODEL_PATH)
    scaler    = joblib.load(SCALER_PATH)
    explainer = shap.TreeExplainer(model)

    log.info("[OK] Model, scaler, and SHAP explainer loaded")
    yield                       # ← app runs here
    log.info("Shutting down ...")


# ── FastAPI app ──────────────────────────────────────────────────────
app = FastAPI(
    title="LendFlow ML — Risk Prediction Engine",
    version="1.0.0",
    description="XGBoost-powered loan default prediction with SHAP explanations",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── request / response schemas ──────────────────────────────────────
class LoanFeatures(BaseModel):
    annualIncome:           float = Field(..., gt=0,  description="Gross yearly income (USD)")
    employmentLengthMonths: float = Field(..., ge=0,  description="Months at current employer")
    debtToIncomeRatio:      float = Field(..., ge=0,  le=1.0, description="Existing debt / income")
    creditScore:            float = Field(..., ge=300, le=850, description="FICO or equivalent")

    model_config = {"json_schema_extra": {
        "examples": [{
            "annualIncome": 85000,
            "employmentLengthMonths": 48,
            "debtToIncomeRatio": 0.28,
            "creditScore": 720,
        }]
    }}


class RiskPrediction(BaseModel):
    risk_probability:  float
    business_decision: str
    key_factors:       list[str]


# ── business-rule thresholds ─────────────────────────────────────────
APPROVE_THRESHOLD = 0.2
REJECT_THRESHOLD  = 0.7


def _decision(prob: float) -> str:
    if prob < APPROVE_THRESHOLD:
        return "Auto-Approve"
    if prob > REJECT_THRESHOLD:
        return "Auto-Reject"
    return "Manual Review"


def _explain(shap_values: np.ndarray, raw_features: dict) -> list[str]:
    """Turn SHAP values into human-readable sentences."""
    explanations: list[str] = []

    indexed = list(zip(FEATURE_ORDER, shap_values))
    indexed.sort(key=lambda x: abs(x[1]), reverse=True)      # most impactful first

    for feat_key, sv in indexed:
        label = FEATURE_LABELS[feat_key]
        raw   = raw_features[feat_key]
        direction = "increases" if sv > 0 else "decreases"

        if feat_key == "annualIncome":
            val_str = f"${raw:,.0f}"
        elif feat_key == "debtToIncomeRatio":
            val_str = f"{raw:.0%}"
        elif feat_key == "creditScore":
            val_str = f"{int(raw)}"
        else:
            val_str = f"{int(raw)} months"

        explanations.append(
            f"{label} ({val_str}) {direction} default risk "
            f"by {abs(sv):.3f}"
        )

    return explanations


# ── endpoints ────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "healthy", "model_loaded": model is not None}


@app.post("/predict-risk", response_model=RiskPrediction)
async def predict_risk(features: LoanFeatures):
    """Score a single loan applicant and return risk + SHAP explanations."""
    try:
        raw = features.model_dump()
        arr = np.array([[raw[f] for f in FEATURE_ORDER]])

        # scale using the same scaler from training
        arr_scaled = scaler.transform(arr)

        # probability of default (class 1)
        prob = float(model.predict_proba(arr_scaled)[0, 1])

        # SHAP explanations on the scaled input
        sv = explainer.shap_values(arr_scaled)
        # shap_values returns an array; for binary classification pick class-1
        if isinstance(sv, list):
            shap_row = sv[1][0]
        else:
            shap_row = sv[0]

        return RiskPrediction(
            risk_probability  = round(prob, 4),
            business_decision = _decision(prob),
            key_factors       = _explain(shap_row, raw),
        )

    except Exception as exc:
        log.exception("Prediction failed")
        raise HTTPException(status_code=500, detail=str(exc))


# ── run directly with `python main.py` ──────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
