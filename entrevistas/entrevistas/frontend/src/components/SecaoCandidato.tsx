import type { ChangeEvent } from 'react';
import type { Candidato } from '../types';
import { Campo, Secao } from './ui';

interface Props {
  candidato: Candidato;
  onChange: (candidato: Candidato) => void;
}

export function SecaoCandidato({ candidato, onChange }: Props) {
  const atualizar = (campo: keyof Candidato) => (evento: ChangeEvent<HTMLInputElement>) =>
    onChange({ ...candidato, [campo]: evento.target.value });

  return (
    <Secao
      id="candidato"
      titulo="Dados do candidato"
      descricao="Aparecem no relatório em PDF. Não são enviados para a avaliação com IA."
    >
      <div className="grade grade--2">
        <Campo id="candidato-nome" rotulo="Nome completo" obrigatorio>
          <input
            id="candidato-nome"
            className="entrada"
            value={candidato.nome}
            onChange={atualizar('nome')}
            autoComplete="off"
            required
          />
        </Campo>
        <Campo id="candidato-email" rotulo="E-mail">
          <input
            id="candidato-email"
            type="email"
            className="entrada"
            value={candidato.email}
            onChange={atualizar('email')}
            autoComplete="off"
          />
        </Campo>
        <Campo id="candidato-telefone" rotulo="Telefone">
          <input
            id="candidato-telefone"
            type="tel"
            className="entrada"
            value={candidato.telefone}
            onChange={atualizar('telefone')}
            autoComplete="off"
          />
        </Campo>
        <Campo id="candidato-linkedin" rotulo="LinkedIn ou portfólio">
          <input
            id="candidato-linkedin"
            className="entrada"
            value={candidato.linkedin}
            onChange={atualizar('linkedin')}
            autoComplete="off"
          />
        </Campo>
        <Campo id="candidato-data" rotulo="Data da entrevista">
          <input
            id="candidato-data"
            type="date"
            className="entrada"
            value={candidato.data_entrevista}
            onChange={atualizar('data_entrevista')}
          />
        </Campo>
        <Campo id="candidato-entrevistador" rotulo="Entrevistador(a)">
          <input
            id="candidato-entrevistador"
            className="entrada"
            value={candidato.entrevistador}
            onChange={atualizar('entrevistador')}
          />
        </Campo>
      </div>
    </Secao>
  );
}
