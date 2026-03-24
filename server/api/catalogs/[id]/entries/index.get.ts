import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const catalogId = getRouterParam(event, 'id')!
  const query = getQuery(event)

  const where: any = { catalogId }
  if (query.origin) where.origin = query.origin
  if (query.enabled !== undefined) where.enabled = query.enabled === 'true'

  return prisma.catalogEntry.findMany({
    where,
    orderBy: { createdAt: 'asc' },
  })
})
