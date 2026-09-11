"""Relatório da entrevista em PDF (ReportLab)."""
from __future__ import annotations

import io
from datetime import datetime
from functools import partial
from pathlib import Path
from typing import Optional
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas as rl_canvas
from reportlab.platypus import (
    CondPageBreak,
    Flowable,
    HRFlowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from models import Avaliacao, AvaliacaoStar, Entrevista, Observacao

# ---------------------------------------------------------------------------
# Identidade visual
# ---------------------------------------------------------------------------

COR_TEXTO = colors.HexColor("#1E2A36")
COR_SECUNDARIA = colors.HexColor("#5F6B78")
COR_BORDA = colors.HexColor("#D8DEE5")
COR_FUNDO = colors.HexColor("#F4F6F8")
COR_ACENTO = colors.HexColor("#1F4E79")
CORES_FAIXA = {"alta": "#2F7D4F", "media": "#8A5D00", "baixa": "#B23B3B"}
CORES_PRESENCA = {"presente": "#2F7D4F", "parcial": "#8A5D00", "ausente": "#B23B3B"}
ROTULOS_PRESENCA = {"presente": "Presente", "parcial": "Parcial", "ausente": "Ausente"}
ETAPAS_STAR = [("situacao", "Situação"), ("tarefa", "Tarefa"), ("acao", "Ação"), ("resultado", "Resultado")]

MARGEM = 18 * mm
PADDING_QUADRO = 6  # recuo interno padrão do Frame do ReportLab, em pontos
LARGURA_UTIL = A4[0] - 2 * MARGEM - 2 * PADDING_QUADRO

# Fontes TrueType ampliam o suporte a caracteres; sem elas, usa Helvetica.
_FONTES_CANDIDATAS = [
    ("C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/arialbd.ttf"),
    ("/System/Library/Fonts/Supplemental/Arial.ttf", "/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
    ("/Library/Fonts/Arial.ttf", "/Library/Fonts/Arial Bold.ttf"),
    (
        "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    ),
    ("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
]


def _registrar_fontes() -> tuple[str, str]:
    for regular, negrito in _FONTES_CANDIDATAS:
        if not (Path(regular).is_file() and Path(negrito).is_file()):
            continue
        try:
            pdfmetrics.registerFont(TTFont("Relatorio", regular))
            pdfmetrics.registerFont(TTFont("Relatorio-Negrito", negrito))
            pdfmetrics.registerFontFamily(
                "Relatorio",
                normal="Relatorio",
                bold="Relatorio-Negrito",
                italic="Relatorio",
                boldItalic="Relatorio-Negrito",
            )
            return "Relatorio", "Relatorio-Negrito"
        except Exception:  # fonte corrompida ou sem permissão de leitura
            continue
    return "Helvetica", "Helvetica-Bold"


FONTE, FONTE_NEGRITO = _registrar_fontes()


def _estilos() -> dict[str, ParagraphStyle]:
    base = ParagraphStyle("base", fontName=FONTE, fontSize=9.5, leading=14, textColor=COR_TEXTO)
    return {
        "base": base,
        "secundario": ParagraphStyle("secundario", parent=base, fontSize=8.5, leading=12, textColor=COR_SECUNDARIA),
        "titulo": ParagraphStyle("titulo", parent=base, fontName=FONTE_NEGRITO, fontSize=19, leading=24),
        "subtitulo": ParagraphStyle("subtitulo", parent=base, fontSize=10.5, leading=15, textColor=COR_SECUNDARIA),
        "secao": ParagraphStyle(
            "secao", parent=base, fontName=FONTE_NEGRITO, fontSize=12.5, leading=16, textColor=COR_ACENTO, spaceBefore=16
        ),
        "subsecao": ParagraphStyle(
            "subsecao", parent=base, fontName=FONTE_NEGRITO, fontSize=10, leading=14, spaceBefore=10, spaceAfter=3
        ),
        "rotulo": ParagraphStyle("rotulo", parent=base, fontSize=8.5, leading=12, textColor=COR_SECUNDARIA, spaceBefore=4),
        "enunciado": ParagraphStyle("enunciado", parent=base, fontName=FONTE_NEGRITO),
        "resposta": ParagraphStyle("resposta", parent=base, leftIndent=8),
        "celula": ParagraphStyle("celula", parent=base, fontSize=9, leading=12.5),
        "celula_negrito": ParagraphStyle("celula_negrito", parent=base, fontName=FONTE_NEGRITO, fontSize=9, leading=12.5),
        "celula_cabecalho": ParagraphStyle(
            "celula_cabecalho", parent=base, fontSize=8, leading=11, textColor=COR_SECUNDARIA
        ),
        "celula_numero": ParagraphStyle("celula_numero", parent=base, fontSize=9, leading=12.5, alignment=2),
        "nota_rotulo": ParagraphStyle("nota_rotulo", parent=base, fontSize=8.5, leading=12, textColor=COR_SECUNDARIA),
        "nota_valor": ParagraphStyle("nota_valor", parent=base, fontName=FONTE_NEGRITO, fontSize=28, leading=32),
        "item": ParagraphStyle("item", parent=base, leftIndent=11, bulletIndent=0, spaceAfter=3),
    }


# ---------------------------------------------------------------------------
# Utilitários
# ---------------------------------------------------------------------------


def _texto(valor: str) -> str:
    """Escapa texto digitado pelo usuário e preserva as quebras de linha."""
    return escape(valor.strip()).replace("\n", "<br/>")


def _nota(valor: float) -> str:
    return f"{valor:.1f}".replace(".", ",")


def _percentual(valor: float) -> str:
    return f"{valor:.0f}%" if float(valor).is_integer() else f"{valor:.1f}%".replace(".", ",")


def _data_br(valor: str) -> str:
    try:
        return datetime.strptime(valor[:10], "%Y-%m-%d").strftime("%d/%m/%Y")
    except ValueError:
        return valor


def _data_hora_br(valor: str) -> str:
    try:
        return datetime.fromisoformat(valor).strftime("%d/%m/%Y às %H:%M")
    except ValueError:
        return valor


def _secao(
    titulo: str,
    conteudo: list[Flowable],
    e: dict[str, ParagraphStyle],
    espaco_minimo: float = 32 * mm,
) -> list[Flowable]:
    """Título de seção. Quebra a página antes se não houver espaço para o início do conteúdo."""
    return [
        CondPageBreak(espaco_minimo),
        Paragraph(titulo, e["secao"]),
        HRFlowable(width="100%", thickness=0.6, color=COR_BORDA, spaceBefore=3, spaceAfter=8),
        *conteudo,
    ]


def _lista(itens: list[str], e: dict[str, ParagraphStyle], vazio: str) -> list[Flowable]:
    itens = [i for i in itens if i.strip()]
    if not itens:
        return [Paragraph(vazio, e["secundario"])]
    return [Paragraph(_texto(item), e["item"], bulletText="•") for item in itens]


def _estilo_tabela(com_cabecalho: bool = True) -> TableStyle:
    comandos = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, COR_BORDA),
    ]
    if com_cabecalho:
        comandos.append(("LINEBELOW", (0, 0), (-1, 0), 0.8, COR_SECUNDARIA))
    return TableStyle(comandos)


class _CanvasNumerado(rl_canvas.Canvas):
    """Canvas que desenha cabeçalho e rodapé com 'Página X de Y'."""

    def __init__(self, *args, cabecalho: str = "", rodape: str = "", **kwargs) -> None:
        super().__init__(*args, **kwargs)
        self._cabecalho = cabecalho
        self._rodape = rodape
        self._paginas: list[dict] = []

    def showPage(self) -> None:  # noqa: N802 (nome da API do ReportLab)
        self._paginas.append(dict(self.__dict__))
        self._startPage()

    def save(self) -> None:
        total = len(self._paginas)
        for estado in self._paginas:
            self.__dict__.update(estado)
            self._desenhar_moldura(total)
            super().showPage()
        super().save()

    def _desenhar_moldura(self, total: int) -> None:
        largura, altura = A4
        esquerda, direita = MARGEM + PADDING_QUADRO, largura - MARGEM - PADDING_QUADRO
        self.saveState()
        self.setStrokeColor(COR_BORDA)
        self.setLineWidth(0.6)
        self.line(esquerda, altura - 14 * mm, direita, altura - 14 * mm)
        self.line(esquerda, 14 * mm, direita, 14 * mm)

        self.setFont(FONTE_NEGRITO, 8)
        self.setFillColor(COR_ACENTO)
        self.drawString(esquerda, altura - 11 * mm, "Relatório de entrevista")
        self.setFont(FONTE, 8)
        self.setFillColor(COR_SECUNDARIA)
        self.drawRightString(direita, altura - 11 * mm, self._cabecalho[:80])
        self.drawString(esquerda, 9.5 * mm, self._rodape)
        self.drawRightString(direita, 9.5 * mm, f"Página {self._pageNumber} de {total}")
        self.restoreState()


# ---------------------------------------------------------------------------
# Blocos do relatório
# ---------------------------------------------------------------------------


def _bloco_resultado(avaliacao: Avaliacao, e: dict[str, ParagraphStyle]) -> list[Flowable]:
    cor = CORES_FAIXA.get(avaliacao.faixa, "#1E2A36")
    coluna_nota = [
        Paragraph("Nota final", e["nota_rotulo"]),
        Paragraph(
            f'{_nota(avaliacao.nota_final)}<font size="12" color="#5F6B78"> / 10</font>', e["nota_valor"]
        ),
        Spacer(1, 4),
        Paragraph(
            f'<font color="{cor}">{escape(avaliacao.recomendacao)}</font>',
            ParagraphStyle("recomendacao", parent=e["base"], fontName=FONTE_NEGRITO),
        ),
    ]

    linhas = [
        [
            Paragraph("Componente", e["celula_cabecalho"]),
            Paragraph("Nota", ParagraphStyle("c1", parent=e["celula_cabecalho"], alignment=2)),
            Paragraph("Peso", ParagraphStyle("c2", parent=e["celula_cabecalho"], alignment=2)),
            Paragraph("Contribuição", ParagraphStyle("c3", parent=e["celula_cabecalho"], alignment=2)),
        ]
    ]
    for componente in avaliacao.composicao:
        linhas.append(
            [
                Paragraph(escape(componente.rotulo), e["celula"]),
                Paragraph(_nota(componente.nota), e["celula_numero"]),
                Paragraph(_percentual(componente.peso), e["celula_numero"]),
                Paragraph(f"{componente.contribuicao:.2f}".replace(".", ","), e["celula_numero"]),
            ]
        )
    largura_composicao = LARGURA_UTIL - 58 * mm - 20
    composicao = Table(
        linhas,
        colWidths=[largura_composicao - 66 * mm, 18 * mm, 18 * mm, 30 * mm],
        style=_estilo_tabela(),
    )

    quadro = Table(
        [[coluna_nota, composicao]],
        colWidths=[58 * mm, LARGURA_UTIL - 58 * mm],
        style=TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), COR_FUNDO),
                ("BOX", (0, 0), (-1, -1), 0.6, COR_BORDA),
                ("LINEAFTER", (0, 0), (0, 0), 0.6, COR_BORDA),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ]
        ),
    )
    return [quadro, Spacer(1, 10), Paragraph(_texto(avaliacao.resumo), e["base"])]


