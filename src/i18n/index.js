import { ref, computed, inject, provide } from 'vue'
import { locales } from './locales.js'

const I18N_KEY = Symbol('i18n')

export function createI18n(initialLocale = 'zh') {
  const currentLocale = ref(initialLocale)

  const t = (key, params = {}) => {
    const keys = key.split('.')
    let value = locales[currentLocale.value]
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k]
      } else {
        return key
      }
    }
    if (typeof value !== 'string') return key
    return Object.keys(params).reduce((str, paramKey) => {
      return str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), params[paramKey])
    }, value)
  }

  const setLocale = (locale) => {
    if (locales[locale]) {
      currentLocale.value = locale
      localStorage.setItem('app-locale', locale)
    }
  }

  const loadSavedLocale = () => {
    const saved = localStorage.getItem('app-locale')
    if (saved && locales[saved]) {
      currentLocale.value = saved
    }
  }

  const i18n = {
    locale: computed(() => currentLocale.value),
    t,
    setLocale,
    loadSavedLocale
  }

  provide(I18N_KEY, i18n)

  return i18n
}

export function useI18n() {
  const i18n = inject(I18N_KEY)
  if (!i18n) {
    console.warn('[i18n] useI18n() must be called within a component that has createI18n() as an ancestor')
    const fallbackLocale = ref('zh')
    const fallbackT = (key, params = {}) => {
      const keys = key.split('.')
      let value = locales.zh
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k]
        } else {
          return key
        }
      }
      if (typeof value !== 'string') return key
      return Object.keys(params).reduce((str, paramKey) => {
        return str.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), params[paramKey])
      }, value)
    }
    return {
      locale: computed(() => fallbackLocale.value),
      t: fallbackT,
      setLocale: () => {},
      loadSavedLocale: () => {}
    }
  }
  return i18n
}
