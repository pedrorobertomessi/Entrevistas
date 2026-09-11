import { Download, LoaderCircle } from 'lucide-react';
import { ETAPAS_STAR, ROTULOS_PRESENCA } from '../constants';
import {
  formatarContribuicao,
  formatarDataHora,
  formatarNota,
  formatarPercentual,
} from '../lib/formatacao';
import type { Avaliacao, AvaliacaoDimensao, Pergunta } from '../types';

interface Props {
  avaliacao: Avaliacao;
  perguntas: Pergunta[];
  exportando: boolean;
  onExportar: () => void;
}

function ListaSimples({ itens, variante, vazio }: { itens: string[]; variante?: 'positivo' | 'negativo'; vazio: string }) {
  if (itens.length === 0) return <p className="campo__ajuda">{vazio}</p>;
  return (
    <ul className={`lista${variante ? ` lista--${variante}` : ''}`}>
      {itens.map((item, indice) => (
        <li key={indice}>{item}</li>
      ))}
    </ul>
  );
}

function Dimensao({ titulo, dimensao }: { titulo: string; dimensao: AvaliacaoDimensao }) {
  return (
    <div className="dimensao">
      <div className="dimensao__topo">
        <h4 className="dimensao__titulo">{titulo}</h4>
        <span className="dimensao__nota">
          {formatarNota(dimensao.nota)}
          <small> / 10</small>
        </span>
      </div>
      <p>{dimensao.comentario}</p>
    </div>
  );
}

export function ResultadoAvaliacao({ avaliacao, perguntas, exportando, onExportar }: Props) {
  return (
    <div className="resultado" id="resultado">
      <div className="resumo-nota">
        <div className="nota">
          <span className="nota__rotulo">Nota final</span>
          <span className="nota__valor">
            {formatarNota(avaliacao.nota_final)}
            <span className="nota__escala"> / 10</span>
          </span>
          <span className={`selo selo--${avaliacao.faixa}`}>{avaliacao.recomendacao}</span>
        </div>

        <div className="rolagem-horizontal">
          <table className="tabela">
            <caption className="tabela__legenda">Composição da nota</caption>
            <thead>
              <tr>
                <th scope="col">Componente</th>
                <th scope="col" className="num">
                  Nota
                </th>
                <th scope="col" className="num">
                  Peso
                </th>
                <th scope="col" className="num">
                  Contribuição
                </th>
              </tr>
            </thead>
            <tbody>
              {avaliacao.composicao.map((componente) => (
                <tr key={componente.chave}>
                  <td>
                    {componente.rotulo}
                    <div className="barra" aria-hidden="true">
                      <span style={{ width: `${componente.nota * 10}%` }} />
                    </div>
                  </td>
                  <td className="num">{formatarNota(componente.nota)}</td>
                  <td className="num">{formatarPercentual(componente.peso)}</td>
                  <td className="num">{formatarContribuicao(componente.contribuicao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="resultado__resumo">{avaliacao.resumo}</p>

      <div className="bloco">
        <h3 className="bloco__titulo">Highlights</h3>
        <ListaSimples itens={avaliacao.highlights} vazio="Nenhum highlight." />
      </div>

      <div className="grade grade--2 grade--espacada">
        <div className="bloco">
          <h3 className="bloco__titulo">Pontos fortes</h3>
          <ListaSimples itens={avaliacao.pontos_fortes} variante="positivo" vazio="Nenhum ponto forte identificado." />
        </div>
        <div className="bloco">
          <h3 className="bloco__titulo">Pontos fracos</h3>
          <ListaSimples itens={avaliacao.pontos_fracos} variante="negativo" vazio="Nenhum ponto fraco identificado." />
        </div>
      </div>

      <div className="bloco">
        <h3 className="bloco__titulo">Avaliação por critério</h3>
        <div className="rolagem-horizontal">
          <table className="tabela tabela--criterios">
            <thead>
              <tr>
                <th scope="col">Critério</th>
                <th scope="col" className="num">
                  Nota
                </th>
                <th scope="col">Justificativa</th>
              </tr>
            </thead>
            <tbody>
              {avaliacao.criterios.map((criterio) => (
                <tr key={criterio.criterio}>
                  <td className="tabela__destaque">{criterio.criterio}</td>
                  <td className="num">{formatarNota(criterio.nota)}</td>
                  <td>{criterio.justificativa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bloco">
        <h3 className="bloco__titulo">Metodologia STAR</h3>
        {avaliacao.star.length === 0 ? (
          <p className="campo__ajuda">Nenhuma pergunta foi avaliada pela metodologia STAR.</p>
        ) : (
          <ul className="star">
            {avaliacao.star.map((item) => {
              const indice = perguntas.findIndex((pergunta) => pergunta.id === item.pergunta_id);
              return (
                <li key={item.pergunta_id} className="star__item">
                  <div className="star__topo">
                    <div>
                      <h4 className="star__titulo">
                        {indice >= 0 ? `Pergunta ${indice + 1}` : 'Pergunta removida'}
                      </h4>
                      {indice >= 0 && <p className="star__enunciado">{perguntas[indice].texto}</p>}
                    </div>
                    <span className="star__nota">
                      {formatarNota(item.nota)}
                      <small> / 10</small>
                    </span>
                  </div>
                  <dl className="etapas-star">
                    {ETAPAS_STAR.map(([chave, rotulo]) => (
                      <div key={chave} className={`etapa-star etapa-star--${item[chave]}`}>
                        <dt>{rotulo}</dt>
                        <dd>{ROTULOS_PRESENCA[item[chave]]}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="star__comentario">{item.comentario}</p>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="grade grade--2 grade--espacada">
        <Dimensao titulo="Raciocínio" dimensao={avaliacao.raciocinio} />
        <Dimensao titulo="Comunicação" dimensao={avaliacao.comunicacao} />
      </div>

      <div className="resultado__rodape">
        <p className="campo__ajuda">
          Gerado por {avaliacao.modelo} em {formatarDataHora(avaliacao.gerado_em)}. As notas parciais são da IA e a
          nota final é a média ponderada calculada pelo sistema. Use como apoio à decisão.
        </p>
        <button type="button" className="btn btn--secundario" onClick={onExportar} disabled={exportando}>
          {exportando ? (
            <LoaderCircle size={16} className="girando" aria-hidden="true" />
          ) : (
            <Download size={16} aria-hidden="true" />
          )}
          {exportando ? 'Exportando PDF…' : 'Exportar PDF'}
        </button>
      </div>
    </div>
  );
}