def _tabela_chave_valor(pares: list[tuple[str, str]], e: dict[str, ParagraphStyle]) -> Table:
    celulas = [
        [Paragraph(rotulo, e["celula_cabecalho"]), Paragraph(_texto(valor) or "Não informado", e["celula"])]
        for rotulo, valor in pares
    ]
    # Distribui os pares em duas colunas (rótulo, valor, rótulo, valor).
    linhas = []
    for i in range(0, len(celulas), 2):
        esquerda = celulas[i]
        direita = celulas[i + 1] if i + 1 < len(celulas) else ["", ""]
        linhas.append([*esquerda, *direita])
    largura_rotulo = 30 * mm
    largura_valor = LARGURA_UTIL / 2 - largura_rotulo
    return Table(
        linhas,
        colWidths=[largura_rotulo, largura_valor, largura_rotulo, largura_valor],
        style=_estilo_tabela(com_cabecalho=False),
    )


def _tabela_star(star: AvaliacaoStar, e: dict[str, ParagraphStyle]) -> Table:
    cabecalho = [Paragraph(rotulo, e["celula_cabecalho"]) for _, rotulo in ETAPAS_STAR]
    cabecalho.append(Paragraph("Nota STAR", ParagraphStyle("ns", parent=e["celula_cabecalho"], alignment=2)))
    valores = []
    for chave, _ in ETAPAS_STAR:
        presenca = getattr(star, chave)
        valores.append(
            Paragraph(
                f'<font color="{CORES_PRESENCA[presenca]}">{ROTULOS_PRESENCA[presenca]}</font>',
                e["celula_negrito"],
            )
        )
    valores.append(
        Paragraph(_nota(star.nota), ParagraphStyle("nv", parent=e["celula_negrito"], alignment=2))
    )
    coluna = (LARGURA_UTIL - 24 * mm) / 4
    return Table(
        [cabecalho, valores],
        colWidths=[coluna] * 4 + [24 * mm],
        style=TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), COR_FUNDO),
                ("BOX", (0, 0), (-1, -1), 0.6, COR_BORDA),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, 0), 6),
                ("BOTTOMPADDING", (0, 0), (-1, 0), 1),
                ("TOPPADDING", (0, 1), (-1, 1), 1),
                ("BOTTOMPADDING", (0, 1), (-1, 1), 6),
            ]
        ),
    )


