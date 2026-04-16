export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 border-b border-amber-500/30 pb-6">
          <h1 className="text-5xl font-bold tracking-wide text-amber-200">ARV</h1>
          <p className="mt-2 text-2xl text-slate-300">Reality Validation Authority</p>
          <p className="mt-1 text-sm text-slate-400">A System by Intelligence Olsen</p>
        </header>

        <section className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-8">
          <h2 className="text-3xl font-semibold text-emerald-300">
            Public Verification Portal
          </h2>
          <p className="mt-4 max-w-3xl text-slate-200">
            ARV provides cryptographic validation records that can be publicly verified
            through stable verification and certificate endpoints.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <a
              href="/verify?id=ARV-2026-000006"
              className="rounded-xl border border-cyan-400/40 bg-slate-900 px-5 py-4 text-lg font-semibold text-cyan-300 hover:bg-cyan-400/10"
            >
              Open Verify Demo
            </a>

            <a
              href="/certificate?id=ARV-2026-000006"
              className="rounded-xl border border-amber-400/40 bg-slate-900 px-5 py-4 text-lg font-semibold text-amber-300 hover:bg-amber-400/10"
            >
              Open Certificate Demo
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}