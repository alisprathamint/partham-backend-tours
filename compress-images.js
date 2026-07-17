import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const uploadsDir = './uploads';

async function compressAll() {
  console.log("Starting image compression...");
  
  if (!fs.existsSync(uploadsDir)) {
    console.error("Uploads directory not found!");
    return;
  }

  const files = fs.readdirSync(uploadsDir);
  let count = 0;

  for (const file of files) {
    const filePath = path.join(uploadsDir, file);
    const stats = fs.statSync(filePath);

    // Only compress image files (jpg, jpeg, png) that are larger than 300KB
    if (/\.(jpg|jpeg|png)$/i.test(file) && stats.size > 300 * 1024) {
      console.log(`Compressing ${file} (${(stats.size / 1024 / 1024).toFixed(2)} MB)...`);
      
      const tempPath = filePath + '.temp';
      
      try {
        await sharp(filePath)
          .resize({ width: 1200, withoutEnlargement: true }) // limit width to 1200px
          .jpeg({ quality: 80, mozjpeg: true }) // compress as high quality jpeg
          .toFile(tempPath);

        // Replace original file with compressed one
        fs.unlinkSync(filePath);
        fs.renameSync(tempPath, filePath);

        const newStats = fs.statSync(filePath);
        console.log(`Success! New size: ${(newStats.size / 1024).toFixed(2)} KB (Reduced by ${(((stats.size - newStats.size) / stats.size) * 100).toFixed(1)}%)`);
        count++;
      } catch (err) {
        console.error(`Failed to compress ${file}:`, err.message);
        if (fs.existsSync(tempPath)) {
          fs.unlinkSync(tempPath);
        }
      }
    }
  }

  console.log(`Compression finished. Compressed ${count} images.`);
}

compressAll().catch(console.error);
