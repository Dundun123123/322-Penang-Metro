export class BodyTooLargeError extends Error {}
export async function readRequestBytes(request: Request, limit: number): Promise<Buffer> {
  if (Number(request.headers.get("content-length")) > limit)
    throw new BodyTooLargeError("Request is too large");
  if (!request.body) return Buffer.alloc(0);
  const reader = request.body.getReader();
  const chunks: Buffer[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) {
        await reader.cancel().catch(() => {});
        throw new BodyTooLargeError("Request is too large");
      }
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, size);
}
