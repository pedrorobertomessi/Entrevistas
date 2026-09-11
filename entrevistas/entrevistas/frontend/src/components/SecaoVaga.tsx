import { NIVEIS } from '../constants';
import type { Vaga } from '../types';
import { SeletorCriterios } from './SeletorCriterios';
import { AreaTexto, Campo, Secao } from './ui';

interface Props {
  vaga: Vaga;
  criterios: string[];
  criteriosPersonalizados: string[];
  onChangeVaga: (vaga: Vaga) => void;
  onChangeCriterios: (criterios: string[]) => void;
  onChangeCriteriosPersonalizados: (criterios: string[]) => void;
}

export function SecaoVaga({
  vaga,
  criterios,
  criteriosPersonalizados,
  onChangeVaga,
  onChangeCriterios,
  onChangeCriteriosPersonalizados,
}: Props) {
  return (
    <Secao
      id="vaga"
      titulo="Vaga e critérios"
      descricao="A IA avalia o fit do candidato com base nos critérios selecionados."
    >
      <div className="grade grade--2">
        <Campo id="vaga-titulo" rotulo="Cargo">
          <input
            id="vaga-titulo"
            className="entrada"
            placeholder="Por exemplo: Analista de Marketing"
            value={vaga.titulo}
            onChange={(evento) => onChangeVaga({ ...vaga, titulo: evento.target.value })}
          />
        </Campo>
        <Campo id="vaga-nivel" rotulo="Nível">
          <select
            id="vaga-nivel"
            className="entrada"
            value={vaga.nivel}
            onChange={(evento) => onChangeVaga({ ...vaga, nivel: evento.target.value })}
          >
            <option value="">Selecione</option>
            {NIVEIS.map((nivel) => (
              <option key={nivel} value={nivel}>
                {nivel}
              </option>
            ))}
          </select>
        </Campo>
      </div>

      <Campo
        id="vaga-descricao"
        rotulo="Descrição e requisitos"
        ajuda="Opcional. Ajuda a IA a calibrar a exigência pelo contexto e pelo nível da vaga."
      >
        <AreaTexto
          id="vaga-descricao"
          linhasMinimas={3}
          value={vaga.descricao}
          onChange={(evento) => onChangeVaga({ ...vaga, descricao: evento.target.value })}
        />
      </Campo>

      <SeletorCriterios
        selecionados={criterios}
        personalizados={criteriosPersonalizados}
        onChangeSelecionados={onChangeCriterios}
        onChangePersonalizados={onChangeCriteriosPersonalizados}
      />
    </Secao>
  );
}
