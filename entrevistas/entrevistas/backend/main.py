"""API do sistema de entrevistas: avaliação com IA e exportação em PDF.

Desenvolvimento:  python -m uvicorn main:app --reload --port 8000
Produção:         compile o frontend (npm run build) e rode python main.py
"""
from __future__ import annotations

import re
import unicodedata
from datetime import date

from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles

from config import config
from evaluator import ErroAvaliacao, avaliar_entrevista
from models import Avaliacao, Entrevista, RelatorioRequest
from pdf_report import gerar_pdf

app = FastAPI(title="Entrevistas", version="1.0.0")


@app.get("/api/config")
def obter_configuracao() -> dict:
    return {
        "ia_configurada": config.ia_configurada,
        "modelo": config.modelo,
        "pesos": config.pesos.percentuais(),
    }


@app.post("/api/avaliar", response_model=Avaliacao)
def avaliar(entrevista: Entrevista) -> Avaliacao:
    try:
        return avaliar_entrevista(entrevista, config)
    except ErroAvaliacao as erro:
        raise HTTPException(status_code=erro.status, detail=erro.mensagem) from erro


@app.post("/api/relatorio/pdf")
def exportar_pdf(dados: RelatorioRequest) -> Response:
    conteudo = gerar_pdf(dados.entrevista, dados.avaliacao)
    return Response(
        content=conteudo,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{_nome_arquivo(dados.entrevista)}"'},
    )


def _nome_arquivo(entrevista: Entrevista) -> str:
    ascii_nome = unicodedata.normalize("NFKD", entrevista.candidato.nome).encode("ascii", "ignore").decode()
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_nome).strip("-").lower() or "candidato"
    return f"entrevista-{slug}-{date.today().isoformat()}.pdf"


# Em produção, o próprio backend serve o frontend compilado.
if config.frontend_dist.is_dir():
    app.mount("/", StaticFiles(directory=config.frontend_dist, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="127.0.0.1", port=8000)
