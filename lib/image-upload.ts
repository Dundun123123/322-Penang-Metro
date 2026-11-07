import "server-only";
import sharp from "sharp";
import { BodyTooLargeError, readRequestBytes } from "@/lib/request-body";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_FORM_BYTES = MAX_IMAGE_BYTES + 100_000;
const MAX_IMAGE_PIXELS = 16_000_000;
const MAX_IMAGE_FRAMES = 60;
const MAX_ACTIVE_DECODES = 2;
const MAX_QUEUED_DECODES = 8;

export class ImageUploadError extends Error {
  constructor(
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "ImageUploadError";
  }
}

export type ValidatedImage = {
  bytes: Buffer;
  mime: string;
  ext: string;
};

// Read a bounded stream before asking the multipart parser to allocate files.
export async function readImageForm(request: Request): Promise<FormData> {
  try {
    const bytes = await readRequestBytes(request, MAX_FORM_BYTES);
    return await new Response(new Uint8Array(bytes), {
      headers: { "Content-Type": request.headers.get("content-type") || "" },
    }).formData();
  } catch (error) {
    if (error instanceof BodyTooLargeError)
      throw new ImageUploadError("Upload request is too large", 413);
    throw new ImageUploadError("Invalid form");
  }
}

type DecodeState = { active: number; queue: Array<() => void> };
const processState = globalThis as typeof globalThis & {
  metroImageUploadDecodes?: DecodeState;
};
// Share the budget across separately bundled routes in the same server process.
const decodeState = (processState.metroImageUploadDecodes ??= { active: 0, queue: [] });

async function acquireDecodeSlot(): Promise<void> {
  if (decodeState.active < MAX_ACTIVE_DECODES) {
    decodeState.active += 1;
    return;
  }
  if (decodeState.queue.length >= MAX_QUEUED_DECODES)
    throw new ImageUploadError("Image processing is busy. Please try again shortly", 503);
  await new Promise<void>((resolve) => decodeState.queue.push(resolve));
}

function releaseDecodeSlot() {
  const next = decodeState.queue.shift();
  if (next) next();
  else decodeState.active -= 1;
}

function detectImage(bytes: Buffer) {
  if (bytes.length >= 3 && bytes.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff])))
    return { format: "jpeg", mime: "image/jpeg", ext: "jpg" };
  if (
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  )
    return { format: "png", mime: "image/png", ext: "png" };
  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  )
    return { format: "webp", mime: "image/webp", ext: "webp" };
  if (bytes.length >= 6 && ["GIF87a", "GIF89a"].includes(bytes.toString("ascii", 0, 6)))
    return { format: "gif", mime: "image/gif", ext: "gif" };
  return null;
}

export async function validateImageUpload(file: File, allowGif = false): Promise<ValidatedImage> {
  if (!file.size) throw new ImageUploadError("Image must not be empty");
  if (file.size > MAX_IMAGE_BYTES) throw new ImageUploadError("Image must be 5 MB or smaller", 413);

  await acquireDecodeSlot();
  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const detected = detectImage(bytes);
    if (!detected || file.type !== detected.mime || (!allowGif && detected.format === "gif"))
      throw new ImageUploadError(
        allowGif ? "Use a JPEG, PNG, WebP or GIF image" : "Use a JPEG, PNG or WebP image",
      );

    const decoder = sharp(bytes, {
      animated: true,
      failOn: "warning",
      limitInputPixels: MAX_IMAGE_PIXELS,
      limitInputChannels: 5,
    }).timeout({ seconds: 5 });
    const metadata = await decoder.metadata();
    if (metadata.format !== detected.format)
      throw new ImageUploadError("Image content does not match its declared type");

    const frames = metadata.pages ?? 1;
    const width = metadata.width;
    const height = metadata.pageHeight ?? metadata.height;
    const totalPixels = width * height * frames;
    if (
      !Number.isSafeInteger(frames) ||
      frames < 1 ||
      frames > MAX_IMAGE_FRAMES ||
      !Number.isSafeInteger(totalPixels) ||
      totalPixels < 1 ||
      totalPixels > MAX_IMAGE_PIXELS
    )
      throw new ImageUploadError("Image exceeds the 16 million pixel or 60 frame limit");

    // Raw output forces decoding of every frame, not just inspection of its header.
    // The bounded pixel count and decode slots cap raw output memory allocation.
    await decoder.raw().toBuffer();
    return { bytes, mime: detected.mime, ext: detected.ext };
  } catch (error) {
    if (error instanceof ImageUploadError) throw error;
    throw new ImageUploadError("Image is damaged, unsupported or too large to decode safely");
  } finally {
    releaseDecodeSlot();
  }
}
