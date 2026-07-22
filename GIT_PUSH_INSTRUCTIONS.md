# Como enviar para o GitHub

O código já foi revisado e está pronto. Siga os passos abaixo no seu computador
(onde o Git roda nativamente, sem as restrições do ambiente da Cowork).

## 0. Limpeza rápida (uma vez)
No Windows Explorer, dentro da pasta do projeto, **apague** estes itens que ficaram
travados pelo ambiente (estão vazios/quebrados):
- a pasta `.git` (se existir)
- os arquivos `_tmp_6_98ef8550b892f868e404e8fbe29a95be` e `_tmp_6_e3f83c055aef9207389c3df11f401f60`

## 1. Crie o repositório no GitHub
Acesse https://github.com/new e crie um repositório **vazio** (sem README/gitignore).
Copie a URL, algo como `https://github.com/SEU_USUARIO/eliesio-monte.git`.

## 2. Inicialize e envie
Abra o terminal (PowerShell ou Git Bash) na pasta do projeto e rode:

```bash
git init -b main
git add -A
git commit -m "chore: primeira versão revisada para publicação"
git remote add origin https://github.com/SEU_USUARIO/eliesio-monte.git
git push -u origin main
```

O `.gitignore` já protege `.env`, `node_modules`, credenciais do WhatsApp e logs —
nada sensível será enviado. Confirme antes do push com `git status`.

## 3. Depois do push
- Configure as variáveis de ambiente (veja `.env.example`) onde for hospedar (ex.: Vercel).
- Leia o `SECURITY_NOTES.md` antes de operar com dados reais de clientes.
