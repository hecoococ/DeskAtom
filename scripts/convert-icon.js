import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pngToIco from 'png-to-ico';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sizes = [16, 24, 32, 48, 64, 128, 256];

async function convertSvgToIco() {
  const svgPath = path.join(__dirname, '..', 'build', 'icon.svg');
  const icoPath = path.join(__dirname, '..', 'build', 'icon.ico');
  
  try {
    const svgBuffer = await fs.readFile(svgPath);
    
    // 为每个尺寸生成PNG
    const pngPaths = [];
    for (const size of sizes) {
      const pngPath = path.join(__dirname, '..', 'build', `icon-${size}.png`);
      await sharp(svgBuffer)
        .resize(size, size)
        .png()
        .toFile(pngPath);
      pngPaths.push(pngPath);
    }
    
    // 生成 ICO 文件
    const icoBuffer = await pngToIco(pngPaths);
    await fs.writeFile(icoPath, icoBuffer);
    
    console.log('✅ Icon ICO generated successfully!');
    console.log('📁 Output: build/icon.ico');
    
    // 清理临时PNG文件
    for (const pngPath of pngPaths) {
      await fs.unlink(pngPath);
    }
    
    // 同时生成一个 256x256 的 PNG 用于其他用途
    await sharp(svgBuffer)
      .resize(256, 256)
      .png()
      .toFile(path.join(__dirname, '..', 'build', 'icon.png'));
    
    console.log('✅ Icon PNG generated successfully!');
    console.log('📁 Output: build/icon.png (256x256)');
    
  } catch (error) {
    console.error('❌ Error converting icon:', error);
    process.exit(1);
  }
}

convertSvgToIco();
