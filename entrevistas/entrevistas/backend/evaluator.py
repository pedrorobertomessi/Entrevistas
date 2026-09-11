"""Avaliação da entrevista com IA e cálculo da nota final ponderada.

A IA atribui as notas parciais (critérios, STAR, raciocínio e comunicação).
A nota final é calculada aqui, de forma determinística, com os pesos do .env.
"""
from __future__ import annotations

from datetime import datetime
from decimal import ROUND_HALF_UP, Decimal
from typing import Optional

import anthropic
from pydantic import ValidationError

from config import FAIXAS_RECOMENDACAO, Configuracao
from models import (
    Avaliacao,
    ComponenteNota,
    Entrevista,
    Observacao,
    Pergunta,
    ResultadoIA,
)


class ErroAvaliacao(Exception):
    """Erro com mensagem pronta para exibir ao usuário."""

    def __init__(self, mensagem: str, status: int = 502) -> None:
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.status = status


# ---------------------------------------------------------------------------
# Prompt e formato de saída
# ---------------------------------------------------------------------------

PROMPT_SISTEMA = """Você é especialista em recrutamento e seleção e avalia entrevistas de emprego de forma criteriosa, justa e baseada em evidências.

Você receberá a descrição da vaga, os critérios escolhidos pelo entrevistador, as perguntas feitas com as respostas transcritas e as observações do entrevistador sobre raciocínio e comunicação.

Como avaliar:

1. Fit com os critérios. Para cada critério, atribua uma nota de 0 a 10 com base apenas nas evidências presentes nas respostas. Se faltar evidência sobre um critério, dê uma nota conservadora (entre 3 e 5) e deixe isso claro na justificativa.

2. Metodologia STAR. Avalie somente as perguntas marcadas com avaliar_star="sim". Classifique Situação, Tarefa, Ação e Resultado como presente, parcial ou ausente e dê uma nota de 0 a 10 para a estrutura e a qualidade da resposta. Ações descritas em primeira pessoa e resultados concretos ou mensuráveis valem mais do que relatos genéricos ou no plural ("a gente fez").

3. Raciocínio. Combine as observações do entrevistador (tempo para responder, necessidade de ajuda, organização das ideias) com a lógica e a coerência das respostas.

4. Comunicação. Combine as observações do entrevistador (hesitações, gagueira, vícios de linguagem, prolixidade) com a clareza e a objetividade das respostas. Avalie o impacto dessas ocorrências no entendimento da mensagem, e não só a frequência, considerando o nervosismo natural de uma entrevista. Se as anotações indicarem que a disfluência decorre de uma condição (como gagueira crônica), não a penalize: avalie apenas a clareza do conteúdo.

Escala de referência: 0 a 2 muito abaixo do esperado; 3 a 4 abaixo do esperado; 5 a 6 parcialmente adequado; 7 a 8 adequado; 9 a 10 excepcional, com evidências fortes. Use uma casa decimal quando fizer sentido e calibre a exigência pelo nível da vaga.

Regras:
- Baseie-se somente no que foi transcrito e anotado. Não invente fatos, números ou experiências.
- As respostas são transcrições feitas pelo entrevistador e podem ter erros de digitação ou abreviações. Não penalize isso.
- Ignore idade, gênero, raça, origem, religião, deficiência, sotaque e qualquer característica pessoal sem relação com o trabalho.
- Não calcule nem mencione nota final. Ela é calculada pelo sistema a partir das suas notas parciais.
- Nos highlights, cite a pergunta relacionada pelo número (por exemplo, "Na pergunta 2, ...").
- Escreva em português do Brasil, em tom profissional e objetivo. Refira-se à pessoa entrevistada como "o(a) candidato(a)" ou construa frases sem sujeito explícito.
"""

_NOTA = {"type": "number", "minimum": 0, "maximum": 10}
_PRESENCA = {"type": "string", "enum": ["presente", "parcial", "ausente"]}
_DIMENSAO = {
    "type": "object",
    "properties": {
        "nota": _NOTA,
        "comentario": {"type": "string", "description": "2 a 4 frases com as evidências usadas."},
    },
    "required": ["nota", "comentario"],
}

