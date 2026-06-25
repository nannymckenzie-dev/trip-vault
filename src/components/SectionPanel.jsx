import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { TagBadges } from './QuickTags'

function CardRow({ item, type, tripId }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  }

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`flex items-stretch bg-surface ${
        isDragging ? 'rounded-lg shadow-lg ring-1 ring-accent' : ''
      }`}
    >
      {/* Drag handle — isolates dragging from the row's navigation tap. */}
      <button
        type="button"
        className="flex w-10 shrink-0 cursor-grab touch-none items-center justify-center text-text-dim hover:text-text-soft active:cursor-grabbing"
        aria-label="Drag to reorder"
        {...attributes}
        {...listeners}
      >
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
          <circle cx="9" cy="6" r="1.4" /><circle cx="15" cy="6" r="1.4" />
          <circle cx="9" cy="12" r="1.4" /><circle cx="15" cy="12" r="1.4" />
          <circle cx="9" cy="18" r="1.4" /><circle cx="15" cy="18" r="1.4" />
        </svg>
      </button>

      <Link
        to={`/trips/${tripId}/${type.section}/${item.id}`}
        className="flex min-h-[44px] flex-1 items-center justify-between gap-3 py-3 pr-3"
      >
        <div className="min-w-0">
          <p className="truncate font-display font-semibold text-text">{type.title(item)}</p>
          {type.subtitle(item) && (
            <p className="truncate text-sm text-text-soft">{type.subtitle(item)}</p>
          )}
          <TagBadges tags={item.quick_tags} className="mt-1" />
        </div>
        <div className="shrink-0 text-right">
          {type.meta(item) && <p className="text-xs text-text-dim">{type.meta(item)}</p>}
        </div>
      </Link>
    </li>
  )
}

export default function SectionPanel({ type, items, tripId, onReorder }) {
  const [open, setOpen] = useState(true)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    onReorder(arrayMove(items, oldIndex, newIndex))
  }

  return (
    <section className="overflow-hidden rounded-card bg-surface ring-1 ring-line">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-[44px] flex-1 items-center gap-3 text-left"
          aria-expanded={open}
        >
          <span
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-accent-strong"
            style={{ backgroundColor: 'color-mix(in srgb, var(--color-accent) 16%, transparent)' }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <path d={type.icon} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <span className="label-caps text-xs text-text" style={{ letterSpacing: '0.17em' }}>
            {type.plural}
          </span>
          <span className="rounded-full bg-bg px-2 py-0.5 text-xs font-bold text-text-dim">
            {items.length}
          </span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`ml-auto h-4 w-4 text-text-dim transition-transform ${open ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-line">
          {items.length === 0 ? (
            <p className="px-4 py-4 text-sm text-text-dim">No {type.plural.toLowerCase()} yet.</p>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <ul className="divide-y divide-line">
                  {items.map((item) => (
                    <CardRow key={item.id} item={item} type={type} tripId={tripId} />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}

          <Link
            to={`/trips/${tripId}/${type.section}/new`}
            className="flex min-h-[44px] items-center gap-2 border-t border-line px-4 py-3 text-sm font-semibold text-accent-strong hover:bg-surface-2"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            </svg>
            Add {type.singular.toLowerCase()}
          </Link>
        </div>
      )}
    </section>
  )
}