def _bloco_perguntas(
    entrevista: Entrevista, avaliacao: Optional[Avaliacao], e: dict[str, ParagraphStyle]
) -> list[Flowable]:
    star_por_id = {s.pergunta_id: s for s in avaliacao.star} if avaliacao else {}
    blocos: list[Flowable] = []
    for numero, pergunta in enumerate(entrevista.perguntas, start=1):
        if not pergunta.texto.strip() and not pergunta.resposta.strip():
            continue
        enunciado = _texto(pergunta.texto) or "Pergunta sem enunciado."
        if pergunta.resposta.strip():
            resposta = Paragraph(_texto(pergunta.resposta), e["resposta"])
        else:
            resposta = Paragraph("Sem resposta registrada.", ParagraphStyle("sr", parent=e["secundario"], leftIndent=8))
        # A resposta pode ser longa e continua na página seguinte quando necessário.
        blocos += [
            CondPageBreak(38 * mm),
            Paragraph(f"Pergunta {numero}", e["subsecao"]),
            Paragraph(enunciado, e["enunciado"]),
            Paragraph("Resposta do candidato", e["rotulo"]),
            resposta,
        ]

        if not avaliacao:
            pass
        elif pergunta.id in star_por_id:
            star = star_por_id[pergunta.id]
            blocos.append(
                KeepTogether(
                    [Spacer(1, 6), _tabela_star(star, e), Spacer(1, 4), Paragraph(_texto(star.comentario), e["secundario"])]
                )
            )
        elif not pergunta.avaliar_star:
            blocos += [Spacer(1, 4), Paragraph("Pergunta não avaliada pela metodologia STAR.", e["secundario"])]
        elif not (pergunta.texto.strip() and pergunta.resposta.strip()):
            blocos += [Spacer(1, 4), Paragraph("Pergunta incompleta, fora da avaliação.", e["secundario"])]
        blocos.append(Spacer(1, 8))
    return blocos or [Paragraph("Nenhuma pergunta registrada.", e["secundario"])]


