import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const entryId = getRouterParam(event, 'entryId')!

  await prisma.catalogEntry.delete({ where: { id: entryId } })
  return { success: true }
})
