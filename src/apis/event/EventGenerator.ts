import { EventSchema } from '../../schemas/Event'
import { isRecurrence } from './utils'
import { clone } from '../../utils'
import { EventId } from 'teambition-types'

const { rrulestr } = require('rrule')

type TimeFrame = { startDate: Date, endDate: Date }

export class EventGenerator implements IterableIterator<EventSchema | undefined> {
  type: 'event' = 'event'
  _id: EventId

  private done: boolean
  private rrule: any
  private startDate: Date
  private isRecurrence = isRecurrence(this.event)
  private interval: number

  [Symbol.iterator] = () => this

  constructor(private event: EventSchema) {
    this._id = event._id
    this.done = false
    if (this.isRecurrence) {
      const startDateObj = new Date(event.startDate)
      const endDateObj = new Date(event.endDate)
      this.interval = endDateObj.valueOf() - startDateObj.valueOf()
      this.startDate = startDateObj
      this.rrule = rrulestr(this.event.recurrence.join('\n'), { forceset: true })
    }
  }

  private makeEvent(timeFrame?: TimeFrame): EventSchema {
    const target = clone(this.event)

    if (!this.isRecurrence || !timeFrame) {
      return target
    }
    // this.isRecurrence && timeFrame

    const timestamp = timeFrame.startDate.valueOf()
    target._id = `${target._id}_${timestamp}`
    target.startDate = timeFrame.startDate.toISOString()
    target.endDate = timeFrame.endDate.toISOString()

    return target
  }

  private computeEndDate(startDate: Date): Date {
    return new Date(startDate.valueOf() + this.interval)
  }

  private slice(
    from: Date, fromCmpOption: 'byStartDate' | 'byEndDate',
    to: Date, toCmpOption: 'byStartDate' | 'byEndDate'
  ): TimeFrame[] {
    let startDate = new Date(this.event.startDate)
    let endDate = new Date(this.event.endDate)
    let eventSpan = { startDate, endDate }

    const skipPred = (eSpan: TimeFrame): boolean =>
      fromCmpOption === 'byStartDate' && eSpan.startDate < from
      || fromCmpOption === 'byEndDate' && eSpan.endDate < from

    const stopPred = (eSpan: TimeFrame): boolean =>
      toCmpOption === 'byStartDate' && eSpan.startDate > to
      || toCmpOption === 'byEndDate' && eSpan.endDate > to

    const result: TimeFrame[] = []

    if (!this.isRecurrence) {
      if (!skipPred(eventSpan) && !stopPred(eventSpan)) {
        result.push({ startDate, endDate })
      }
      return result
    }

    for (; startDate; startDate = this.rrule.after(startDate)) {
      endDate = this.computeEndDate(startDate)
      eventSpan = { startDate, endDate }
      if (stopPred(eventSpan)) {
        break
      }
      if (skipPred(eventSpan)) {
        continue
      }
      result.push(eventSpan)
    }
    return result
  }

  next(): IteratorResult<EventSchema | undefined> {
    const doneRet = { value: undefined, done: true }

    if (!this.isRecurrence) {
      if (this.done) {
        return doneRet
      } else {
        this.done = true
        return { value: this.makeEvent(), done: false }
      }
    }

    const startDate = this.rrule.after(this.startDate, true)
    if (!startDate) {
      return doneRet
    }
    const endDate = this.computeEndDate(startDate)
    const afterDate = this.rrule.after(endDate, true)
    const result = {
      done: !afterDate,
      value: this.makeEvent({ startDate, endDate })
    }
    this.startDate = afterDate
    return result
  }

  takeUntil(startDateUntil: Date, endDateUntil?: Date) {
    const untilDate = !endDateUntil ? startDateUntil : new Date(Math.min(
      startDateUntil.valueOf(),
      endDateUntil.valueOf() - this.interval)
    )
    return this.slice(
      new Date(this.event.startDate), 'byStartDate',
      untilDate, 'byStartDate'
    ).map((eventSpan) => this.makeEvent(eventSpan))
  }

  takeFrom(fromDate: Date, startDateTo: Date, endDateTo?: Date) {
    const toDate = !endDateTo ? startDateTo : new Date(Math.min(
      startDateTo.valueOf(),
      endDateTo.valueOf() - this.interval)
    )
    return this.slice(
      fromDate, 'byEndDate',
      toDate, 'byStartDate'
    ).map((eventSpan) => this.makeEvent(eventSpan))
  }

  after(date: Date) {
    if (!this.isRecurrence) {
      if (new Date(this.event.startDate) < date) {
        return undefined
      } else {
        return this.event
      }
    }
    const startDate = this.rrule.after(date, true)
    if (!startDate) {
      return undefined
    }
    const endDate = this.computeEndDate(startDate)
    return this.makeEvent({ startDate, endDate })
  }
}
