/// <reference lib="webworker" />

/**
 * Downloads the offline map package into OPFS in Range chunks and resumes from the bytes already on disk.
 * Runs in a dedicated worker because iOS Safari before 26 has no createWritable — only createSyncAccessHandle,
 * which exists solely in workers.
 */

export interface MapDownloadRequest {
  type: "start";
  url: string;
  fileName: string;
  etag: string | null;
}
export type MapDownloadMessage =
  | { type: "progress"; receivedBytes: number; totalBytes: number; etag: string | null }
  | { type: "done"; receivedBytes: number; totalBytes: number; etag: string | null }
  | { type: "error"; message: string };

interface SyncAccessHandle {
  getSize(): number;
  truncate(size: number): void;
  write(buffer: ArrayBufferView, options: { at: number }): number;
  flush(): void;
  close(): void;
}

const CHUNK_BYTES = 8 * 1024 * 1024;

const post = (message: MapDownloadMessage) => {
  self.postMessage(message);
};

function totalFromContentRange(header: string | null): number | null {
  const match = header ? /\/(\d+)$/.exec(header) : null;
  return match ? Number(match[1]) : null;
}

async function download({ url, fileName, etag: knownEtag }: MapDownloadRequest): Promise<void> {
  const root = await navigator.storage.getDirectory();
  const file = await root.getFileHandle(fileName, { create: true });
  const access = (await (
    file as FileSystemFileHandle & { createSyncAccessHandle(): Promise<SyncAccessHandle> }
  ).createSyncAccessHandle()) as SyncAccessHandle;

  try {
    let offset = access.getSize();
    let etag = knownEtag;
    let total: number | null = null;

    for (;;) {
      const response = await fetch(url, { headers: { Range: `bytes=${offset}-${offset + CHUNK_BYTES - 1}` } });
      const responseTotal = totalFromContentRange(response.headers.get("Content-Range"));

      // Asking past the end of a fully downloaded file: the server answers 416 with the full size.
      if (response.status === 416 && responseTotal !== null && responseTotal === offset) {
        post({ type: "done", receivedBytes: offset, totalBytes: offset, etag });
        return;
      }
      if (response.status !== 206 || responseTotal === null) {
        throw new Error(`Serwer nie obsługuje pobierania fragmentami (HTTP ${response.status}).`);
      }

      const responseEtag = response.headers.get("ETag");
      if (etag !== null && responseEtag !== null && responseEtag !== etag) {
        // The package changed between sessions: the bytes on disk belong to another version.
        access.truncate(0);
        offset = 0;
        etag = responseEtag;
        continue;
      }
      etag = responseEtag ?? etag;
      total = responseTotal;

      const chunk = new Uint8Array(await response.arrayBuffer());
      access.write(chunk, { at: offset });
      access.flush();
      offset += chunk.byteLength;

      if (offset >= total) {
        post({ type: "done", receivedBytes: offset, totalBytes: total, etag });
        return;
      }
      post({ type: "progress", receivedBytes: offset, totalBytes: total, etag });
    }
  } finally {
    access.close();
  }
}

self.onmessage = (event: MessageEvent<MapDownloadRequest>) => {
  download(event.data).catch((error: unknown) => {
    post({ type: "error", message: error instanceof Error ? error.message : String(error) });
  });
};
