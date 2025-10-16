import { Appbar } from "../../components/Appbar";
import axios from "axios";
import { BACKEND_URL } from "../../config";
import { useNavigate } from "react-router-dom";
import { type ChangeEvent, useEffect, useMemo, useState } from "react";

/* ---------- tiny helpers ---------- */
const DRAFT_KEY = "cm_draft_alert";
const minTitle = 3;
const minBody = 10;

type AlertRole = "student" | "security" | "driver" | "faculty";
const ALL_ROLES: AlertRole[] = ["student", "security", "driver", "faculty"]; // ⬅️ default set

export const Publish = () => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [callTo, setCallTo] = useState<AlertRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const navigate = useNavigate();

  // restore draft
  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      try {
        const { title, description, callTo } = JSON.parse(raw);
        if (title) setTitle(title);
        if (description) setDescription(description);
        if (Array.isArray(callTo)) setCallTo(callTo.filter(isRole));
      } catch {}
    }
  }, []);

  // autosave draft
  useEffect(() => {
    const id = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ title, description, callTo }));
    }, 300);
    return () => clearTimeout(id);
  }, [title, description, callTo]);

  // cmd/ctrl + enter to publish
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "enter") {
        void onPublish();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, callTo, loading]);

  const canPublish = useMemo(
    () => title.trim().length >= minTitle && description.trim().length >= minBody && !loading,
    [title, description, loading]
  );

  async function onPublish() {
    if (!canPublish) return;
    try {
      setErr(null);
      setLoading(true);

      // ⬅️ if nothing selected, default to all roles
      const finalCallTo = callTo.length ? callTo : ALL_ROLES;

      const { data } = await axios.post(
        `${BACKEND_URL}/api/v1/alert/create`,
        {
          title: title.trim(),
          message: description.trim(),
          callTo: finalCallTo,
        },
        { headers: { Authorization: localStorage.getItem("token") || "" } }
      );
      localStorage.removeItem(DRAFT_KEY);
      navigate(`/alert/${data.id}`);
    } catch (e: any) {
      setErr(e?.response?.data?.message || "Failed to publish. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function toggleRole(r: AlertRole) {
    setCallTo((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  }

  return (
    <div className="min-h-screen bg-[#070B12] text-slate-100">
      <Appbar />

      {/* page backdrop flourish */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(56,189,248,0.10),transparent_60%)]" />
        <div className="absolute inset-0 [mask-image:radial-gradient(70%_60%_at_50%_35%,black,transparent)] bg-[linear-gradient(rgba(148,163,184,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.06)_1px,transparent_1px)] bg-[size:34px_34px]" />
      </div>

      <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-8 pb-16">
        {/* card frame */}
        <div className="rounded-2xl p-[1px] bg-gradient-to-b from-sky-400/40 via-fuchsia-400/30 to-transparent shadow-[0_20px_60px_-20px_rgba(0,0,0,0.75)]">
          <div className="rounded-2xl bg-[rgba(10,15,23,0.80)] backdrop-blur-2xl border border-white/10">
            {/* top line */}
            <div className="h-px mx-6 mt-4 bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-60" />

            <div className="p-5 sm:p-6">
              <h1 className="text-xl sm:text-2xl font-semibold tracking-[-0.01em]">Create Alert</h1>
              <p className="text-sm text-slate-400 mt-1">Title & message will be published to the feed.</p>

              {err && (
                <div className="mt-4 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
                  {err}
                </div>
              )}

              {/* Title */}
              <label htmlFor="title" className="mt-5 block text-sm text-slate-300">
                Title
              </label>
              <input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Short, crisp headline"
                className={[
                  "mt-1 w-full rounded-xl bg-white/5 text-slate-100 placeholder:text-slate-400",
                  "px-4 py-2.5 text-sm ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-sky-400/40",
                ].join(" ")}
                maxLength={120}
              />
              <div className="mt-1 text-xs text-slate-500">
                {title.trim().length < minTitle ? `${minTitle - title.trim().length} more chars…` : `${title.length}/120`}
              </div>

              {/* Editor */}
              <label htmlFor="editor" className="mt-5 block text-sm text-slate-300">
                Message
              </label>
              <TextEditor
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Write your alert message…"
              />
              <div className="mt-1 text-xs text-slate-500">
                {description.trim().length < minBody
                  ? `${minBody - description.trim().length} more chars…`
                  : `${Math.max(1, Math.ceil(description.trim().split(/\s+/).filter(Boolean).length / 200))} min read`}
              </div>

              {/* Notify / Call (four buttons, multi-select) */}
              <div className="mt-6">
                <div className="text-sm text-slate-300">Notify / Call</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Chip role="student"  active={callTo.includes("student")}  onClick={() => toggleRole("student")} />
                  <Chip role="security" active={callTo.includes("security")} onClick={() => toggleRole("security")} />
                  <Chip role="driver"   active={callTo.includes("driver")}   onClick={() => toggleRole("driver")} />
                  <Chip role="faculty"  active={callTo.includes("faculty")}  onClick={() => toggleRole("faculty")} />
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {callTo.length === 0
                    ? "No one selected — will notify everyone (Student, Security, Driver, Faculty)."
                    : `Calling: ${callTo.map(cap).join(", ")}`}
                </div>
              </div>

              {/* actions */}
              <div className="mt-6 flex items-center gap-3">
                <button
                  onClick={onPublish}
                  disabled={!canPublish}
                  type="button"
                  className={[
                    "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium",
                    "bg-gradient-to-r from-sky-500 to-fuchsia-500 text-white",
                    "enabled:shadow-[0_10px_30px_-10px_rgba(56,189,248,0.5)]",
                    "ring-1 ring-white/10 hover:brightness-110 active:scale-[0.98]",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    "transition",
                  ].join(" ")}
                  title="Publish (⌘/Ctrl + Enter)"
                >
                  {loading ? (
                    <>
                      <Spinner />
                      Publishing…
                    </>
                  ) : (
                    <>
                      Publish Alert
                      <kbd className="ml-1 hidden sm:inline-block text-[10px] rounded bg-white/10 px-1.5 py-0.5 ring-1 ring-white/10">
                        ⌘/Ctrl + ↵
                      </kbd>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTitle("");
                    setDescription("");
                    setCallTo([]);
                    localStorage.removeItem(DRAFT_KEY);
                  }}
                  className="rounded-full px-4 py-2.5 text-sm text-slate-200 bg-white/5 ring-1 ring-white/10 hover:bg-white/10 transition"
                >
                  Clear
                </button>

                <span className="ml-auto text-xs text-slate-500">Draft autosaved</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------- TextEditor (dark glass) ---------- */
function TextEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
}) {
  return (
    <div className="mt-2">
      <div className="rounded-xl ring-1 ring-white/10 bg-white/5 overflow-hidden">
        <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-400 bg-white/5 border-b border-white/10">
          <span>Basic text</span>
          <span className="opacity-70">Plain textarea · no formatting</span>
        </div>

        <textarea
          id="editor"
          rows={8}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="block w-full resize-y bg-transparent px-3 py-3 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
        />
      </div>
    </div>
  );
}

/* ---------- tiny bits ---------- */
function Spinner() {
  return (
    <span
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-transparent"
      aria-hidden
    />
  );
}

/* ---------- chips ---------- */
function Chip({
  role,
  active,
  onClick,
}: {
  role: AlertRole;
  active: boolean;
  onClick: () => void;
}) {
  const label = cap(role);
  const base = "rounded-full px-3.5 py-1.5 text-sm transition select-none";
  const styles: Record<AlertRole, string> = {
    student:  active ? "bg-blue-500 text-white"      : "bg-white/5 text-blue-200 ring-1 ring-blue-400/30 hover:bg-blue-500/10",
    security: active ? "bg-amber-500 text-white"     : "bg-white/5 text-amber-200 ring-1 ring-amber-400/30 hover:bg-amber-500/10",
    driver:   active ? "bg-emerald-500 text-white"   : "bg-white/5 text-emerald-200 ring-1 ring-emerald-400/30 hover:bg-emerald-500/10",
    faculty:  active ? "bg-violet-500 text-white"    : "bg-white/5 text-violet-200 ring-1 ring-violet-400/30 hover:bg-violet-500/10",
  };
  return (
    <button type="button" onClick={onClick} className={`${base} ${styles[role]}`}>
      {label}
    </button>
  );
}

/* small util */
function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function isRole(x: any): x is AlertRole {
  return ["student","security","driver","faculty"].includes(String(x));
}
