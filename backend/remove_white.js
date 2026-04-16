const { Jimp } = require('jimp');

async function processImage() {
  try {
    const image = await Jimp.read('../frontend/public/katia-logo.png');
    image.scan(0, 0, image.bitmap.width, image.bitmap.height, function(x, y, idx) {
      const r = this.bitmap.data[idx + 0];
      const g = this.bitmap.data[idx + 1];
      const b = this.bitmap.data[idx + 2];
      
      if (r > 235 && g > 235 && b > 235) {
        this.bitmap.data[idx + 3] = 0; 
      }
    });
    await image.write('../frontend/public/katia-logo.png');
    console.log("Background mapped to transparent successfully.");
  } catch (err) {
    console.error("Error processing image:", err);
  }
}

processImage();
