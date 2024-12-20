import useDropdownPosition from '@/hooks/dropdownPosition'
import clsx from 'clsx'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

export const Tooltip = ({
  title,
  message,
  children,
  className,
  position = 'top',
  tooltipClassname,
  active,
}: {
  title?: string
  message: string
  children: React.ReactNode
  className?: string
  position?: 'top' | 'bottom' | 'left' | 'right' | 'manual'
  tooltipClassname?: string
  active?: boolean
}) => {
  return (
    <div className={clsx(`group relative`, className)}>
      {children}

      {active && (
        <div
          className={clsx(
            'bg-hunter-950 pointer-events-none absolute z-[4000] flex flex-col items-center justify-center gap-y-1 rounded-md p-2 font-sans text-xs text-white opacity-0 transition-opacity group-hover:opacity-100',
            getPosClass(position),
            tooltipClassname
          )}>
          {title && <span>{title}</span>}
          <span className="inline-flex items-center justify-center text-center text-gray-400">
            {message}
          </span>
        </div>
      )}
    </div>
  )
}

const getPosClass = (position: 'top' | 'bottom' | 'left' | 'right' | 'manual'): string => {
  switch (position) {
    case 'top':
      return '-top-1 left-1/2 -translate-x-1/2 -translate-y-full'
    case 'bottom':
      return '-bottom-1 right-1/2 translate-x-1/2 translate-y-full'
    case 'left':
      return '-left-1 top-1/2 -translate-x-full -translate-y-1/2'
    case 'right':
      return 'right-0 top-1/2 translate-x-full -translate-y-1/2'
    case 'manual':
      return ''
  }
}

interface PortalTooltipProps {
  className?: string
  children: React.ReactNode
  content: React.ReactNode
}
export function PortalTooltip(props: PortalTooltipProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(false)
  const { onOpen, dropdownPosition } = useDropdownPosition(ref, 'top')
  useEffect(() => {
    if (active) {
      onOpen()
    }
  }, [active])

  return (
    <div
      className={clsx(props.className, 'relative')}
      ref={ref}
      onMouseEnter={() => setActive(true)}
      onMouseLeave={() => setActive(false)}>
      {props.children}
      {createPortal(
        <div
          className={clsx(
            'absolute z-[2000] -translate-y-full pb-2 subpixel-antialiased transition-opacity',
            active ? 'opacity-100' : 'invisible opacity-0'
          )}
          style={dropdownPosition}>
          {props.content}
        </div>,
        document.body
      )}
    </div>
  )
}
