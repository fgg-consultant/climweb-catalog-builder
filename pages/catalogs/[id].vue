<script setup lang="ts">
import { buildTree } from '~/utils/tree-helpers'
import { resolveTranslation } from '~/types/i18n'
import type { CatalogEntry } from '~/types/catalog'

const route = useRoute()
const catalogId = route.params.id as string

const { data: catalog } = await useFetch(`/api/catalogs/${catalogId}`)
const { entries, loading, fetchEntries, updateEntry, deleteEntry } = useCatalogEntries(catalogId)
const { versions, fetchVersions, createVersion } = useVersions(catalogId)

await fetchEntries()
await fetchVersions()

const tree = computed(() => buildTree(entries.value))
const selectedEntry = ref<CatalogEntry | null>(null)
const expandedCategories = ref<Set<string>>(new Set())
const expandedSubcategories = ref<Set<string>>(new Set())
const activeTab = ref<'tree' | 'versions'>('tree')

function toggleCategory(key: string) {
  if (expandedCategories.value.has(key)) {
    expandedCategories.value.delete(key)
  } else {
    expandedCategories.value.add(key)
  }
}

function toggleSubcategory(key: string) {
  if (expandedSubcategories.value.has(key)) {
    expandedSubcategories.value.delete(key)
  } else {
    expandedSubcategories.value.add(key)
  }
}

function selectEntry(entry: CatalogEntry) {
  selectedEntry.value = entry
}

async function toggleEnabled(entry: CatalogEntry) {
  await updateEntry(entry.id, { enabled: !entry.enabled })
}

async function handleDelete(entry: CatalogEntry) {
  if (confirm('Remove this entry?')) {
    await deleteEntry(entry.id)
    if (selectedEntry.value?.id === entry.id) selectedEntry.value = null
  }
}

async function handleCreateVersion() {
  const summary = prompt('Version change summary (optional):')
  await createVersion(summary || undefined)
}

async function handleExport() {
  const data = await $fetch(`/api/catalogs/${catalogId}/export`)
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${catalog.value?.name || 'catalog'}.json`
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div v-if="catalog">
    <div class="flex items-center justify-between mb-6">
      <div>
        <NuxtLink to="/" class="text-sm text-gray-500 hover:text-gray-700">&larr; Catalogs</NuxtLink>
        <h1 class="text-2xl font-bold text-gray-900 dark:text-white">{{ catalog.name }}</h1>
        <p v-if="catalog.description" class="text-sm text-gray-500">{{ catalog.description }}</p>
      </div>
      <div class="flex gap-2">
        <UButton variant="outline" @click="handleExport" icon="i-heroicons-arrow-down-tray">Export JSON</UButton>
        <UButton @click="handleCreateVersion" icon="i-heroicons-document-duplicate">Save Version</UButton>
      </div>
    </div>

    <UTabs v-model="activeTab" :items="[{ label: 'Layer Tree', slot: 'tree' }, { label: `Versions (${versions.length})`, slot: 'versions' }]">
      <template #tree>
        <div class="grid grid-cols-12 gap-6 mt-4">
          <!-- Tree panel -->
          <div class="col-span-5 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 max-h-[70vh] overflow-y-auto">
            <div v-if="loading" class="text-center py-8">
              <UIcon name="i-heroicons-arrow-path" class="animate-spin" />
            </div>
            <div v-else-if="tree.length === 0" class="text-center py-8 text-gray-500 text-sm">
              No entries yet. Import layers from a WMS source.
            </div>
            <div v-else class="space-y-1">
              <div v-for="cat in tree" :key="cat.key">
                <button
                  class="flex items-center gap-2 w-full text-left px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 font-medium text-sm"
                  @click="toggleCategory(cat.key)"
                >
                  <UIcon :name="expandedCategories.has(cat.key) ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'" class="text-xs" />
                  <UIcon v-if="cat.config.icon" :name="`i-heroicons-${cat.config.icon}`" />
                  {{ resolveTranslation(cat.config.title) }}
                  <UBadge size="xs" variant="subtle">{{ cat.subcategories.reduce((sum, s) => sum + s.entries.length, 0) }}</UBadge>
                </button>

                <div v-if="expandedCategories.has(cat.key)" class="ml-4">
                  <div v-for="sub in cat.subcategories" :key="sub.key">
                    <button
                      class="flex items-center gap-2 w-full text-left px-2 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
                      @click="toggleSubcategory(`${cat.key}/${sub.key}`)"
                    >
                      <UIcon :name="expandedSubcategories.has(`${cat.key}/${sub.key}`) ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'" class="text-xs" />
                      {{ resolveTranslation(sub.config.title) }}
                      <UBadge size="xs" variant="subtle">{{ sub.entries.length }}</UBadge>
                    </button>

                    <div v-if="expandedSubcategories.has(`${cat.key}/${sub.key}`)" class="ml-4">
                      <button
                        v-for="entry in sub.entries"
                        :key="entry.id"
                        class="flex items-center gap-2 w-full text-left px-2 py-1 rounded text-sm"
                        :class="[
                          selectedEntry?.id === entry.id ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700',
                          !entry.enabled ? 'opacity-50' : ''
                        ]"
                        @click="selectEntry(entry)"
                      >
                        <UIcon name="i-heroicons-map" class="text-xs text-gray-400" />
                        {{ resolveTranslation(entry.datasetConfig.title) }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Editor panel -->
          <div class="col-span-7">
            <div v-if="!selectedEntry" class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8 text-center text-gray-500">
              Select an entry from the tree to edit
            </div>
            <CatalogEntryEditor
              v-else
              :entry="selectedEntry"
              @update="updateEntry(selectedEntry!.id, $event)"
              @delete="handleDelete(selectedEntry!)"
              @toggle-enabled="toggleEnabled(selectedEntry!)"
            />
          </div>
        </div>
      </template>

      <template #versions>
        <div class="mt-4 space-y-3">
          <div v-if="versions.length === 0" class="text-center py-8 text-gray-500">
            No versions yet. Save a version to create a snapshot.
          </div>
          <UCard v-for="v in versions" :key="v.id">
            <div class="flex items-center justify-between">
              <div>
                <span class="font-medium">v{{ v.versionNumber }}</span>
                <span class="text-sm text-gray-500 ml-2">{{ new Date(v.createdAt).toLocaleString() }}</span>
                <span v-if="v.createdBy" class="text-sm text-gray-500 ml-2">by {{ v.createdBy }}</span>
              </div>
              <UButton variant="outline" size="xs" @click="handleExportVersion(v.versionNumber)">
                Export
              </UButton>
            </div>
            <p v-if="v.changeSummary" class="text-sm text-gray-600 mt-1">{{ v.changeSummary }}</p>
          </UCard>
        </div>
      </template>
    </UTabs>
  </div>
</template>
