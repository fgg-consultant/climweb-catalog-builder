import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const catalogId = getRouterParam(event, 'id')!
  const body = await readBody(event)

  if (!Array.isArray(body.entries) || body.entries.length === 0) {
    throw createError({ statusCode: 400, message: 'entries array is required' })
  }

  const results = await prisma.$transaction(
    body.entries.map((entry: any) =>
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
          enabled: entry.enabled ?? true,
          origin: entry.origin ?? 'wms_import',
        },
        update: {
          category: entry.category,
          subcategory: entry.subcategory,
          datasetConfig: entry.datasetConfig,
          layerConfig: entry.layerConfig,
          enabled: entry.enabled ?? true,
        },
      })
    )
  )

  return { imported: results.length }
})
