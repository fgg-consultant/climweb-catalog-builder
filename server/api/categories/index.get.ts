import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const parentId = query.parentId as string | undefined

  return prisma.category.findMany({
    where: parentId === 'null' || !parentId
      ? { parentId: null }
      : { parentId },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    include: {
      children: {
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      },
      _count: { select: { children: true } },
    },
  })
})
