import Image from 'next/image'

import { SITE } from '@/lib/constants'
import { teamMap } from '@/lib/data'

export type TeamLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type TeamLogoStatus = 'normal' | 'win' | 'lose'

interface TeamLogoProps {
  id: string
  size?: TeamLogoSize
  className?: string
  status?: TeamLogoStatus
  hideLabel?: boolean
  wrapperClassName?: string
}

const PIXEL_SIZE: Record<TeamLogoSize, number> = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
}

const LABEL_SIZE: Record<TeamLogoSize, string> = {
  xs: 'text-xs gap-0.5 px-1.5 py-0.5',
  sm: 'text-sm gap-0.5 px-2 py-0.5',
  md: 'text-base gap-1 px-2.5 py-0.5',
  lg: 'text-lg gap-1 px-3 py-1',
  xl: 'text-xl gap-1.5 px-4 py-1.5',
}

/** 带文字时的底色（含圆角，与原始样式保持一致） */
const LABEL_TONE: Record<TeamLogoStatus, string> = {
  normal: 'rounded bg-surface-2 text-tertiary',
  win: 'rounded bg-win/30 text-win',
  lose: 'rounded bg-lose/30 text-lose',
}

/** 仅图标时的描边 */
const ICON_TONE: Record<TeamLogoStatus, string> = {
  normal: 'rounded border border-transparent bg-surface-3 text-tertiary',
  win: 'rounded border border-win/80 bg-win/30 text-win',
  lose: 'rounded border border-lose/80 bg-lose/30 text-lose',
}

/** 战队图标（可选带队名与胜负态） */
export function TeamLogo({
  id,
  size = 'xs',
  className = '',
  wrapperClassName = '',
  status = 'normal',
  hideLabel = false,
}: TeamLogoProps) {
  const pixelSize = PIXEL_SIZE[size]

  const icon = (
    <Image
      src={teamMap.get(id)?.logo || SITE.teamLogo(id)}
      alt={`${id} logo`}
      width={pixelSize}
      height={pixelSize}
      title={id}
      className={`inline-block shrink-0 ${hideLabel ? ICON_TONE[status] : ''} ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
    />
  )

  if (hideLabel) return icon

  return (
    <span
      className={`inline-flex items-center font-medium ${LABEL_TONE[status]} ${LABEL_SIZE[size]} ${wrapperClassName}`}
    >
      {icon}
      {id}
    </span>
  )
}
