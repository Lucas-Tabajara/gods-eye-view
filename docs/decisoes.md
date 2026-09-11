# Decisões de Arquitetura — Cliente ANA HidroWebService

## Separação em três arquivos (auth, fetch, adapt)

Decisão: separar autenticação, busca de dados e adaptação de formato em
três arquivos distintos, espelhando o padrão já usado pela camada FIRMS
do projeto original.

Alternativa rejeitada: um único arquivo fazendo tudo.

Motivo: cada arquivo isola o app de um tipo diferente de instabilidade
(regras de autenticação da ANA, formato da API externa, convenções
internas do projeto). Uma mudança em um não deveria forçar mudança nos
outros.

## Distinção entre zero e ausência de dado

Decisão: campos vazios ou nulos na resposta da ANA viram `null` no
formato interno, nunca `0`.

Motivo: uma leitura real de "0.00" de chuva é diferente de "não há
leitura registrada". Confundir os dois geraria uma inferência falsa
(seção 9.2 do guia de implementação).

## Preservar status de qualidade do dado, não descartar

Decisão: medições marcadas como suspeitas ou ruins pela própria ANA
(Cota_Adotada_Status = 1 ou 2) são mantidas no resultado, com a
qualidade sinalizada, em vez de filtradas silenciosamente.

Motivo: descartar dado suspeito sem avisar esconde informação que quem
for usar o cliente pode precisar decidir como tratar.
