import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, test, vi } from "vitest";
import type { ChromeClient } from "../../src/browser/types.js";
import {
  MAX_DATA_TRANSFER_BYTES,
  assertAttachmentCanUseDataTransfer,
  transferAttachmentViaDataTransfer,
} from "../../src/browser/actions/attachmentDataTransfer.js";

describe("attachment data transfer", () => {
  test("rejects oversized files before browser-side transfer", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "oracle-data-transfer-limit-"));
    try {
      const archivePath = path.join(tempDir, "public.zip");
      await fs.writeFile(archivePath, "");
      await fs.truncate(archivePath, MAX_DATA_TRANSFER_BYTES + 1);
      const runtime = { evaluate: vi.fn() } as unknown as ChromeClient["Runtime"];

      await expect(
        transferAttachmentViaDataTransfer(
          runtime,
          { path: archivePath, displayPath: "public.zip" },
          'input[type="file"]',
        ),
      ).rejects.toThrow(/too large for browser-side data transfer/i);
      expect(runtime.evaluate).not.toHaveBeenCalled();
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
  });

  test("uses attachment metadata for the transfer limit check", async () => {
    await expect(
      assertAttachmentCanUseDataTransfer({
        path: "/tmp/public.zip",
        displayPath: "public.zip",
        sizeBytes: MAX_DATA_TRANSFER_BYTES + 1,
      }),
    ).rejects.toThrow(/--browser-manual-login/);
  });
});
