import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.name) {
    throw createError({ statusCode: 400, message: 'name is required' })
  }

  return prisma.catalog.create({
    data: {
      name: body.name,
      description: body.description || null,
    },
  })
})
