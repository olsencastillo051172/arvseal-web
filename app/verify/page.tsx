import Image from "next/image";
import { loadRecord } from "../../lib/load-record";

type VerifyPageProps = {
  searchParams?: {
    id?: string;
  };
};

export default function VerifyPage({ searchParams }: VerifyPageProps) {
  const validationId = searchParams?.id?.trim();

  if (!validationId) {
    return (
      <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
        <div className="mx-auto max-w-6xl">
          <header className="mb-8 border-b border-amber-500/40 pb-6">
            <h1 className="text-5xl font-bold tracking-wide text-amber-200">ARV</h1>
            <p className="mt-2 text-xl text-slate-300">Reality Validation Authority</p>
            <p className="mt-1 text-sm text-slate-400">A System by Intelligence Olsen</p>
          </header>

          <section className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-8">
            <h2 className="text-2xl font-semibold text-amber-200">NO VALIDATION ID PROVIDED</h2>
            <p className="mt-3 text-slate-300">Use /verify?id=ARV-2026-000001</p>
          </section>
        </div>
      </main>
    );
  }

  const record = loadRecord(validationId);

  if (!record) {
    return (
      <main className="min-h-screen bg-slate-950 text-white px-6 py-10">
        <div className="mx-auto max-w-6xl">
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
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 border-b border-amber-500/40 pb-6">
          <h1 className="text-5xl font-bold tracking-wide text-amber-200">ARV</h1>
          <p className="mt-2 text-xl text-slate-300">Reality Validation Authority</p>
          <p className="mt-1 text-sm text-slate-400">A System by Intelligence Olsen</p>
        </header>

        <section className="rounded-xl border border-green-400/40 bg-green-500/10 p-8">
          <h2 className="text-2xl font-semibold text-green-300">VALID</h2>
          <p className="mt-3 text-slate-300">
            This validation record exists and is publicly verifiable.
          </p>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1fr_320px]">
          <div className="space-y-4 rounded-xl border bg-white p-6 shadow-sm text-slate-900">
            <div><span className="font-semibold">Validation ID:</span> {record.validation_id}</div>
            <div><span className="font-semibold">Status:</span> {record.status}</div>
            <div><span className="font-semibold">Authority:</span> {record.authority}</div>
            <div><span className="font-semibold">System:</span> {record.system}</div>
            <div><span className="font-semibold">Canon:</span> {record.canon}</div>
            <div><span className="font-semibold">Epoch ID:</span> {record.epoch_id}</div>
            <div><span className="font-semibold">Ledger Position:</span> {record.ledger_position}</div>
            <div><span className="font-semibold">Issued By:</span> {record.issued_by}</div>
            <div><span className="font-semibold">Institution:</span> {record.institution}</div>
            <div><span className="font-semibold">Issued For:</span> {record.issued_for}</div>
            <div><span className="font-semibold">Document Type:</span> {record.document_type}</div>
            <div><span className="font-semibold">Source File:</span> {record.source_file?.filename ?? "Legacy Record"}</div>
            <div><span className="font-semibold">Timestamp (UTC):</span> {record.timestamp_utc}</div>
          </div>

          <div className="space-y-4 rounded-xl border bg-white p-6 shadow-sm text-slate-900">
            <div>
              <span className="font-semibold">Document Hash:</span>
              <div className="mt-1 break-all rounded bg-gray-100 p-3 text-sm font-mono">
                {record.document_hash}
              </div>
            </div>

            <div>
              <span className="font-semibold">Merkle Root:</span>
              <div className="mt-1 break-all rounded bg-gray-100 p-3 text-sm font-mono">
                {record.merkle_root}
              </div>
            </div>

            <div>
              <span className="font-semibold">Dual Seal Mode:</span> {record.dual_seal?.mode ?? "N/A"}
            </div>

            <div>
              <span className="font-semibold">Primary Seal Hash:</span>
              <div className="mt-1 break-all rounded bg-gray-100 p-3 text-sm font-mono">
                {record.dual_seal?.primary_seal_hash ?? "N/A"}
              </div>
            </div>

            <div>
              <span className="font-semibold">Secondary Seal Hash:</span>
              <div className="mt-1 break-all rounded bg-gray-100 p-3 text-sm font-mono">
                {record.dual_seal?.secondary_seal_hash ?? "N/A"}
              </div>
            </div>

            <div>
              <span className="font-semibold">Signature Algorithm:</span> {record.signature?.algorithm ?? "N/A"}
            </div>

            <div>
              <span className="font-semibold">Public Key Fingerprint:</span>
              <div className="mt-1 break-all rounded bg-gray-100 p-3 text-sm font-mono">
                {record.signature?.public_key_fingerprint ?? "N/A"}
              </div>
            </div>

            <div>
              <span className="font-semibold">Signature:</span>
              <div className="mt-1 break-all rounded bg-gray-100 p-3 text-sm font-mono">
                {record.signature?.value ?? "N/A"}
              </div>
            </div>

            <div>
              <span className="font-semibold">Verification URL:</span>{" "}
              <a href={record.verification_url} className="text-blue-600 underline">
                {record.verification_url}
              </a>
            </div>

            <div>
              <span className="font-semibold">Certificate Artifact:</span>{" "}
              {record.certificate_artifact?.path ? (
                <a href={record.certificate_artifact?.path} className="text-blue-600 underline">
                  {record.certificate_artifact?.filename ?? "Not generated"}
                </a>
              ) : (
                "Not generated"
              )}
            </div>

            <div className="pt-4">
              <a
                href={record.certificate_artifact?.path ?? `/certificate?id=${record.validation_id}`}
                className="inline-block rounded border border-amber-500 px-4 py-2 font-semibold text-amber-700 hover:bg-amber-50"
              >
                Open Certificate
              </a>
            </div>
          </div>

          <div className="rounded-xl border bg-white p-6 shadow-sm text-slate-900">
            <div className="text-sm font-semibold uppercase tracking-widest text-slate-500">
              Signed QR
            </div>
            <div className="mt-4 overflow-hidden rounded-lg border bg-white p-3">
              <Image
                src={record.qr?.image_path ?? "/placeholder-qr.png"}
                alt={`Signed QR for ${record.validation_id}`}
                width={280}
                height={280}
                className="h-auto w-full"
                unoptimized
              />
            </div>
            <div className="mt-4 text-xs uppercase tracking-widest text-slate-500">
              QR Payload
            </div>
            <div className="mt-2 break-all rounded bg-gray-100 p-3 text-xs font-mono">
              {record.qr?.payload ?? "N/A"}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
