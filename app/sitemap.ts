import { evt } from '@/lib/data'
import { MAJOR_STAGES } from '@/lib/constants'
import { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://major.viki.moe'

  return evt.eventNames.flatMap(({ id }) => {
    const routes = ['', '/teams', '/leaderboard'].map((route) => ({
      url: `${baseUrl}/${id}${route}`,
      lastModified: new Date(),
      changeFrequency: 'hourly' as const,
      priority: 1,
    }))

    const predictionRoutes = MAJOR_STAGES.map((stage) => ({
      url: `${baseUrl}/${id}/stages/${stage}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }))

    return [...routes, ...predictionRoutes]
  })
}
