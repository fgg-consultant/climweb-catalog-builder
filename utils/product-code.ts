import type { TranslatableString } from '~/types/i18n'
import { resolveTranslation } from '~/types/i18n'

/**
 * Generate a stable product code from WMS URL + layer name.
 * This is the natural key for deduplication.
 */
export function generateProductCode(wmsUrl: string, layerName: string): string {
  const host = extractHost(wmsUrl)
  const normalized = layerName.replace(/[^a-zA-Z0-9:_-]/g, '_').toLowerCase()
  return `${host}:${normalized}`
}

function extractHost(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.replace(/\./g, '_')
  } catch {
    return 'unknown'
  }
}

/**
 * Generate a product code from a dataset title (for manual entries).
 */
export function generateProductCodeFromTitle(title: TranslatableString): string {
  const text = resolveTranslation(title, 'en')
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
