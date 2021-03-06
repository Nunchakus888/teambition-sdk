import { Observable } from 'rxjs/Observable'
import { SDKFetch } from '../../SDKFetch'
import { Http } from '../../Net'
import { SDK } from '../../SDK'

export interface MyCountData {
  favoritesCount: number
  notesCount: number
  organizationsCount: number
  reportCount: number
  subtasksCount: number
  tasksCount: number
}

export function getMyCountFetch(
  this: SDKFetch
): Http<MyCountData> {
  return this.get<MyCountData>(`users/me/count`)
}

SDKFetch.prototype.getMyCount = getMyCountFetch

declare module '../../SDKFetch' {
  interface SDKFetch {
    getMyCount: typeof getMyCountFetch
  }
}

export function getMyCount(
  this: SDK
): Observable<MyCountData> {
  return this.fetch.getMyCount().send()
}

SDK.prototype.getMyCount = getMyCount

declare module '../../SDK' {
  interface SDK {
    getMyCount: typeof getMyCount
  }
}
