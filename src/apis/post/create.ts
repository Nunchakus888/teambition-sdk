import { Observable } from 'rxjs/Observable'
import { SDK } from '../../SDK'
import { Http } from '../../Net'
import { SDKFetch } from '../../SDKFetch'
import { PostModeOptions, PostSchema } from '../../schemas/Post'
import { ProjectId, Visibility, FileId, UserId, TagId } from 'teambition-types'

export interface CreatePostOptions {
  _projectId: ProjectId
  title: string
  content: string
  postMode?: PostModeOptions
  visiable?: Visibility
  attachments?: FileId[]
  involveMembers?: UserId[]
  tagIds?: TagId[]
}

export function createPostFetch(this: SDKFetch, options: CreatePostOptions): Http<PostSchema> {
  return this.post<PostSchema>('posts', options)
}

SDKFetch.prototype.createPost = createPostFetch

declare module '../../SDKFetch' {
  export interface SDKFetch {
    createPost: typeof createPostFetch
  }
}

export function createPost (this: SDK, options: CreatePostOptions): Observable<PostSchema> {
  return this.lift({
    request: this.fetch.createPost(options),
    tableName: 'Post',
    method: 'create'
  })
}

SDK.prototype.createPost = createPost

declare module '../../SDK' {
  export interface SDK {
    createPost: typeof createPost
  }
}
