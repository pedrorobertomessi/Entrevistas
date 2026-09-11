"""Configurações do servidor, lidas do arquivo backend/.env."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

MODELO_PADRAO = "claude-sonnet-5"

# Faixas de recomendação aplicadas sobre a nota final (limite mínimo, código, rótulo).
FAIXAS_RECOMENDACAO: list[tuple[float, str, str]] = [
    (8.0, "alta", "Recomendado"),
    (6.0, "media", "Recomendado com ressalvas"),
    (0.0, "baixa", "Não recomendado"),
]


def _numero_env(nome: str, padrao: float) -> float:
    bruto = os.getenv(nome, "").strip().replace(",", ".")
    if not bruto:
        return padrao
    try:
        return max(float(bruto), 0.0)
    except ValueError:
        return padrao


@dataclass(frozen=True)
class Pesos:
    fit: float
    star: float
    raciocinio: float
    comunicacao: float

    def como_dict(self) -> dict[str, float]:
        return {
            "fit": self.fit,
            "star": self.star,
            "raciocinio": self.raciocinio,
            "comunicacao": self.comunicacao,
        }

    def percentuais(self) -> dict[str, float]:
        """Pesos convertidos em percentuais que somam 100."""
        valores = self.como_dict()
        total = sum(valores.values()) or 1.0
        return {chave: round(valor / total * 100, 1) for chave, valor in valores.items()}


@dataclass(frozen=True)
class Configuracao:
    api_key: str
    modelo: str
    pesos: Pesos
    frontend_dist: Path

    @property
    def ia_configurada(self) -> bool:
        return bool(self.api_key)


def carregar_configuracao() -> Configuracao:
    return Configuracao(
        api_key=os.getenv("ANTHROPIC_API_KEY", "").strip(),
        modelo=os.getenv("ANTHROPIC_MODEL", "").strip() or MODELO_PADRAO,
        pesos=Pesos(
            fit=_numero_env("PESO_FIT", 40),
            star=_numero_env("PESO_STAR", 30),
            raciocinio=_numero_env("PESO_RACIOCINIO", 15),
            comunicacao=_numero_env("PESO_COMUNICACAO", 15),
        ),
        frontend_dist=BASE_DIR.parent / "frontend" / "dist",
    )


config = carregar_configuracao()
