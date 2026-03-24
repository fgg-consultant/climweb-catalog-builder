<script setup lang="ts">
import type { WmsCapabilities, WmsCapabilityLayer } from '~/types/wms'
import type { Catalog, CatalogEntry, CatalogEntryCreateInput } from '~/types/catalog'
import { generateProductCode } from '~/utils/product-code'
import { resolveTranslation } from '~/types/i18n'

const route = useRoute()
const sourceId = route.params.id as string

const { data: source } = await useFetch(`/api/wms-sources/${sourceId}`)
const { fetchCapabilities } = useWmsSources()
const { data: catalogs } = await useFetch<Catalog[]>('/api/catalogs')
const { categories, fetchCategories } = useCategories()

await fetchCategories()

const capabilities = ref<WmsCapabilities | null>(source.value?.rawCapabilities as any || null)
const fetchingCaps = ref(false)
const selectedLayers = ref<Set<string>>(new Set())
const importing = ref(false)
const targetCatalogId = ref<string>((catalogs.value?.[0]?.id) || '')
const importCategoryId = ref('')
const importSubcategoryId = ref('')

const selectedImportCategory = computed(() => categories.value.find(c => c.id === importCategoryId.value))
const importSubcategories = computed(() => selectedImportCategory.value?.children || [])

const categoryOptions = computed(() =>
  categories.value.map(c => ({ label: resolveTranslation(c.name, 'en'), value: c.id }))
)
const subcategoryOptions = computed(() =>
  importSubcategories.value.map(s => ({ label: resolveTranslation(s.name, 'en'), value: s.id }))
)

watch(importCategoryId, () => {
  importSubcategoryId.value = ''
})

// Catalog entries for the selected catalog
const catalogEntries = ref<CatalogEntry[]>([])
const loadingEntries = ref(false)

// Diff state
const diff = ref<{ added: string[]; removed: string[]; unchanged: string[] } | null>(null)

// Filter mode
type FilterMode = 'all' | 'new' | 'in-catalog' | 'added' | 'removed'
const filterMode = ref<FilterMode>('all')

// Set of layer_names already in the catalog
const catalogLayerNames = computed(() => {
  const names = new Set<string>()
  for (const entry of catalogEntries.value) {
    const layers = entry.layerConfig as any[]
    for (const lc of layers) {
      if (lc.layer_name) names.add(lc.layer_name)
    }
  }
  return names
})

async function fetchCatalogEntries() {
  if (!targetCatalogId.value) {
    catalogEntries.value = []
    return
  }
  loadingEntries.value = true
  try {
    catalogEntries.value = await $fetch<CatalogEntry[]>(`/api/catalogs/${targetCatalogId.value}/entries`)
  } finally {
    loadingEntries.value = false
  }
}

// Fetch entries when catalog changes
watch(targetCatalogId, () => {
  fetchCatalogEntries()
}, { immediate: true })

