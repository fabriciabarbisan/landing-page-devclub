# Contribuindo

Obrigado por considerar contribuir com este projeto! Como é um site estático simples, o processo é bem direto.

## Antes de começar

- Dê uma lida no [README](README.md) pra entender o escopo do projeto e o aviso sobre conteúdo ilustrativo.
- Verifique nas [Issues](../../issues) se alguém já não relatou o mesmo problema ou sugeriu a mesma ideia.
- Para mudanças grandes (nova seção, reestruturação visual), abra uma issue antes pra alinhar a ideia — evita retrabalho.

## Como rodar o projeto localmente

Veja a seção **Como rodar localmente** do [README](README.md#-como-rodar-localmente). Resumo:

```bash
git clone https://github.com/<seu-usuario>/<seu-repositorio>.git
cd <seu-repositorio>
python3 -m http.server 8080
```

Não há build, então qualquer alteração em `index.html`, `style.css` ou `script.js` já aparece ao recarregar a página.

## Fluxo de contribuição

1. Faça um fork do repositório.
2. Crie uma branch a partir da `main`:
   ```bash
   git checkout -b tipo/descricao-curta
   ```
   Exemplos: `fix/menu-mobile-nao-fecha`, `feat/secao-newsletter`, `docs/atualiza-readme`.
3. Faça as alterações, testando no navegador (desktop e, se possível, mobile).
4. Confira o console do navegador — não deve haver erros de JavaScript.
5. Faça commits pequenos e descritivos (veja convenção abaixo).
6. Abra um Pull Request explicando **o que** mudou e **por quê**. Prints ou GIFs de "antes/depois" ajudam bastante em mudanças visuais.

## Convenção de commits

Usamos prefixos simples, inspirados em [Conventional Commits](https://www.conventionalcommits.org/pt-br/):

| Prefixo     | Quando usar                                         |
|-------------|------------------------------------------------------|
| `feat:`     | Nova funcionalidade ou seção                          |
| `fix:`      | Correção de bug                                       |
| `style:`    | Mudança visual/CSS que não altera comportamento       |
| `docs:`     | Mudanças em documentação (README, comentários, etc.)  |
| `refactor:` | Reorganização de código sem mudar comportamento       |
| `perf:`     | Melhoria de performance                                |
| `chore:`    | Tarefas de manutenção (gitignore, licença, etc.)      |

Exemplo: `fix: corrige overflow do menu mobile em telas pequenas`

## Estilo de código

- **HTML**: semântico, com atributos `aria-*` em elementos interativos ou decorativos quando fizer sentido.
- **CSS**: siga o padrão de variáveis já definido em `:root` no topo do `style.css` — evite cores "hardcoded" fora dali.
- **JavaScript**: sem frameworks ou dependências novas sem discutir antes numa issue. Prefira funções pequenas e nomeadas, como o restante do arquivo já faz.
- Sempre teste com `prefers-reduced-motion` ativado pra garantir que novas animações respeitam essa preferência.

## Conteúdo ilustrativo

Depoimentos, avatares, nomes de instrutores, "empresas contratantes" e valores salariais neste projeto são **fictícios/ilustrativos** — não substitua por dados reais de pessoas ou empresas sem autorização explícita delas. Veja o aviso completo no [README](README.md#%EF%B8%8F-aviso-importante).

## Dúvidas

Abra uma issue com sua pergunta — é o jeito mais fácil de manter tudo documentado pra quem chegar depois.
