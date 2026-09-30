/**
 * ANA HidroWebService — data layer registration (browser-side).
 *
 * Follows the same contract as firmsHeatmap.js: id, enable, disable,
 * update, getStats. Fetches through the server-side proxy (/api/ana-hidro)
 * so the ANA credentials never reach the browser.
 *
 * Scope for this first version: ONE hardcoded station (15400000, Rio
 * Madeira / Porto Velho). Station coordinates are not returned by the
 * série telemétrica endpoint, so they're hardcoded here as a known
 * limitation — a future version should fetch them from the
 * HidroInventarioEstacoes endpoint if multiple stations are added.
 */

import { adaptAnaReadings } from './anaHidroAdapt.js';

const STATION = {
  codigo: '15400000',
  nome: 'Porto Velho (Rio Madeira)',
  lat: -8.7619,
  lon: -63.9039,
};

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export const anaHidroLayer = {
  id: 'ana-hidro',

  _viewer: null,
  _entity: null,
  _state: { status: 'loading', message: 'Carregando…' },

  async enable(viewer) {
    this._viewer = viewer;
    this._entity = viewer.entities.add({
      id: `ana-hidro-${STATION.codigo}`,
      name: STATION.nome,
      position: window.Cesium.Cartesian3.fromDegrees(STATION.lon, STATION.lat),
      point: {
        pixelSize: 12,
        color: window.Cesium.Color.DEEPSKYBLUE,
        outlineColor: window.Cesium.Color.WHITE,
        outlineWidth: 2,
      },
      label: {
        text: STATION.nome,
        font: '14px sans-serif',
        pixelOffset: new window.Cesium.Cartesian2(0, -20),
        fillColor: window.Cesium.Color.WHITE,
      },
    });
    await this.update();
  },

  disable() {
    if (this._viewer && this._entity) {
      this._viewer.entities.remove(this._entity);
    }
    this._entity = null;
    this._viewer = null;
  },

  async update() {
    try {
      const res = await fetch(`/api/ana-hidro?estacao=${STATION.codigo}&data=${todayIso()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        this._state = { status: 'error', message: body.error || `HTTP ${res.status}` };
        return;
      }
      const body = await res.json();
      const readings = adaptAnaReadings(body.items);

      if (readings.length === 0) {
        this._state = { status: 'stale', message: 'STALE · sem leituras recentes' };
        return;
      }

      const latest = readings[readings.length - 1];
      const parts = [];
      if (latest.cota.valorCm !== null) parts.push(`Cota: ${latest.cota.valorCm} cm`);
      if (latest.vazao.valorM3s !== null) parts.push(`Vazão: ${latest.vazao.valorM3s} m³/s`);
      if (latest.chuva.valorMm !== null) parts.push(`Chuva: ${latest.chuva.valorMm} mm`);

      if (this._entity) {
        this._entity.label.text = `${STATION.nome}\n${parts.join(' · ')}`;
      }

      this._state = {
        status: 'live',
        message: `LIVE · ${parts.join(' · ')}`,
        medidoEm: latest.medidoEm,
      };
    } catch (err) {
      this._state = { status: 'error', message: err.message };
    }
  },

  getStats() {
    return this._state;
  },
};
