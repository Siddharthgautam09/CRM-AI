import type { DocumentType } from '@prisma/client';

/**
 * The two vendor/client-owned steps a file goes through (Flow 4.5) — both
 * STUBS behind a real interface, swapped for the real services later:
 *   - virus check: ClamAV container (scope.md Phase 4);
 *   - "Could the system read it?": the client's own OCR pipeline (SOW A-002).
 */

// The standard EICAR antivirus test string, so the "rejected" path is testable today.
const EICAR = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';

/** shortcut: only detects the EICAR test file — replace with a ClamAV scan before real uploads. */
export async function scanForViruses(data: Buffer): Promise<{ clean: boolean }> {
  return { clean: !data.includes(EICAR) };
}

export interface ReadResult {
  status: 'READ' | 'PARTIAL' | 'FAILED';
  extracted: Record<string, string | number>;
}

/** shortcut: placeholder values per document type — replaced by the client's OCR pipeline. */
export async function readDocument(type: DocumentType, mimeType: string): Promise<ReadResult> {
  if (!/^(application\/pdf|image\/)/.test(mimeType)) {
    return { status: 'FAILED', extracted: {} };
  }
  switch (type) {
    case 'T4':
    case 'NOA':
    case 'PAY_STUB':
    case 'EMPLOYMENT_LETTER':
      return { status: 'READ', extracted: { income: 95000 } };
    case 'MORTGAGE_STATEMENT':
      return { status: 'PARTIAL', extracted: { propertyAddress: '[Placeholder address]' } };
    default:
      return { status: 'READ', extracted: {} };
  }
}

/** "Missing-documents list" — ticked types with nothing received yet. */
export function missingDocuments(required: DocumentType[], received: { type: DocumentType }[]) {
  const have = new Set(received.map((d) => d.type));
  return required.filter((t) => !have.has(t));
}
