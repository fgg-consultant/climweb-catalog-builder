<script setup lang="ts">
import type { CatalogEntry } from '~/types/catalog'
import type { Category } from '~/types/category'
import { resolveTranslation, toTranslatableObject } from '~/types/i18n'

const props = defineProps<{
  entry: CatalogEntry
}>()

const emit = defineEmits<{
  update: [data: Partial<CatalogEntry>]
  delete: []
  toggleEnabled: []
}>()

const locales = ['en', 'fr', 'es', 'ar']
const activeLocale = ref('en')

const { categories, fetchCategories } = useCategories()

const datasetConfig = ref({ ...props.entry.datasetConfig })
const layerConfig = ref([...props.entry.layerConfig])
const selectedCategoryId = ref('')
const selectedSubcategoryId = ref('')

// Fetch categories on mount
onMounted(async () => {
  if (categories.value.length === 0) await fetchCategories()
  // Match current entry to a category by English name
  const catTitle = resolveTranslation(props.entry.category.title, 'en')
  const subTitle = resolveTranslation(props.entry.subcategory.title, 'en')
  const match = categories.value.find(c => resolveTranslation(c.name, 'en') === catTitle)
  if (match) {
    selectedCategoryId.value = match.id
    const subMatch = match.children?.find(s => resolveTranslation(s.name, 'en') === subTitle)
    if (subMatch) selectedSubcategoryId.value = subMatch.id
  }
})

const selectedCategory = computed(() => categories.value.find(c => c.id === selectedCategoryId.value))
const subcategories = computed(() => selectedCategory.value?.children || [])

const categoryOptions = computed(() =>
  categories.value.map(c => ({ label: resolveTranslation(c.name, 'en'), value: c.id }))
)
const subcategoryOptions = computed(() =>
  subcategories.value.map(s => ({ label: resolveTranslation(s.name, 'en'), value: s.id }))
)

// Reset subcategory when category changes
watch(selectedCategoryId, () => {
  selectedSubcategoryId.value = ''
})

watch(() => props.entry, (entry) => {
  datasetConfig.value = { ...entry.datasetConfig }
  layerConfig.value = [...entry.layerConfig]
  const catTitle = resolveTranslation(entry.category.title, 'en')
  const subTitle = resolveTranslation(entry.subcategory.title, 'en')
  const match = categories.value.find(c => resolveTranslation(c.name, 'en') === catTitle)
  if (match) {
    selectedCategoryId.value = match.id
    const subMatch = match.children?.find(s => resolveTranslation(s.name, 'en') === subTitle)
    if (subMatch) selectedSubcategoryId.value = subMatch.id
  }
}, { deep: true })

function save() {
  const cat = selectedCategory.value
  const sub = subcategories.value.find(s => s.id === selectedSubcategoryId.value)

  emit('update', {
    category: {
      title: cat ? cat.name : props.entry.category.title,
      icon: cat?.icon || props.entry.category.icon,
    },
    subcategory: {
      title: sub ? sub.name : props.entry.subcategory.title,
    },
    datasetConfig: datasetConfig.value,
    layerConfig: layerConfig.value,
  })
}
</script>

