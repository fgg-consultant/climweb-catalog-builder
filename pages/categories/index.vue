<script setup lang="ts">
import type { Category, CategoryCreateInput, CategoryUpdateInput } from '~/types/category'
import type { TranslatableString } from '~/types/i18n'
import { resolveTranslation, toTranslatableObject } from '~/types/i18n'

const { categories, loading, fetchCategories, createCategory, updateCategory, deleteCategory } = useCategories()

const LOCALES = ['en', 'fr', 'es', 'ar'] as const
const LOCALE_LABELS: Record<string, string> = { en: 'EN', fr: 'FR', es: 'ES', ar: 'AR' }

const AVAILABLE_ICONS = [
  'agriculture', 'violent-wind', 'cloud', 'drought', 'warning',
  'environment', 'fire', 'flood', 'water-source', 'heatwave', 'snippet',
]

const activeLocale = useState('active-locale', () => 'en')

// Modal state
const showModal = ref(false)
const editingCategory = ref<Category | null>(null)
const editingParentId = ref<string | null>(null)

// Form state
const formName = ref<Record<string, string>>({ en: '' })
const formDescription = ref<Record<string, string>>({ en: '' })
const formIcon = ref<string | null>(null)

// Expanded categories
const expandedIds = ref<Set<string>>(new Set())

await fetchCategories()

function toggleExpand(id: string) {
  if (expandedIds.value.has(id)) {
    expandedIds.value.delete(id)
  } else {
    expandedIds.value.add(id)
  }
}

function openCreate(parentId?: string) {
  editingCategory.value = null
  editingParentId.value = parentId || null
  formName.value = { en: '' }
  formDescription.value = { en: '' }
  formIcon.value = parentId ? null : ''
  showModal.value = true
}

function openEdit(category: Category) {
  editingCategory.value = category
  editingParentId.value = category.parentId || null
  formName.value = toTranslatableObject(category.name)
  formDescription.value = toTranslatableObject(category.description)
  formIcon.value = category.icon || null
  showModal.value = true
}

const isSubcategory = computed(() => !!editingParentId.value)

const modalTitle = computed(() => {
  if (editingCategory.value) {
    return isSubcategory.value ? 'Edit Subcategory' : 'Edit Category'
  }
  return isSubcategory.value ? 'New Subcategory' : 'New Category'
})

async function handleSave() {
  const name = formName.value
  if (!name.en?.trim()) return

  if (editingCategory.value) {
    const data: CategoryUpdateInput = {
      name,
      description: Object.values(formDescription.value).some((v) => v) ? formDescription.value : undefined,
      icon: formIcon.value,
    }
    await updateCategory(editingCategory.value.id, data)
  } else {
    const data: CategoryCreateInput = {
      name,
      description: Object.values(formDescription.value).some((v) => v) ? formDescription.value : undefined,
      icon: formIcon.value || undefined,
      parentId: editingParentId.value || undefined,
    }
    await createCategory(data)
  }

  showModal.value = false
  await fetchCategories()
}

async function handleDelete(category: Category) {
  const label = resolveTranslation(category.name, 'en')
  const hasChildren = (category.children?.length ?? 0) > 0
  const msg = hasChildren
    ? `Delete "${label}" and all its subcategories?`
    : `Delete "${label}"?`
  if (confirm(msg)) {
    await deleteCategory(category.id)
  }
}

