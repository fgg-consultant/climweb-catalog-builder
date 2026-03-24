import { prisma } from '~/server/utils/prisma'
import { buildCatalogExport } from '~/server/utils/catalog-export'

export default defineEventHandler(async (event) => {
  const catalogId = getRouterParam(event, 'id')!
  const query = getQuery(event)

  // If a version is requested, return that snapshot
  if (query.version) {
    const version = await prisma.catalogVersion.findFirst({
      where: { catalogId, versionNumber: Number(query.version) },
    })
    if (!version) {
      throw createError({ statusCode: 404, message: 'Version not found' })
    }
    return version.data
  }

  // Otherwise build from current entries
  const entries = await prisma.catalogEntry.findMany({
    where: { catalogId, enabled: true },
  })

  return buildCatalogExport(entries)
})
