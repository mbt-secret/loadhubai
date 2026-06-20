import type { DestinationOption, DestinationType } from './types';

export function normalizeDestination(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

export function createCustomDestinationOption(
  type: DestinationType,
  filter: string,
  options: DestinationOption[]
) {
  if (type === 'all') return null;
  const label = filter.replace(/\s+/g, ' ').trim();
  if (!label) return null;
  const normalizedLabel = normalizeDestination(label);
  const exists = options.some((option) => normalizeDestination(option.label) === normalizedLabel);
  if (exists) return null;

  return {
    label,
    code: type === 'country' ? 'TARA' : type === 'city' ? 'ORAS' : 'COD',
    type,
    isCustom: true,
    verified: false
  } satisfies DestinationOption;
}
