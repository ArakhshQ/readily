// Generates the PNG app icons from scripts/app-icon.svg. Run: node scripts/make-icons.mjs
import sharp from "sharp";
import { readFileSync } from "node:fs";
const svg = readFileSync(new URL("./app-icon.svg", import.meta.url));
const out = (n) => new URL(`../public/${n}`, import.meta.url).pathname;
await sharp(svg).resize(192, 192).png().toFile(out("icon-192.png"));
await sharp(svg).resize(512, 512).png().toFile(out("icon-512.png"));
await sharp(svg).resize(512, 512).png().toFile(out("icon-maskable-512.png"));
await sharp(svg).resize(180, 180).png().toFile(out("apple-touch-icon.png"));
await sharp(svg).resize(48, 48).png().toFile(out("favicon-48.png"));
console.log("icons written");
