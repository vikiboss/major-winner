import { MAJOR_STAGES } from '@/lib/constants'
import { eventSummaries } from '@/lib/data'
import { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://major.viki.moe'
  const lastModified = new Date()

  return eventSummaries.flatMap(({ id }) => {
    const pages = ['', '/teams', '/leaderboard'].map((route) => ({
      url: `${baseUrl}/${id}${route}`,
      lastModified,
      changeFrequency: 'hourly' as const,
      priority: 1,
    }))

    const stages = MAJOR_STAGES.map((stage) => ({
      url: `${baseUrl}/${id}/stages/${stage}`,
      lastModified,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }))

    return [...pages, ...stages]
  })
}
