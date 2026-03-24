import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async () => {
  return prisma.wmsSource.findMany({
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      url: true,
      description: true,
      lastFetched: true,
      layerCount: true,
      createdAt: true,
      updatedAt: true,
    },
  })
})
