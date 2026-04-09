/**
 * Compress image file to reduce size before upload
 * @param {File} file - Original image file
 * @param {number} maxWidth - Maximum width (default 1920)
 * @param {number} maxHeight - Maximum height (default 1920)
 * @param {number} quality - JPEG quality 0-1 (default 0.85)
 * @returns {Promise<File>} Compressed image file
 */
export async function compressImage(file, maxWidth = 1920, maxHeight = 1920, quality = 0.85) {
  // If file is already small, return as-is
  if (file.size < 500000) { // Less than 500KB
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions while maintaining aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas to Blob failed'));
              return;
            }
            // Create new File from blob
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
}

/**
 * Compress multiple images
 * @param {File[]} files - Array of image files
 * @returns {Promise<File[]>} Array of compressed files
 */
export async function compressImages(files) {
  const promises = files.map(file => compressImage(file));
  return Promise.all(promises);
}
