import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const entryId = getRouterParam(event, 'entryId')!
  const body = await readBody(event)

  return prisma.catalogEntry.update({
    where: { id: entryId },
    data: {
      ...(body.category !== undefined && { category: body.category }),
      ...(body.subcategory !== undefined && { subcategory: body.subcategory }),
      ...(body.datasetConfig !== undefined && { datasetConfig: body.datasetConfig }),
      ...(body.layerConfig !== undefined && { layerConfig: body.layerConfig }),
      ...(body.enabled !== undefined && { enabled: body.enabled }),
    },
  })
})
