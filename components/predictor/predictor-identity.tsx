import type { Predictor } from '@/types'

interface PredictorIdentityProps {
  predictor: Pick<Predictor, 'name' | 'avatar' | 'link' | 'platform'>
  avatarSize?: 'sm' | 'md'
  className?: string
}

const AVATAR_SIZE = {
  sm: 'size-8',
  md: 'size-10',
}

const PROXY_DOMAINS = ['pbs.twimg.com', 'yt3.googleusercontent.com']

const getReferer = (u: string) => {
  switch (true) {
    case u.includes('twimg'):
      return 'https://x.com'
    case u.includes('yt3'):
      return 'https://youtube.com'
    default:
      return ''
  }
}

const getProxyUrl = (u: string) =>
  `https://nettools-img3.oxyry.com/image-proxy?url=${encodeURIComponent(u)}&referer=${encodeURIComponent(getReferer(u))}`

/** 竞猜者头像 + 昵称 + 平台，表格/卡片/预览通用 */
export function PredictorIdentity({
  predictor,
  avatarSize = 'sm',
  className = '',
}: PredictorIdentityProps) {
  const url =
    predictor.avatar && PROXY_DOMAINS.some((e) => predictor.avatar?.includes(e))
      ? getProxyUrl(predictor.avatar)
      : predictor.avatar

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {predictor.avatar && (
        <img
          className={`${AVATAR_SIZE[avatarSize]} rounded-full object-cover`}
          src={url}
          alt={`${predictor.name} logo`}
          referrerPolicy="no-referrer"
          loading="lazy"
        />
      )}
      <div className="flex flex-col items-start">
        <a
          className="text-primary hover:text-primary-400 text-sm font-medium text-nowrap hover:underline"
          href={predictor.link || '#'}
          target="_blank"
          rel="noopener noreferrer"
        >
          {predictor.name}
        </a>
        {predictor.platform && (
          <span className="text-primary-400 text-xs text-nowrap">@{predictor.platform}</span>
        )}
      </div>
    </div>
  )
}
