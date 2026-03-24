import type { Catalog } from '~/types/catalog'

export function useCatalogs() {
  const catalogs = useState<Catalog[]>('catalogs', () => [])
  const loading = useState('catalogs-loading', () => false)

  async function fetchCatalogs() {
    loading.value = true
    try {
      catalogs.value = await $fetch<Catalog[]>('/api/catalogs')
    } finally {
      loading.value = false
    }
  }

  async function createCatalog(data: { name: string; description?: string }) {
    const catalog = await $fetch<Catalog>('/api/catalogs', {
      method: 'POST',
      body: data,
    })
    catalogs.value.unshift(catalog)
    return catalog
  }

  async function deleteCatalog(id: string) {
    await $fetch(`/api/catalogs/${id}`, { method: 'DELETE' })
    catalogs.value = catalogs.value.filter((c) => c.id !== id)
  }

  return { catalogs, loading, fetchCatalogs, createCatalog, deleteCatalog }
}
