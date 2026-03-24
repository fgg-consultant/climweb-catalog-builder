import type { CatalogEntry, CatalogEntryCreateInput } from '~/types/catalog'

export function useCatalogEntries(catalogId: Ref<string> | string) {
  const id = typeof catalogId === 'string' ? catalogId : catalogId.value
  const entries = useState<CatalogEntry[]>(`entries-${id}`, () => [])
  const loading = useState(`entries-loading-${id}`, () => false)

  async function fetchEntries() {
    loading.value = true
    try {
      entries.value = await $fetch<CatalogEntry[]>(`/api/catalogs/${id}/entries`)
    } finally {
      loading.value = false
    }
  }

  async function createEntry(data: CatalogEntryCreateInput) {
    const entry = await $fetch<CatalogEntry>(`/api/catalogs/${id}/entries`, {
      method: 'POST',
      body: data,
    })
    entries.value.push(entry)
    return entry
  }

  async function updateEntry(entryId: string, data: Partial<CatalogEntry>) {
    const updated = await $fetch<CatalogEntry>(`/api/catalogs/${id}/entries/${entryId}`, {
      method: 'PUT',
      body: data,
    })
    const idx = entries.value.findIndex((e) => e.id === entryId)
    if (idx !== -1) entries.value[idx] = updated
    return updated
  }

  async function deleteEntry(entryId: string) {
    await $fetch(`/api/catalogs/${id}/entries/${entryId}`, { method: 'DELETE' })
    entries.value = entries.value.filter((e) => e.id !== entryId)
  }

  async function bulkImport(importEntries: CatalogEntryCreateInput[]) {
    const result = await $fetch<{ imported: number }>(`/api/catalogs/${id}/entries/bulk`, {
      method: 'POST',
      body: { entries: importEntries },
    })
    await fetchEntries()
    return result
  }

  return { entries, loading, fetchEntries, createEntry, updateEntry, deleteEntry, bulkImport }
}
