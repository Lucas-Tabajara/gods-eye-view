import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fetchSerieTelemetrica } from './anaHidro.js';

const sample = JSON.parse(
  readFileSync(new URL('./fixtures/ana-hidro-sample.json', import.meta.url))
);

function fakeFetch(response, { ok = true, status = 200 } = {}) {
  return async () => ({
    ok,
    status,
    json: async () => response,
  });
}

test('retorna os registros quando a resposta é OK', async () => {
  const fetchImpl = fakeFetch(sample);
  const items = await fetchSerieTelemetrica({
    codigoEstacao: '15400000', token: 'tok', fetchImpl,
  });

  assert.equal(items.length, 2);
  assert.equal(items[0].codigoestacao, '15400000');
});

test('retorna array vazio quando a estação não tem medições (não é erro)', async () => {
  const fetchImpl = fakeFetch({ status: 'OK', code: 200, message: 'Sucesso', items: [] });
  const items = await fetchSerieTelemetrica({
    codigoEstacao: '99999999', token: 'tok', fetchImpl,
  });

  assert.deepEqual(items, []);
});

test('lança erro quando o status não é OK', async () => {
  const fetchImpl = fakeFetch({ status: 'ERROR', code: 400, message: 'Parâmetro inválido' });
  await assert.rejects(
    () => fetchSerieTelemetrica({ codigoEstacao: 'x', token: 'tok', fetchImpl }),
    /Parâmetro inválido/,
  );
});

test('lança erro em falha HTTP (ex: token expirado)', async () => {
  const fetchImpl = fakeFetch({}, { ok: false, status: 401 });
  await assert.rejects(
    () => fetchSerieTelemetrica({ codigoEstacao: 'x', token: 'tok-velho', fetchImpl }),
    /HTTP 401/,
  );
});

test('lança erro quando o corpo não é JSON válido', async () => {
  const fetchImpl = async () => ({
    ok: true,
    status: 200,
    json: async () => { throw new Error('invalid json'); },
  });
  await assert.rejects(
    () => fetchSerieTelemetrica({ codigoEstacao: 'x', token: 'tok', fetchImpl }),
  );
});