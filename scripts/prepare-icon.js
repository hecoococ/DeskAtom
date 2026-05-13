import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function prepareIcon() {
  const svgPath = path.join(__dirname, '..', 'build', 'icon.svg');
  const pngPath = path.join(__dirname, '..', 'build', 'icon.png');
  
  try {
    // 将SVG转换为PNG (1024x1024用于生成各种尺寸)
    await sharp(svgPath)
      .resize(1024, 1024)
      .png()
      .toFile(pngPath);
    
    console.log('✅ Icon PNG generated successfully!');
    console.log('📁 Output: build/icon.png (1024x1024)');
    console.log('');
    console.log('下一步: 运行 pnpm generate-icons 生成多尺寸图标');
    
  } catch (error) {
    console.error('❌ Error converting icon:', error);
    process.exit(1);
  }
}

prepareIcon();
