/**
 * A translatable string field.
 * Can be either a plain string (default language) or an object keyed by ISO 639-1 codes.
 */
export type TranslatableString = string | Record<string, string>

/**
 * Resolve a translatable string to a plain string for a given locale.
 * Falls back to 'en', then first available value, then empty string.
 */
export function resolveTranslation(
  value: TranslatableString | undefined | null,
  locale: string = 'en'
): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  return value[locale] ?? value['en'] ?? Object.values(value)[0] ?? ''
}

/**
 * Ensure a value is in the TranslatableString object format.
 * If it's a plain string, wraps it with the given locale key.
 */
export function toTranslatableObject(
  value: TranslatableString | undefined | null,
  locale: string = 'en'
): Record<string, string> {
  if (!value) return { [locale]: '' }
  if (typeof value === 'string') return { [locale]: value }
  return value
}