<template>
  <div class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 space-y-6">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold">{{ resolveTranslation(entry.datasetConfig.title) }}</h3>
      <div class="flex gap-2">
        <UBadge :color="entry.enabled ? 'green' : 'gray'" variant="subtle" class="cursor-pointer" @click="$emit('toggleEnabled')">
          {{ entry.enabled ? 'Enabled' : 'Disabled' }}
        </UBadge>
        <UBadge variant="subtle">{{ entry.origin }}</UBadge>
      </div>
    </div>

    <!-- Language tabs -->
    <div class="flex gap-1 border-b border-gray-200 dark:border-gray-700">
      <button
        v-for="locale in locales"
        :key="locale"
        class="px-3 py-1.5 text-sm border-b-2 -mb-px"
        :class="activeLocale === locale
          ? 'border-primary-500 text-primary-600 font-medium'
          : 'border-transparent text-gray-500 hover:text-gray-700'"
        @click="activeLocale = locale"
      >
        {{ locale.toUpperCase() }}
      </button>
    </div>

    <!-- Category / Subcategory -->
    <div class="grid grid-cols-2 gap-4">
      <UFormGroup label="Category">
        <USelect
          v-model="selectedCategoryId"
          :options="categoryOptions"
          placeholder="Select a category"
        />
      </UFormGroup>
      <UFormGroup label="Subcategory">
        <USelect
          v-model="selectedSubcategoryId"
          :options="subcategoryOptions"
          placeholder="Select a subcategory"
          :disabled="!selectedCategoryId"
        />
      </UFormGroup>
    </div>

    <!-- Dataset config -->
    <UFormGroup label="Dataset Title">
      <UInput
        :model-value="resolveTranslation(datasetConfig.title, activeLocale)"
        @update:model-value="datasetConfig.title = { ...toTranslatableObject(datasetConfig.title), [activeLocale]: $event }"
        :placeholder="`Title (${activeLocale})`"
      />
    </UFormGroup>

    <UFormGroup label="Description">
      <UTextarea
        :model-value="resolveTranslation(datasetConfig.description, activeLocale)"
        @update:model-value="datasetConfig.description = { ...toTranslatableObject(datasetConfig.description), [activeLocale]: $event }"
        :placeholder="`Description (${activeLocale})`"
        rows="3"
      />
    </UFormGroup>

    <div class="grid grid-cols-3 gap-4">
      <UFormGroup>
        <UCheckbox v-model="datasetConfig.multi_temporal" label="Multi-temporal" />
      </UFormGroup>
      <UFormGroup>
        <UCheckbox v-model="datasetConfig.near_realtime" label="Near realtime" />
      </UFormGroup>
      <UFormGroup>
        <UCheckbox v-model="datasetConfig.public" label="Public" />
      </UFormGroup>
    </div>

    <!-- Metadata -->
    <details class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <summary class="font-medium cursor-pointer">Metadata</summary>
      <div class="mt-4 space-y-4" v-if="datasetConfig.metadata">
        <UFormGroup label="Source">
          <UInput v-model="datasetConfig.metadata.source" />
        </UFormGroup>
        <UFormGroup label="Resolution">
          <UInput v-model="datasetConfig.metadata.resolution" />
        </UFormGroup>
        <UFormGroup label="License">
          <UInput v-model="datasetConfig.metadata.license" />
        </UFormGroup>
        <UFormGroup label="Function">
          <UTextarea
            :model-value="resolveTranslation(datasetConfig.metadata.function, activeLocale)"
            @update:model-value="datasetConfig.metadata.function = { ...toTranslatableObject(datasetConfig.metadata.function), [activeLocale]: $event }"
            rows="2"
          />
        </UFormGroup>
        <UFormGroup label="Overview">
          <UTextarea
            :model-value="resolveTranslation(datasetConfig.metadata.overview, activeLocale)"
            @update:model-value="datasetConfig.metadata.overview = { ...toTranslatableObject(datasetConfig.metadata.overview), [activeLocale]: $event }"
            rows="3"
          />
        </UFormGroup>
        <UFormGroup label="Learn More URL">
          <UInput v-model="datasetConfig.metadata.learn_more" type="url" />
        </UFormGroup>
      </div>
    </details>

    <!-- Layers -->
    <details class="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
      <summary class="font-medium cursor-pointer">Layers ({{ layerConfig.length }})</summary>
      <div class="mt-4 space-y-4">
        <div v-for="(layer, i) in layerConfig" :key="i" class="border border-gray-100 dark:border-gray-700 rounded p-3 space-y-3">
          <UFormGroup label="Layer Title">
            <UInput
              :model-value="resolveTranslation(layer.title, activeLocale)"
              @update:model-value="layer.title = { ...toTranslatableObject(layer.title), [activeLocale]: $event }"
            />
          </UFormGroup>
          <div class="grid grid-cols-2 gap-3">
            <UFormGroup label="Layer Name (WMS)">
              <UInput v-model="layer.layer_name" />
            </UFormGroup>
            <UFormGroup label="WMS URL">
              <UInput v-model="layer.wms_url" />
            </UFormGroup>
          </div>
          <UFormGroup>
            <UCheckbox v-model="layer.default" label="Default layer" />
          </UFormGroup>
        </div>
      </div>
    </details>

    <!-- Actions -->
    <div class="flex justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
      <UButton color="red" variant="ghost" @click="$emit('delete')">Delete entry</UButton>
      <UButton @click="save">Save changes</UButton>
    </div>
  </div>
</template>
