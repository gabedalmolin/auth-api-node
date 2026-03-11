const durationPattern = /^(\d+)(ms|s|m|h|d)$/;

const unitToMs: Record<string, number> = {
  ms: 1,
  s: 1_000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

export function durationToMs(value: string): number {
  if (/^\d+$/.test(value)) {
    return Number(value) * 1_000;
  }

  const match = durationPattern.exec(value.trim());
  if (!match) {
    throw new Error(`Unsupported duration format: ${value}`);
  }

  const [, amount, unit] = match;
  if (!unit) {
    throw new Error(`Unsupported duration format: ${value}`);
  }
  const unitFactor = unitToMs[unit];
  if (!unitFactor) {
    throw new Error(`Unsupported duration format: ${value}`);
  }

  return Number(amount) * unitFactor;
}
