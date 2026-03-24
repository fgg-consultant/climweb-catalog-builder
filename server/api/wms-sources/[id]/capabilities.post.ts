import { prisma } from '~/server/utils/prisma'
import { fetchWmsCapabilities, flattenLayers } from '~/server/utils/wms-parser'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!

  const source = await prisma.wmsSource.findUnique({ where: { id } })
  if (!source) {
    throw createError({ statusCode: 404, message: 'WMS source not found' })
  }

  const previous = source.rawCapabilities as any || null
  const capabilities = await fetchWmsCapabilities(source.url)
  const leafLayers = flattenLayers(capabilities.layers)

  await prisma.wmsSource.update({
    where: { id },
    data: {
      rawCapabilities: capabilities as any,
      lastFetched: new Date(),
      layerCount: leafLayers.length,
    },
  })

  return { capabilities, previous }
})