FERRAMENTA_AVALIACAO = {
    "name": "registrar_avaliacao",
    "description": "Registra a avaliação estruturada da entrevista de emprego.",
    "input_schema": {
        "type": "object",
        "properties": {
            "resumo": {
                "type": "string",
                "description": "Visão geral da aderência à vaga, em 3 a 5 frases.",
            },
            "highlights": {
                "type": "array",
                "items": {"type": "string"},
                "description": "2 a 4 momentos marcantes da entrevista, positivos ou negativos.",
            },
            "pontos_fortes": {
                "type": "array",
                "items": {"type": "string"},
                "description": "2 a 5 pontos fortes concretos, uma frase cada.",
            },
            "pontos_fracos": {
                "type": "array",
                "items": {"type": "string"},
                "description": "2 a 5 pontos fracos ou a desenvolver, uma frase cada.",
            },
            "criterios": {
                "type": "array",
                "description": "Uma entrada por critério informado, na mesma ordem e com o mesmo nome.",
                "items": {
                    "type": "object",
                    "properties": {
                        "criterio": {"type": "string"},
                        "nota": _NOTA,
                        "justificativa": {
                            "type": "string",
                            "description": "1 a 3 frases com as evidências usadas.",
                        },
                    },
                    "required": ["criterio", "nota", "justificativa"],
                },
            },
            "star": {
                "type": "array",
                "description": 'Uma entrada por pergunta com avaliar_star="sim". Lista vazia se nenhuma estiver marcada.',
                "items": {
                    "type": "object",
                    "properties": {
                        "pergunta_id": {
                            "type": "string",
                            "description": "Valor exato do atributo id da pergunta.",
                        },
                        "situacao": _PRESENCA,
                        "tarefa": _PRESENCA,
                        "acao": _PRESENCA,
                        "resultado": _PRESENCA,
                        "nota": _NOTA,
                        "comentario": {
                            "type": "string",
                            "description": "1 a 3 frases sobre a estrutura da resposta e o que faltou.",
                        },
                    },
                    "required": [
                        "pergunta_id",
                        "situacao",
                        "tarefa",
                        "acao",
                        "resultado",
                        "nota",
                        "comentario",
                    ],
                },
            },
            "raciocinio": _DIMENSAO,
            "comunicacao": _DIMENSAO,
        },
        "required": [
            "resumo",
            "highlights",
            "pontos_fortes",
            "pontos_fracos",
            "criterios",
            "star",
            "raciocinio",
            "comunicacao",
        ],
    },
}


# ---------------------------------------------------------------------------
# Preparação dos dados
# ---------------------------------------------------------------------------


def criterios_unicos(entrevista: Entrevista) -> list[str]:
    vistos: dict[str, str] = {}
    for criterio in entrevista.criterios:
        nome = " ".join(criterio.split())
        if nome and nome.lower() not in vistos:
            vistos[nome.lower()] = nome
    return list(vistos.values())


def perguntas_avaliaveis(entrevista: Entrevista) -> list[tuple[int, Pergunta]]:
    """Perguntas com enunciado e resposta, com o número exibido na tela."""
    return [
        (numero, pergunta)
        for numero, pergunta in enumerate(entrevista.perguntas, start=1)
        if pergunta.texto.strip() and pergunta.resposta.strip()
    ]


def pendencias(entrevista: Entrevista) -> list[str]:
    itens = []
    if not criterios_unicos(entrevista):
        itens.append("Selecione pelo menos um critério de avaliação.")
    if not perguntas_avaliaveis(entrevista):
        itens.append("Registre pelo menos uma pergunta com a resposta do candidato.")
    return itens


def _bloco_observacao(tag: str, observacao: Observacao) -> list[str]:
    marcadores = "; ".join(m.strip() for m in observacao.marcadores if m.strip())
    return [
        f"<{tag}>",
        f"Marcadores selecionados: {marcadores or 'nenhum'}",
        "Anotações do entrevistador:",
        observacao.notas.strip() or "Nenhuma anotação.",
        f"</{tag}>",
    ]


