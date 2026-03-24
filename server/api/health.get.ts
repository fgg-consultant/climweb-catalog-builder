import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async () => {
  await prisma.$queryRaw`SELECT 1`
  return { status: 'ok', timestamp: new Date().toISOString() }
})
