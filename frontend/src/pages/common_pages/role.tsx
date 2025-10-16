
export type ApiRole = "student" | "security" | "driver" | "faculty";

// 4 UI buttons mapped to backend roles
const OPTIONS: { key: string; label: string; role: ApiRole }[] = [
  { key: "faculty",          label: "Faculty",           role: "faculty"  }, // adjust if you add real 'faculty'
  { key: "student",          label: "Student",           role: "student"  },
  { key: "guard",            label: "Guard",             role: "security" },
  { key: "ambulance_driver", label: "Ambulance Driver",  role: "driver"   },
];

export default function Role({
  value,
  onChange,
}: {
  value: ApiRole | null;
  onChange: (role: ApiRole) => void;
}) {
  return (
    <div className="mt-2">
      <label className="block text-sm font-medium mb-2">Role</label>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {OPTIONS.map((opt) => {
          const active = value === opt.role;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(opt.role)}
              className={[
                "flex items-center justify-center rounded-xl border py-3 px-4 transition",
                active
                  ? "border-gray-900 bg-gray-900 text-white shadow"
                  : "border-gray-200 hover:shadow-md"
              ].join(" ")}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Selected:{" "}
        <span className="font-medium">
          {value
            ? OPTIONS.find((o) => o.role === value)?.label
            : "None"}
        </span>
      </p>
    </div>
  );
}
