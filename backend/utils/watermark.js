/**
 * 🎨 Museo Watermark Utility
 * Adds watermarks to images using Sharp library
 */

import sharp from 'sharp';

/**
 * Add text watermark to image
 * @param {Buffer} imageBuffer - Original image buffer
 * @param {Object} options - Watermark options
 * @param {string} options.text - Text to watermark (default: "© Museo")
 * @param {string} options.position - Position: 'bottom-right', 'bottom-left', 'center', 'diagonal'
 * @param {number} options.opacity - Opacity 0-1 (default: 0.5)
 * @param {boolean} options.withBackground - Add semi-transparent background box (default: false)
 * @returns {Promise<Buffer>} - Watermarked image buffer
 */
export async function addTextWatermark(imageBuffer, options = {}) {
  try {
    const {
      text = '© Museo',
      position = 'bottom-right',
      opacity = 0.5
    } = options;

    // Get image metadata
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    
    // Calculate watermark size based on image dimensions
    const fontSize = Math.floor(metadata.width / 25);
    const padding = Math.floor(metadata.width / 40);
    
    // Calculate position
    let x, y, textAnchor;
    
    switch (position) {
      case 'bottom-left':
        x = padding;
        y = metadata.height - padding;
        textAnchor = 'start';
        break;
      case 'center':
        x = metadata.width / 2;
        y = metadata.height / 2;
        textAnchor = 'middle';
        break;
      case 'bottom-right':
      default:
        x = metadata.width - padding;
        y = metadata.height - padding;
        textAnchor = 'end';
        break;
    }
    
    // Create SVG watermark with enhanced visibility (stroke + multiple shadows)
    const watermarkSvg = `
      <svg width="${metadata.width}" height="${metadata.height}">
        <defs>
          <!-- Strong shadow for depth -->
          <filter id="strongShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
            <feOffset dx="2" dy="2" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.8"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <!-- Dark stroke outline for contrast -->
        <text 
          x="${x}" 
          y="${y}" 
          text-anchor="${textAnchor}" 
          font-family="Georgia, serif"
          font-size="${fontSize}px"
          font-weight="bold"
          fill="none"
          stroke="rgba(0, 0, 0, 0.8)"
          stroke-width="3"
        >
          ${text}
        </text>
        
        <!-- Main white text with shadow -->
        <text 
          x="${x}" 
          y="${y}" 
          text-anchor="${textAnchor}" 
          font-family="Georgia, serif"
          font-size="${fontSize}px"
          font-weight="bold"
          fill="rgba(255, 255, 255, ${opacity})"
          filter="url(#strongShadow)"
        >
          ${text}
        </text>
      </svg>
    `;
    
    // Apply watermark
    const watermarkedImage = await image
      .composite([{
        input: Buffer.from(watermarkSvg),
        blend: 'over'
      }])
      .toBuffer();
    
    return watermarkedImage;
    
  } catch (error) {
    console.error('❌ Text watermark error:', error);
    throw error;
  }
}

/**
 * Add diagonal repeating watermark pattern
 * @param {Buffer} imageBuffer - Original image buffer
 * @param {Object} options - Watermark options
 * @returns {Promise<Buffer>} - Watermarked image buffer
 */
export async function addDiagonalWatermark(imageBuffer, options = {}) {
  try {
    const {
      text = '© Museo',
      opacity = 0.15
    } = options;

    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    
    const fontSize = Math.floor(metadata.width / 20);
    const spacing = 300; // Space between repeated watermarks
    
    // Create diagonal repeating watermark pattern
    const watermarkSvg = `
      <svg width="${metadata.width}" height="${metadata.height}">
        <defs>
          <pattern id="watermark" x="0" y="0" width="${spacing}" height="${spacing}" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)">
            <text 
              x="${spacing / 2}" 
              y="${spacing / 2}" 
              text-anchor="middle" 
              font-family="Georgia, serif"
              font-size="${fontSize}px"
              font-weight="bold"
              fill="rgba(255, 255, 255, ${opacity})"
            >
              ${text}
            </text>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#watermark)"/>
      </svg>
    `;
    
    const watermarkedImage = await image
      .composite([{
        input: Buffer.from(watermarkSvg),
        blend: 'over'
      }])
      .toBuffer();
    
    return watermarkedImage;
    
  } catch (error) {
    console.error('❌ Diagonal watermark error:', error);
    throw error;
  }
}

/**
 * Add logo watermark to image
 * @param {Buffer} imageBuffer - Original image buffer
 * @param {string} logoPath - Path to logo image file
 * @param {Object} options - Watermark options
 * @returns {Promise<Buffer>} - Watermarked image buffer
 */
export async function addLogoWatermark(imageBuffer, logoPath, options = {}) {
  try {
    const {
      position = 'bottom-right',
      size = 0.1, // 10% of image width
      opacity = 0.7
    } = options;

    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    
    // Calculate logo size
    const logoSize = Math.floor(metadata.width * size);
    const padding = Math.floor(metadata.width / 40);
    
    // Resize and prepare logo
    const logo = await sharp(logoPath)
      .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();
    
    // Calculate position
    let gravity;
    switch (position) {
      case 'bottom-left':
        gravity = 'southwest';
        break;
      case 'top-right':
        gravity = 'northeast';
        break;
      case 'top-left':
        gravity = 'northwest';
        break;
      case 'center':
        gravity = 'center';
        break;
      case 'bottom-right':
      default:
        gravity = 'southeast';
        break;
    }
    
    // Apply logo watermark
    const watermarkedImage = await image
      .composite([{
        input: logo,
        gravity: gravity,
        blend: 'over'
      }])
      .toBuffer();
    
    return watermarkedImage;
    
  } catch (error) {
    console.error('❌ Logo watermark error:', error);
    throw error;
  }
}

