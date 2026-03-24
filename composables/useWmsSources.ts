import type { WmsSource, WmsCapabilities, WmsSourceCreateInput } from '~/types/wms'

export function useWmsSources() {
  const sources = useState<WmsSource[]>('wms-sources', () => [])
  const loading = useState('wms-sources-loading', () => false)

  async function fetchSources() {
    loading.value = true
    try {
      sources.value = await $fetch<WmsSource[]>('/api/wms-sources')
    } finally {
      loading.value = false
    }
  }

  async function createSource(data: WmsSourceCreateInput) {
    const source = await $fetch<WmsSource>('/api/wms-sources', {
      method: 'POST',
      body: data,
    })
    sources.value.unshift(source)
    return source
  }

  async function deleteSource(id: string) {
    await $fetch(`/api/wms-sources/${id}`, { method: 'DELETE' })
    sources.value = sources.value.filter((s) => s.id !== id)
  }

  async function fetchCapabilities(id: string): Promise<{ capabilities: WmsCapabilities; previous: WmsCapabilities | null }> {
    return $fetch<{ capabilities: WmsCapabilities; previous: WmsCapabilities | null }>(`/api/wms-sources/${id}/capabilities`, {
      method: 'POST',
    })
  }

  return { sources, loading, fetchSources, createSource, deleteSource, fetchCapabilities }
}
