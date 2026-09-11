# Cliente ANA HidroWebService

Cliente para consumo de dados hidrológicos públicos da Agência Nacional de
Águas e Saneamento Básico (ANA), via a API HidroWebService.

Aviso: uso experimental. Este módulo não deve ser usado como fonte para
resposta a emergências, decisões médicas ou qualquer outro uso crítico.

## O que faz

Busca a série telemétrica adotada (nível do rio, vazão e chuva) de uma
estação hidrológica, autenticando-se automaticamente na API da ANA e
convertendo a resposta bruta para um formato interno tipado.

## Arquitetura

Três arquivos, cada um isolando o app de um tipo diferente de instabilidade,
seguindo o mesmo padrão da camada FIRMS do projeto original:

- anaHidroAuth.js: gerencia o token de autenticação (busca, cache, expiração)
- anaHidro.js: busca a série de dados na API, valida o envelope da resposta
- anaHidroAdapt.js: converte o JSON bruto para o formato interno tipado

Uma mudança na API da ANA nunca deveria obrigar a mexer em como o resto do
app consome o dado, e vice-versa.

## Uso

    import { createAnaAuth } from './anaHidroAuth.js';
    import { fetchSerieTelemetrica } from './anaHidro.js';
    import { adaptAnaReadings } from './anaHidroAdapt.js';

    const auth = createAnaAuth({
      identificador: process.env.ANA_IDENTIFICADOR,
      senha: process.env.ANA_SENHA,
    });

    const token = await auth.getToken();
    const rawItems = await fetchSerieTelemetrica({
      codigoEstacao: '15400000',
      dataBusca: '2024-01-01',
      token,
    });
    const leituras = adaptAnaReadings(rawItems);

## Variáveis de ambiente necessárias

    ANA_IDENTIFICADOR=  (CPF ou CNPJ cadastrado junto a ANA)
    ANA_SENHA=           (senha recebida por e-mail apos solicitacao de acesso)

Nunca commitar essas variáveis. Ver .env.example na raiz do projeto.

## Peculiaridades da API descobertas durante o desenvolvimento

- Os nomes dos parâmetros de query da rota de consulta de dados são os
  rótulos literais em português usados na interface Swagger da ANA
  (Código da Estação, Data de Busca yyyy-MM-dd), não nomes em
  inglês/camelCase como sugere o exemplo em Java do manual oficial.
  Confirmado em 2026-09-08: os nomes do manual retornam 400 Bad Request;
  os rótulos em português, corretamente URL-encoded, retornam 200 OK.
- O parâmetro Data de Busca é obrigatório, mesmo que o exemplo do manual
  o omita.
- Todos os campos numéricos (Cota_Adotada, Vazao_Adotada, Chuva_Adotada)
  chegam como string, não como número.
- Cada medição tem seu próprio código de qualidade
  (0 = ok, 1 = suspeito, 2 = ruim), preservado no formato interno em vez
  de descartado.
- Data_Atualizacao pode legitimamente vir como null em respostas reais
  da API, mesmo que o exemplo do manual sempre mostre esse campo
  preenchido.

## Testes

    node --test src/data/anaHidroAuth.test.mjs
    node --test src/data/anaHidro.test.mjs
    node --test src/data/anaHidroAdapt.test.mjs

Todos os testes usam respostas simuladas (mock). Nenhuma chamada de rede
real é feita durante a suíte de testes.

## Créditos

Construído a partir da leitura e estudo da arquitetura da camada FIRMS do
projeto original God's Eye View (github.com/bilawalsidhu/gods-eye-view),
licença MIT, de autoria de Bilawal Sidhu.
