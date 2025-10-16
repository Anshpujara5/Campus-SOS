import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { BACKEND_URL } from "../../config";
import { Appbar } from "../../components/Appbar";

/* ---------------- Types ---------------- */
type UserMe = {
  id: string;
  name: string;
  email: string;
  role?: "student" | "security" | "driver" | "faculty" | string;
  createdAt?: string;
};

export default function Settings() {
  const [me, setMe] = useState<UserMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  // UI feedback
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [actionErr, setActionErr] = useState<string | null>(null);

  // Profile (view vs edit)
  const [editingProfile, setEditingProfile] = useState(false);
  const [name, setName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const profileDirty = useMemo(
    () => me && name.trim() !== (me.name || "").trim(),
    [me, name]
  );

  // Security (hidden until click)
  const [showPwForm, setShowPwForm] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const pwOk = newPw.length >= 6 && currentPw.length >= 1;

  // Local prefs (stay editable)
  const [notif, setNotif] = useState<boolean>(() => localStorage.getItem("cm_pref_notif") === "1");
  const [compact, setCompact] = useState<boolean>(() => localStorage.getItem("cm_pref_compact") === "1");

  const authHeader = { Authorization: localStorage.getItem("token") || "" };

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const res = await axios.get(`${BACKEND_URL}/api/v1/user/me`, { headers: authHeader });
        const u = normalizeUser(res.data);
        if (!alive) return;
        setMe(u);
        setName(u.name || "");
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.response?.data?.message || e?.message || "Couldn’t load your profile.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function bumpOk(msg: string) {
    setOkMsg(msg);
    setTimeout(() => setOkMsg(null), 1500);
  }

  function upPrefs(key: "cm_pref_notif" | "cm_pref_compact", val: boolean) {
    localStorage.setItem(key, val ? "1" : "0");
    bumpOk("Preferences saved");
  }

  async function saveProfile() {
    if (!profileDirty || !me) { setEditingProfile(false); return; }
    setSavingProfile(true);
    setOkMsg(null);
    setActionErr(null);
    try {
      await axios.put(
        `${BACKEND_URL}/api/v1/user/profile`,
        { name: name.trim() },
        { headers: { ...authHeader, "Content-Type": "application/json" } }
      );
      setMe({ ...me, name: name.trim() });
      setEditingProfile(false);
      bumpOk("Profile updated");
    } catch (e: any) {
      setActionErr(e?.response?.data?.message || e?.message || "Failed to update profile.");
    } finally {
      setSavingProfile(false);
    }
  }

  function cancelProfileEdit() {
    setName(me?.name || "");
    setEditingProfile(false);
    setActionErr(null);
  }

  async function changePassword() {
    if (!pwOk) return;
    setSavingPw(true);
    setOkMsg(null);
    setActionErr(null);
    try {
      await axios.put(
        `${BACKEND_URL}/api/v1/user/password`,
        { currentPassword: currentPw, newPassword: newPw },
        { headers: { ...authHeader, "Content-Type": "application/json" } }
      );
      bumpOk("Password changed");
      setCurrentPw("");
      setNewPw("");
      setShowPwForm(false);
    } catch (e: any) {
      setActionErr(e?.response?.data?.message || e?.message || "Failed to change password.");
    } finally {
      setSavingPw(false);
    }
  }

  async function deleteAccount() {
    const sure = window.confirm("This will permanently delete your account and alerts. Continue?");
    if (!sure) return;
    setOkMsg(null);
    setActionErr(null);
    try {
      await axios.delete(`${BACKEND_URL}/api/v1/user/delete`, { headers: authHeader });
      localStorage.removeItem("token");
      window.location.href = "/signin";
    } catch (e: any) {
      setActionErr(e?.response?.data?.message || e?.message || "Failed to delete account.");
    }
  }

  return (
    <div className="min-h-screen relative bg-[#070B12] text-slate-100">
      <Appbar />

      {/* page flourish */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(56,189,248,0.10),transparent_60%)]" />
        <div className="absolute inset-0 [mask-image:radial-gradient(70%_60%_at_50%_35%,black,transparent)] bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:34px_34px]" />
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-8 pb-20">
        <h1 className="text-2xl font-semibold tracking-[-0.01em]">Settings</h1>
        <p className="text-sm text-slate-400">View or edit your account and preferences.</p>

        {(okMsg || actionErr || err) && (
          <div className="mt-4 space-y-2">
            {okMsg && <Banner tone="ok">{okMsg}</Banner>}
            {(actionErr || err) && <Banner tone="warn">{actionErr || err}</Banner>}
          </div>
        )}

        {/* Profile (read-only by default; Edit toggles inputs) */}
        <Card
          title="Profile"
          action={
            !loading && me ? (
              editingProfile ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={saveProfile}
                    disabled={savingProfile}
                    className="rounded-full px-3 py-1.5 text-xs font-medium bg-gradient-to-r from-sky-500 to-fuchsia-500 text-white ring-1 ring-white/10 hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
                  >
                    {savingProfile ? "Saving…" : "Save"}
                  </button>
                  <button
                    onClick={cancelProfileEdit}
                    className="rounded-full px-3 py-1.5 text-xs font-medium bg-white/5 text-slate-100 ring-1 ring-white/10 hover:bg-white/10"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setEditingProfile(true)}
                  className="rounded-full px-3 py-1.5 text-xs font-medium bg-white/5 text-slate-100 ring-1 ring-white/10 hover:bg-white/10"
                >
                  Edit
                </button>
              )
            ) : null
          }
        >
          {loading ? (
            <Skeleton rows={3} />
          ) : me ? (
            editingProfile ? (
              <div className="space-y-4">
                <Field label="Name">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl bg-white/5 text-slate-100 placeholder:text-slate-500 px-4 py-2.5 text-sm ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                    placeholder="Your name"
                  />
                </Field>
                <Field label="Email">
                  <input
                    value={me.email}
                    readOnly
                    className="w-full rounded-xl bg-white/5 text-slate-400 px-4 py-2.5 text-sm ring-1 ring-white/10"
                  />
                </Field>
                <Field label="Role">
                  <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-200 capitalize">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-300/80" />
                    {me.role || "—"}
                  </span>
                </Field>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <ReadRow label="Name" value={me.name || "—"} />
                <ReadRow label="Email" value={me.email || "—"} />
                <ReadRow label="Role" value={(me.role || "—").toString()} cap />
                {me.createdAt && <ReadRow label="Joined" value={formatDate(me.createdAt)} />}
              </div>
            )
          ) : (
            <div className="text-sm text-slate-400">No profile loaded.</div>
          )}
        </Card>

        {/* Security (hidden until Change password) */}
        <Card
          title="Security"
          action={
            <button
              onClick={() => setShowPwForm((v) => !v)}
              className="rounded-full px-3 py-1.5 text-xs font-medium bg-white/5 text-slate-100 ring-1 ring-white/10 hover:bg-white/10"
            >
              {showPwForm ? "Close" : "Change password"}
            </button>
          }
        >
          {showPwForm ? (
            <div className="space-y-4">
              <Field label="Current password">
                <input
                  type={showPw ? "text" : "password"}
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  className="w-full rounded-xl bg-white/5 text-slate-100 placeholder:text-slate-500 px-4 py-2.5 text-sm ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                  placeholder="••••••••"
                />
              </Field>
              <Field label="New password">
                <div className="relative">
                  <input
                    type={showPw ? "text" : "password"}
                    value={newPw}
                    onChange={(e) => setNewPw(e.target.value)}
                    className="w-full rounded-xl bg-white/5 text-slate-100 placeholder:text-slate-500 px-4 py-2.5 text-sm ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-sky-400/40"
                    placeholder="At least 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="absolute inset-y-0 right-0 px-3 text-xs text-slate-300 hover:text-slate-100"
                  >
                    {showPw ? "Hide" : "Show"}
                  </button>
                </div>
                <div className="text-xs text-slate-500">Must be at least 6 characters.</div>
              </Field>

              <div className="pt-1">
                <button
                  onClick={changePassword}
                  disabled={!pwOk || savingPw}
                  className={[
                    "rounded-full px-4 py-2 text-sm font-medium",
                    "bg-gradient-to-r from-sky-500 to-fuchsia-500 text-white",
                    "ring-1 ring-white/10 hover:brightness-110 active:scale-[0.98]",
                    "disabled:opacity-50 disabled:cursor-not-allowed transition",
                  ].join(" ")}
                >
                  {savingPw ? "Updating…" : "Change password"}
                </button>
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-400">Passwords are hidden. Click “Change password” to edit.</div>
          )}
        </Card>

        {/* Preferences (always editable) */}
        <Card title="Preferences">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Toggle
              label="Enable notifications (local)"
              checked={notif}
              onChange={(v) => { setNotif(v); upPrefs("cm_pref_notif", v); }}
            />
            <Toggle
              label="Compact list density (local)"
              checked={compact}
              onChange={(v) => { setCompact(v); upPrefs("cm_pref_compact", v); }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">Preferences are stored locally in your browser.</p>
        </Card>

        {/* Danger zone */}
        <Card title="Danger zone">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="font-medium text-slate-200">Delete account</div>
              <p className="text-sm text-slate-400">This action is permanent and cannot be undone.</p>
            </div>
            <button
              onClick={deleteAccount}
              className="rounded-full px-4 py-2 text-sm font-medium bg-rose-500/90 text-white hover:brightness-110 active:scale-[0.98] transition"
            >
              Delete account
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- Bits ---------------- */

function Card({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="mt-6 rounded-2xl p-[1px] bg-gradient-to-b from-sky-400/40 via-fuchsia-400/30 to-transparent shadow-[0_20px_60px_-20px_rgba(0,0,0,0.75)]">
      <div className="rounded-2xl bg-[rgba(10,15,23,0.8)] backdrop-blur-2xl border border-white/10 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-[-0.01em]">{title}</h2>
          {action}
        </div>
        <div className="h-px mx-1 my-4 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-60" />
        <div>{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1 text-slate-200">{label}</label>
      {children}
    </div>
  );
}

function ReadRow({ label, value, cap = false }: { label: string; value: string; cap?: boolean }) {
  return (
    <div>
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      <div className={`rounded-xl bg-white/5 ring-1 ring-white/10 px-4 py-2.5 text-sm text-slate-200 ${cap ? "capitalize" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function Banner({
  children,
  tone = "ok",
}: {
  children: React.ReactNode;
  tone?: "ok" | "warn";
}) {
  const cls =
    tone === "ok"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
      : "border-amber-400/30 bg-amber-400/10 text-amber-200";
  return (
    <div className={`rounded-lg border px-3 py-2 text-sm ${cls}`}>{children}</div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-xl bg-white/5 ring-1 ring-white/10 px-4 py-3 hover:bg-white/10 transition">
      <span className="text-sm text-slate-200">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={[
          "h-6 w-11 rounded-full p-0.5 transition",
          checked ? "bg-sky-500/90" : "bg-slate-600/60",
        ].join(" ")}
        aria-pressed={checked}
      >
        <span
          className={[
            "block h-5 w-5 rounded-full bg-white transform transition",
            checked ? "translate-x-5" : "translate-x-0",
          ].join(" ")}
        />
      </button>
    </label>
  );
}

function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-9 rounded-xl bg-white/5 ring-1 ring-white/10" />
      ))}
    </div>
  );
}

/* ---------------- Helpers ---------------- */

function normalizeUser(data: any): UserMe {
  const u = data?.user ?? data ?? {};
  return {
    id: String(u.id ?? u.userId ?? ""),
    name: String(u.name ?? u.fullName ?? "Anonymous"),
    email: String(u.email ?? u.mail ?? ""),
    role: u.role ?? u.type ?? undefined,
    createdAt: u.createdAt ?? u.created_at ?? undefined,
  };
}

function formatDate(d: string) {
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}