import { assert, assertAlmostEquals, assertEquals } from "./assert.ts";
import { imageSize, mp3Duration, mp4Duration } from "../_shared/media.ts";

const read = (f: string) => Deno.readFileSync(new URL(`./fixtures/${f}`, import.meta.url));

Deno.test("mp3 length, MPEG-1 44.1 kHz", () => assertAlmostEquals(mp3Duration(read("tone.mp3")), 61.5, 0.1));
Deno.test("mp3 length, MPEG-2 22 kHz with header frame", () => assertAlmostEquals(mp3Duration(read("tone-mpeg2.mp3")), 7.3, 0.12));
Deno.test("mp3 rejects a non-mp3", () => assertEquals(mp3Duration(read("img.png")), 0));
Deno.test("mp4 length, moov at end", () => assertAlmostEquals(mp4Duration(read("clip.mp4")), 12.4, 0.05));
Deno.test("mp4 length, moov at start", () => assertAlmostEquals(mp4Duration(read("faststart.mp4")), 3, 0.05));
Deno.test("mp4 rejects an mp3", () => assertEquals(mp4Duration(read("tone.mp3")), 0));
Deno.test("image sizes", () => {
  assertEquals(imageSize(read("img.png")), { width: 640, height: 480, type: "image/png" });
  const j = imageSize(read("img.jpg"))!;
  assertEquals([j.width, j.height, j.type], [1023, 767, "image/jpeg"]);
  assertEquals(imageSize(read("img.webp"))?.width, 300);
  assert(imageSize(read("tone.mp3")) === null);
});
