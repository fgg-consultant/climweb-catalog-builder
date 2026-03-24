import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')!

  const source = await prisma.wmsSource.findUnique({ where: { id } })
  if (!source) {
    throw createError({ statusCode: 404, message: 'WMS source not found' })
  }

  return source
})
