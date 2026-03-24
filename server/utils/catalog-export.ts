import type { CatalogEntry as PrismaCatalogEntry } from '@prisma/client'
import type {
  CatalogExport,
  CatalogExportCategory,
  CatalogExportSubcategory,
  CatalogExportDataset,
  CategoryConfig,
  SubcategoryConfig,
  DatasetConfig,
  LayerConfig,
} from '~/types/catalog'
import { resolveTranslation } from '~/types/i18n'

/**
 * Build the nested category tree from flat CatalogEntry rows.
 * Groups by category title (en) then subcategory title (en).
 */
export function buildCatalogExport(
  entries: PrismaCatalogEntry[],
  versionNumber?: number
): CatalogExport {
  const categoryMap = new Map<string, {
    config: CategoryConfig
    subcategories: Map<string, {
      config: SubcategoryConfig
      datasets: CatalogExportDataset[]
    }>
  }>()

  for (const entry of entries) {
    if (!entry.enabled) continue

    const category = entry.category as unknown as CategoryConfig
    const subcategory = entry.subcategory as unknown as SubcategoryConfig
    const dataset = entry.datasetConfig as unknown as DatasetConfig
    const layers = entry.layerConfig as unknown as LayerConfig[]

    const catKey = resolveTranslation(category.title, 'en')
    const subKey = resolveTranslation(subcategory.title, 'en')

    if (!categoryMap.has(catKey)) {
      categoryMap.set(catKey, {
        config: category,
        subcategories: new Map(),
      })
    }

    const cat = categoryMap.get(catKey)!
    if (!cat.subcategories.has(subKey)) {
      cat.subcategories.set(subKey, {
        config: subcategory,
        datasets: [],
      })
    }

    const sub = cat.subcategories.get(subKey)!
    sub.datasets.push({
      title: dataset.title,
      description: dataset.description,
      multi_temporal: dataset.multi_temporal ?? true,
      near_realtime: dataset.near_realtime,
      public: dataset.public,
      metadata: dataset.metadata,
      layers,
    })
  }

  const categories: CatalogExportCategory[] = []
  for (const [, cat] of categoryMap) {
    const subcategories: CatalogExportSubcategory[] = []
    for (const [, sub] of cat.subcategories) {
      subcategories.push({
        title: sub.config.title,
        datasets: sub.datasets,
      })
    }
    categories.push({
      title: cat.config.title,
      icon: cat.config.icon,
      subcategories,
    })
  }

  return {
    exportedAt: new Date().toISOString(),
    version: versionNumber,
    categories,
  }
}
