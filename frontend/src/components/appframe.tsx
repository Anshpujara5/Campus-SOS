// AppFrame.tsx
export default function AppFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen relative bg-[#070B12] text-slate-100 antialiased">
      {/* vignette + spotlight */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(1200px_600px_at_50%_-10%,rgba(56,189,248,0.12),transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(900px_400px_at_15%_10%,rgba(168,85,247,0.08),transparent_60%)]" />
        <div className="absolute inset-0 [mask-image:radial-gradient(75%_60%_at_50%_35%,black,transparent)] bg-[linear-gradient(rgba(148,163,184,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.07)_1px,transparent_1px)] bg-[size:34px_34px]" />
      </div>

      {/* fine noise */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-soft-light"
           style={{ backgroundImage: "url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2248%22 height=%2248%22 viewBox=%220 0 48 48%22><filter id=%22n%22 x=%220%22 y=%220%22><feTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%222%22 stitchTiles=%22stitch%22/></filter><rect width=%2248%22 height=%2248%22 filter=%22url(%23n)%22 opacity=%220.3%22/></svg>')" }} />

      <main className="relative">{children}</main>
    </div>
  );
}
