import { redirect } from 'next/navigation'
import { firstEvent } from '@/lib/data'

export default function PredictionsPage() {
  redirect(`/${firstEvent.id}`)
}
