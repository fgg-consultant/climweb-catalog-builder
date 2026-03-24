import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!
  const body = await readBody(event)

  return prisma.category.update({
    where: { id },
    data: {
      ...(body.name !== undefined && { name: body.name }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.icon !== undefined && { icon: body.icon }),
      ...(body.sortOrder !== undefined && { sortOrder: body.sortOrder }),
    },
    include: {
      children: true,
      _count: { select: { children: true } },
    },
  })
})
