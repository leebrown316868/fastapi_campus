/**
 * File upload service for handling image uploads to the backend.
 */

import { apiClient } from './api';

// Upload response types
export interface UploadResponse {
  url: string;
  filename: string;
  size: number;
}

export interface UploadError {
  detail: string;
}

/**
 * Upload a single image file
 * @param file - The file to upload
 * @returns Promise with the upload response containing URL
 */
export async function uploadImage(file: File): Promise<UploadResponse> {
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload a JPG, PNG, GIF, or WebP image.');
  }

  // Validate file size (5MB max)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error('File too large. Maximum size is 5MB.');
  }

  // Create FormData
  const formData = new FormData();
  formData.append('file', file);

  try {
    // Get API base URL
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    // Get auth token
    const token = localStorage.getItem('auth_token');

    const response = await fetch(`${API_BASE_URL}/api/upload/image`, {
      method: 'POST',
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      // Handle auth errors - trigger reload to let AuthContext handle redirect
      if (response.status === 401 || response.status === 403) {
        window.location.href = '/';
      }
      const error: UploadError = await response.json().catch(() => ({ detail: response.statusText }));
      throw new Error(error.detail || 'Upload failed');
    }

    const data: UploadResponse = await response.json();

    // Return full URL (combine base URL with relative path)
    return {
      ...data,
      url: `${API_BASE_URL}${data.url}`,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Upload failed. Please try again.');
  }
}

/**
 * Delete an uploaded image by filename
 * @param filename - The filename to delete
 */
export async function deleteImage(filename: string): Promise<void> {
  try {
    await apiClient.delete(`/api/upload/image/${filename}`);
  } catch (error) {
    console.error('Failed to delete image:', error);
    // Don't throw - allow UI to continue even if deletion fails
  }
}

/**
 * Convert a file to preview URL
 * @param file - The file to convert
 * @returns Preview URL string
 */
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Revoke a preview URL to free memory
 * @param url - The preview URL to revoke
 */
export function revokePreviewUrl(url: string): void {
  URL.revokeObjectURL(url);
}

// Export as service object
export const uploadsService = {
  uploadImage,
  deleteImage,
  createPreviewUrl,
  revokePreviewUrl,
};
