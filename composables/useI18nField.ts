import type { TranslatableString } from '~/types/i18n'
import { toTranslatableObject, resolveTranslation } from '~/types/i18n'

const SUPPORTED_LOCALES = ['en', 'fr', 'es', 'ar'] as const

export function useI18nField(initial?: TranslatableString) {
  const activeLocale = useState('active-locale', () => 'en')
  const translations = ref<Record<string, string>>(toTranslatableObject(initial))

  function getValue(locale?: string): string {
    return resolveTranslation(translations.value, locale ?? activeLocale.value)
  }

  function setValue(text: string, locale?: string) {
    const loc = locale ?? activeLocale.value
    translations.value = { ...translations.value, [loc]: text }
  }

  return {
    activeLocale,
    translations,
    getValue,
    setValue,
    locales: SUPPORTED_LOCALES,
  }
}
