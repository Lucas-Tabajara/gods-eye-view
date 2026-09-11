# Auditoria de Arquitetura — God's Eye View

Documento pessoal de estudo, produzido durante a Fase 1 do processo de
contribuição brasileira. Fluxo estudado: NASA FIRMS (focos de calor).

## 1. Por que estudei essa camada

A camada FIRMS foi escolhida como referência porque tem a mesma estrutura
que o cliente da ANA vai precisar ter: consumir uma API externa que exige
uma chave, lidar com respostas que podem falhar ou vir malformadas,
aplicar cache para não sobrecarregar a fonte, e normalizar o dado bruto
para um formato interno consistente. Entender como o projeto original
resolveu esses problemas para o FIRMS serve como modelo direto para
replicar as mesmas decisões na integração hidrológica.

## 2. O caminho do dado, do início ao fim

Quando o navegador precisa dos dados de incêndio, ele chama a rota interna
`/api/firms`. Essa chamada é interceptada pelo `firmsProxy()`, que roda
dentro do servidor, não no navegador. Esse proxy lê a chave secreta
(`FIRMS_MAP_KEY`) do arquivo `.env` e monta a URL real para a API da NASA
FIRMS. A resposta em formato CSV é interpretada pela função
`parseFirmsCsv()`, que filtra os registros das últimas 24 horas. Depois de
cacheado por 30 minutos, o resultado é devolvido ao navegador — mas sem a
`MAP_KEY`. No navegador, a função `adaptFirmsRecords()` converte esse
resultado para o formato interno que o resto do app entende.

## 3. Onde fica o segredo (MAP_KEY) e por quê

A `FIRMS_MAP_KEY` é lida dentro da função `mapKey()`, definida dentro de
`firmsProxy()`, em `vite.config.js` — um arquivo que roda exclusivamente
no processo Node.js do servidor, nunca no navegador. Essa chave nunca
chega ao navegador em nenhum momento: a URL completa que contém a chave
(montada em `fetchSource()`) é usada só internamente para chamar a NASA, e
a resposta devolvida ao cliente (`/api/firms`) já vem sem ela. Isso
importa porque qualquer coisa que rode no navegador pode ser lida por
qualquer visitante do site via DevTools — se a chave estivesse exposta
ali, qualquer pessoa poderia copiá-la e consumir a cota gratuita da conta,
ou até gerar cobrança dependendo do plano da API.

## 4. Por que existem dois arquivos de transformação (Csv e Adapt)

`firmsCsv.js` e `firmsAdapt.js` isolam o app de duas fontes de
instabilidade diferentes. O `firmsCsv.js` isola o app das mudanças na
fonte externa — formato de CSV da NASA, nomes e ordem das colunas,
peculiaridades como hora sem zero à esquerda. O `firmsAdapt.js` isola o
app de mudanças nas próprias convenções internas do projeto — como o app
representa "confiança" (0 a 1), quais campos existem no objeto final,
como o dado é consumido pela camada de renderização. Separar essas duas
responsabilidades significa que uma mudança na API da NASA nunca obriga a
mexer em como o resto do app consome o dado, e vice-versa. Também permite,
em tese, que múltiplas fontes de incêndio diferentes (cada uma com seu
próprio parser) alimentem o mesmo adapter, já que o formato interno é um
só.

## 5. Como o sistema lida com falha parcial

O FIRMS é consultado a partir de três satélites diferentes (NOAA20,
NOAA21, SNPP), buscados sequencialmente (nunca em paralelo, para não
sobrecarregar a cota gratuita da API). Se uma dessas três fontes falhar,
o sistema não trata isso como erro fatal — ela é marcada com `ok: false`
e o processamento segue normalmente com as outras duas fontes que
funcionaram (`refreshUpstream()`, em `vite.config.js`). Só quando as três
falham ao mesmo tempo é que o proxy lança um erro de verdade — e mesmo
nesse caso, o mecanismo de cache em disco permite que o proxy sirva a
última versão válida guardada, em vez de deixar o usuário sem nenhum
dado.

## 6. O que isso me ensina para o cliente da ANA

- Separar em dois arquivos: um cuidando só do formato bruto que a API da
  ANA devolve (parsing, peculiaridades, erros disfarçados de sucesso), e
  outro convertendo isso para o formato interno do projeto.
- Nunca deixar a credencial/token da ANA chegar ao navegador — ela precisa
  viver só do lado do servidor, dentro de um proxy próprio, do mesmo jeito
  que o `firmsProxy()` faz.
- Diferenciar explicitamente "zero" (estação registrou cota zero de fato)
  de "ausência de dado" (estação não transmitiu) — usando `null` ou algum
  valor sentinela em vez de simplesmente zerar um valor ausente.
- Implementar cache com TTL para não sobrecarregar a API da ANA a cada
  requisição do navegador.
- Tratar falha parcial (uma estação sem dado) sem derrubar as demais
  estações que estão funcionando normalmente.
- Nunca logar a URL completa da requisição quando ela contém a chave/token
  de autenticação.

## 7. Diagrama (texto simples)


NASA FIRMS (CSV)
      │
      ▼
firmsProxy (servidor, esconde MAP_KEY)
      │
      ▼
firmsCsv.js (parsing, tolera formato instável)
      │
      ▼
cache (30 min)
      │
      ▼
/api/firms (resposta ao navegador, sem chave)
      │
      ▼
firmsAdapt.js (formato interno do app)
      │
      ▼
camada de dados → globo 3D
