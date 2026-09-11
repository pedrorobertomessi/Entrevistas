import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { novaPergunta } from '../lib/entrevista';
import type { Pergunta } from '../types';
import { AreaTexto, Campo, Secao } from './ui';

interface Props {
  perguntas: Pergunta[];
  onChange: (perguntas: Pergunta[]) => void;
}

export function SecaoPerguntas({ perguntas, onChange }: Props) {
  const atualizar = (id: string, alteracao: Partial<Pergunta>) =>
    onChange(perguntas.map((pergunta) => (pergunta.id === id ? { ...pergunta, ...alteracao } : pergunta)));

  const adicionar = () => {
    const pergunta = novaPergunta();
    onChange([...perguntas, pergunta]);
    requestAnimationFrame(() => document.getElementById(`pergunta-${pergunta.id}`)?.focus());
  };

  const remover = (indice: number) => {
    const pergunta = perguntas[indice];
    const temConteudo = pergunta.texto.trim() || pergunta.resposta.trim();
    if (temConteudo && !window.confirm(`Remover a pergunta ${indice + 1}? O texto e a resposta serão apagados.`)) {
      return;
    }
    onChange(perguntas.filter((_, i) => i !== indice));
  };

  const mover = (indice: number, direcao: -1 | 1) => {
    const destino = indice + direcao;
    if (destino < 0 || destino >= perguntas.length) return;
    const reordenadas = [...perguntas];
    [reordenadas[indice], reordenadas[destino]] = [reordenadas[destino], reordenadas[indice]];
    onChange(reordenadas);
  };

  return (
    <Secao
      id="perguntas"
      titulo="Perguntas e respostas"
      descricao="Registre cada pergunta e transcreva a resposta do candidato."
    >
      {perguntas.length === 0 ? (
        <p className="vazio">Nenhuma pergunta adicionada ainda.</p>
      ) : (
        <ol className="perguntas">
          {perguntas.map((pergunta, indice) => (
            <li key={pergunta.id} className="pergunta">
              <div className="pergunta__cabecalho">
                <h3 className="pergunta__numero">Pergunta {indice + 1}</h3>
                <div className="pergunta__acoes">
                  <button
                    type="button"
                    className="botao-icone"
                    onClick={() => mover(indice, -1)}
                    disabled={indice === 0}
                    aria-label={`Mover a pergunta ${indice + 1} para cima`}
                    title="Mover para cima"
                  >
                    <ArrowUp size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="botao-icone"
                    onClick={() => mover(indice, 1)}
                    disabled={indice === perguntas.length - 1}
                    aria-label={`Mover a pergunta ${indice + 1} para baixo`}
                    title="Mover para baixo"
                  >
                    <ArrowDown size={16} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="botao-icone botao-icone--perigo"
                    onClick={() => remover(indice)}
                    aria-label={`Remover a pergunta ${indice + 1}`}
                    title="Remover pergunta"
                  >
                    <Trash2 size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>

              <Campo id={`pergunta-${pergunta.id}`} rotulo="Pergunta">
                <AreaTexto
                  id={`pergunta-${pergunta.id}`}
                  linhasMinimas={2}
                  placeholder="Por exemplo: conte sobre uma situação em que você precisou cumprir um prazo apertado."
                  value={pergunta.texto}
                  onChange={(evento) => atualizar(pergunta.id, { texto: evento.target.value })}
                />
              </Campo>

              <Campo id={`resposta-${pergunta.id}`} rotulo="Resposta do candidato">
                <AreaTexto
                  id={`resposta-${pergunta.id}`}
                  linhasMinimas={4}
                  placeholder="Transcreva a resposta do candidato"
                  value={pergunta.resposta}
                  onChange={(evento) => atualizar(pergunta.id, { resposta: evento.target.value })}
                />
              </Campo>

              <div className="opcao-com-ajuda">
                <label className="opcao">
                  <input
                    type="checkbox"
                    checked={pergunta.avaliar_star}
                    onChange={(evento) => atualizar(pergunta.id, { avaliar_star: evento.target.checked })}
                  />
                  Avaliar pela metodologia STAR
                </label>
                <p className="campo__ajuda">
                  Desmarque para perguntas objetivas, como pretensão salarial ou disponibilidade.
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div>
        <button type="button" className="btn btn--secundario" onClick={adicionar}>
          <Plus size={16} aria-hidden="true" />
          Adicionar pergunta
        </button>
      </div>
    </Secao>
  );
}
