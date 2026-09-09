"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/brand/Logo";
import { APP_TAGLINE, DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/constants";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("customer");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [demoLoading, setDemoLoading] = useState("");

  function goHome() {
    router.refresh();
    router.push("/dashboard");
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (mode === "signup") {
        const registerRes = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password, role }),
        });
        const registerData = await registerRes.json();
        if (!registerRes.ok) throw new Error(registerData.error);
      }

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, remember }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(true);
      goHome();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function demoLogin(demoRole: "customer" | "staff" | "admin") {
    setDemoLoading(demoRole);
    setError("");
    try {
      const res = await fetch("/api/auth/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: demoRole }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(true);
      goHome();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Demo sign-in failed");
    } finally {
      setDemoLoading("");
    }
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f4f6f9_0%,#e8eef5_100%)]">
      <div className="mx-auto grid min-h-screen max-w-6xl lg:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden flex-col justify-between bg-navy px-10 py-10 text-white lg:flex">
          <Logo light />
          <div className="max-w-md">
            <p className="text-sm font-medium tracking-[0.16em] text-white/50 uppercase">
              Loan verification operations
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">
              Verify smarter.
              <br />
              Decide with confidence.
            </h1>
            <p className="mt-4 text-sm leading-6 text-white/70">
              LendFlow gives loan officers and reviewers one workspace for applications,
              documents, rules-based checks, issues, and a transparent decision trail.
            </p>
            <ol className="mt-8 space-y-3 text-sm text-white/75">
              <li>1. Intake a complete application</li>
              <li>2. Review documents and consistency checks</li>
              <li>3. Resolve issues and record a verification decision</li>
            </ol>
          </div>
          <p className="text-xs text-white/40">
            Demo prototype — simulated verification only. Not a credit bureau or lender of record.
          </p>
        </section>

        <section className="flex items-center px-4 py-10 sm:px-8">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-8 lg:hidden">
              <Logo />
              <p className="mt-2 text-sm text-muted-foreground">{APP_TAGLINE}</p>
            </div>

            <div className="surface-card p-6 sm:p-8">
              <div className="mb-6 flex rounded-lg bg-muted p-1">
                <button
                  type="button"
                  className={`flex-1 rounded-md py-2 text-sm font-medium ${mode === "login" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
                  onClick={() => { setMode("login"); setError(""); }}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  className={`flex-1 rounded-md py-2 text-sm font-medium ${mode === "signup" ? "bg-card shadow-sm" : "text-muted-foreground"}`}
                  onClick={() => { setMode("signup"); setError(""); }}
                >
                  Create account
                </button>
              </div>

              <h2 className="text-xl font-semibold">
                {mode === "login" ? "Welcome back" : "Create a workspace account"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {mode === "login"
                  ? "Sign in to continue verification work."
                  : "Choose a demo role. This is an internal operations prototype."}
              </p>

              <form onSubmit={onSubmit} className="mt-6 space-y-4">
                {error && (
                  <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                    Signed in. Opening your workspace...
                  </div>
                )}

                {mode === "signup" && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="name">Full name</Label>
                      <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required className="h-10" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="role">Role</Label>
                      <select
                        id="role"
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="h-10 w-full rounded-lg border border-input bg-background px-2.5 text-sm"
                      >
                        <option value="customer">Loan Officer</option>
                        <option value="staff">Reviewer</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  </>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-10"
                    placeholder="you@lender.example"
                  />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    {mode === "login" && (
                      <Link href="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                        Forgot password
                      </Link>
                    )}
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="h-10 pr-10"
                    />
                    <button
                      type="button"
                      className="absolute top-2 right-2 text-muted-foreground"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {mode === "login" && (
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    Keep me signed in for 30 days
                  </label>
                )}

                <Button type="submit" disabled={loading} className="h-10 w-full">
                  {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
                </Button>
              </form>
            </div>

            <div className="mt-4 rounded-xl border border-dashed border-border bg-card/70 p-4">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                Demo accounts
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Password for all demo users: <span className="font-medium text-foreground">{DEMO_PASSWORD}</span>
              </p>
              <div className="mt-3 grid gap-2">
                {DEMO_ACCOUNTS.map((account) => (
                  <Button
                    key={account.email}
                    type="button"
                    variant="outline"
                    className="h-auto justify-between px-3 py-2"
                    disabled={Boolean(demoLoading)}
                    onClick={() => demoLogin(account.role)}
                  >
                    <span className="text-left">
                      <span className="block text-sm font-medium">{account.title}</span>
                      <span className="block text-xs text-muted-foreground">{account.email}</span>
                    </span>
                    <span className="text-xs">
                      {demoLoading === account.role ? "Signing in..." : "Enter"}
                    </span>
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
