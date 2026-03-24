<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex items-center justify-between h-16">
          <div class="flex items-center gap-6">
            <NuxtLink to="/" class="text-lg font-semibold text-gray-900 dark:text-white">
              Climweb Catalog Builder
            </NuxtLink>
            <nav class="flex gap-4">
              <NuxtLink
                to="/"
                class="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                active-class="text-primary-600 dark:text-primary-400 font-medium"
              >
                Catalogs
              </NuxtLink>
              <NuxtLink
                to="/categories"
                class="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                active-class="text-primary-600 dark:text-primary-400 font-medium"
              >
                Categories
              </NuxtLink>
              <NuxtLink
                to="/wms-sources"
                class="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                active-class="text-primary-600 dark:text-primary-400 font-medium"
              >
                WMS Sources
              </NuxtLink>
            </nav>
          </div>
        </div>
      </div>
    </header>
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <slot />
    </main>
  </div>
</template>
