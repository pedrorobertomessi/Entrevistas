"""Modelos de dados da API, validados com Pydantic."""
from __future__ import annotations

from typing import Annotated, Literal, Optional

from pydantic import BaseModel, BeforeValidator, Field


def _limitar_nota(valor: object) -> float:
    """Converte a nota para número e garante o intervalo de 0 a 10."""
    try:
        nota = float(str(valor).replace(",", "."))
    except (TypeError, ValueError) as exc:
        raise ValueError("nota inválida") from exc
    return min(max(nota, 0.0), 10.0)


def _normalizar_presenca(valor: object) -> str:
    texto = str(valor).strip().lower()
    return texto if texto in {"presente", "parcial", "ausente"} else "parcial"


Nota = Annotated[float, BeforeValidator(_limitar_nota)]
Presenca = Annotated[
    Literal["presente", "parcial", "ausente"], BeforeValidator(_normalizar_presenca)
]


# ---------------------------------------------------------------------------
# Entrevista (preenchida pelo entrevistador)
# ---------------------------------------------------------------------------


class Candidato(BaseModel):
    nome: str = ""
    email: str = ""
    telefone: str = ""
    linkedin: str = ""
    data_entrevista: str = ""
    entrevistador: str = ""


class Vaga(BaseModel):
    titulo: str = ""
    nivel: str = ""
    descricao: str = ""


class Pergunta(BaseModel):
    id: str
    texto: str = ""
    resposta: str = ""
    avaliar_star: bool = True


class Observacao(BaseModel):
    marcadores: list[str] = Field(default_factory=list)
    notas: str = ""


class Entrevista(BaseModel):
    candidato: Candidato = Field(default_factory=Candidato)
    vaga: Vaga = Field(default_factory=Vaga)
    criterios: list[str] = Field(default_factory=list)
    perguntas: list[Pergunta] = Field(default_factory=list)
    raciocinio: Observacao = Field(default_factory=Observacao)
    comunicacao: Observacao = Field(default_factory=Observacao)


# ---------------------------------------------------------------------------
# Avaliação (gerada pela IA + nota calculada pelo sistema)
# ---------------------------------------------------------------------------


class AvaliacaoCriterio(BaseModel):
    criterio: str
    nota: Nota
    justificativa: str


class AvaliacaoStar(BaseModel):
    pergunta_id: str
    situacao: Presenca
    tarefa: Presenca
    acao: Presenca
    resultado: Presenca
    nota: Nota
    comentario: str


class AvaliacaoDimensao(BaseModel):
    nota: Nota
    comentario: str


class ResultadoIA(BaseModel):
    """Formato devolvido pela IA."""

    resumo: str
    highlights: list[str]
    pontos_fortes: list[str]
    pontos_fracos: list[str]
    criterios: list[AvaliacaoCriterio]
    star: list[AvaliacaoStar] = Field(default_factory=list)
    raciocinio: AvaliacaoDimensao
    comunicacao: AvaliacaoDimensao


class ComponenteNota(BaseModel):
    chave: str
    rotulo: str
    nota: float
    peso: float  # percentual efetivamente aplicado, de 0 a 100
    contribuicao: float


class Avaliacao(ResultadoIA):
    """Avaliação completa devolvida ao frontend."""

    nota_final: float
    faixa: Literal["alta", "media", "baixa"]
    recomendacao: str
    composicao: list[ComponenteNota]
    modelo: str
    gerado_em: str


class RelatorioRequest(BaseModel):
    entrevista: Entrevista
    avaliacao: Optional[Avaliacao] = None
