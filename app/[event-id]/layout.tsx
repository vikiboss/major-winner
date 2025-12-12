import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { firstEvent } from '@/lib/data'

interface RootLayoutProps {
  children: React.ReactNode
  params: Promise<{ 'event-id': string }>
}

export default async function RootLayout({ children, params }: RootLayoutProps) {
  const { 'event-id': eventId = firstEvent.id } = await params

  return (
    <>
      <Header eventId={eventId} />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  )
}
