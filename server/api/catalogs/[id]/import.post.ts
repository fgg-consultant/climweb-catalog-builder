import { prisma } from '~/server/utils/prisma'
import type {
  CatalogExport,
  CatalogExportCategory,
  CatalogExportSubcategory,
  CatalogExportDataset,
} from '~/types/catalog'
import { resolveTranslation } from '~/types/i18n'

function generateProductCodeFromLayer(dataset: CatalogExportDataset): string {
  if (dataset.layers?.length) {
    const layer = dataset.layers[0]
    try {
      const host = new URL(layer.wms_url).hostname.replace(/\./g, '_')
      const normalized = layer.layer_name.replace(/[^a-zA-Z0-9:_-]/g, '_').toLowerCase()
      return `${host}:${normalized}`
    } catch {
      // fall through
    }
  }
  // Fallback: slug from title
  const title = resolveTranslation(dataset.title, 'en')
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export default defineEventHandler(async (event) => {
  const catalogId = getRouterParam(event, 'id')!
  const body = await readBody<CatalogExport>(event)

  if (!body.categories?.length) {
    throw createError({ statusCode: 400, message: 'No categories found in import data' })
  }

  const catalog = await prisma.catalog.findUnique({ where: { id: catalogId } })
  if (!catalog) {
    throw createError({ statusCode: 404, message: 'Catalog not found' })
  }

  const entries: Array<{
    productCode: string
    category: { title: any; icon?: string }
    subcategory: { title: any }
    datasetConfig: any
    layerConfig: any
    origin: string
  }> = []

  for (const cat of body.categories) {
    for (const sub of cat.subcategories) {
      for (const dataset of sub.datasets) {
        const productCode = generateProductCodeFromLayer(dataset)
        entries.push({
          productCode,
          category: { title: cat.title, icon: cat.icon },
          subcategory: { title: sub.title },
          datasetConfig: {
            title: dataset.title,
            description: dataset.description,
            multi_temporal: dataset.multi_temporal ?? true,
            near_realtime: dataset.near_realtime,
            public: dataset.public,
            metadata: dataset.metadata,
          },
          layerConfig: dataset.layers || [],
          origin: 'config',
        })
      }
    }
  }

  const results = await prisma.$transaction(
    entries.map((entry) =>
      prisma.catalogEntry.upsert({
        where: {
          catalogId_productCode: {
            catalogId,
            productCode: entry.productCode,
          },
        },
        create: {
          catalogId,
          productCode: entry.productCode,
          category: entry.category,
          subcategory: entry.subcategory,
          datasetConfig: entry.datasetConfig,
          layerConfig: entry.layerConfig,
          enabled: true,
          origin: entry.origin,
        },
        update: {
          category: entry.category,
          subcategory: entry.subcategory,
          datasetConfig: entry.datasetConfig,
          layerConfig: entry.layerConfig,
        },
      })
    )
  )

  return { imported: results.length }
})
