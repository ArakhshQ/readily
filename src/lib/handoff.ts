// Passes files from one page to the next without re-uploading them.
// Navigation inside the site keeps this module in memory, so a result from one
// tool (or a file dropped on the homepage) arrives ready in the next tool.

let pending: File[] = [];

export function setHandoff(files: File[]): void {
  pending = files;
}

export function takeHandoff(): File[] {
  const files = pending;
  pending = [];
  return files;
}

export function blobToFile(blob: Blob, name: string): File {
  return new File([blob], name, { type: blob.type, lastModified: Date.now() });
}
