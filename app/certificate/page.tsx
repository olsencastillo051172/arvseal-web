import Image from "next/image";
import { loadRecord } from "../../lib/load-record";

type CertificatePageProps = {
  searchParams?: {
    id?: string;
  };
};

export default function CertificatePage({ searchParams }: CertificatePageProps) {
  const validationId = searchParams?.id?.trim();

  if (!validationId) {
    return (
      <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <header className="mb-8 border-b border-amber-500/40 pb-6">
            <h1 className="text-5xl font-bold tracking-wide text-amber-200">ARV</h1>
            <p className="mt-2 text-xl text-slate-300">Reality Validation Authority</p>
            <p className="mt-1 text-sm text-slate-400">A System by Intelligence Olsen</p>
          </header>

          <section className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-8">
            <h2 className="text-2xl font-semibold text-amber-200">NO VALIDATION ID PROVIDED</h2>
            <p className="mt-3 text-slate-300">Use /certificate?id=ARV-2026-000001</p>
          </section>
        </div>
      </main>
    );
  }

  const record = loadRecord(validationId);

  if (!record) {
    return (
      <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
        <div className="mx-auto max-w-5xl">
          <header className="mb-8 border-b border-amber-500/40 pb-6">
            <h1 className="text-5xl font-bold tracking-wide text-amber-200">ARV</h1>
            <p className="mt-2 text-xl text-slate-300">Reality Validation Authority</p>
            <p className="mt-1 text-sm text-slate-400">A System by Intelligence Olsen</p>
          </header>

          <section className="rounded-xl border border-red-400/40 bg-red-500/10 p-8">
            <h2 className="text-2xl font-semibold text-red-300">INVALID / RECORD NOT FOUND</h2>
            <p className="mt-3 text-slate-300">Validation ID: {validationId}</p>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 border-b border-amber-500/40 pb-6">
          <div className="flex items-start justify-between gap-6">
            <div>
              <h1 className="text-5xl font-bold tracking-wide text-amber-200">ARV</h1>
              <p className="mt-2 text-xl text-slate-300">Reality Validation Authority</p>
              <p className="mt-1 text-sm text-slate-400">A System by Intelligence Olsen</p>
            </div>

            <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-right">
              <div className="text-xs uppercase tracking-widest text-emerald-300">Status</div>
              <div className="mt-1 text-2xl font-bold text-emerald-300">{record.status}</div>
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-amber-500/30 bg-white p-10 text-slate-900 shadow-2xl">
          <div className="border-b border-slate-200 pb-6 text-center">
            <div className="text-sm uppercase tracking-[0.3em] text-slate-500">
              Integrity Certificate
            </div>
            <h2 className="mt-4 text-4xl font-bold text-slate-900">
              Independent Cryptographic Validation Record
            </h2>
            <p className="mt-4 text-base text-slate-600">
              This certificate confirms that the validation record identified below exists,
              has been registered, and is publicly verifiable through ARV.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-8 py-8 xl:grid-cols-[1fr_1fr_320px]">
            <div className="space-y-6">
              <div><div className="text-xs uppercase tracking-widest text-slate-500">Validation ID</div><div className="mt-2 text-2xl font-semibold">{record.validation_id}</div></div>
              <div><div className="text-xs uppercase tracking-widest text-slate-500">Authority</div><div className="mt-2 text-lg">{record.authority}</div></div>
              <div><div className="text-xs uppercase tracking-widest text-slate-500">System</div><div className="mt-2 text-lg">{record.system}</div></div>
              <div><div className="text-xs uppercase tracking-widest text-slate-500">Canon</div><div className="mt-2 text-lg">{record.canon}</div></div>
              <div><div className="text-xs uppercase tracking-widest text-slate-500">Epoch ID</div><div className="mt-2 text-lg">{record.epoch_id}</div></div>
              <div><div className="text-xs uppercase tracking-widest text-slate-500">Ledger Position</div><div className="mt-2 text-lg">{record.ledger_position}</div></div>
              <div><div className="text-xs uppercase tracking-widest text-slate-500">Issued By</div><div className="mt-2 text-lg">{record.issued_by}</div></div>
              <div><div className="text-xs uppercase tracking-widest text-slate-500">Institution</div><div className="mt-2 text-lg">{record.institution}</div></div>
              <div><div className="text-xs uppercase tracking-widest text-slate-500">Issued For</div><div className="mt-2 text-lg">{record.issued_for}</div></div>
              <div><div className="text-xs uppercase tracking-widest text-slate-500">Document Type</div><div className="mt-2 text-lg">{record.document_type}</div></div>
            </div>

            <div className="space-y-6">
              <div>
                <div className="text-xs uppercase tracking-widest text-slate-500">Document Hash</div>
                <div className="mt-2 break-all rounded-lg bg-slate-100 p-4 font-mono text-sm">
                  {record.document_hash}
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-widest text-slate-500">Merkle Root</div>
                <div className="mt-2 break-all rounded-lg bg-slate-100 p-4 font-mono text-sm">
                  {record.merkle_root}
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-widest text-slate-500">Dual Seal</div>
                <div className="mt-2 text-sm font-semibold">{record.dual_seal.mode}</div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-widest text-slate-500">Primary Seal Hash</div>
                <div className="mt-2 break-all rounded-lg bg-slate-100 p-4 font-mono text-sm">
                  {record.dual_seal.primary_seal_hash}
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-widest text-slate-500">Secondary Seal Hash</div>
                <div className="mt-2 break-all rounded-lg bg-slate-100 p-4 font-mono text-sm">
                  {record.dual_seal.secondary_seal_hash}
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-widest text-slate-500">Signature Algorithm</div>
                <div className="mt-2 text-lg">{record.signature.algorithm}</div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-widest text-slate-500">Public Key Fingerprint</div>
                <div className="mt-2 break-all rounded-lg bg-slate-100 p-4 font-mono text-sm">
                  {record.signature.public_key_fingerprint}
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-widest text-slate-500">Signature</div>
                <div className="mt-2 break-all rounded-lg bg-slate-100 p-4 font-mono text-sm">
                  {record.signature.value}
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-widest text-slate-500">Timestamp UTC</div>
                <div className="mt-2 text-lg">{record.timestamp_utc}</div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-widest text-slate-500">Verification URL</div>
                <a href={record.verification_url} className="mt-3 inline-block text-lg font-semibold text-blue-700 underline">
                  {record.verification_url}
                </a>
              </div>
            </div>

            <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-6">
              <div className="text-xs uppercase tracking-widest text-slate-500">Signed QR</div>
              <div className="overflow-hidden rounded-lg border bg-white p-3">
                <Image
                  src={record.qr.image_path}
                  alt={`Signed QR for ${record.validation_id}`}
                  width={280}
                  height={280}
                  className="h-auto w-full"
                  unoptimized
                />
              </div>
              <div className="text-xs uppercase tracking-widest text-slate-500">Signed QR Payload</div>
              <div className="break-all rounded-lg bg-white p-3 font-mono text-xs">
                {record.qr.payload}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