/**
 * Add ultra-clear watermark with background box
 * @param {Buffer} imageBuffer - Original image buffer
 * @param {Object} options - Watermark options
 * @returns {Promise<Buffer>} - Watermarked image buffer
 */
export async function addClearWatermark(imageBuffer, options = {}) {
  try {
    const {
      text = '© Museo',
      position = 'bottom-right',
      opacity = 0.9
    } = options;

    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    
    const fontSize = Math.floor(metadata.width / 25);
    const padding = Math.floor(metadata.width / 40);
    
    // Calculate position
    let x, y, textAnchor, rectX, rectY, rectAnchor;
    
    switch (position) {
      case 'bottom-left':
        x = padding;
        y = metadata.height - padding;
        textAnchor = 'start';
        rectX = padding - 10;
        rectY = metadata.height - padding - fontSize - 5;
        rectAnchor = 'start';
        break;
      case 'center':
        x = metadata.width / 2;
        y = metadata.height / 2;
        textAnchor = 'middle';
        rectX = metadata.width / 2;
        rectY = metadata.height / 2 - fontSize - 5;
        rectAnchor = 'middle';
        break;
      case 'bottom-right':
      default:
        x = metadata.width - padding;
        y = metadata.height - padding;
        textAnchor = 'end';
        rectX = metadata.width - padding + 10;
        rectY = metadata.height - padding - fontSize - 5;
        rectAnchor = 'end';
        break;
    }
    
    // Estimate text width (rough approximation)
    const textWidth = text.length * fontSize * 0.6;
    const boxPadding = 15;
    
    // Create SVG with background box for maximum clarity
    const watermarkSvg = `
      <svg width="${metadata.width}" height="${metadata.height}">
        <defs>
          <filter id="boxShadow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceAlpha" stdDeviation="3"/>
            <feOffset dx="0" dy="2" result="offsetblur"/>
            <feComponentTransfer>
              <feFuncA type="linear" slope="0.5"/>
            </feComponentTransfer>
            <feMerge>
              <feMergeNode/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        <!-- Semi-transparent background box -->
        <rect 
          x="${textAnchor === 'end' ? rectX - textWidth - boxPadding : textAnchor === 'middle' ? rectX - textWidth / 2 - boxPadding : rectX}" 
          y="${rectY}" 
          width="${textWidth + boxPadding * 2}" 
          height="${fontSize + boxPadding}" 
          fill="rgba(0, 0, 0, 0.7)"
          rx="5"
          filter="url(#boxShadow)"
        />
        
        <!-- White text (no stroke needed with background) -->
        <text 
          x="${x}" 
          y="${y}" 
          text-anchor="${textAnchor}" 
          font-family="Georgia, serif"
          font-size="${fontSize}px"
          font-weight="bold"
          fill="rgba(255, 255, 255, ${opacity})"
        >
          ${text}
        </text>
      </svg>
    `;
    
    const watermarkedImage = await image
      .composite([{
        input: Buffer.from(watermarkSvg),
        blend: 'over'
      }])
      .toBuffer();
    
    return watermarkedImage;
    
  } catch (error) {
    console.error('❌ Clear watermark error:', error);
    throw error;
  }
}

/**
 * Add custom watermark with user info
 * @param {Buffer} imageBuffer - Original image buffer
 * @param {Object} userInfo - User information
 * @returns {Promise<Buffer>} - Watermarked image buffer
 */
export async function addUserWatermark(imageBuffer, userInfo = {}) {
  try {
    const {
      username = 'Museo Artist',
      userId = '',
      date = new Date().getFullYear()
    } = userInfo;

    const watermarkText = `© ${username} ${date} • Museo`;
    
    // Use enhanced clear watermark for better visibility
    return await addTextWatermark(imageBuffer, {
      text: watermarkText,
      position: 'bottom-right',
      opacity: 0.7  // Increased from 0.6 for better clarity
    });
    
  } catch (error) {
    console.error('❌ User watermark error:', error);
    throw error;
  }
}

/**
 * Batch watermark multiple images
 * @param {Array<Buffer>} imageBuffers - Array of image buffers
 * @param {Object} options - Watermark options
 * @returns {Promise<Array<Buffer>>} - Array of watermarked image buffers
 */
export async function batchWatermark(imageBuffers, options = {}) {
  try {
    const watermarked = await Promise.all(
      imageBuffers.map(buffer => addTextWatermark(buffer, options))
    );
    return watermarked;
  } catch (error) {
    console.error('❌ Batch watermark error:', error);
    throw error;
  }
}

export default {
  addTextWatermark,
  addDiagonalWatermark,
  addLogoWatermark,
  addUserWatermark,
  addClearWatermark,
  batchWatermark
};
