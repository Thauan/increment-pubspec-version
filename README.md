# Increment Pubspec Version GitHub Action

Essa GitHub Action incrementa automaticamente a versão no arquivo `pubspec.yaml` com base nas labels de Pull Requests (PR) ou nas mensagens de commit, criando novas tags para as versões incrementadas.

## Permissões Necessárias

Certifique-se de que o repositório onde essa Action será usada tenha permissões para:

1. Permitir a criação de commits e tags.
2. Usar o `GITHUB_TOKEN` com escopo padrão para commits e push.

Se você estiver usando um repositório privado ou precisa de permissões adicionais, configure um token com escopos adicionais em **Settings > Developer Settings > Personal Access Tokens**.

## Configuração do Arquivo `action.yml`

```yaml
name: "Incrementar Versão no Pubspec"
description: "Incrementa a versão no pubspec.yaml com base nas labels de PR ou mensagens de commit."
author: "Thauan (https://github.com/Thauan)"
inputs:
  enable_on_commit:
    description: "Habilita a funcionalidade em eventos de commit."
    required: false
    default: "false"
  github_token:
    description: "Token do GitHub para acesso às informações de commit."
    required: true
runs:
  using: "node16"
  main: "dist/index.js"
branding:
  icon: "tag"
  color: "blue"
```

## Atributos

### `enable_on_commit`
- Tipo: Booleano (`true` ou `false`)
- Descrição: Habilita a funcionalidade para incrementar versões com base em mensagens de commit.
- Padrão: `false`

### `github_token`
- Tipo: String
- Descrição: Token do GitHub para autenticação e acesso a eventos de PR e commits.

## Exemplo de Pipeline

Aqui está um exemplo de uso dessa Action:

```yaml
name: Incrementar Versão no PR ou Commit

on:
  pull_request:
    types:
      - closed
  push:
    branches:
      - main

jobs:
  incrementar-versao:
    if: github.event.pull_request.merged == true || github.event_name == 'push'
    runs-on: ubuntu-latest
    steps:
      - name: Fazer checkout do código
        uses: actions/checkout@v2
        with:
          path: "increment-pubspec-version"

      - name: Configurar Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 16

      - name: Executar Incremento de Versão
        uses: ./
        with:
          enable_on_commit: "true"
          github_token: "${{ secrets.GITHUB_TOKEN }}"

      - name: Criar Tag com Nova Versão
        if: steps.increment_version.outputs.new_version
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git tag v${{ steps.increment_version.outputs.new_version }}
          git push origin v${{ steps.increment_version.outputs.new_version }}
```

## Funcionamento das Labels e Commits

### Labels de Pull Requests
- **major**: Incrementa a versão principal (Exemplo: `1.0.0` para `2.0.0`).
- **minor**: Incrementa a versão secundária (Exemplo: `1.0.0` para `1.1.0`).
- **patch**: Incrementa a versão de correção (Exemplo: `1.0.0` para `1.0.1`).

### Mensagens de Commit
As mensagens de commit devem conter as palavras-chave:
- **major**: Para incrementos de versão principal.
- **minor**: Para incrementos de versão secundária.
- **patch**: Para incrementos de versão de correção.

### Exemplo de Commit
```bash
git commit -m "feat: adicionar nova funcionalidade (minor)"
```

## Testando Localmente

Para testar localmente, você pode usar a ferramenta [act](https://github.com/nektos/act):

1. Certifique-se de que o `act` está instalado.
2. Execute o comando:
   ```bash
   act -W .github/workflows/increment-version.yml
   ```

## Problemas Comuns

### Erro de Permissão (`403`)
Certifique-se de que o `GITHUB_TOKEN` tem permissões para criar commits e tags.

### Problema com o `dist/index.js`
Garanta que o projeto foi buildado corretamente antes de ser usado:
```bash
npm run build
```

