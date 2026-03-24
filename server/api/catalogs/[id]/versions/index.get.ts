import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const catalogId = getRouterParam(event, 'id')!

  return prisma.catalogVersion.findMany({
    where: { catalogId },
    orderBy: { versionNumber: 'desc' },
    select: {
      id: true,
      versionNumber: true,
      changeSummary: true,
      createdBy: true,
      createdAt: true,
    },
  })
})
