<script setup lang="ts">
const { sources, loading, fetchSources, createSource, deleteSource } = useWmsSources()

const showCreate = ref(false)
const form = ref({ name: '', url: '', description: '' })

await fetchSources()

async function handleCreate() {
  if (!form.value.name || !form.value.url) return
  await createSource(form.value)
  form.value = { name: '', url: '', description: '' }
  showCreate.value = false
}

async function handleDelete(id: string) {
  if (confirm('Delete this WMS source?')) {
    await deleteSource(id)
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">WMS Sources</h1>
      <UButton @click="showCreate = true" icon="i-heroicons-plus">Add Source</UButton>
    </div>

    <UModal v-model="showCreate">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">Add WMS Source</h3>
        </template>
        <div class="space-y-4">
          <UFormGroup label="Name">
            <UInput v-model="form.name" placeholder="e.g. EUMETSAT GeoServer" />
          </UFormGroup>
          <UFormGroup label="URL">
            <UInput v-model="form.url" placeholder="https://view.eumetsat.int/geoserver/ows" />
          </UFormGroup>
          <UFormGroup label="Description">
            <UTextarea v-model="form.description" placeholder="Optional" />
          </UFormGroup>
        </div>
        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="showCreate = false">Cancel</UButton>
            <UButton @click="handleCreate" :disabled="!form.name || !form.url">Add</UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <div v-if="loading" class="text-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl" />
    </div>

    <div v-else-if="sources.length === 0" class="text-center py-12 text-gray-500">
      No WMS sources yet. Add one to start browsing layers.
    </div>

    <div v-else class="space-y-3">
      <UCard v-for="source in sources" :key="source.id">
        <div class="flex items-center justify-between">
          <div>
            <NuxtLink :to="`/wms-sources/${source.id}`" class="font-medium hover:text-primary-600">
              {{ source.name }}
            </NuxtLink>
            <p class="text-sm text-gray-500 truncate max-w-md">{{ source.url }}</p>
          </div>
          <div class="flex items-center gap-3">
            <span v-if="source.lastFetched" class="text-xs text-gray-400">
              {{ source.layerCount }} layers
            </span>
            <UButton variant="ghost" color="red" icon="i-heroicons-trash" size="xs" @click="handleDelete(source.id)" />
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>