def montar_prompt(entrevista: Entrevista) -> str:
    """Monta a mensagem enviada à IA. Dados pessoais do candidato não são incluídos."""
    vaga = entrevista.vaga
    linhas = [
        "Avalie a entrevista abaixo e registre o resultado com a ferramenta registrar_avaliacao.",
        "",
        "<vaga>",
        f"Cargo: {vaga.titulo.strip() or 'Não informado'}",
        f"Nível: {vaga.nivel.strip() or 'Não informado'}",
        "Descrição e requisitos:",
        vaga.descricao.strip() or "Não informados.",
        "</vaga>",
        "",
        "<criterios>",
        *[f"- {criterio}" for criterio in criterios_unicos(entrevista)],
        "</criterios>",
        "",
        "<perguntas_e_respostas>",
    ]
    for numero, pergunta in perguntas_avaliaveis(entrevista):
        star = "sim" if pergunta.avaliar_star else "não"
        linhas += [
            f'<pergunta numero="{numero}" id="{pergunta.id}" avaliar_star="{star}">',
            "<enunciado>",
            pergunta.texto.strip(),
            "</enunciado>",
            "<resposta_transcrita>",
            pergunta.resposta.strip(),
            "</resposta_transcrita>",
            "</pergunta>",
        ]
    linhas += ["</perguntas_e_respostas>", ""]
    linhas += _bloco_observacao("observacoes_raciocinio", entrevista.raciocinio)
    linhas += [""]
    linhas += _bloco_observacao("observacoes_comunicacao", entrevista.comunicacao)
    return "\n".join(linhas)


# ---------------------------------------------------------------------------
# Nota final
# ---------------------------------------------------------------------------


def arredondar(valor: float, casas: str = "0.1") -> float:
    return float(Decimal(str(valor)).quantize(Decimal(casas), rounding=ROUND_HALF_UP))


def _media(valores: list[float]) -> Optional[float]:
    return sum(valores) / len(valores) if valores else None


def classificar(nota: float) -> tuple[str, str]:
    for limite, faixa, rotulo in FAIXAS_RECOMENDACAO:
        if nota >= limite:
            return faixa, rotulo
    return FAIXAS_RECOMENDACAO[-1][1], FAIXAS_RECOMENDACAO[-1][2]


def calcular_nota_final(
    resultado: ResultadoIA, cfg: Configuracao
) -> tuple[float, list[ComponenteNota]]:
    """Média ponderada das notas parciais.

    Componentes sem nota (por exemplo, nenhuma pergunta avaliada em STAR) saem
    do cálculo e o peso deles é redistribuído proporcionalmente entre os demais.
    """
    pesos = cfg.pesos
    componentes = [
        ("fit", "Fit com os critérios", _media([c.nota for c in resultado.criterios]), pesos.fit),
        ("star", "Metodologia STAR", _media([s.nota for s in resultado.star]), pesos.star),
        ("raciocinio", "Raciocínio", resultado.raciocinio.nota, pesos.raciocinio),
        ("comunicacao", "Comunicação", resultado.comunicacao.nota, pesos.comunicacao),
    ]
    ativos = [c for c in componentes if c[2] is not None and c[3] > 0]
    soma_pesos = sum(c[3] for c in ativos)
    if soma_pesos <= 0:
        raise ErroAvaliacao(
            "Todos os pesos da nota estão zerados. Ajuste os valores PESO_* no arquivo backend/.env.",
            500,
        )

    total = 0.0
    composicao: list[ComponenteNota] = []
    for chave, rotulo, nota, peso in ativos:
        fracao = peso / soma_pesos
        contribuicao = nota * fracao
        total += contribuicao
        composicao.append(
            ComponenteNota(
                chave=chave,
                rotulo=rotulo,
                nota=arredondar(nota),
                peso=arredondar(fracao * 100),
                contribuicao=arredondar(contribuicao, "0.01"),
            )
        )
    return arredondar(total), composicao


