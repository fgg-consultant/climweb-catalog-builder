import type { CatalogEntry, CategoryConfig, SubcategoryConfig } from '~/types/catalog'
import { resolveTranslation } from '~/types/i18n'

export interface TreeCategory {
  key: string
  config: CategoryConfig
  subcategories: TreeSubcategory[]
}

export interface TreeSubcategory {
  key: string
  config: SubcategoryConfig
  entries: CatalogEntry[]
}

/**
 * Group flat catalog entries into a category > subcategory tree for UI display.
 */
export function buildTree(entries: CatalogEntry[]): TreeCategory[] {
  const categoryMap = new Map<string, TreeCategory>()

  for (const entry of entries) {
    const catKey = resolveTranslation(entry.category.title, 'en')
    const subKey = resolveTranslation(entry.subcategory.title, 'en')

    if (!categoryMap.has(catKey)) {
      categoryMap.set(catKey, {
        key: catKey,
        config: entry.category,
        subcategories: [],
      })
    }

    const cat = categoryMap.get(catKey)!
    let sub = cat.subcategories.find((s) => s.key === subKey)
    if (!sub) {
      sub = { key: subKey, config: entry.subcategory, entries: [] }
      cat.subcategories.push(sub)
    }

    sub.entries.push(entry)
  }

  return Array.from(categoryMap.values())
}
