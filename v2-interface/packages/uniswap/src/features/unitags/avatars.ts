import { SignMessageFunc, UnitagGetAvatarUploadUrlResponse } from '@universe/api'
import { isLocalFileUri, uploadFileToS3 } from 'uniswap/src/features/unitags/fileUtils'
import { logger } from 'utilities/src/logger/logger'

export async function uploadAndUpdateAvatarAfterClaim({
  username,
  imageUri,
  address,
  signMessage,
}: {
  username: string
  imageUri: string
  address: string
  signMessage: SignMessageFunc
}): Promise<{ success: boolean }> {
  void username
  void imageUri
  void address
  void signMessage
  logger.error('Unitags avatar upload/update is disabled', {
    tags: { file: 'unitags/avatars.ts', function: 'uploadAndUpdateAvatarAfterClaim' },
  })
  return { success: false }
}

export async function tryUploadAvatar({
  avatarImageUri,
  avatarUploadUrlResponse,
  avatarUploadUrlLoading,
}: {
  avatarImageUri: string | undefined
  avatarUploadUrlResponse: UnitagGetAvatarUploadUrlResponse | undefined
  avatarUploadUrlLoading: boolean
}): Promise<{ success: boolean; skipped: boolean }> {
  const needsAvatarUpload = !!avatarImageUri && isLocalFileUri(avatarImageUri)
  const isPreSignedUrlReady =
    !avatarUploadUrlLoading && !!avatarUploadUrlResponse?.preSignedUrl && !!avatarUploadUrlResponse.s3UploadFields
  const shouldTryAvatarUpload = needsAvatarUpload && isPreSignedUrlReady

  if (!shouldTryAvatarUpload) {
    // Return success=true if no upload needed, false if upload needed but can't make request
    return { success: !needsAvatarUpload, skipped: true }
  }

  const avatarUploadResult = await uploadFileToS3(avatarImageUri, {
    preSignedUrl: avatarUploadUrlResponse.preSignedUrl,
    s3UploadFields: avatarUploadUrlResponse.s3UploadFields,
  })

  return { ...avatarUploadResult, skipped: false }
}
