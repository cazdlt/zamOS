import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const staticDir = path.join(__dirname, '../static');

async function generateIcons() {
	// Read the favicon SVG
	const faviconSvg = fs.readFileSync(path.join(staticDir, 'favicon.svg'));

	// Generate 192x192 icon
	await sharp(faviconSvg).resize(192, 192).png().toFile(path.join(staticDir, 'icon-192.png'));

	console.log('✓ Generated icon-192.png');

	// Generate 512x512 icon
	await sharp(faviconSvg).resize(512, 512).png().toFile(path.join(staticDir, 'icon-512.png'));

	console.log('✓ Generated icon-512.png');

	// Generate 192x192 maskable icon (with padding for safe zone)
	// Maskable icons need padding because the system might crop them
	const maskable192Buffer = await sharp(faviconSvg)
		.resize(144, 144) // Slightly smaller to add padding
		.png()
		.toBuffer();

	// Create a 192x192 canvas with padding
	await sharp({
		create: {
			width: 192,
			height: 192,
			channels: 4,
			background: { r: 102, g: 126, b: 234, alpha: 1 } // Gradient start color
		}
	})
		.composite([
			{
				input: maskable192Buffer,
				top: 24,
				left: 24
			}
		])
		.png()
		.toFile(path.join(staticDir, 'icon-192-maskable.png'));

	console.log('✓ Generated icon-192-maskable.png');

	// Generate 512x512 maskable icon
	const maskable512Buffer = await sharp(faviconSvg)
		.resize(384, 384) // Slightly smaller to add padding
		.png()
		.toBuffer();

	// Create a 512x512 canvas with padding
	await sharp({
		create: {
			width: 512,
			height: 512,
			channels: 4,
			background: { r: 102, g: 126, b: 234, alpha: 1 } // Gradient start color
		}
	})
		.composite([
			{
				input: maskable512Buffer,
				top: 64,
				left: 64
			}
		])
		.png()
		.toFile(path.join(staticDir, 'icon-512-maskable.png'));

	console.log('✓ Generated icon-512-maskable.png');

	console.log('\n✅ All PWA icons generated successfully!');
}

generateIcons().catch((err) => {
	console.error('Error generating icons:', err);
	process.exit(1);
});
