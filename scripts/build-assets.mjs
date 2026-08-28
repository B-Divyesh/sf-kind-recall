import sharp from 'sharp';
import { mkdir, copyFile } from 'node:fs/promises';

await mkdir('public/assets', { recursive: true });
await mkdir('public/icons', { recursive: true });

const hero = sharp('assets/src/hero-drafting.png');
await hero.clone().resize({ width: 720 }).webp({ quality: 78 }).toFile('public/assets/hero-drafting-720.webp');
await hero.clone().resize({ width: 1200 }).webp({ quality: 80 }).toFile('public/assets/hero-drafting-1200.webp');
await hero.clone().resize({ width: 720 }).avif({ quality: 52 }).toFile('public/assets/hero-drafting-720.avif');
await hero.clone().resize({ width: 1200 }).avif({ quality: 55 }).toFile('public/assets/hero-drafting-1200.avif');
await hero.clone().resize(1200, 630, { fit: 'cover' }).jpeg({ quality: 82, progressive: true }).toFile('public/assets/social-card-1200x630.jpg');
await copyFile('assets/src/icon.svg', 'public/icons/icon.svg');

const icon = sharp('assets/src/icon.svg');
await icon.clone().resize(192, 192).png().toFile('public/icons/icon-192.png');
await icon.clone().resize(512, 512).png().toFile('public/icons/icon-512.png');
await icon.clone().resize(410, 410).extend({ top: 51, right: 51, bottom: 51, left: 51, background: '#f5f0e3' }).png().toFile('public/icons/icon-maskable-512.png');
