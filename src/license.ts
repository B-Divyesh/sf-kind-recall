export interface LicenseState {
  unlocked: boolean;
  message?: string;
  token?: string;
}

const SLUG = 'kind-recall';
const TOKEN_KEY = `sb_license:${SLUG}`;
const VERDICT_KEY = `sb_license_verdict:${SLUG}`;
const DAY = 86_400_000;

function billingBase(): string {
  if (import.meta.env.VITE_BILLING_BASE) return import.meta.env.VITE_BILLING_BASE;
  return location.hostname === 'kind-recall.sociobot.in' ? 'https://api.sociobot.in' : 'https://pilot-api.sociobot.in';
}

export function checkoutUrl(): string {
  return `${billingBase()}/api/v1/products/${SLUG}/checkout`;
}

export function captureLicenseFromUrl(): string | undefined {
  const url = new URL(location.href);
  const token = url.searchParams.get('license')?.trim();
  if (!token) return undefined;
  localStorage.setItem(TOKEN_KEY, token);
  url.searchParams.delete('license');
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  return token;
}

export function restoreLicense(token: string): void {
  localStorage.setItem(TOKEN_KEY, token.trim());
  localStorage.removeItem(VERDICT_KEY);
}

export function removeLicense(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(VERDICT_KEY);
}

export async function loadLicense(): Promise<LicenseState> {
  const returnedToken = captureLicenseFromUrl();
  const token = returnedToken || localStorage.getItem(TOKEN_KEY) || undefined;
  if (!token) return { unlocked: false };

  let cached: { valid: boolean; checkedAt: number } | undefined;
  try { cached = JSON.parse(localStorage.getItem(VERDICT_KEY) || ''); } catch { cached = undefined; }
  const optimistic = returnedToken ? true : Boolean(cached?.valid);
  if (cached && Date.now() - cached.checkedAt < DAY) return { unlocked: cached.valid, token, message: cached.valid ? undefined : 'This license is no longer active.' };
  if (!navigator.onLine) return { unlocked: optimistic, token, message: optimistic ? 'License check will resume when you are online.' : undefined };

  try {
    const response = await fetch(`${billingBase()}/api/v1/products/${SLUG}/verify?license=${encodeURIComponent(token)}`);
    if (!response.ok) throw new Error('verify unavailable');
    const result = await response.json() as { valid: boolean };
    localStorage.setItem(VERDICT_KEY, JSON.stringify({ valid: result.valid, checkedAt: Date.now() }));
    return { unlocked: result.valid, token, message: result.valid ? undefined : 'This license is no longer active.' };
  } catch {
    return { unlocked: optimistic, token, message: 'License check will resume when the service is reachable.' };
  }
}