def _bloco_observacao(
    titulo: str,
    observacao: Observacao,
    analise_nota: Optional[float],
    analise_texto: Optional[str],
    e: dict[str, ParagraphStyle],
) -> list[Flowable]:
    marcadores = "; ".join(escape(m) for m in observacao.marcadores if m.strip())
    itens: list[Flowable] = [
        CondPageBreak(30 * mm),
        Paragraph(titulo, e["subsecao"]),
        Paragraph("Observações do entrevistador", e["rotulo"]),
        Paragraph(f"<b>Marcadores:</b> {marcadores or 'nenhum'}", e["base"]),
        Paragraph(_texto(observacao.notas) or "Sem anotações.", e["base"] if observacao.notas.strip() else e["secundario"]),
    ]
    if analise_nota is not None and analise_texto is not None:
        itens += [
            Paragraph(f"Análise da IA, nota {_nota(analise_nota)}", e["rotulo"]),
            Paragraph(_texto(analise_texto), e["base"]),
        ]
    return itens


def _tabela_criterios(avaliacao: Avaliacao, e: dict[str, ParagraphStyle]) -> Table:
    linhas = [
        [
            Paragraph("Critério", e["celula_cabecalho"]),
            Paragraph("Nota", ParagraphStyle("cn", parent=e["celula_cabecalho"], alignment=2)),
            Paragraph("Justificativa", e["celula_cabecalho"]),
        ]
    ]
    for criterio in avaliacao.criterios:
        linhas.append(
            [
                Paragraph(escape(criterio.criterio), e["celula_negrito"]),
                Paragraph(_nota(criterio.nota), e["celula_numero"]),
                Paragraph(_texto(criterio.justificativa), e["celula"]),
            ]
        )
    return Table(
        linhas,
        colWidths=[42 * mm, 16 * mm, LARGURA_UTIL - 58 * mm],
        style=_estilo_tabela(),
        repeatRows=1,
    )


# ---------------------------------------------------------------------------
# Relatório
# ---------------------------------------------------------------------------


