const TEMPORARY_CONTEXT_PATH_PREFIXES = ['/api/v1/temporary-contexts/', '/api/v1/clipboard/'];

export function isTemporaryContextPath(path: string): boolean {
  return TEMPORARY_CONTEXT_PATH_PREFIXES.some(prefix => path.startsWith(prefix));
}
