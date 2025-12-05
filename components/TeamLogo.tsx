import Image from 'next/image'

interface TeamLogoProps {
  shortName: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const sizeMap = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 32,
}

export default function TeamLogo({ shortName, size = 'sm', className = '' }: TeamLogoProps) {
  const pixelSize = sizeMap[size]

  return (
    <Image
      src={`/logo/${shortName}.png`}
      alt={`${shortName} logo`}
      width={pixelSize}
      height={pixelSize}
      className={`inline-block ${className}`}
      style={{ width: pixelSize, height: pixelSize }}
    />
  )
}
