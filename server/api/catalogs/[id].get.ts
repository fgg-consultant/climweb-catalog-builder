import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!

  const catalog = await prisma.catalog.findUnique({
    where: { id },
    include: {
      _count: { select: { entries: true, versions: true } },
    },
  })

  if (!catalog) {
    throw createError({ statusCode: 404, message: 'Catalog not found' })
  }

  return catalog
})
