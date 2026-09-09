"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/providers/ToastProvider";
import { LOAN_TYPES } from "@/lib/constants";

export default function SettingsPage() {
  const { push } = useToast();
  const [rates, setRates] = useState<Record<string, number>>({});
  const [windowDays, setWindowDays] = useState(90);
  const [me, setMe] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me").then((res) => res.json()).then((data) => setMe(data.user));
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        setRates(data.settings?.rates || {});
        setWindowDays(data.settings?.verificationWindowDays || 90);
      });
  }, []);

  const isAdmin = me?.role === "admin";

  async function save() {
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rates, verificationWindowDays: windowDays }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) return push(json.error || "Could not save", "error");
    push("Settings saved", "success");
  }

  async function resetDemo() {
    const res = await fetch("/api/seed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ force: true }),
    });
    const json = await res.json();
    if (!res.ok) return push(json.error || "Seed failed", "error");
    push("Demo data reset", "success");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Settings"
        description="Product rates and the demo verification window. These are operational defaults, not market offers."
      />
      <section className="surface-card p-5">
        <h2 className="font-semibold">Profile</h2>
        <p className="mt-2 text-sm text-muted-foreground">{me?.name} · {me?.email} · {me?.displayRole}</p>
      </section>
      <section className="surface-card p-5 space-y-4">
        <h2 className="font-semibold">Verification defaults</h2>
        <div className="space-y-1.5">
          <Label htmlFor="window">Document verification window (days)</Label>
          <Input id="window" type="number" value={windowDays} disabled={!isAdmin} onChange={(e) => setWindowDays(Number(e.target.value))} className="h-10 max-w-xs" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {LOAN_TYPES.map((type) => (
            <div key={type} className="space-y-1.5">
              <Label htmlFor={type}>{type} reference rate (%)</Label>
              <Input
                id={type}
                type="number"
                value={rates[type] ?? ""}
                disabled={!isAdmin}
                onChange={(e) => setRates((current) => ({ ...current, [type]: Number(e.target.value) }))}
                className="h-10"
              />
            </div>
          ))}
        </div>
        <Button onClick={save} disabled={!isAdmin || saving}>
          {saving ? "Saving..." : isAdmin ? "Save settings" : "Admin only"}
        </Button>
      </section>
      <section className="surface-card p-5">
        <h2 className="font-semibold">Demo data</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Reload the fictional sample book. This does not connect to any live lender system.
        </p>
        <Button variant="outline" className="mt-3" disabled={!isAdmin} onClick={resetDemo}>
          Reset demo applications
        </Button>
      </section>
    </div>
  );
}
