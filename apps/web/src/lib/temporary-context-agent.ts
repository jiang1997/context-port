import { translate, type AppLocale, type AppMessageKey } from '../i18n';

export function resolveTemporaryContextApiBase(): string {
  const configured = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (configured?.startsWith('http')) return configured.replace(/\/$/, '');
  const pathBase = configured && configured.startsWith('/') ? configured : '/api/v1';
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${pathBase}`;
  }
  return pathBase;
}

function shellQuotedJson(payload: string): string {
  return `'${payload.replace(/'/g, `'\"'\"'`)}'`;
}

/**
 * Instructions copied for an agent to read + append one Temporary Context. The
 * prose follows `locale` (defaults to English, which the tests assert on); the
 * curl commands are language-neutral.
 */
export function buildTemporaryContextAgentInstructions(passphrase: string, apiBase: string, expiresAt?: string, locale: AppLocale = 'en'): string {
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string | number>) => translate(locale, key, values);
  const readPayload = shellQuotedJson(JSON.stringify({ passphrase }));
  const appendPayload = shellQuotedJson(JSON.stringify({ passphrase, content: 'YOUR TEXT HERE' }));
  return [
    t('@app.agent.instructions.intro'),
    '',
    t('@app.agent.instructions.passphrase', { passphrase }),
    t('@app.agent.instructions.apiBase', { apiBase }),
    ...(expiresAt ? [t('@app.agent.instructions.expires', { expires: expiresAt })] : []),
    '',
    t('@app.agent.instructions.readHeading'),
    `curl -s -X POST "${apiBase}/temporary-contexts/read" -H "Content-Type: application/json" -d ${readPayload}`,
    '',
    t('@app.agent.instructions.appendHeading'),
    `curl -s -X POST "${apiBase}/temporary-contexts/append" -H "Content-Type: application/json" -d ${appendPayload}`,
    '',
    t('@app.agent.instructions.notesHeading'),
    t('@app.agent.instructions.note1'),
    t('@app.agent.instructions.note2'),
    t('@app.agent.instructions.note3'),
  ].join('\n');
}

/** Leave the passphrase empty to let the agent generate one; otherwise use it verbatim. */
export function validateAgentGuidePassphrase(passphrase: string): AppMessageKey | null {
  if (passphrase.length > 0 && passphrase.length < 8) return '@app.temp.passphraseMin';
  if (passphrase.length > 128) return '@app.temp.passphraseMax';
  return null;
}

/** Localised guide for a supplied passphrase, or for an agent to generate one. */
export function buildTemporaryContextAgentGuide(apiBase: string, locale: AppLocale = 'en', passphrase = ''): string {
  const t = (key: Parameters<typeof translate>[1], values?: Record<string, string | number>) => translate(locale, key, values);
  const credential = passphrase || 'YOUR PASSPHRASE';
  const readPayload = shellQuotedJson(JSON.stringify({ passphrase: credential }));
  const appendPayload = shellQuotedJson(JSON.stringify({ passphrase: credential, content: 'YOUR TEXT HERE' }));
  return [
    t('@app.agent.guide.intro'),
    '',
    t('@app.agent.guide.apiBase', { apiBase }),
    '',
    ...(passphrase ? [
      t('@app.agent.instructions.passphrase', { passphrase }),
      '',
      t('@app.agent.guide.openStep'),
      `curl -s -X POST "${apiBase}/temporary-contexts/open" -H "Content-Type: application/json" -d ${readPayload}`,
      t('@app.agent.guide.openResult'),
    ] : [
      t('@app.agent.guide.step1'),
      `curl -s -X POST "${apiBase}/temporary-contexts/generate"`,
      t('@app.agent.guide.step1Result'),
      t('@app.agent.guide.generatedNext'),
      '',
      t('@app.agent.guide.orOpen'),
      `curl -s -X POST "${apiBase}/temporary-contexts/open" -H "Content-Type: application/json" -d ${readPayload}`,
    ]),
    '',
    t('@app.agent.guide.step2'),
    `curl -s -X POST "${apiBase}/temporary-contexts/read" -H "Content-Type: application/json" -d ${readPayload}`,
    '',
    t('@app.agent.guide.step3'),
    `curl -s -X POST "${apiBase}/temporary-contexts/append" -H "Content-Type: application/json" -d ${appendPayload}`,
    '',
    t('@app.agent.guide.rulesHeading'),
    t('@app.agent.guide.rule1'),
    t('@app.agent.guide.rule2'),
    t('@app.agent.guide.rule3'),
    t('@app.agent.guide.rule4'),
  ].join('\n');
}

// Backwards-compatible aliases
export const buildClipboardAgentInstructions = buildTemporaryContextAgentInstructions;
export const buildClipboardAgentGuide = buildTemporaryContextAgentGuide;
