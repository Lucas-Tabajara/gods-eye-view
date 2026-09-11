import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adaptAnaReading, adaptAnaReadings } from './anaHidroAdapt.js';

const baseItem = {
  Chuva_Adotada: '0.00',
  Chuva_Adotada_Status: '0',
  Cota_Adotada: '781.00',
  Cota_Adotada_Status: '0',
  Data_Atualizacao: '2024-01-02 00:28:03.307',
  Data_Hora_Medicao: '2024-01-01 23:00:00.0',
  Vazao_Adotada: '13225.42',
  Vazao_Adotada_Status: '0',
  codigoestacao: '15400000',
};

test('converte strings numéricas para number', () => {
  const r = adaptAnaReading(baseItem);
  assert.equal(r.cota.valorCm, 781);
  assert.equal(r.vazao.valorM3s, 13225.42);
  assert.equal(r.chuva.valorMm, 0);
});

test('zero legítimo permanece 0, não vira null', () => {
  const r = adaptAnaReading(baseItem);
  assert.equal(r.chuva.valorMm, 0);
  assert.notEqual(r.chuva.valorMm, null);
});

test('campo vazio/ausente vira null, nunca 0', () => {
  const item = { ...baseItem, Cota_Adotada: '', Cota_Adotada_Status: null };
  const r = adaptAnaReading(item);
  assert.equal(r.cota.valorCm, null);
});

test('mapeia status de qualidade corretamente', () => {
  const suspeito = adaptAnaReading({ ...baseItem, Cota_Adotada_Status: '1' });
  const ruim = adaptAnaReading({ ...baseItem, Cota_Adotada_Status: '2' });
  assert.equal(suspeito.cota.qualidade, 'suspeito');
  assert.equal(ruim.cota.qualidade, 'ruim');
});

test('status ausente vira "desconhecido", não "ok"', () => {
  const r = adaptAnaReading({ ...baseItem, Cota_Adotada_Status: null });
  assert.equal(r.cota.qualidade, 'desconhecido');
});

test('converte data para ISO', () => {
  const r = adaptAnaReading(baseItem);
  assert.equal(r.medidoEm, new Date('2024-01-01T23:00:00.0').toISOString());
});

test('adapta lista vazia sem erro', () => {
  assert.deepEqual(adaptAnaReadings([]), []);
});

test('adapta lista de vários registros', () => {
  const result = adaptAnaReadings([baseItem, baseItem]);
  assert.equal(result.length, 2);
});