import { LEGACY_STATUS_MAP } from "./constants";
import type { ApplicationStatus } from "./types";

export function formatCurrency(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCurrencyExact(value?: number | null) {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value?: string | Date | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatRelative(value?: string | Date | null) {
  if (!value) return "—";
  const date = new Date(value);
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (Math.abs(minutes) < 1) return "Just now";
  if (Math.abs(minutes) < 60) return `${Math.abs(minutes)}m ago`;
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return `${Math.abs(hours)}h ago`;
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 14) return `${Math.abs(days)}d ago`;
  return formatDate(date);
}

export function normalizeStatus(status?: string | null): ApplicationStatus {
  if (!status) return "Draft";
  if (LEGACY_STATUS_MAP[status]) return LEGACY_STATUS_MAP[status];
  return status as ApplicationStatus;
}

export function initials(name?: string) {
  if (!name) return "LF";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function calculateEmi(principal: number, annualRate: number, tenureMonths: number) {
  if (!principal || !tenureMonths) return 0;
  const monthly = annualRate / 12 / 100;
  if (!monthly) return principal / tenureMonths;
  return (
    (principal * monthly * Math.pow(1 + monthly, tenureMonths)) /
    (Math.pow(1 + monthly, tenureMonths) - 1)
  );
}
