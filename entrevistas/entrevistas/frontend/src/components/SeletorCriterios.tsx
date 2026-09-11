import { useMemo, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { CRITERIOS_PADRAO } from '../constants';
import { normalizarTexto } from '../lib/formatacao';

interface Props {
  selecionados: string[];
  personalizados: string[];
  onChangeSelecionados: (criterios: string[]) => void;
  onChangePersonalizados: (criterios: string[]) => void;
}

export function SeletorCriterios({
  selecionados,
  personalizados,
  onChangeSelecionados,
  onChangePersonalizados,
}: Props) {
  const [filtro, setFiltro] = useState('');
  const [novo, setNovo] = useState('');

  // Inclui os selecionados para exibir critérios de rascunhos antigos que não estão nas listas.
  const todos = useMemo(() => {
    const unicos = new Map<string, string>();
    for (const criterio of [...CRITERIOS_PADRAO, ...personalizados, ...selecionados]) {
      const chave = normalizarTexto(criterio);
      if (!unicos.has(chave)) unicos.set(chave, criterio);
    }
    return [...unicos.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [personalizados, selecionados]);

  const termo = normalizarTexto(filtro);
  const visiveis = termo ? todos.filter((criterio) => normalizarTexto(criterio).includes(termo)) : todos;

  const alternar = (criterio: string) =>
    onChangeSelecionados(
      selecionados.includes(criterio)
        ? selecionados.filter((item) => item !== criterio)
        : [...selecionados, criterio],
    );

  const adicionar = () => {
    const nome = novo.trim().replace(/\s+/g, ' ');
    if (!nome) return;
    const existente = todos.find((criterio) => normalizarTexto(criterio) === normalizarTexto(nome));
    if (existente) {
      if (!selecionados.includes(existente)) onChangeSelecionados([...selecionados, existente]);
    } else {
      onChangePersonalizados([...personalizados, nome]);
      onChangeSelecionados([...selecionados, nome]);
    }
    setNovo('');
    setFiltro('');
  };

  const remover = (criterio: string) => {
    onChangePersonalizados(personalizados.filter((item) => item !== criterio));
    onChangeSelecionados(selecionados.filter((item) => item !== criterio));
  };

  const contagem =
    selecionados.length === 0
      ? 'Nenhum selecionado'
      : selecionados.length === 1
        ? '1 selecionado'
        : `${selecionados.length} selecionados`;

  return (
    <div className="criterios" role="group" aria-labelledby="criterios-rotulo">
      <div className="criterios__topo">
        <span id="criterios-rotulo" className="campo__rotulo">
          Critérios de avaliação
          <span className="campo__obrigatorio" aria-hidden="true">
            {' '}*
          </span>
        </span>
        <span className="criterios__contagem" aria-live="polite">
          {contagem}
          {selecionados.length > 0 && (
            <button type="button" className="link" onClick={() => onChangeSelecionados([])}>
              Limpar seleção
            </button>
          )}
        </span>
      </div>

      <div className="busca">
        <Search size={16} aria-hidden="true" />
        <input
          className="entrada"
          type="search"
          placeholder="Filtrar critérios"
          aria-label="Filtrar critérios"
          value={filtro}
          onChange={(evento) => setFiltro(evento.target.value)}
        />
      </div>

      <ul className="criterios__lista">
        {visiveis.map((criterio) => {
          const marcado = selecionados.includes(criterio);
          const personalizado = personalizados.includes(criterio);
          return (
            <li key={criterio} className={`criterio${marcado ? ' criterio--marcado' : ''}`}>
              <label className="criterio__rotulo">
                <input type="checkbox" checked={marcado} onChange={() => alternar(criterio)} />
                <span>{criterio}</span>
              </label>
              {personalizado && (
                <button
                  type="button"
                  className="botao-icone botao-icone--pequeno"
                  aria-label={`Excluir o critério ${criterio}`}
                  title="Excluir critério personalizado"
                  onClick={() => remover(criterio)}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
            </li>
          );
        })}
        {visiveis.length === 0 && (
          <li className="criterios__vazio">Nenhum critério encontrado. Adicione um novo abaixo.</li>
        )}
      </ul>

      <div className="criterios__novo">
        <input
          className="entrada"
          placeholder="Novo critério, por exemplo: Domínio de Excel"
          aria-label="Nome do novo critério"
          value={novo}
          onChange={(evento) => setNovo(evento.target.value)}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter') {
              evento.preventDefault();
              adicionar();
            }
          }}
        />
        <button type="button" className="btn btn--secundario" onClick={adicionar} disabled={!novo.trim()}>
          <Plus size={16} aria-hidden="true" />
          Adicionar critério
        </button>
      </div>
    </div>
  );
}
