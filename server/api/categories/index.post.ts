import { prisma } from '~/server/utils/prisma'
import { resolveTranslation } from '~/types/i18n'

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.name) {
    throw createError({ statusCode: 400, message: 'name is required' })
  }

  const slug = toSlug(resolveTranslation(body.name, 'en'))
  const id = body.parentId ? `${body.parentId}-${slug}` : slug

  return prisma.category.create({
    data: {
      id,
      name: body.name,
      description: body.description || null,
      icon: body.icon || null,
      sortOrder: body.sortOrder ?? 0,
      parentId: body.parentId || null,
    },
    include: {
      children: true,
      _count: { select: { children: true } },
    },
  })
})
