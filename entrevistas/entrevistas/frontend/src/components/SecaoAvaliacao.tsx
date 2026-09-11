import { LoaderCircle, RefreshCw } from 'lucide-react';
import { pendenciasAvaliacao, perguntasIncompletas } from '../lib/entrevista';
import { formatarLista, formatarPercentual } from '../lib/formatacao';
import type { Avaliacao, ConfigServidor, Entrevista } from '../types';
import { ResultadoAvaliacao } from './ResultadoAvaliacao';
import { Aviso, Secao } from './ui';

interface Props {
  entrevista: Entrevista;
  config: ConfigServidor | null;
  avaliacao: Avaliacao | null;
  desatualizada: boolean;
  avaliando: boolean;
  erro: string | null;
  exportando: boolean;
  onAvaliar: () => void;
  onExportar: () => void;
}

export function SecaoAvaliacao({
  entrevista,
  config,
  avaliacao,
  desatualizada,
  avaliando,
  erro,
  exportando,
  onAvaliar,
  onExportar,
}: Props) {
  const pendencias = pendenciasAvaliacao(entrevista);
  const incompletas = perguntasIncompletas(entrevista);
  const podeAvaliar = Boolean(config?.ia_configurada) && pendencias.length === 0 && !avaliando;

  return (
    <Secao
      id="avaliacao"
      titulo="Avaliação"
      descricao="A IA analisa as respostas pelos critérios da vaga e pela metodologia STAR e gera um feedback com nota de 0 a 10."
    >
      {config && !config.ia_configurada && (
        <Aviso tipo="alerta">
          A chave da API não está configurada. Defina <code>ANTHROPIC_API_KEY</code> no arquivo{' '}
          <code>backend/.env</code> e reinicie o servidor.
        </Aviso>
      )}

      <div className="preparo">
        {config && (
          <p className="preparo__pesos">
            A nota final combina fit com os critérios ({formatarPercentual(config.pesos.fit)}), metodologia STAR (
            {formatarPercentual(config.pesos.star)}), raciocínio ({formatarPercentual(config.pesos.raciocinio)}) e
            comunicação ({formatarPercentual(config.pesos.comunicacao)}).
          </p>
        )}

        {pendencias.length > 0 && (
          <ul className="pendencias">
            {pendencias.map((pendencia) => (
              <li key={pendencia}>{pendencia}</li>
            ))}
          </ul>
        )}

        {incompletas.length > 0 && (
          <p className="campo__ajuda">
            {incompletas.length === 1
              ? `A pergunta ${incompletas[0]} está incompleta e fica fora da avaliação.`
              : `As perguntas ${formatarLista(incompletas.map(String))} estão incompletas e ficam fora da avaliação.`}{' '}
            Se o candidato não soube responder, registre isso no campo de resposta.
          </p>
        )}

        <div className="acoes">
          <button type="button" className="btn btn--primario" onClick={onAvaliar} disabled={!podeAvaliar}>
            {avaliando ? (
              <LoaderCircle size={16} className="girando" aria-hidden="true" />
            ) : avaliacao ? (
              <RefreshCw size={16} aria-hidden="true" />
            ) : null}
            {avaliando ? 'Gerando avaliação…' : avaliacao ? 'Gerar avaliação novamente' : 'Gerar avaliação'}
          </button>
          {avaliando && <span className="campo__ajuda">Pode levar até um minuto.</span>}
        </div>
      </div>

      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      {avaliacao && desatualizada && !avaliando && (
        <Aviso tipo="alerta">
          A entrevista mudou depois da última avaliação. Gere a avaliação novamente para atualizar o feedback e a nota.
        </Aviso>
      )}

      {avaliacao && (
        <ResultadoAvaliacao
          avaliacao={avaliacao}
          perguntas={entrevista.perguntas}
          exportando={exportando}
          onExportar={onExportar}
        />
      )}
    </Secao>
  );
}
