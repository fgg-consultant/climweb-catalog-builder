<script setup lang="ts">
const { catalogs, loading, fetchCatalogs, createCatalog, deleteCatalog } = useCatalogs()

const showCreate = ref(false)
const newName = ref('')
const newDescription = ref('')

const showImport = ref(false)
const importTargetId = ref('')
const importFile = ref<File | null>(null)
const importPreview = ref<{ categories: number; datasets: number } | null>(null)
const importError = ref('')
const importingCatalog = ref(false)
const importData = ref<any>(null)

await fetchCatalogs()

async function handleCreate() {
  if (!newName.value) return
  await createCatalog({ name: newName.value, description: newDescription.value || undefined })
  newName.value = ''
  newDescription.value = ''
  showCreate.value = false
}

async function handleDelete(id: string) {
  if (confirm('Delete this catalog and all its entries?')) {
    await deleteCatalog(id)
  }
}

function openImport() {
  importTargetId.value = catalogs.value[0]?.id || ''
  importFile.value = null
  importPreview.value = null
  importError.value = ''
  importData.value = null
  showImport.value = true
}

async function handleFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  importError.value = ''
  importPreview.value = null
  importData.value = null

  if (!file) {
    importFile.value = null
    return
  }

  importFile.value = file

  try {
    const text = await file.text()
    const data = JSON.parse(text)

    if (!data.categories || !Array.isArray(data.categories)) {
      importError.value = 'Invalid format: missing "categories" array'
      return
    }

    let datasets = 0
    for (const cat of data.categories) {
      for (const sub of cat.subcategories || []) {
        datasets += (sub.datasets || []).length
      }
    }

    importData.value = data
    importPreview.value = { categories: data.categories.length, datasets }
  } catch {
    importError.value = 'Invalid JSON file'
  }
}

async function handleImport() {
  if (!importTargetId.value || !importData.value) return
  importingCatalog.value = true
  importError.value = ''
  try {
    const result = await $fetch<{ imported: number }>(`/api/catalogs/${importTargetId.value}/import`, {
      method: 'POST',
      body: importData.value,
    })
    showImport.value = false
    await fetchCatalogs()
    alert(`Imported ${result.imported} entries`)
  } catch (err: any) {
    importError.value = err.data?.message || 'Import failed'
  } finally {
    importingCatalog.value = false
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Catalogs</h1>
      <div class="flex gap-2">
        <UButton @click="openImport" variant="outline" icon="i-heroicons-arrow-up-tray">
          Import Catalog
        </UButton>
        <UButton @click="showCreate = true" icon="i-heroicons-plus">
          New Catalog
        </UButton>
      </div>
    </div>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Create Catalog</h3>
        </template>
        <div class="space-y-4">
          <UFormGroup label="Name">
            <UInput v-model="newName" placeholder="e.g. EUMETSAT Layers" />
          </UFormGroup>
          <UFormGroup label="Description">
            <UTextarea v-model="newDescription" placeholder="Optional description" />
          </UFormGroup>
        </div>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="showCreate = false">Cancel</UButton>
            <UButton @click="handleCreate" :disabled="!newName">Create</UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Import modal -->
    <UModal v-model="showImport">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Import Catalog</h3>
        </template>
        <div class="space-y-4">
          <UFormGroup label="Target Catalog">
            <USelect
              v-model="importTargetId"
              :options="catalogs.map(c => ({ label: c.name, value: c.id }))"
              placeholder="Select a catalog"
            />
          </UFormGroup>

          <UFormGroup label="JSON File">
            <input
              type="file"
              accept=".json"
              class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 dark:file:bg-primary-900/20 dark:file:text-primary-400"
              @change="handleFileChange"
            />
          </UFormGroup>

          <div v-if="importError" class="text-sm text-red-600 dark:text-red-400">
            {{ importError }}
          </div>

          <div v-if="importPreview" class="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
            <div class="font-medium mb-1">Preview</div>
            <div class="text-gray-600 dark:text-gray-400">
              {{ importPreview.categories }} categories, {{ importPreview.datasets }} datasets
            </div>
          </div>
        </div>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="showImport = false">Cancel</UButton>
            <UButton
              @click="handleImport"
              :loading="importingCatalog"
              :disabled="!importTargetId || !importData"
            >
              Import
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <div v-if="loading" class="text-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl" />
    </div>

    <div v-else-if="catalogs.length === 0" class="text-center py-12 text-gray-500">
      No catalogs yet. Create one to get started.
    </div>

    <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <UCard v-for="catalog in catalogs" :key="catalog.id">
        <template #header>
          <div class="flex items-center justify-between">
            <NuxtLink :to="`/catalogs/${catalog.id}`" class="text-lg font-medium hover:text-primary-600">
              {{ catalog.name }}
            </NuxtLink>
            <UButton variant="ghost" color="red" icon="i-heroicons-trash" size="xs" @click="handleDelete(catalog.id)" />
          </div>
        </template>
        <p v-if="catalog.description" class="text-sm text-gray-600 dark:text-gray-400 mb-3">
          {{ catalog.description }}
        </p>
        <div class="flex gap-4 text-sm text-gray-500">
          <span>{{ catalog._count?.entries ?? 0 }} entries</span>
          <span>{{ catalog._count?.versions ?? 0 }} versions</span>
        </div>
      </UCard>
    </div>
  </div>
</template>
