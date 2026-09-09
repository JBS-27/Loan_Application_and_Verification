import type { DisplayRole, Role, SessionUser } from "./types";

export function canonicalRole(role?: string | null): "customer" | "staff" | "admin" {
  if (role === "loan_officer" || role === "customer") return "customer";
  if (role === "reviewer" || role === "staff") return "staff";
  if (role === "admin") return "admin";
  return "customer";
}

export function displayRole(role?: string | null): DisplayRole {
  const c = canonicalRole(role);
  if (c === "admin") return "Admin";
  if (c === "staff") return "Reviewer";
  return "Loan Officer";
}

export function parseSignupRole(role?: string): "customer" | "staff" | "admin" {
  const allowed = ["customer", "staff", "admin", "loan_officer", "reviewer"];
  if (!role || !allowed.includes(role)) return "customer";
  return canonicalRole(role);
}

export function canReview(user?: SessionUser | null) {
  const role = canonicalRole(user?.role);
  return role === "staff" || role === "admin";
}

export function canManageSettings(user?: SessionUser | null) {
  return canonicalRole(user?.role) === "admin";
}

export function canCreateApplications(user?: SessionUser | null) {
  return Boolean(user);
}

export function isOfficer(user?: SessionUser | null) {
  return canonicalRole(user?.role) === "customer";
}
