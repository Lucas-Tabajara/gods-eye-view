/**
 * ANA HidroWebService — token authentication (pure logic, no network I/O
 * hardcoded — fetch is injected so this stays unit-testable).
 *
 * Upstream: GET /EstacoesTelemetricas/OAUth/v1
 *   headers: Identificador (CPF/CNPJ), Senha
 *   returns: { status, code, message, items: { tokenautenticacao, ... } }
 *
 * Quirk this module owns:
 * - Tokens are valid for 60 minutes. The manual explicitly warns that
 *   high-frequency auth requests are monitored and can trigger an automatic
 *   IP block — so this module NEVER requests a new token while a cached one
 *   is still valid. A small safety margin (SAFETY_MARGIN_MS) is subtracted
 *   from the 60-minute window so we refresh slightly early instead of
 *   risking an expired-token request mid-flight.
 */

const TOKEN_LIFETIME_MS = 60 * 60_000; // 60 minutes, per ANA manual
const SAFETY_MARGIN_MS = 2 * 60_000; // refresh 2 min before actual expiry

/**
 * Create a token manager bound to one set of credentials.
 * @param {{identificador: string, senha: string, fetchImpl?: typeof fetch, now?: () => number}} config
 */
export function createAnaAuth({ identificador, senha, fetchImpl = fetch, now = Date.now }) {
  /** @type {?{token: string, obtainedAt: number}} */
  let cached = null;

  function isValid() {
    if (!cached) return false;
    return now() - cached.obtainedAt < TOKEN_LIFETIME_MS - SAFETY_MARGIN_MS;
  }

  async function fetchNewToken() {
    const url = 'https://www.ana.gov.br/hidrowebservice/EstacoesTelemetricas/OAUth/v1';
    const res = await fetchImpl(url, {
      method: 'GET',
      headers: {
        Identificador: identificador,
        Senha: senha,
      },
    });
    if (!res.ok) throw new Error(`ANA auth HTTP ${res.status}`);

    const body = await res.json().catch(() => null);
    const token = body?.items?.tokenautenticacao;
    if (body?.status !== 'OK' || typeof token !== 'string' || !token) {
      throw new Error(`ANA auth failed: ${body?.message || 'resposta inválida'}`);
    }

    cached = { token, obtainedAt: now() };
    return token;
  }

  /** Returns a valid token, reusing the cached one when possible. */
  async function getToken() {
    if (isValid()) return cached.token;
    return fetchNewToken();
  }

  return { getToken, isValid };
}