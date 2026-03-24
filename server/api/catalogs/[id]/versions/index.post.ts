import { prisma } from '~/server/utils/prisma'
import { buildCatalogExport } from '~/server/utils/catalog-export'

export default defineEventHandler(async (event) => {
  const catalogId = getRouterParam(event, 'id')!
  const body = await readBody(event)

  // Get latest version number
  const latest = await prisma.catalogVersion.findFirst({
    where: { catalogId },
    orderBy: { versionNumber: 'desc' },
    select: { versionNumber: true },
  })

  const nextVersion = (latest?.versionNumber ?? 0) + 1

  // Get all enabled entries and build export
  const entries = await prisma.catalogEntry.findMany({
    where: { catalogId, enabled: true },
  })

  const data = buildCatalogExport(entries, nextVersion)

  return prisma.catalogVersion.create({
    data: {
      catalogId,
      versionNumber: nextVersion,
      data: data as any,
      changeSummary: body?.changeSummary || null,
      createdBy: body?.createdBy || null,
    },
  })
})
