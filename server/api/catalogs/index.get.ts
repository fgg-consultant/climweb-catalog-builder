import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async () => {
  return prisma.catalog.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: {
        select: { entries: true, versions: true },
      },
    },
  })
})