function exportRawCapabilities() {
  if (!source.value?.rawCapabilities) return
  const blob = new Blob([JSON.stringify(source.value.rawCapabilities, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${source.value.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-capabilities.json`
  a.click()
  URL.revokeObjectURL(url)
}

function flatLayers(layers: WmsCapabilityLayer[]): WmsCapabilityLayer[] {
  const result: WmsCapabilityLayer[] = []
  for (const layer of layers) {
    if (layer.name) result.push(layer)
    if (layer.children?.length) result.push(...flatLayers(layer.children))
  }
  return result
}

const leafLayers = computed(() => capabilities.value ? flatLayers(capabilities.value.layers) : [])

function computeDiff(previous: WmsCapabilities | null, current: WmsCapabilities) {
  if (!previous) return null

  const prevNames = new Set(flatLayers(previous.layers).map(l => l.name).filter(Boolean) as string[])
  const currNames = new Set(flatLayers(current.layers).map(l => l.name).filter(Boolean) as string[])

  const added: string[] = []
  const removed: string[] = []
  const unchanged: string[] = []

  for (const name of currNames) {
    if (prevNames.has(name)) unchanged.push(name)
    else added.push(name)
  }
  for (const name of prevNames) {
    if (!currNames.has(name)) removed.push(name)
  }

  return { added, removed, unchanged }
}

async function handleFetchCapabilities() {
  fetchingCaps.value = true
  try {
    const result = await fetchCapabilities(sourceId)
    const previous = result.previous
    capabilities.value = result.capabilities
    diff.value = computeDiff(previous, result.capabilities)
  } finally {
    fetchingCaps.value = false
  }
}

const filteredLayers = computed(() => {
  if (filterMode.value === 'all') return leafLayers.value
  if (filterMode.value === 'new') {
    return leafLayers.value.filter(l => l.name && !catalogLayerNames.value.has(l.name))
  }
  if (filterMode.value === 'in-catalog') {
    return leafLayers.value.filter(l => l.name && catalogLayerNames.value.has(l.name))
  }
  if (filterMode.value === 'added' && diff.value) {
    const addedSet = new Set(diff.value.added)
    return leafLayers.value.filter(l => l.name && addedSet.has(l.name))
  }
  if (filterMode.value === 'removed' && diff.value) {
    // Removed layers are not in current capabilities, we can only list names
    return []
  }
  return leafLayers.value
})

const newLayerCount = computed(() => leafLayers.value.filter(l => l.name && !catalogLayerNames.value.has(l.name)).length)
const inCatalogCount = computed(() => leafLayers.value.filter(l => l.name && catalogLayerNames.value.has(l.name)).length)

function toggleLayer(name: string) {
  // Don't allow toggling layers already in catalog
  if (catalogLayerNames.value.has(name)) return
  if (selectedLayers.value.has(name)) {
    selectedLayers.value.delete(name)
  } else {
    selectedLayers.value.add(name)
  }
}

function selectAllNew() {
  for (const layer of leafLayers.value) {
    if (layer.name && !catalogLayerNames.value.has(layer.name)) {
      selectedLayers.value.add(layer.name)
    }
  }
}

function selectNone() {
  selectedLayers.value.clear()
}

function layerStatus(name: string): 'in-catalog' | 'added' | 'new' | 'default' {
  if (catalogLayerNames.value.has(name)) return 'in-catalog'
  if (diff.value?.added.includes(name)) return 'added'
  if (!catalogLayerNames.value.has(name)) return 'new'
  return 'default'
}

async function handleImport() {
  if (!targetCatalogId.value || selectedLayers.value.size === 0) return
  if (!importCategoryId.value) return
  importing.value = true
  try {
    const cat = selectedImportCategory.value!
    const sub = importSubcategories.value.find(s => s.id === importSubcategoryId.value)

    const entries: CatalogEntryCreateInput[] = []
    for (const layer of leafLayers.value) {
      if (!layer.name || !selectedLayers.value.has(layer.name)) continue
      entries.push({
        productCode: generateProductCode(source.value!.url, layer.name),
        category: { title: cat.name, icon: cat.icon || undefined },
        subcategory: { title: sub ? sub.name : { en: 'Observation' } },
        datasetConfig: {
          title: { en: layer.title },
          description: layer.abstract ? { en: layer.abstract } : undefined,
          multi_temporal: !!layer.timeDimension,
          public: true,
          metadata: {
            title: { en: layer.title },
            function: layer.abstract ? { en: layer.abstract } : undefined,
            source: capabilities.value?.service.title || source.value?.name,
          },
        },
        layerConfig: [{
          type: 'wms',
          title: { en: layer.title },
          layer_name: layer.name,
          wms_url: source.value!.url,
          default: true,
        }],
        origin: 'wms_import',
      })
    }

    await $fetch(`/api/catalogs/${targetCatalogId.value}/entries/bulk`, {
      method: 'POST',
      body: { entries },
    })

    selectedLayers.value.clear()
    await fetchCatalogEntries()
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <div v-if="source">
    <div class="mb-6">
      <NuxtLink to="/wms-sources" class="text-sm text-gray-500 hover:text-gray-700">&larr; WMS Sources</NuxtLink>
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ source.name }}</h1>
      <p class="text-sm text-gray-500">{{ source.url }}</p>
    </div>

    <!-- Target catalog selector (always visible) -->
    <div class="flex items-center gap-3 mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
      <span class="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Target catalog:</span>
      <USelect
        v-model="targetCatalogId"
        :options="(catalogs || []).map(c => ({ label: c.name, value: c.id }))"
        placeholder="Select a catalog"
        class="w-64"
      />
      <span v-if="targetCatalogId && !loadingEntries" class="text-sm text-gray-500">
        {{ inCatalogCount }}/{{ leafLayers.length }} layers in catalog
      </span>
      <UIcon v-if="loadingEntries" name="i-heroicons-arrow-path" class="animate-spin text-gray-400" />
    </div>

    <!-- Actions bar -->
    <div class="flex flex-wrap gap-3 mb-6">
      <UButton @click="handleFetchCapabilities" :loading="fetchingCaps" icon="i-heroicons-arrow-path">
        {{ capabilities ? 'Refresh' : 'Fetch' }} Capabilities
      </UButton>
      <UButton
        v-if="source.rawCapabilities"
        variant="outline"
        icon="i-heroicons-arrow-down-tray"
        @click="exportRawCapabilities"
      >
        Export Raw JSON
      </UButton>

      <template v-if="selectedLayers.size > 0 && targetCatalogId">
        <USelect
          v-model="importCategoryId"
          :options="categoryOptions"
          placeholder="Category"
          class="w-48"
        />
        <USelect
          v-model="importSubcategoryId"
          :options="subcategoryOptions"
          placeholder="Subcategory"
          class="w-48"
          :disabled="!importCategoryId"
        />
        <UButton @click="handleImport" :loading="importing" color="green" :disabled="!importCategoryId">
          Import {{ selectedLayers.size }} layers
        </UButton>
      </template>
    </div>

    <!-- Diff banner -->
    <div v-if="diff" class="mb-4 p-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
      <div class="flex items-center gap-2 mb-1">
        <UIcon name="i-heroicons-information-circle" class="text-blue-600" />
        <span class="text-sm font-medium text-blue-800 dark:text-blue-300">Capabilities diff</span>
      </div>
      <div class="flex gap-4 text-sm">
        <span v-if="diff.added.length" class="text-green-700 dark:text-green-400">
          +{{ diff.added.length }} new layers
        </span>
        <span v-if="diff.removed.length" class="text-red-700 dark:text-red-400">
          -{{ diff.removed.length }} removed layers
        </span>
        <span class="text-gray-600 dark:text-gray-400">
          {{ diff.unchanged.length }} unchanged
        </span>
        <span v-if="!diff.added.length && !diff.removed.length" class="text-gray-600 dark:text-gray-400">
          No changes detected
        </span>
      </div>
      <!-- Removed layers detail -->
      <div v-if="diff.removed.length" class="mt-2">
        <details>
          <summary class="text-xs text-red-600 dark:text-red-400 cursor-pointer">Show removed layers</summary>
          <ul class="mt-1 text-xs text-gray-600 dark:text-gray-400 ml-4 list-disc">
            <li v-for="name in diff.removed" :key="name">{{ name }}</li>
          </ul>
        </details>
      </div>
    </div>

    <div v-if="capabilities">
      <!-- Filter bar -->
      <div class="flex items-center gap-3 mb-4">
        <span class="text-sm text-gray-600 dark:text-gray-400">{{ leafLayers.length }} layers</span>
        <div class="flex gap-1">
          <UButton
            size="xs"
            :variant="filterMode === 'all' ? 'solid' : 'ghost'"
            @click="filterMode = 'all'"
          >
            All
          </UButton>
          <UButton
            size="xs"
            :variant="filterMode === 'new' ? 'solid' : 'ghost'"
            @click="filterMode = 'new'"
            :disabled="!targetCatalogId"
          >
            Not in catalog ({{ newLayerCount }})
          </UButton>
          <UButton
            size="xs"
            :variant="filterMode === 'in-catalog' ? 'solid' : 'ghost'"
            @click="filterMode = 'in-catalog'"
            :disabled="!targetCatalogId"
          >
            In catalog ({{ inCatalogCount }})
          </UButton>
          <UButton
            v-if="diff?.added.length"
            size="xs"
            :variant="filterMode === 'added' ? 'solid' : 'ghost'"
            color="green"
            @click="filterMode = 'added'"
          >
            New since refresh (+{{ diff.added.length }})
          </UButton>
        </div>
        <div class="ml-auto flex gap-2">
          <UButton variant="ghost" size="xs" @click="selectAllNew">Select all new</UButton>
          <UButton variant="ghost" size="xs" @click="selectNone">Select none</UButton>
          <span v-if="selectedLayers.size > 0" class="text-sm text-primary-600 font-medium">
            {{ selectedLayers.size }} selected
          </span>
        </div>
      </div>

      <div class="space-y-2 max-h-[60vh] overflow-y-auto">
        <div
          v-for="layer in filteredLayers"
          :key="layer.name"
          class="flex items-start gap-3 p-3 rounded-lg border"
          :class="{
            'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800': layer.name && layerStatus(layer.name) === 'in-catalog',
            'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800': layer.name && layerStatus(layer.name) === 'added',
            'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700': !layer.name || (layerStatus(layer.name!) !== 'in-catalog' && layerStatus(layer.name!) !== 'added'),
          }"
        >
          <UCheckbox
            :model-value="(layer.name && catalogLayerNames.has(layer.name)) || selectedLayers.has(layer.name!)"
            :disabled="!!(layer.name && catalogLayerNames.has(layer.name))"
            @update:model-value="toggleLayer(layer.name!)"
          />
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="font-medium text-sm">{{ layer.title }}</span>
              <UBadge v-if="layer.name && catalogLayerNames.has(layer.name)" size="xs" color="green" variant="subtle">
                in catalog
              </UBadge>
              <UBadge v-else-if="layer.name && diff?.added.includes(layer.name)" size="xs" color="blue" variant="subtle">
                new
              </UBadge>
            </div>
            <div class="text-xs text-gray-500 truncate">{{ layer.name }}</div>
            <p v-if="layer.abstract" class="text-xs text-gray-400 mt-1 line-clamp-2">{{ layer.abstract }}</p>
            <div class="flex gap-2 mt-1">
              <UBadge v-if="layer.timeDimension" size="xs" variant="subtle" color="blue">temporal</UBadge>
              <UBadge v-if="layer.queryable" size="xs" variant="subtle" color="green">queryable</UBadge>
              <UBadge v-for="crs in layer.crs.slice(0, 3)" :key="crs" size="xs" variant="subtle">{{ crs }}</UBadge>
            </div>
          </div>
        </div>
      </div>

      <div v-if="filteredLayers.length === 0" class="text-center py-8 text-gray-500">
        No layers match the current filter.
      </div>
    </div>

    <div v-else-if="!fetchingCaps" class="text-center py-12 text-gray-500">
      Click "Fetch Capabilities" to browse available WMS layers.
    </div>
  </div>
</template>
