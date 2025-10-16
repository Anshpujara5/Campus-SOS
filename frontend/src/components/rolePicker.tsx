// src/components/RolePicker.tsx

export type ApiRole = "student" | "security" | "driver" | "faculty"; // ⬅️ added

export default function RolePicker({
  value,
  onChange,
}: {
  value: ApiRole | null;
  onChange: (v: ApiRole) => void;
}) {
  const roles: ApiRole[] = ["student", "security", "driver", "faculty"]; // ⬅️ added
  return (
    <div className="flex flex-wrap gap-2">
      {roles.map((r) => {
        const active = value === r;
        return (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            className={[
              "rounded-full px-3 py-1.5 text-sm capitalize transition",
              active
                ? "bg-sky-500 text-white"
                : "bg-white/5 text-slate-200 ring-1 ring-white/10 hover:bg-white/10",
            ].join(" ")}
          >
            {r}
          </button>
        );
      })}
    </div>
  );
}
