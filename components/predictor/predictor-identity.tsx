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

/** 竞猜者头像 + 昵称 + 平台，表格/卡片/预览通用 */
export function PredictorIdentity({
  predictor,
  avatarSize = 'sm',
  className = '',
}: PredictorIdentityProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {predictor.avatar && (
        <img
          className={`${AVATAR_SIZE[avatarSize]} rounded-full object-cover`}
          src={predictor.avatar}
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
