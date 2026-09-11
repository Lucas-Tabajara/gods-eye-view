# Diário de Bordo: Obstáculos e Soluções

Registro cronológico dos obstáculos reais enfrentados durante a
preparação do ambiente e início da auditoria do God's Eye View.

## 1. Hardware insuficiente para rodar localmente

Obstáculo: notebook Lenovo IdeaPad 1i com processador Celeron e
apenas 3,4 GiB de RAM total (com aproximadamente 876 MiB disponíveis
em uso normal do sistema). O projeto usa CesiumJS com renderização
WebGL pesada (Google Photorealistic 3D Tiles), além de exigir
Node.js + Vite + dependências grandes para build.

Diagnóstico: RAM já estava sendo parcialmente trocada para swap
mesmo em uso ocioso do sistema, o que indicava risco real de o
`npm install` ou o navegador travarem ao tentar rodar tudo
localmente.

Solução adotada: mover toda a parte pesada (instalação de
dependências, build, testes, execução do servidor de desenvolvimento)
para o GitHub Codespaces, que roda numa máquina virtual na nuvem
acessada pelo navegador. Isso elimina o gargalo de RAM para tudo,
exceto a renderização final do WebGL no navegador, que inevitavelmente
ainda depende da GPU local.

Lição: nem todo obstáculo técnico precisa ser resolvido à força na
própria máquina. Às vezes a solução certa é mudar onde a carga de
trabalho roda, não tentar otimizar um hardware limitado.

## 2. Arquivo `.env.example` não encontrado pelo `cp`

Obstáculo: o comando `cp .env.example .env` retornou
`No such file or directory`, mesmo estando aparentemente na pasta
certa do projeto.

Diagnóstico: o arquivo existe, mas é um arquivo oculto (começa com
ponto), então não aparecia num `ls` simples, só ao rodar `ls -la`.
O erro inicial provavelmente veio de rodar o comando fora do
diretório raiz do projeto, ou de digitação.

Solução: confirmar com `pwd` que estava em
`/workspaces/gods-eye-view`, depois confirmar a existência do
arquivo com `ls -la | grep -i env` antes de tentar copiar de novo.
O `cp` funcionou normalmente na segunda tentativa.

Lição: ao debugar um "arquivo não encontrado", primeiro confirmar o
diretório atual com `pwd` e a existência exata do arquivo com
`ls -la`, incluindo arquivos ocultos, antes de supor que o comando
está errado.

## 3. Chave do Google Maps criada com restrição de API excessiva

Obstáculo: ao gerar a chave de API no Google Cloud Console, ela veio
automaticamente restrita a 35 APIs em vez de apenas a Map Tiles API,
que é a única necessária para este projeto.

Risco identificado: uma chave com permissão para muitas APIs aumenta
a superfície de dano caso ela vaze algum dia, mesmo estando
restrita por domínio (HTTP referrer).

Solução: revisar manualmente a seção "API restrictions" da chave no
Console e restringir explicitamente para apenas a Map Tiles API,
seguindo o princípio do menor privilégio necessário.

Lição: configurações padrão de provedores de nuvem nem sempre seguem
o princípio de menor privilégio. Vale sempre revisar restrições
geradas automaticamente antes de considerar a configuração pronta.

## 4. Projeto do Google Cloud incorreto selecionado inicialmente

Obstáculo: ao acessar o Google Cloud Console pela primeira vez, o
projeto ativo era "Generative Language Client", criado
automaticamente em uso anterior da API do Gemini, em vez de um
projeto dedicado a este trabalho.

Solução: criar um projeto novo e específico (`gods-eye-view-dev`)
antes de ativar qualquer API ou gerar qualquer chave, evitando
misturar cotas, custos e permissões de projetos diferentes.

Lição: conferir sempre qual projeto está ativo antes de qualquer
configuração no Google Cloud Console. É fácil configurar algo no
projeto errado sem perceber.