# Entrevistas

Sistema para conduzir e registrar entrevistas de emprego com avaliação por IA. O entrevistador transcreve as respostas do candidato e registra observações sobre raciocínio e comunicação. A IA avalia o fit com os critérios da vaga e a estrutura das respostas pela metodologia STAR. O resultado traz highlights, pontos fortes, pontos fracos e uma nota de 0 a 10. Tudo pode ser exportado em PDF.

| Parte | Tecnologia | Função |
| --- | --- | --- |
| `backend/` | Python, FastAPI, ReportLab | Chamada à IA, cálculo da nota, geração do PDF |
| `frontend/` | TypeScript, React, Vite | Interface |
| `scripts/` | JavaScript (Node.js) | Instalação e execução com um comando |

## Requisitos

- Python 3.10 ou superior
- Node.js 18 ou superior
- Uma chave da API da Anthropic, criada na Claude Platform (instruções em https://docs.claude.com)

## Instalação

Na pasta do projeto, rode:

```bash
npm run setup
```

O script cria o ambiente virtual do Python em `backend/.venv`. Em seguida instala as dependências do backend e do frontend e cria o arquivo `backend/.env`.

Depois, abra `backend/.env` e preencha a chave:

```
ANTHROPIC_API_KEY=sua-chave-aqui
```

## Execução

**Uso no dia a dia ou desenvolvimento**

```bash
npm run dev
```

Acesse http://localhost:5173. O backend e o frontend sobem juntos e recarregam sozinhos ao editar o código. Para parar, use `Ctrl+C`.

**Modo produção**

```bash
npm run build
npm start
```

Acesse http://localhost:8000. Nesse modo, o próprio backend serve a interface compilada.

## Como usar

1. **Dados do candidato:** somente o nome é obrigatório, porque identifica o PDF.
2. **Vaga e critérios:** informe o cargo, o nível e, se quiser, a descrição da vaga. Selecione na lista um ou mais critérios de avaliação. Critérios que não estão na lista podem ser criados no campo abaixo dela. Eles ficam salvos para as próximas entrevistas.
3. **Perguntas:** adicione as perguntas e transcreva as respostas. Perguntas objetivas, como pretensão salarial, podem ter o STAR desmarcado. Perguntas sem resposta ficam fora da avaliação.
4. **Raciocínio e comunicação:** marque os comportamentos observados e complemente com anotações livres. Por exemplo, "demorou uns 20 segundos para começar".
5. **Avaliação:** clique em **Gerar avaliação** e depois em **Exportar PDF**. A avaliação exige pelo menos um critério selecionado e uma pergunta respondida.

A entrevista é salva automaticamente no navegador enquanto você digita. Fechar ou recarregar a página não apaga o conteúdo. **Nova entrevista** limpa o formulário, com confirmação. Se você editar algo depois de avaliar, o sistema avisa que a avaliação está desatualizada.

O PDF pode ser exportado com ou sem avaliação, desde que o nome do candidato esteja preenchido.

## Como a nota é calculada

A IA atribui notas parciais de 0 a 10. A nota final é calculada pelo sistema, e não pela IA, como média ponderada:

| Componente | Peso padrão | Origem |
| --- | --- | --- |
| Fit com os critérios | 40% | Média das notas de cada critério selecionado |
| Metodologia STAR | 30% | Média das notas das perguntas avaliadas em STAR |
| Raciocínio | 15% | Respostas e observações do entrevistador |
| Comunicação | 15% | Respostas e observações do entrevistador |

Se algum componente ficar sem nota, o peso dele é redistribuído proporcionalmente entre os demais. Isso acontece, por exemplo, quando nenhuma pergunta está marcada para STAR.

A composição completa (nota, peso e contribuição) aparece na tela e no PDF, para que o resultado possa ser conferido.

| Nota final | Classificação |
| --- | --- |
| 8,0 a 10 | Recomendado |
| 6,0 a 7,9 | Recomendado com ressalvas |
| 0 a 5,9 | Não recomendado |

## Privacidade e imparcialidade

- Nome, e-mail, telefone, LinkedIn e nome do entrevistador **não são enviados à IA**. Esses dados aparecem apenas na tela e no PDF.
- A IA é instruída a desconsiderar idade, gênero, raça, origem, religião, deficiência e sotaque.
- Hesitações e gagueira são avaliadas pelo impacto na clareza da mensagem. Se a disfluência decorrer de uma condição, como gagueira crônica, registre isso nas anotações de comunicação e a IA não a penalizará.
- Nada é gravado no servidor. O rascunho fica apenas no navegador de quem está usando e é apagado se os dados do navegador forem limpos. Guarde o PDF para manter o registro.

A avaliação é um apoio à decisão e não a substitui. Revise o feedback antes de usá-lo.

## Configuração

Todas as opções ficam em `backend/.env`. Reinicie o sistema após alterar.

| Variável | Padrão | Descrição |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | (vazio) | Chave da API. Sem ela, a avaliação fica indisponível, mas o restante funciona. |
| `ANTHROPIC_MODEL` | `claude-sonnet-5` | Modelo usado na avaliação |
| `PESO_FIT` | `40` | Peso do fit com os critérios |
| `PESO_STAR` | `30` | Peso da metodologia STAR |
| `PESO_RACIOCINIO` | `15` | Peso do raciocínio |
| `PESO_COMUNICACAO` | `15` | Peso da comunicação |

Os pesos não precisam somar 100: são convertidos em percentuais. Um peso `0` tira o componente da nota.

## Estrutura

```
entrevistas/
├── package.json            atalhos: setup, dev, build, start
├── scripts/
│   ├── setup.js            instalação completa
│   ├── dev.js              sobe backend e frontend juntos
│   └── utils.js
├── backend/
│   ├── main.py             rotas da API
│   ├── evaluator.py        prompt, chamada à IA e cálculo da nota
│   ├── pdf_report.py       relatório em PDF
│   ├── models.py           modelos de dados
│   ├── config.py           leitura do .env
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── index.html
    ├── vite.config.js
    └── src/
        ├── App.tsx         estado da entrevista e ações
        ├── styles.css
        ├── types.ts
        ├── constants.ts    critérios e marcadores padrão
        ├── components/     seções da interface
        └── lib/            API, rascunho e formatação
```

A lista de critérios padrão e os marcadores de raciocínio e comunicação ficam em `frontend/src/constants.ts`. As instruções dadas à IA ficam em `PROMPT_SISTEMA`, em `backend/evaluator.py`.

## Instalação manual

Se preferir não usar os scripts:

```bash
# Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env               # Windows: copy .env.example .env
uvicorn main:app --port 8000 --reload

# Frontend (em outro terminal)
cd frontend
npm install
npm run dev
```

## Problemas comuns

| Mensagem ou sintoma | Solução |
| --- | --- |
| "A chave da API não está configurada" | Preencha `ANTHROPIC_API_KEY` em `backend/.env` e reinicie. |
| "A chave da API foi recusada" | Confira se a chave foi copiada inteira, sem espaços. |
| "O modelo … não foi encontrado" | Ajuste `ANTHROPIC_MODEL` para um modelo disponível na sua conta. |
| "O limite de uso da API foi atingido" | Aguarde alguns instantes e tente de novo. |
| "Não foi possível conectar à API da Anthropic" | Verifique a conexão com a internet ou um firewall corporativo. |
| "Não foi possível conectar ao servidor" | O backend não está rodando. Use `npm run dev`, e não apenas o frontend. |
| Porta 8000 ou 5173 em uso | Feche outra instância do sistema ou o programa que ocupa a porta. |
| Python não encontrado no Windows | Reinstale o Python marcando a opção "Add python.exe to PATH". |
