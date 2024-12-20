import ReactDOM from 'react-dom'
import * as Y from 'yjs'
import ReactInputMask from 'react-input-mask'
import useYTextInput from '@/hooks/useYTextInput'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import DatePicker from './DatePicker'
import { DateInputValue, dateInputValueFromString, formatDateInputValue } from '@briefer/editor'
import Spin from '@/components/Spin'
import { CalendarIcon, ExclamationCircleIcon } from '@heroicons/react/24/solid'
import { ClockIcon } from '@heroicons/react/20/solid'
import useEditorAwareness from '@/hooks/useEditorAwareness'

function invalidValueErrorMessage(
  status: 'invalid-value' | 'invalid-variable-and-value' | 'unexpected-error'
): JSX.Element {
  switch (status) {
    case 'invalid-value':
    case 'invalid-variable-and-value':
      return <>The value is invalid.</>
    case 'unexpected-error':
      return <>Unexpected error occurred while updating the input. Click this icon to retry.</>
  }
}

interface Props {
  blockId: string
  value: DateInputValue
  dateType: 'date' | 'datetime'
  newValue: Y.Text
  onSave: () => void
  error: 'invalid-value' | 'unexpected-error' | 'invalid-variable-and-value' | null
  isSaving: boolean
  isEnqueued: boolean
  isEditable: boolean
  belongsToMultiTabGroup: boolean
  isCursorWithin: boolean
  isCursorInserting: boolean
}
function DateInputBlockInput(props: Props) {
  const isLoading = useMemo(() => {
    return props.isSaving || props.isEnqueued
  }, [props.isSaving, props.isEnqueued])

  const { value: newTextValue, onChange: onChangeNewTextValue } = useYTextInput(props.newValue)
  const newValue = dateInputValueFromString(newTextValue, props.value)

  const onChangeEvent = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChangeNewTextValue(e.target.value)
    },
    [onChangeNewTextValue]
  )

  const inputRef = useRef<ReactInputMask>(null)

  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const onClick = useCallback(() => {
    setIsPickerOpen(true)
  }, [])
  useEffect(() => {
    if (isPickerOpen) {
      return
    }

    const previousTextValue = formatDateInputValue(props.value, props.dateType)
    if (newTextValue !== previousTextValue) {
      props.onSave()
    }
  }, [isPickerOpen, newTextValue, props.value, props.dateType, props.onSave])

  const onKeyUp = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        props.onSave()
        setIsPickerOpen(false)
      }
    },
    [props.onSave]
  )

  const pickerContainer = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close the date picker only when clicked outside
      if (
        pickerContainer.current &&
        event.target instanceof Node &&
        !pickerContainer.current.contains(event.target)
      ) {
        setIsPickerOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [pickerContainer])

  const onDatePicked = useCallback(
    (date: DateInputValue) => {
      onChangeNewTextValue(formatDateInputValue(date, props.dateType))
    },
    [onChangeNewTextValue, props.dateType]
  )

  const innerRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (props.isCursorWithin && props.isCursorInserting) {
      innerRef.current?.focus()
    }
  }, [props.isCursorWithin, props.isCursorInserting])

  const unfocusOnEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      innerRef.current?.blur()
      setIsPickerOpen(false)
    }
  }, [])

  const [, editorAPI] = useEditorAwareness()
  const onFocus = useCallback(() => {
    editorAPI.insert(props.blockId, { scrollIntoView: false })
  }, [editorAPI.insert, props.blockId])

  return (
    <div className="relative">
      <ReactInputMask
        ref={inputRef}
        mask={props.dateType === 'date' ? '9999/99/99' : '9999/99/99 99:99:99'}
        value={newTextValue}
        onChange={onChangeEvent}
        onKeyUp={onKeyUp}
        onClick={onClick}
        onFocus={onFocus}
        onBlur={editorAPI.blur}>
        {
          // @ts-ignore
          (inputProps: any) => (
            <input
              {...inputProps}
              ref={innerRef}
              type="text"
              className={clsx(
                'block w-full appearance-none rounded-md border-0 bg-white py-1.5 text-gray-900 shadow-sm ring-1 ring-inset placeholder:text-gray-400 focus:ring-2 focus:ring-inset disabled:cursor-not-allowed disabled:bg-gray-100',
                props.error ? 'ring-red-200 focus:ring-red-200' : 'focus:ring-primary-200',
                props.isCursorWithin && !props.isCursorInserting && !props.belongsToMultiTabGroup
                  ? 'ring-blue-400'
                  : 'ring-gray-200',
                (isLoading || props.error) && 'bg-none' // this removes the caret
              )}
              onKeyDown={unfocusOnEscape}
            />
          )
        }
      </ReactInputMask>

      {ReactDOM.createPortal(
        <div
          className={clsx(
            'absolute z-[2000] mt-1.5 rounded-md border border-gray-200 bg-white px-3 pb-2 pt-1 shadow-lg',
            isPickerOpen ? 'block' : 'hidden'
          )}
          ref={pickerContainer}
          style={{
            top: innerRef.current?.getBoundingClientRect().bottom,
            left: innerRef.current?.getBoundingClientRect().left,
          }}>
          <DatePicker
            value={newValue}
            dateType={props.dateType}
            disabled={isLoading || !props.isEditable}
            onChange={onDatePicked}
          />
        </div>,
        document.body
      )}
      <div className="group absolute inset-y-0 right-0 flex items-center pr-2">
        {props.isSaving ? (
          <Spin />
        ) : props.isEnqueued ? (
          <ClockIcon className="h-4 w-4 text-gray-300" />
        ) : props.error && !isLoading ? (
          <>
            <button onClick={props.onSave}>
              <ExclamationCircleIcon className="h-4 w-4 text-red-300" aria-hidden="true" />
            </button>
            <div className="bg-hunter-950 pointer-events-none absolute -top-2 left-1/2 flex w-32 -translate-x-1/2 -translate-y-full flex-col gap-y-1 rounded-md p-2 font-sans text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
              <span className="inline-flex items-center gap-x-1 text-gray-400">
                <span>{invalidValueErrorMessage(props.error)}</span>
              </span>
            </div>
          </>
        ) : (
          <CalendarIcon className="h-4 w-4 text-gray-400" />
        )}
      </div>
    </div>
  )
}

export default DateInputBlockInput
