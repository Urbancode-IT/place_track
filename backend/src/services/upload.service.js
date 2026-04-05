import cloudinary from '../config/cloudinary.js';
import { readFileSync, unlinkSync } from 'fs';

export async function uploadToCloudinary(filePath, folder = 'placetrack') {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    return { secure_url: `/uploads/${filePath}` };
  }
  const result = await cloudinary.uploader.upload(filePath, {
    folder,
    resource_type: 'auto',
  });
  try {
    unlinkSync(filePath);
  } catch {}
  return result;
}

export async function uploadResume(filePath) {
  const result = await uploadToCloudinary(filePath, 'placetrack/resumes');
  return result.secure_url;
}

export async function uploadPhoto(filePath) {
  const result = await uploadToCloudinary(filePath, 'placetrack/photos');
  return result.secure_url;
}
