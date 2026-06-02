// XHR-based file upload with progress reporting.
//
// `fetch` cannot report upload progress, so every uploader that wants a
// percentage bar goes through this helper instead. Resolves with the parsed
// JSON body on a 2xx response; rejects with the server's `error` message
// (or a generic fallback) on anything else, including network failures.

type UploadOptions = {
  url: string
  file: Blob
  /** Form field name for the file. Defaults to 'file'. */
  fieldName?: string
  /** File name to send alongside the blob. Defaults to 'upload'. */
  fileName?: string
  /** Extra string form fields to append (e.g. caption, eventName). */
  fields?: Record<string, string>
  /** HTTP method. Defaults to 'POST'. */
  method?: string
  /** Called with an integer 0–100 as the upload streams. */
  onProgress?: (percent: number) => void
}

export function uploadWithProgress<T = unknown>(options: UploadOptions): Promise<T> {
  const { url, file, fieldName = 'file', fileName = 'upload', fields = {}, method = 'POST', onProgress } = options

  return new Promise<T>((resolve, reject) => {
    const form = new FormData()
    form.append(fieldName, file, fileName)
    for (const [key, value] of Object.entries(fields)) form.append(key, value)

    const xhr = new XMLHttpRequest()
    xhr.open(method, url)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      let data: unknown = null
      try { data = JSON.parse(xhr.responseText) } catch { /* non-JSON body */ }
      if (xhr.status >= 200 && xhr.status < 300) {
        // Ensure progress lands on 100 even if no final progress event fired.
        onProgress?.(100)
        resolve(data as T)
      } else {
        const message = (data as { error?: string } | null)?.error ?? 'Upload failed. Please try again.'
        reject(new Error(message))
      }
    }

    xhr.onerror = () => reject(new Error('Network error. Please check your connection and try again.'))
    xhr.onabort = () => reject(new Error('Upload cancelled.'))

    xhr.send(form)
  })
}
