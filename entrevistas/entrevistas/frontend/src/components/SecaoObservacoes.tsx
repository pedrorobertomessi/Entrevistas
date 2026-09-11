import { MARCADORES_COMUNICACAO, MARCADORES_RACIOCINIO } from '../constants';
import type { Observacao } from '../types';
import { AreaTexto, Secao } from './ui';

interface PainelProps {
  id: string;
  titulo: string;
  descricao: string;
  marcadores: string[];
  placeholder: string;
  valor: Observacao;
  onChange: (valor: Observacao) => void;
}

function PainelObservacao({ id, titulo, descricao, marcadores, placeholder, valor, onChange }: PainelProps) {
  const alternar = (marcador: string) =>
    onChange({
      ...valor,
      marcadores: valor.marcadores.includes(marcador)
        ? valor.marcadores.filter((item) => item !== marcador)
        : [...valor.marcadores, marcador],
    });

  return (
    <div className="observacao">
      <div>
        <h3 className="observacao__titulo">{titulo}</h3>
        <p className="campo__ajuda">{descricao}</p>
      </div>

      <div className="marcadores" role="group" aria-label={`Marcadores de ${titulo.toLowerCase()}`}>
        {marcadores.map((marcador) => {
          const ativo = valor.marcadores.includes(marcador);
          return (
            <label key={marcador} className={`marcador${ativo ? ' marcador--ativo' : ''}`}>
              <input type="checkbox" checked={ativo} onChange={() => alternar(marcador)} />
              {marcador}
            </label>
          );
        })}
      </div>

      <div className="campo">
        <label htmlFor={`${id}-notas`} className="campo__rotulo">
          Anotações
        </label>
        <AreaTexto
          id={`${id}-notas`}
          linhasMinimas={4}
          placeholder={placeholder}
          value={valor.notas}
          onChange={(evento) => onChange({ ...valor, notas: evento.target.value })}
        />
      </div>
    </div>
  );
}

interface Props {
  raciocinio: Observacao;
  comunicacao: Observacao;
  onChangeRaciocinio: (valor: Observacao) => void;
  onChangeComunicacao: (valor: Observacao) => void;
}

export function SecaoObservacoes({ raciocinio, comunicacao, onChangeRaciocinio, onChangeComunicacao }: Props) {
  return (
    <Secao
      id="observacoes"
      titulo="Raciocínio e comunicação"
      descricao="Registre como o candidato se expressou durante a entrevista. Essas observações entram na nota final."
    >
      <div className="grade grade--2 grade--espacada">
        <PainelObservacao
          id="raciocinio"
          titulo="Raciocínio"
          descricao="Tempo para responder, organização das ideias e lógica."
          marcadores={MARCADORES_RACIOCINIO}
          placeholder="Por exemplo: levou cerca de 30 segundos para começar a responder a pergunta 3."
          valor={raciocinio}
          onChange={onChangeRaciocinio}
        />
        <PainelObservacao
          id="comunicacao"
          titulo="Comunicação"
          descricao="Clareza, fluência, objetividade e vocabulário."
          marcadores={MARCADORES_COMUNICACAO}
          placeholder="Por exemplo: gaguejou bastante no início, mas ficou mais fluente a partir da pergunta 2."
          valor={comunicacao}
          onChange={onChangeComunicacao}
        />
      </div>
    </Secao>
  );
}
