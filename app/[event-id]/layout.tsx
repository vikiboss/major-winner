import { eventSummaries } from '@/lib/data'
import { Footer } from '@/components/footer'
import { Header } from '@/components/header'

interface EventLayoutProps {
  children: React.ReactNode
  params: Promise<{ 'event-id': string }>
}

export default async function EventLayout({ children, params }: EventLayoutProps) {
  const { 'event-id': eventId } = await params

  return (
    <>
      <Header eventId={eventId} events={eventSummaries} />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  )
}
