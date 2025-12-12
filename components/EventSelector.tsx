import { evt } from '@/lib/data'

export function EventSelector() {
  return (
    <select className="bg-surface-1 text-primary hover:bg-surface-2 rounded border-none px-0 text-left text-[10px] transition-colors sm:px-3 sm:py-1 sm:text-right sm:text-xs">
      {evt.eventNames.map((event) => (
        <option key={event.id} value={event.id} className="bg-surface-1 text-primary text-left">
          {event.name}
        </option>
      ))}
    </select>
  )
}
