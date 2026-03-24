import type { Category, CategoryCreateInput, CategoryUpdateInput } from '~/types/category'

export function useCategories() {
  const categories = useState<Category[]>('categories', () => [])
  const loading = useState('categories-loading', () => false)

  async function fetchCategories() {
    loading.value = true
    try {
      categories.value = await $fetch<Category[]>('/api/categories')
    } finally {
      loading.value = false
    }
  }

  async function createCategory(data: CategoryCreateInput) {
    const category = await $fetch<Category>('/api/categories', {
      method: 'POST',
      body: data,
    })

    if (category.parentId) {
      const parent = categories.value.find((c) => c.id === category.parentId)
      if (parent) {
        if (!parent.children) parent.children = []
        parent.children.push(category)
      }
    } else {
      categories.value.push(category)
    }

    return category
  }

  async function updateCategory(id: string, data: CategoryUpdateInput) {
    const updated = await $fetch<Category>(`/api/categories/${id}`, {
      method: 'PUT',
      body: data,
    })

    const idx = categories.value.findIndex((c) => c.id === id)
    if (idx !== -1) {
      categories.value[idx] = { ...categories.value[idx], ...updated }
    } else {
      for (const cat of categories.value) {
        const childIdx = cat.children?.findIndex((c) => c.id === id) ?? -1
        if (childIdx !== -1 && cat.children) {
          cat.children[childIdx] = { ...cat.children[childIdx], ...updated }
          break
        }
      }
    }

    return updated
  }

  async function deleteCategory(id: string) {
    await $fetch(`/api/categories/${id}`, { method: 'DELETE' })

    const idx = categories.value.findIndex((c) => c.id === id)
    if (idx !== -1) {
      categories.value.splice(idx, 1)
    } else {
      for (const cat of categories.value) {
        if (cat.children) {
          const childIdx = cat.children.findIndex((c) => c.id === id)
          if (childIdx !== -1) {
            cat.children.splice(childIdx, 1)
            break
          }
        }
      }
    }
  }

  return { categories, loading, fetchCategories, createCategory, updateCategory, deleteCategory }
}
