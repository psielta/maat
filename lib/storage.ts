import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

import { env } from "@/env.mjs"

let s3Client: S3Client | null = null
let bucketReady = false

function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: env.S3_ENDPOINT,
      region: env.S3_REGION,
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY,
        secretAccessKey: env.S3_SECRET_KEY,
      },
      forcePathStyle: env.S3_FORCE_PATH_STYLE,
    })
  }

  return s3Client
}

export async function ensureBucketExists() {
  if (bucketReady) {
    return
  }

  const client = getS3Client()

  try {
    await client.send(new HeadBucketCommand({ Bucket: env.S3_BUCKET }))
  } catch {
    await client.send(new CreateBucketCommand({ Bucket: env.S3_BUCKET }))
  }

  bucketReady = true
}

export function buildStorageKey(
  boardId: string,
  cardId: string,
  attachmentId: string,
  fileName: string
) {
  const safeName = fileName.replace(/[^\w.\-() ]+/g, "_").slice(0, 200)
  return `boards/${boardId}/cards/${cardId}/${attachmentId}/${safeName}`
}

export async function createPresignedPutUrl({
  key,
  mimeType,
  sizeBytes,
}: {
  key: string
  mimeType: string
  sizeBytes: number
}) {
  await ensureBucketExists()

  const command = new PutObjectCommand({
    Bucket: env.S3_BUCKET,
    Key: key,
    ContentType: mimeType || "application/octet-stream",
    ContentLength: sizeBytes,
  })

  return getSignedUrl(getS3Client(), command, { expiresIn: 60 * 15 })
}

export async function createPresignedGetUrl(key: string) {
  await ensureBucketExists()

  return getSignedUrl(
    getS3Client(),
    new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
    }),
    { expiresIn: 60 * 5 }
  )
}

export async function headObject(key: string) {
  await ensureBucketExists()

  return getS3Client().send(
    new HeadObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
    })
  )
}

export async function deleteObject(key: string) {
  await ensureBucketExists()

  await getS3Client().send(
    new DeleteObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: key,
    })
  )
}