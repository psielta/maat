export function putFile(
  uploadUrl: string,
  file: File,
  onProgress?: (progress: number) => void
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest()
    request.open("PUT", uploadUrl)
    request.setRequestHeader(
      "Content-Type",
      file.type || "application/octet-stream"
    )

    request.upload.onprogress = (event) => {
      if (!event.lengthComputable || !onProgress) {
        return
      }

      onProgress(Math.round((event.loaded / event.total) * 100))
    }

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve()
        return
      }

      reject(new Error("Upload failed."))
    }

    request.onerror = () => reject(new Error("Upload failed."))
    request.send(file)
  })
}