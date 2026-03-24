import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const catalogId = getRouterParam(event, 'id')!
  const body = await readBody(event)

  if (!body.productCode || !body.category || !body.subcategory || !body.datasetConfig || !body.layerConfig) {
    throw createError({ statusCode: 400, message: 'productCode, category, subcategory, datasetConfig, and layerConfig are required' })
  }

  return prisma.catalogEntry.create({
    data: {
      catalogId,
      productCode: body.productCode,
      category: body.category,
      subcategory: body.subcategory,
      datasetConfig: body.datasetConfig,
      layerConfig: body.layerConfig,
      enabled: body.enabled ?? true,
      origin: body.origin ?? 'manual',
    },
  })
})
