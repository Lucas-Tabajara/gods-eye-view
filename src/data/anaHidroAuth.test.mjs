import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAnaAuth } from './anaHidroAuth.js';

function fakeFetch(response, ok = true) {
  let calls = 0;
  const impl = async () => {
    calls += 1;
    return {
      ok,
      status: ok ? 200 : 401,
      json: async () => response,
    };
  };
  impl.callCount = () => calls;
  return impl;
}

test('busca token novo na primeira chamada', async () => {
  const fetchImpl = fakeFetch({
    status: 'OK', code: 200, message: 'Sucesso',
    items: { tokenautenticacao: 'abc123' },
  });
  const auth = createAnaAuth({ identificador: 'x', senha: 'y', fetchImpl });

  const token = await auth.getToken();

  assert.equal(token, 'abc123');
  assert.equal(fetchImpl.callCount(), 1);
});

test('reutiliza token em cache quando ainda válido', async () => {
  let currentTime = 0;
  const fetchImpl = fakeFetch({
    status: 'OK', code: 200, message: 'Sucesso',
    items: { tokenautenticacao: 'abc123' },
  });
  const auth = createAnaAuth({
    identificador: 'x', senha: 'y', fetchImpl, now: () => currentTime,
  });

  await auth.getToken();
  currentTime += 5 * 60_000; // 5 minutos depois
  await auth.getToken();

  assert.equal(fetchImpl.callCount(), 1, 'não deveria ter pedido token de novo');
});

test('busca novo token quando o anterior expirou', async () => {
  let currentTime = 0;
  const fetchImpl = fakeFetch({
    status: 'OK', code: 200, message: 'Sucesso',
    items: { tokenautenticacao: 'abc123' },
  });
  const auth = createAnaAuth({
    identificador: 'x', senha: 'y', fetchImpl, now: () => currentTime,
  });

  await auth.getToken();
  currentTime += 59 * 60_000; // quase 60 min depois (dentro da margem de segurança)
  await auth.getToken();

  assert.equal(fetchImpl.callCount(), 2, 'deveria ter pedido um token novo');
});

test('lança erro claro quando a API rejeita as credenciais', async () => {
  const fetchImpl = fakeFetch({ status: 'ERROR', code: 401, message: 'Credenciais inválidas' });
  const auth = createAnaAuth({ identificador: 'x', senha: 'y', fetchImpl });

  await assert.rejects(() => auth.getToken(), /Credenciais inválidas/);
});

test('lança erro quando a resposta não tem token', async () => {
  const fetchImpl = fakeFetch({ status: 'OK', code: 200, message: 'Sucesso', items: {} });
  const auth = createAnaAuth({ identificador: 'x', senha: 'y', fetchImpl });

  await assert.rejects(() => auth.getToken());
});