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
      className={`flex items-stretch bg-white dark:bg-slate-900 ${
        isDragging ? 'rounded-lg shadow-lg ring-1 ring-sky-400' : ''
      }`}
    >
      {/* Drag handle — isolates dragging from the row's navigation tap. */}
      <button
        type="button"
        className="flex w-10 shrink-0 cursor-grab touch-none items-center justify-center text-slate-300 hover:text-slate-500 active:cursor-grabbing dark:text-slate-600 dark:hover:text-slate-400"
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
          <p className="truncate font-medium text-slate-900 dark:text-slate-50">
            {type.title(item)}
          </p>
          {type.subtitle(item) && (
            <p className="truncate text-sm text-slate-500 dark:text-slate-400">
              {type.subtitle(item)}
            </p>
          )}
          <TagBadges tags={item.quick_tags} className="mt-1" />
        </div>
        <div className="shrink-0 text-right">
          {type.meta(item) && (
            <p className="text-xs text-slate-400 dark:text-slate-500">{type.meta(item)}</p>
          )}
        </div>
      </Link>
    </li>
  )
}

export default function SectionPanel({ type, items, tripId, onReorder }) {
  const [open, setOpen] = useState(true)
  const sensors = useSensors(
    // Small activation distance so taps still register as navigation.
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
    <section className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-[44px] flex-1 items-center gap-3 text-left"
          aria-expanded={open}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 text-sky-500">
            <path d={type.icon} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="font-semibold text-slate-900 dark:text-slate-50">
            {type.plural}
          </span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
            {items.length}
          </span>
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={`ml-auto h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-100 dark:border-slate-800">
          {items.length === 0 ? (
            <p className="px-4 py-4 text-sm text-slate-400 dark:text-slate-500">
              No {type.plural.toLowerCase()} yet.
            </p>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((item) => (
                    <CardRow key={item.id} item={item} type={type} tripId={tripId} />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}

          <Link
            to={`/trips/${tripId}/${type.section}/new`}
            className="flex min-h-[44px] items-center gap-2 border-t border-slate-100 px-4 py-3 text-sm font-medium text-sky-600 hover:bg-sky-50 dark:border-slate-800 dark:text-sky-400 dark:hover:bg-sky-950/30"
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
