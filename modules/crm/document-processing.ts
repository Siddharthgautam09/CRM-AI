import type { DocumentType } from '@prisma/client';

/**
 * Virus check before a file is stored (Flow 4.5) — still a STUB behind a real
 * interface (ClamAV container, scope.md Phase 4). Reading the file is the AI
 * document service's job: see ai-documents.service.ts.
 */

// The standard EICAR antivirus test string, so the "rejected" path is testable today.
const EICAR = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

/** shortcut: only detects the EICAR test file — replace with a ClamAV scan before real uploads. */
export async function scanForViruses(data: Buffer): Promise<{ clean: boolean }> {
  return { clean: !data.includes(EICAR) };
}

/** "Missing-documents list" — ticked types with nothing received yet. */
export function missingDocuments(required: DocumentType[], received: { type: DocumentType }[]) {
  const have = new Set(received.map((d) => d.type));
  return required.filter((t) => !have.has(t));
}
