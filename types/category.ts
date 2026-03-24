import type { TranslatableString } from './i18n'

export interface Category {
  id: string
  name: TranslatableString
  description?: TranslatableString | null
  icon?: string | null
  sortOrder: number
  parentId?: string | null
  createdAt: string
  updatedAt: string
  children?: Category[]
  _count?: {
    children: number
  }
}

export interface CategoryCreateInput {
  name: TranslatableString
  description?: TranslatableString
  icon?: string
  sortOrder?: number
  parentId?: string
}

export interface CategoryUpdateInput {
  name?: TranslatableString
  description?: TranslatableString
  icon?: string | null
  sortOrder?: number
}
