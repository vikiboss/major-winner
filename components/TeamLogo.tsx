import Image from 'next/image'

interface TeamLogoProps {
  shortName: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeMap = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
  xl: 48,
}

export default function TeamLogo({ shortName, size = 'sm', className = '' }: TeamLogoProps) {
  const pixelSize = sizeMap[size]

  return (
    <Image
      src={`/logo/${shortName}.png`}
      alt={`${shortName} logo`}
      width={pixelSize}
      height={pixelSize}
      title={shortName}
      className={`inline-block ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
    />
  )
}
