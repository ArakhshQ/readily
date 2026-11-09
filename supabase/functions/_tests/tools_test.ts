import { assertEquals } from "./assert.ts";
import { creditsFor } from "../_shared/tools.ts";

Deno.test("credits per tool", () => {
  assertEquals(creditsFor("transcribe", false, { minutes: 2.1 }), 3);
  assertEquals(creditsFor("studio-voice", false, { minutes: 1 }), 5);
  assertEquals(creditsFor("studio-voice", true, { minutes: 1.2 }), 60);
  assertEquals(creditsFor("summarize-pdf", false, { chars: 250_000 }), 3);
  assertEquals(creditsFor("chat-with-pdf", false, { chars: 10 }), 1);
  assertEquals(creditsFor("translate-document", false, { chars: 9_001 }), 4);
  assertEquals(creditsFor("translate-document", true, { chars: 3_000 }), 3);
  assertEquals(creditsFor("ai-voiceover", false, { chars: 2_500 }), 60);
  assertEquals(creditsFor("restore-photo", false, {}), 6);
  assertEquals(creditsFor("video-upscaler", false, { minutes: 0.4 }), 250);
  assertEquals(creditsFor("assistant", false, {}), 0);
});
