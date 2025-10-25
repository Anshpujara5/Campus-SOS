import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { BACKEND_URL } from "../config";
import RolePicker, { type ApiRole } from "./rolePicker";

type AuthMode = "signin" | "signup";

export default function Auth({ mode }: { mode: AuthMode }) {
  const navigate = useNavigate();

  // form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [role, setRole] = useState<ApiRole | null>(null);

  // ui state
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // simple client-side validation
  const emailOk = /\S+@\S+\.\S+/.test(email);
  const pwOk = password.length >= 6;
  const nameOk = mode === "signin" ? true : name.trim().length >= 2;
  const roleOk = mode === "signin" ? true : !!role;

  const canSubmit = useMemo(
    () => emailOk && pwOk && nameOk && roleOk && !loading,
    [emailOk, pwOk, nameOk, roleOk, loading]
  );

  // ⌘/Ctrl + Enter submits
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "enter") {
        handleSubmit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, password, name, role, loading]);

  async function handleSubmit() {
    if (!canSubmit) return;

    try {
      setErr(null);
      setLoading(true);

      if (mode === "signin") {
        const res = await axios.post(
          `${BACKEND_URL}/api/v1/user/signin`,
          { email, password },
          { headers: { "Content-Type": "application/json" } }
        );
        const token = pickJwt(res.data);
        if (!token) throw new Error("No token in response");
        localStorage.setItem("token", `Bearer ${token}`);
        navigate("/foryou", { replace: true });
        return;
      }

      // signup
      const res = await axios.post(
        `${BACKEND_URL}/api/v1/user/signup`,
        {
          name: name.trim(),
          email,
          password,
          role: (role ?? "").toLowerCase(), // normalize
        },
        { headers: { "Content-Type": "application/json" } }
      );

      const token = pickJwt(res.data);
      if (!token) throw new Error("No token in response");
      localStorage.setItem("token", `Bearer ${token}`);
      navigate("/foryou", { replace: true });
    } catch (e: any) {
      // surface useful messages
      const serverMsg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        e?.message ||
        "Something went wrong";
      setErr(serverMsg);
      // optional: console for quick debugging during dev
      // eslint-disable-next-line no-console
      console.debug("[Auth] submit error:", e?.response ?? e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative bg-[#070B12] text-slate-100">
      {/* background flourish */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(56,189,248,0.10),transparent_60%)]" />
        <div className="absolute inset-0 [mask-image:radial-gradient(70%_60%_at_50%_35%,black,transparent)] bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:34px_34px]" />
      </div>

      <div className="mx-auto max-w-md px-6 py-12">
        {/* gradient frame */}
        <div className="rounded-2xl p-[1px] bg-gradient-to-b from-sky-400/40 via-fuchsia-400/30 to-transparent shadow-[0_20px_60px_-20px_rgba(0,0,0,0.75)]">
          {/* frosted panel */}
          <div className="rounded-2xl bg-[rgba(10,15,23,0.8)] backdrop-blur-2xl border border-white/10">
            <div className="h-px mx-6 mt-4 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-60" />
            <div className="p-6">
              <h1 className="text-2xl font-semibold tracking-[-0.01em]">
                {mode === "signup" ? "Create an account" : "Welcome back"}
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                {mode === "signup" ? "Fill details, pick a role, and get started." : "Sign in to continue."}
              </p>

              {mode === "signup" && (
                <Field label="Name">
                  <Input
                    type="text"
                    placeholder="Full name"
                    value={name}
                    onChange={setName}
                    ok={nameOk}
                  />
                </Field>
              )}

              <Field label="Email">
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={setEmail}
                  ok={emailOk}
                />
              </Field>

              <Field label="Password">
                <div className="relative">
                  <Input
                    type={showPw ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={setPassword}
                    ok={pwOk}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute inset-y-0 right-0 px-3 text-xs text-slate-300 hover:text-slate-100"
                    aria-label={showPw ? "Hide password" : "Show password"}
                  >
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>
                <div className="mt-1 text-xs text-slate-500">At least 6 characters.</div>
              </Field>

              {mode === "signup" && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1 text-slate-200">Role</label>
                  <RolePicker value={role} onChange={setRole} />
                </div>
              )}

              {err && (
                <div className="mt-3 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
                  {err}
                </div>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={[
                  "mt-6 w-full rounded-xl px-4 py-2.5 text-sm font-medium",
                  "bg-gradient-to-r from-sky-500 to-fuchsia-500 text-white",
                  "ring-1 ring-white/10 hover:brightness-110 active:scale-[0.98]",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  "transition",
                ].join(" ")}
                title="Submit (⌘/Ctrl + Enter)"
              >
                {loading ? "Please wait…" : mode === "signup" ? "Sign up" : "Sign in"}
              </button>

              <p className="text-center text-sm text-slate-400 mt-4">
                {mode === "signup" ? (
                  <>
                    Already have an account?{" "}
                    <Link className="underline decoration-sky-400/70 hover:text-slate-100" to="/signin">
                      Sign in
                    </Link>
                  </>
                ) : (
                  <>
                    Don’t have an account?{" "}
                    <Link className="underline decoration-sky-400/70 hover:text-slate-100" to="/">
                      Sign up
                    </Link>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------- bits ----------------- */

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-1 text-slate-200">{label}</label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type,
  ok = true,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  ok?: boolean;
}) {
  return (
    <input
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={[
        "w-full rounded-xl bg-white/5 text-slate-100 placeholder:text-slate-500",
        "px-4 py-2.5 text-sm ring-1 ring-white/10 focus:outline-none",
        ok ? "focus:ring-2 focus:ring-sky-400/40" : "ring-rose-400/30 focus:ring-rose-400/40",
      ].join(" ")}
    />
  );
}

/* ---------- helpers ---------- */
function pickJwt(data: any): string | null {
  // accommodate different API field names
  return data?.jwt || data?.token || data?.accessToken || null;
}
