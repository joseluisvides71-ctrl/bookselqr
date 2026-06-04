import type { Env } from '@/shared/types';

/**
 * Upload an image to Cloudinary
 * Returns the secure URL of the uploaded image
 */
export async function uploadToCloudinary(
  file: File,
  env: Env
): Promise<string> {
  const cloudName = env.CLOUDINARY_CLOUD_NAME;
  const uploadPreset = env.CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary configuration missing. Please configure CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET.');
  }

  // Convert File to base64
  const arrayBuffer = await file.arrayBuffer();
  const base64 = btoa(
    new Uint8Array(arrayBuffer).reduce(
      (data, byte) => data + String.fromCharCode(byte),
      ''
    )
  );
  const fileBase64 = `data:${file.type};base64,${base64}`;

  // Prepare form data for Cloudinary
  const formData = new FormData();
  formData.append('file', fileBase64);
  formData.append('upload_preset', uploadPreset);

  // Upload to Cloudinary
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Cloudinary upload error:', errorText);
    throw new Error(`Error uploading to Cloudinary: ${response.statusText}`);
  }

  const result = await response.json() as { secure_url: string };
  return result.secure_url;
}