def gerar_pdf(entrevista: Entrevista, avaliacao: Optional[Avaliacao] = None) -> bytes:
    e = _estilos()
    candidato = entrevista.candidato
    vaga = entrevista.vaga
    nome = candidato.nome.strip() or "Candidato sem nome"
    agora = datetime.now()

    buffer = io.BytesIO()
    documento = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=MARGEM,
        rightMargin=MARGEM,
        topMargin=22 * mm,
        bottomMargin=20 * mm,
        title=f"Relatório de entrevista - {nome}",
        author=candidato.entrevistador.strip(),
        subject=vaga.titulo.strip(),
        creator="Entrevistas",
    )

    historia: list[Flowable] = [Paragraph(escape(nome), e["titulo"])]
    if vaga.titulo.strip():
        subtitulo = f"Entrevista para {escape(vaga.titulo.strip())}"
        if vaga.nivel.strip():
            subtitulo += f", nível {escape(vaga.nivel.strip())}"
        historia.append(Paragraph(subtitulo, e["subtitulo"]))
    historia.append(Spacer(1, 4))

    # Resultado
    if avaliacao:
        historia += _secao("Resultado", _bloco_resultado(avaliacao, e), e)
    else:
        historia += _secao(
            "Resultado",
            [Paragraph("A avaliação com IA ainda não foi gerada para esta entrevista.", e["secundario"])],
            e,
        )

    # Dados do candidato
    historia += _secao(
        "Dados do candidato",
        [
            _tabela_chave_valor(
                [
                    ("Nome", candidato.nome),
                    ("E-mail", candidato.email),
                    ("Telefone", candidato.telefone),
                    ("LinkedIn ou portfólio", candidato.linkedin),
                    ("Data da entrevista", _data_br(candidato.data_entrevista)),
                    ("Entrevistador(a)", candidato.entrevistador),
                ],
                e,
            )
        ],
        e,
    )

    # Vaga e critérios
    conteudo_vaga: list[Flowable] = [
        _tabela_chave_valor([("Cargo", vaga.titulo), ("Nível", vaga.nivel)], e),
    ]
    if vaga.descricao.strip():
        conteudo_vaga += [
            Paragraph("Descrição e requisitos", e["rotulo"]),
            Paragraph(_texto(vaga.descricao), e["base"]),
        ]
    criterios = ", ".join(escape(c) for c in entrevista.criterios if c.strip())
    conteudo_vaga += [
        Paragraph("Critérios avaliados", e["rotulo"]),
        Paragraph(criterios or "Nenhum critério selecionado.", e["base"]),
    ]
    historia += _secao("Vaga e critérios", conteudo_vaga, e)

    # Perguntas e respostas
    historia += _secao(
        "Perguntas e respostas", _bloco_perguntas(entrevista, avaliacao, e), e, espaco_minimo=52 * mm
    )

    # Raciocínio e comunicação
    historia += _secao(
        "Raciocínio e comunicação",
        [
            *_bloco_observacao(
                "Raciocínio",
                entrevista.raciocinio,
                avaliacao.raciocinio.nota if avaliacao else None,
                avaliacao.raciocinio.comentario if avaliacao else None,
                e,
            ),
            Spacer(1, 6),
            *_bloco_observacao(
                "Comunicação",
                entrevista.comunicacao,
                avaliacao.comunicacao.nota if avaliacao else None,
                avaliacao.comunicacao.comentario if avaliacao else None,
                e,
            ),
        ],
        e,
        espaco_minimo=46 * mm,
    )

    if avaliacao:
        historia += _secao(
            "Feedback",
            [
                Paragraph("Highlights", e["subsecao"]),  # início garantido pelo espaço mínimo da seção
                *_lista(avaliacao.highlights, e, "Nenhum highlight."),
                CondPageBreak(24 * mm),
                Paragraph("Pontos fortes", e["subsecao"]),
                *_lista(avaliacao.pontos_fortes, e, "Nenhum ponto forte identificado."),
                CondPageBreak(24 * mm),
                Paragraph("Pontos fracos", e["subsecao"]),
                *_lista(avaliacao.pontos_fracos, e, "Nenhum ponto fraco identificado."),
            ],
            e,
            espaco_minimo=40 * mm,
        )
        historia += _secao("Avaliação por critério", [_tabela_criterios(avaliacao, e)], e)
        historia += [
            Spacer(1, 14),
            Paragraph(
                f"Avaliação gerada com apoio de IA ({escape(avaliacao.modelo)}) em "
                f"{_data_hora_br(avaliacao.gerado_em)}. As notas parciais são atribuídas pela IA e a nota "
                "final é a média ponderada calculada pelo sistema. Use este relatório como apoio à decisão, "
                "junto com a percepção de quem conduziu a entrevista.",
                e["secundario"],
            ),
        ]

    documento.build(
        historia,
        canvasmaker=partial(
            _CanvasNumerado,
            cabecalho=nome,
            rodape=f"Gerado em {agora.strftime('%d/%m/%Y às %H:%M')}",
        ),
    )
    return buffer.getvalue()