def _organizar_resultado(resultado: ResultadoIA, entrevista: Entrevista) -> ResultadoIA:
    """Mantém os critérios na ordem escolhida e descarta STAR de perguntas não marcadas."""
    ordem = {nome.lower(): indice for indice, nome in enumerate(criterios_unicos(entrevista))}
    criterios = sorted(
        resultado.criterios, key=lambda c: ordem.get(c.criterio.strip().lower(), len(ordem))
    )
    ids_star = [p.id for _, p in perguntas_avaliaveis(entrevista) if p.avaliar_star]
    star = sorted(
        (s for s in resultado.star if s.pergunta_id in ids_star),
        key=lambda s: ids_star.index(s.pergunta_id),
    )
    return resultado.model_copy(update={"criterios": criterios, "star": star})


# ---------------------------------------------------------------------------
# Chamada à IA
# ---------------------------------------------------------------------------


def _chamar_ia(entrevista: Entrevista, cfg: Configuracao) -> ResultadoIA:
    cliente = anthropic.Anthropic(api_key=cfg.api_key)
    try:
        resposta = cliente.messages.create(
            model=cfg.modelo,
            max_tokens=8000,
            system=PROMPT_SISTEMA,
            tools=[FERRAMENTA_AVALIACAO],
            tool_choice={"type": "tool", "name": FERRAMENTA_AVALIACAO["name"]},
            messages=[{"role": "user", "content": montar_prompt(entrevista)}],
        )
    except anthropic.AuthenticationError:
        raise ErroAvaliacao(
            "A chave da API foi recusada. Confira o valor de ANTHROPIC_API_KEY em backend/.env."
        ) from None
    except anthropic.NotFoundError:
        raise ErroAvaliacao(
            f"O modelo {cfg.modelo} não foi encontrado. Ajuste ANTHROPIC_MODEL em backend/.env."
        ) from None
    except anthropic.RateLimitError:
        raise ErroAvaliacao(
            "O limite de uso da API foi atingido. Aguarde alguns instantes e tente novamente.", 429
        ) from None
    except anthropic.APIConnectionError:
        raise ErroAvaliacao(
            "Não foi possível conectar à API da Anthropic. Verifique a conexão com a internet."
        ) from None
    except anthropic.APIStatusError as erro:
        raise ErroAvaliacao(
            f"A API retornou um erro ({erro.status_code}). Tente novamente em instantes."
        ) from None

    if resposta.stop_reason == "max_tokens":
        raise ErroAvaliacao(
            "A avaliação foi interrompida por ficar longa demais. Reduza o número de perguntas e tente novamente."
        )
    bloco = next((b for b in resposta.content if b.type == "tool_use"), None)
    if bloco is None:
        raise ErroAvaliacao("A IA não devolveu uma avaliação estruturada. Tente novamente.")
    try:
        return ResultadoIA.model_validate(bloco.input)
    except ValidationError:
        raise ErroAvaliacao("A avaliação devolvida pela IA veio incompleta. Tente novamente.") from None


def avaliar_entrevista(entrevista: Entrevista, cfg: Configuracao) -> Avaliacao:
    if not cfg.ia_configurada:
        raise ErroAvaliacao(
            "A chave da API não está configurada. Defina ANTHROPIC_API_KEY em backend/.env e reinicie o servidor.",
            503,
        )
    itens_pendentes = pendencias(entrevista)
    if itens_pendentes:
        raise ErroAvaliacao(" ".join(itens_pendentes), 422)

    resultado = _organizar_resultado(_chamar_ia(entrevista, cfg), entrevista)
    nota_final, composicao = calcular_nota_final(resultado, cfg)
    faixa, recomendacao = classificar(nota_final)

    return Avaliacao(
        **resultado.model_dump(),
        nota_final=nota_final,
        faixa=faixa,
        recomendacao=recomendacao,
        composicao=composicao,
        modelo=cfg.modelo,
        gerado_em=datetime.now().astimezone().isoformat(timespec="minutes"),
    )
