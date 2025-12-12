import Image from 'next/image'

interface TeamLogoProps {
  shortName: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
  status?: 'normal' | 'win' | 'lose'
  hideLabel?: boolean
  wrapperClassName?: string
}

const pxSizeMap = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
}

const sizeClsMap = {
  xs: 'text-xs flex items-center gap-0.5 px-1.5 py-0.5 font-medium',
  sm: 'text-sm flex items-center gap-0.5 px-2 py-0.5 font-medium',
  md: 'text-base flex items-center gap-1 px-2.5 py-0.5 font-medium',
  lg: 'text-lg flex items-center gap-1 px-3 py-1 font-medium',
  xl: 'text-xl flex items-center gap-1.5 px-4 py-1.5 font-medium',
}

const statusMap = {
  normal: 'rounded bg-surface-2 text-tertiary',
  win: 'rounded bg-win/10 text-win',
  lose: 'rounded bg-lose/10 text-lose',
}

const iconStatusMap = {
  normal: 'rounded bg-surface-3 text-tertiary',
  win: 'rounded bg-win/20 text-win',
  lose: 'rounded bg-lose/20 text-lose',
}

export default function TeamLogo(props: TeamLogoProps) {
  const {
    shortName,
    size = 'xs',
    className = '',
    wrapperClassName = '',
    status = 'normal',
    hideLabel = false,
  } = props
  const pixelSize = pxSizeMap[size]
  const iconStatusClass = iconStatusMap[status]

  const img = (
    <Image
      src={`/logo/${shortName}.png`}
      alt={`${shortName} logo`}
      width={pixelSize}
      height={pixelSize}
      title={shortName}
      className={`inline-block ${hideLabel ? iconStatusClass : ''} ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
    />
  )

  if (hideLabel) {
    return img
  }

  const statusClass = statusMap[status]
  const sizeClass = sizeClsMap[size]

  return (
    <span className={`${statusClass} ${sizeClass} ${wrapperClassName}`}>
      {img}
      {shortName}
    </span>
  )
}
