# ARV DemoClient Kernel Export Manual QA Checklist v1

## Scope

This checklist validates the DemoClient browser-facing ARV kernel export flow.

It covers the manual QA path for:

- Local file upload
- LOCAL_L0 record creation
- ARV1 QR transfer payload rendering
- Kernel offline certificate HTML
- Kernel certificate PDF export
- Kernel evidence ZIP export
- File-backed kernel verification payload
- Local record JSON viewing
- Safety/scope claims

This checklist is documentation-only. It does not introduce code changes, UI changes, new dependencies, authority registration, public ledger anchoring, RFC 3161 timestamping, HSM/KMS integration, or enterprise workflow behavior.

---

## Preconditions

Repository state:

- Branch is based on latest `main`
- `npm run build` passes
- `npx tsx scripts/smoke-arv-all.ts` passes
- DemoClient route opens successfully in browser
- Browser downloads are allowed
- Popups/new tabs are allowed for the local app

Expected command validation:

```powershell
npm run build
npx tsx scripts\smoke-arv-all.ts