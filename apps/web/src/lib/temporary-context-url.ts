/** URL fragments keep the credential out of HTTP page requests. */
export function readTemporaryContextPassphrase(hash: string): string | null {
  return new URLSearchParams(hash.replace(/^#/, '')).get('passphrase');
}

export function temporaryContextHash(hash: string, passphrase: string | null): string {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  if (passphrase === null) params.delete('passphrase');
  else params.set('passphrase', passphrase);
  const fragment = params.toString();
  return fragment ? `#${fragment}` : '';
}

export function buildTemporaryContextShareUrl(href: string, passphrase: string): string {
  const url = new URL(href);
  url.hash = temporaryContextHash(url.hash, passphrase);
  return url.href;
}
