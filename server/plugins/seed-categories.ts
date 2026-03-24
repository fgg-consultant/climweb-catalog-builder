import { prisma } from '~/server/utils/prisma'

const CATEGORIES = [
  {
    name: { en: 'Agriculture', fr: 'Agriculture', es: 'Agricultura', ar: 'الزراعة' },
    icon: 'agriculture',
  },
  {
    name: { en: 'Atmosphere', fr: 'Atmosphère', es: 'Atmósfera', ar: 'الغلاف الجوي' },
    icon: 'violent-wind',
  },
  {
    name: { en: 'Climate', fr: 'Climat', es: 'Clima', ar: 'المناخ' },
    icon: 'cloud',
  },
  {
    name: { en: 'Drought', fr: 'Sécheresse', es: 'Sequía', ar: 'الجفاف' },
    icon: 'drought',
  },
  {
    name: { en: 'Emergency', fr: 'Urgence', es: 'Emergencia', ar: 'الطوارئ' },
    icon: 'warning',
  },
  {
    name: { en: 'Environment', fr: 'Environnement', es: 'Medio ambiente', ar: 'البيئة' },
    icon: 'environment',
  },
  {
    name: { en: 'Fire', fr: 'Incendie', es: 'Incendio', ar: 'الحرائق' },
    icon: 'fire',
  },
  {
    name: { en: 'Floods', fr: 'Inondations', es: 'Inundaciones', ar: 'الفيضانات' },
    icon: 'flood',
  },
  {
    name: { en: 'Hazard', fr: 'Risque', es: 'Peligro', ar: 'الأخطار' },
    icon: 'warning',
  },
  {
    name: { en: 'Marine', fr: 'Marin', es: 'Marino', ar: 'البحري' },
    icon: 'water-source',
  },
  {
    name: { en: 'Multi-Hazard', fr: 'Multi-risques', es: 'Multiamenaza', ar: 'متعدد الأخطار' },
    icon: 'warning',
  },
  {
    name: { en: 'Ocean', fr: 'Océan', es: 'Océano', ar: 'المحيط' },
    icon: 'water-source',
  },
  {
    name: { en: 'Rainfall', fr: 'Précipitations', es: 'Precipitaciones', ar: 'هطول الأمطار' },
    icon: 'cloud',
  },
  {
    name: { en: 'Temperature', fr: 'Température', es: 'Temperatura', ar: 'درجة الحرارة' },
    icon: 'heatwave',
  },
  {
    name: { en: 'Vegetation', fr: 'Végétation', es: 'Vegetación', ar: 'الغطاء النباتي' },
    icon: 'snippet',
  },
  {
    name: { en: 'Water', fr: 'Eau', es: 'Agua', ar: 'المياه' },
    icon: 'water-source',
  },
]

const SUBCATEGORIES = [
  { name: { en: 'Observation', fr: 'Observation', es: 'Observación', ar: 'الرصد' } },
  { name: { en: 'Forecast', fr: 'Prévision', es: 'Pronóstico', ar: 'التنبؤ' } },
  { name: { en: 'Monitoring', fr: 'Surveillance', es: 'Monitoreo', ar: 'المراقبة' } },
]

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export default defineNitroPlugin(async () => {
  try {
    const existing = await prisma.category.count()
    if (existing > 0) {
      console.log(`[seed] Categories already exist (${existing}), skipping seed.`)
      return
    }

    for (let i = 0; i < CATEGORIES.length; i++) {
      const catId = toSlug(CATEGORIES[i].name.en)

      await prisma.category.create({
        data: {
          id: catId,
          name: CATEGORIES[i].name,
          icon: CATEGORIES[i].icon,
          sortOrder: i,
        },
      })

      for (let j = 0; j < SUBCATEGORIES.length; j++) {
        const subId = `${catId}-${toSlug(SUBCATEGORIES[j].name.en)}`

        await prisma.category.create({
          data: {
            id: subId,
            name: SUBCATEGORIES[j].name,
            parentId: catId,
            sortOrder: j,
          },
        })
      }
    }

    console.log(`[seed] Seeded ${CATEGORIES.length} categories with ${SUBCATEGORIES.length} subcategories each.`)
  } catch (err) {
    console.error('[seed] Failed to seed categories:', err)
  }
})
