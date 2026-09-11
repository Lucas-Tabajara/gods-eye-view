/**
 * ANA HidroWebService — série telemétrica adotada (pure fetch logic,
 * no Cesium/DOM — token is injected via getToken()).
 *
 * Upstream: GET /EstacoesTelemetricas/HidroinfoanaSerieTelemetricaAdotada/v1
 *   headers: Authorization: Bearer {token}
 *   returns: { status, code, message, items: [...] }
 *
 * Quirks this module owns:
 * - Query parameter names are the literal Portuguese UI labels from the
 *   ANA Swagger docs ("Código da Estação", "Data de Busca (yyyy-MM-dd)"),
 *   NOT the English/camelCase names suggested by the manual's Java
 *   example (CodigoDaEstacao, TipoFiltroData). Confirmed against the real
 *   API on 2026-09-08: the manual's param names returned 400 Bad Request;
 *   these exact Portuguese labels, URL-encoded, returned 200 OK.
 * - "Data de Busca" (yyyy-MM-dd) is a REQUIRED parameter, even though the
 *   manual's example omitted it — omitting it also caused 400.
 * - All numeric fields (Cota_Adotada, Vazao_Adotada, Chuva_Adotada) come
 *   back as STRINGS, not numbers — parsing happens in anaHidroAdapt.js,
 *   not here (this module only validates the envelope shape).
 * - `items: []` is a legitimate answer (station has no readings in the
 *   requested window) and is NOT an error — distinct from a malformed or
 *   error response, which throws.
 * - Data_Atualizacao can legitimately be null in real responses (seen in
 *   production data on 2026-09-08), even though the manual's example
 *   always showed it populated. anaHidroAdapt.js already handles this.
 */

const BASE_URL = 'https://www.ana.gov.br/hidrowebservice/EstacoesTelemetricas';

/**
 * Fetch the "série telemétrica adotada" for one station.
 * @param {{codigoEstacao: string, dataBusca: string, token: string, fetchImpl?: typeof fetch}} params
 *   dataBusca must be in "yyyy-MM-dd" format.
 * @returns {Promise<Array<Object>>} Raw items array (possibly empty).
 * @throws {Error} On HTTP failure, non-OK status, or malformed body.
 */
export async function fetchSerieTelemetrica({ codigoEstacao, dataBusca, token, fetchImpl = fetch }) {
  const url = `${BASE_URL}/HidroinfoanaSerieTelemetricaAdotada/v1`
    + `?${encodeURIComponent('Código da Estação')}=${encodeURIComponent(codigoEstacao)}`
    + `&${encodeURIComponent('Tipo Filtro Data')}=DATA_LEITURA`
    + `&${encodeURIComponent('Data de Busca (yyyy-MM-dd)')}=${encodeURIComponent(dataBusca)}`
    + `&${encodeURIComponent('Range Intervalo de busca')}=DIAS_30`;

  const res = await fetchImpl(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) throw new Error(`ANA série HTTP ${res.status}`);

  const body = await res.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    throw new Error('ANA série: resposta não é um JSON válido');
  }
  if (body.status !== 'OK') {
    throw new Error(`ANA série falhou: ${body.message || 'status desconhecido'}`);
  }
  if (!Array.isArray(body.items)) {
    throw new Error('ANA série: campo "items" ausente ou inválido');
  }

  return body.items; // pode ser [] — isso é válido, não é erro
}