function resolve(value: TranslatableString | null | undefined): string {
  return resolveTranslation(value, 'en')
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Categories</h1>
      <UButton @click="openCreate()" icon="i-heroicons-plus">
        New Category
      </UButton>
    </div>

    <!-- Modal -->
    <UModal v-model="showModal">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold">{{ modalTitle }}</h3>
        </template>

        <div class="space-y-4">
          <!-- Language tabs -->
          <div class="flex gap-1 border-b border-gray-200 dark:border-gray-700 pb-2">
            <UButton
              v-for="locale in LOCALES"
              :key="locale"
              size="xs"
              :variant="activeLocale === locale ? 'solid' : 'ghost'"
              @click="activeLocale = locale"
            >
              {{ LOCALE_LABELS[locale] }}
            </UButton>
          </div>

          <!-- Name -->
          <UFormGroup :label="`Name (${activeLocale.toUpperCase()})`" required>
            <UInput
              :model-value="formName[activeLocale] || ''"
              @update:model-value="formName = { ...formName, [activeLocale]: $event as string }"
              :placeholder="`Category name in ${activeLocale.toUpperCase()}`"
            />
          </UFormGroup>

          <!-- Description -->
          <UFormGroup :label="`Description (${activeLocale.toUpperCase()})`">
            <UTextarea
              :model-value="formDescription[activeLocale] || ''"
              @update:model-value="formDescription = { ...formDescription, [activeLocale]: $event as string }"
              :placeholder="`Description in ${activeLocale.toUpperCase()}`"
              :rows="3"
            />
          </UFormGroup>

          <!-- Icon (only for top-level categories) -->
          <UFormGroup v-if="!isSubcategory" label="Icon">
            <div class="grid grid-cols-4 gap-2">
              <button
                v-for="icon in AVAILABLE_ICONS"
                :key="icon"
                type="button"
                class="flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-colors"
                :class="formIcon === icon
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'"
                @click="formIcon = formIcon === icon ? null : icon"
              >
                <span class="text-xs text-gray-600 dark:text-gray-400">{{ icon }}</span>
              </button>
            </div>
          </UFormGroup>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton variant="ghost" @click="showModal = false">Cancel</UButton>
            <UButton @click="handleSave" :disabled="!formName.en?.trim()">
              {{ editingCategory ? 'Save' : 'Create' }}
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Loading -->
    <div v-if="loading" class="text-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-2xl" />
    </div>

    <!-- Empty state -->
    <div v-else-if="categories.length === 0" class="text-center py-12 text-gray-500">
      No categories yet. Create one to get started.
    </div>

    <!-- Category list -->
    <div v-else class="space-y-2">
      <div v-for="category in categories" :key="category.id">
        <!-- Category row -->
        <UCard>
          <div class="flex items-center gap-3">
            <!-- Expand toggle -->
            <UButton
              variant="ghost"
              size="xs"
              :icon="expandedIds.has(category.id) ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'"
              @click="toggleExpand(category.id)"
            />

            <!-- Icon -->
            <span v-if="category.icon" class="text-sm text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
              {{ category.icon }}
            </span>

            <!-- Name & description -->
            <div class="flex-1 min-w-0">
              <div class="font-medium text-gray-900 dark:text-white">
                {{ resolve(category.name) }}
              </div>
              <div v-if="resolve(category.description)" class="text-sm text-gray-500 truncate">
                {{ resolve(category.description) }}
              </div>
            </div>

            <!-- Subcategory count -->
            <UBadge v-if="(category.children?.length ?? 0) > 0" variant="subtle" size="xs">
              {{ category.children?.length }} subcategories
            </UBadge>

            <!-- Translation indicator -->
            <div class="flex gap-1">
              <UBadge
                v-for="locale in LOCALES"
                :key="locale"
                size="xs"
                :color="(typeof category.name === 'object' && (category.name as Record<string, string>)[locale]) ? 'green' : 'gray'"
                variant="subtle"
              >
                {{ locale.toUpperCase() }}
              </UBadge>
            </div>

            <!-- Actions -->
            <div class="flex gap-1">
              <UButton variant="ghost" size="xs" icon="i-heroicons-plus" @click="openCreate(category.id)" title="Add subcategory" />
              <UButton variant="ghost" size="xs" icon="i-heroicons-pencil" @click="openEdit(category)" />
              <UButton variant="ghost" size="xs" icon="i-heroicons-trash" color="red" @click="handleDelete(category)" />
            </div>
          </div>

          <!-- Subcategories -->
          <div v-if="expandedIds.has(category.id) && category.children?.length" class="mt-3 ml-10 space-y-2">
            <div
              v-for="sub in category.children"
              :key="sub.id"
              class="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50"
            >
              <div class="flex-1 min-w-0">
                <div class="font-medium text-gray-800 dark:text-gray-200">
                  {{ resolve(sub.name) }}
                </div>
                <div v-if="resolve(sub.description)" class="text-sm text-gray-500 truncate">
                  {{ resolve(sub.description) }}
                </div>
              </div>

              <!-- Translation indicator -->
              <div class="flex gap-1">
                <UBadge
                  v-for="locale in LOCALES"
                  :key="locale"
                  size="xs"
                  :color="(typeof sub.name === 'object' && (sub.name as Record<string, string>)[locale]) ? 'green' : 'gray'"
                  variant="subtle"
                >
                  {{ locale.toUpperCase() }}
                </UBadge>
              </div>

              <div class="flex gap-1">
                <UButton variant="ghost" size="xs" icon="i-heroicons-pencil" @click="openEdit(sub)" />
                <UButton variant="ghost" size="xs" icon="i-heroicons-trash" color="red" @click="handleDelete(sub)" />
              </div>
            </div>
          </div>

          <!-- Empty subcategories message -->
          <div v-if="expandedIds.has(category.id) && !category.children?.length" class="mt-3 ml-10 text-sm text-gray-400">
            No subcategories.
            <UButton variant="link" size="xs" @click="openCreate(category.id)">Add one</UButton>
          </div>
        </UCard>
      </div>
    </div>
  </div>
</template>
