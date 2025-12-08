import { MetadataRoute } from 'next'

export const dynamic = 'force-static'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://major.viki.moe'

  const routes = ['', '/teams', '/predictors'].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'hourly' as const,
    priority: 1,
  }))

  const stages = ['stage-1', 'stage-2', 'stage-3', 'finals']
  const predictionRoutes = stages.map((stage) => ({
    url: `${baseUrl}/predictions/${stage}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  return [...routes, ...predictionRoutes]
}
