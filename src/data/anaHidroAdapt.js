/**
 * ANA HidroWebService — adapter from raw "série telemétrica adotada" items
 * (src/data/anaHidro.js shape) to the internal station-reading shape.
 *
 * Quirks this module owns:
 * - Every numeric field arrives as a STRING ("781.00") — parsed to Number
 *   here, not upstream, since raw string handling belongs with the raw
 *   shape (anaHidro.js) and typed values belong with the adapted shape.
 * - An empty string or null field means "sensor not present / no reading",
 *   and must become `null`, never `0` — a real zero reading ("Chuva_Adotada":
 *   "0.00") is a legitimate measurement and must stay 0.
 * - Each measurement (chuva, cota, vazão) carries its own quality status
 *   ("0"=ok, "1"=suspeito, "2"=ruim). Suspicious/bad readings are kept, not
 *   dropped — the caller decides how to render/warn based on quality.
 */

const QUALITY_MAP = { 0: 'ok', 1: 'suspeito', 2: 'ruim' };

function parseNumericField(rawValue) {
  if (rawValue === null || rawValue === undefined || rawValue === '') return null;
  const n = Number(rawValue);
  return Number.isFinite(n) ? n : null;
}

function parseQuality(rawStatus) {
  if (rawStatus === null || rawStatus === undefined || rawStatus === '') return 'desconhecido';
  return QUALITY_MAP[Number(rawStatus)] ?? 'desconhecido';
}

function parseAnaDate(rawDate) {
  if (!rawDate) return null;
  // "2024-01-01 23:00:00.0" -> ISO-compatible "2024-01-01T23:00:00.0"
  const iso = rawDate.replace(' ', 'T');
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/**
 * Adapt one raw ANA item into the internal reading shape.
 * @param {Object} item Raw item from anaHidro.js
 */
export function adaptAnaReading(item) {
  return {
    codigoEstacao: String(item.codigoestacao ?? ''),
    medidoEm: parseAnaDate(item.Data_Hora_Medicao),
    atualizadoEm: parseAnaDate(item.Data_Atualizacao),
    cota: {
      valorCm: parseNumericField(item.Cota_Adotada),
      qualidade: parseQuality(item.Cota_Adotada_Status),
    },
    vazao: {
      valorM3s: parseNumericField(item.Vazao_Adotada),
      qualidade: parseQuality(item.Vazao_Adotada_Status),
    },
    chuva: {
      valorMm: parseNumericField(item.Chuva_Adotada),
      qualidade: parseQuality(item.Chuva_Adotada_Status),
    },
  };
}

/**
 * Adapt an array of raw ANA items.
 * @param {Array<Object>} items
 */
export function adaptAnaReadings(items) {
  if (!Array.isArray(items)) return [];
  return items.map(adaptAnaReading);
}