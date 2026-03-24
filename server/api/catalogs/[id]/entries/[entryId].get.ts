import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const entryId = getRouterParam(event, 'entryId')!

  const entry = await prisma.catalogEntry.findUnique({ where: { id: entryId } })
  if (!entry) {
    throw createError({ statusCode: 404, message: 'Entry not found' })
  }

  return entry
})
