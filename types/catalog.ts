import type { TranslatableString } from './i18n'

export interface Catalog {
  id: string
  name: string
  description?: string | null
  createdAt: string
  updatedAt: string
  _count?: {
    entries: number
    versions: number
  }
}

export interface CatalogVersion {
  id: string
  catalogId: string
  versionNumber: number
  data: CatalogExport
  changeSummary?: string | null
  createdBy?: string | null
  createdAt: string
}

export interface CatalogEntry {
  id: string
  catalogId: string
  productCode: string
  category: CategoryConfig
  subcategory: SubcategoryConfig
  datasetConfig: DatasetConfig
  layerConfig: LayerConfig[]
  enabled: boolean
  origin: 'config' | 'manual' | 'wms_import'
  createdAt: string
  updatedAt: string
}

export interface CategoryConfig {
  title: TranslatableString
  icon?: string
}

export interface SubcategoryConfig {
  title: TranslatableString
}

export interface DatasetConfig {
  title: TranslatableString
  description?: TranslatableString
  multi_temporal: boolean
  near_realtime?: boolean
  public?: boolean
  metadata?: MetadataConfig
}

export interface MetadataConfig {
  title: TranslatableString
  function?: TranslatableString
  resolution?: string
  geographic_coverage?: TranslatableString
  source?: string
  license?: string
  frequency_of_update?: TranslatableString
  overview?: TranslatableString
  learn_more?: string
}

export interface LayerConfig {
  type: 'wms'
  title: TranslatableString
  layer_name: string
  wms_url: string
  default?: boolean
  extra_params?: Record<string, string>
}

// Export format: the full nested tree
export interface CatalogExport {
  exportedAt?: string
  version?: number
  categories: CatalogExportCategory[]
}

export interface CatalogExportCategory {
  title: TranslatableString
  icon?: string
  subcategories: CatalogExportSubcategory[]
}

export interface CatalogExportSubcategory {
  title: TranslatableString
  datasets: CatalogExportDataset[]
}

export interface CatalogExportDataset {
  title: TranslatableString
  description?: TranslatableString
  multi_temporal: boolean
  near_realtime?: boolean
  public?: boolean
  metadata?: MetadataConfig
  layers: LayerConfig[]
}

export interface CatalogEntryCreateInput {
  productCode: string
  category: CategoryConfig
  subcategory: SubcategoryConfig
  datasetConfig: DatasetConfig
  layerConfig: LayerConfig[]
  enabled?: boolean
  origin?: 'config' | 'manual' | 'wms_import'
}
