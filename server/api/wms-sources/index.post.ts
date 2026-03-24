import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.name || !body.url) {
    throw createError({ statusCode: 400, message: 'name and url are required' })
  }

  return prisma.wmsSource.create({
    data: {
      name: body.name,
      url: body.url,
      description: body.description || null,
    },
  })
})
