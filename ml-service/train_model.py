"""
train_model.py — Synthetic data generation + XGBoost training pipeline
======================================================================
Generates 1,000 synthetic loan applicants whose default probability is
driven by realistic, non-linear feature interactions, then trains an
XGBoost binary classifier and persists both the model and the fitted
scaler to disk for the FastAPI inference server.

Features (aligned with Mongoose LoanSchema):
  - annualIncome          (USD, 20k–200k)
  - employmentLengthMonths (0–360)
  - debtToIncomeRatio     (0.0–1.0)
  - creditScore           (300–850)

Target:
  - default  (0 = repaid, 1 = defaulted)
"""

import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import classification_report, roc_auc_score
from xgboost import XGBClassifier

# ── reproducibility ─────────────────────────────────────────────────
SEED = 42
np.random.seed(SEED)
N_SAMPLES = 1_000
MODEL_DIR = Path(__file__).parent / "artifacts"
MODEL_DIR.mkdir(exist_ok=True)

# ── 1. synthetic dataset ────────────────────────────────────────────
print("[*] Generating synthetic dataset ...")

annual_income           = np.random.uniform(20_000, 200_000, N_SAMPLES)
employment_length_months = np.random.randint(0, 361, N_SAMPLES).astype(float)
debt_to_income_ratio    = np.random.uniform(0.0, 1.0, N_SAMPLES)
credit_score            = np.random.randint(300, 851, N_SAMPLES).astype(float)

# build a logistic ground-truth: lower income, shorter employment,
# higher DTI, and lower credit score -> higher default probability
log_odds = (
    2.0                                           # intercept (shifted up for ~30% default rate)
    - 0.00002 * annual_income                     # more income -> less risk
    - 0.003  * employment_length_months           # longer tenure -> less risk
    + 3.0    * debt_to_income_ratio               # higher DTI -> more risk
    - 0.006  * credit_score                       # higher score -> less risk
    + np.random.normal(0, 0.6, N_SAMPLES)         # noise
)
prob_default = 1 / (1 + np.exp(-log_odds))
default = (prob_default > np.random.uniform(0, 1, N_SAMPLES)).astype(int)

df = pd.DataFrame({
    "annualIncome":           annual_income,
    "employmentLengthMonths": employment_length_months,
    "debtToIncomeRatio":      debt_to_income_ratio,
    "creditScore":            credit_score,
    "default":                default,
})

print(f"    samples: {len(df)}  |  default rate: {default.mean():.2%}")

# ── 2. train / test split ───────────────────────────────────────────
FEATURES = ["annualIncome", "employmentLengthMonths", "debtToIncomeRatio", "creditScore"]
X = df[FEATURES]
y = df["default"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=SEED, stratify=y
)

# ── 3. feature scaling ──────────────────────────────────────────────
scaler = StandardScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled  = scaler.transform(X_test)

# ── 4. XGBoost training ─────────────────────────────────────────────
print("[*] Training XGBoost classifier ...")

model = XGBClassifier(
    n_estimators=200,
    max_depth=5,
    learning_rate=0.1,
    subsample=0.8,
    colsample_bytree=0.8,
    eval_metric="logloss",

    random_state=SEED,
)
model.fit(
    X_train_scaled, y_train,
    eval_set=[(X_test_scaled, y_test)],
    verbose=False,
)

# ── 5. evaluation ───────────────────────────────────────────────────
y_pred  = model.predict(X_test_scaled)
y_proba = model.predict_proba(X_test_scaled)[:, 1]
auc     = roc_auc_score(y_test, y_proba)

print(f"\n  ROC-AUC: {auc:.4f}\n")
print(classification_report(y_test, y_pred, target_names=["Repaid", "Defaulted"]))

# ── 6. persist artifacts ────────────────────────────────────────────
model_path  = MODEL_DIR / "xgb_loan_model.pkl"
scaler_path = MODEL_DIR / "scaler.pkl"


joblib.dump(model,  model_path)
joblib.dump(scaler, scaler_path)


print(f"[OK] Model  saved -> {model_path}")
print(f"[OK] Scaler saved -> {scaler_path}")

# also save feature importances as a quick sanity-check reference
importances = dict(zip(FEATURES, model.feature_importances_))
print(f"\n  Feature importances: {importances}")
