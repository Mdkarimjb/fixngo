import { Prisma } from '@prisma/client';

export type ReferenceKind = 'SRV' | 'SEL';
export const SUPPORTED_CITIES = ['Guntur', 'Vijayawada'] as const;

const CITY_CODES: Record<string, { name: string; code: string }> = {
  guntur: { name: 'Guntur', code: 'GNT' },
  vijayawada: { name: 'Vijayawada', code: 'VIJ' },
};

export async function nextReferenceCode(
  tx: Prisma.TransactionClient,
  requestedCity: string | undefined,
  kind: ReferenceKind,
): Promise<{ city: string; referenceCode: string }> {
  const trimmed = requestedCity?.trim() || 'Guntur';
  const known = CITY_CODES[trimmed.toLowerCase()];
  const city = known?.name ?? toTitleCase(trimmed);
  const derived = city
    .replace(/[^a-z0-9]/gi, '')
    .slice(0, 3)
    .toUpperCase();
  const cityCode = known?.code ?? derived.padEnd(3, 'X');
  const key = `${cityCode}-${kind}`;
  const sequence = await tx.referenceSequence.upsert({
    where: { key },
    update: { value: { increment: 1 } },
    create: { key, value: 1 },
  });

  return {
    city,
    referenceCode: `${key}-${String(sequence.value).padStart(6, '0')}`,
  };
}

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}
