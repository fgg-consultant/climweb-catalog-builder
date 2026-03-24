import type { CatalogVersion } from '~/types/catalog'

export function useVersions(catalogId: string) {
  const versions = useState<CatalogVersion[]>(`versions-${catalogId}`, () => [])
  const loading = useState(`versions-loading-${catalogId}`, () => false)

  async function fetchVersions() {
    loading.value = true
    try {
      versions.value = await $fetch<CatalogVersion[]>(`/api/catalogs/${catalogId}/versions`)
    } finally {
      loading.value = false
    }
  }

  async function createVersion(changeSummary?: string, createdBy?: string) {
    const version = await $fetch<CatalogVersion>(`/api/catalogs/${catalogId}/versions`, {
      method: 'POST',
      body: { changeSummary, createdBy },
    })
    versions.value.unshift(version)
    return version
  }

  return { versions, loading, fetchVersions, createVersion }
}
