import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

export interface Etapa {
  id: string;
  rotulo: string;
  completa: boolean;
}

/** Destaca a seção visível durante a rolagem. */
function useSecaoAtiva(ids: string[]): string {
  const [ativa, setAtiva] = useState(ids[0]);
  const chave = ids.join('|');

  useEffect(() => {
    let quadro = 0;
    const atualizar = () => {
      cancelAnimationFrame(quadro);
      quadro = requestAnimationFrame(() => {
        let atual = ids[0];
        for (const id of ids) {
          const elemento = document.getElementById(id);
          if (elemento && elemento.getBoundingClientRect().top <= 140) atual = id;
        }
        const noFim = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
        setAtiva(noFim ? ids[ids.length - 1] : atual);
      });
    };
    atualizar();
    window.addEventListener('scroll', atualizar, { passive: true });
    window.addEventListener('resize', atualizar);
    return () => {
      cancelAnimationFrame(quadro);
      window.removeEventListener('scroll', atualizar);
      window.removeEventListener('resize', atualizar);
    };
  }, [chave]);

  return ativa;
}

export function NavegacaoEtapas({ etapas }: { etapas: Etapa[] }) {
  const ativa = useSecaoAtiva(etapas.map((etapa) => etapa.id));

  return (
    <nav className="etapas" aria-label="Etapas da entrevista">
      <ol>
        {etapas.map((etapa, indice) => {
          const atual = ativa === etapa.id;
          return (
            <li key={etapa.id}>
              <a
                href={`#${etapa.id}`}
                className={`etapa-link${atual ? ' etapa-link--ativa' : ''}`}
                aria-current={atual ? 'step' : undefined}
              >
                <span className={`etapa-link__marcador${etapa.completa ? ' etapa-link__marcador--completa' : ''}`}>
                  {etapa.completa ? <Check size={12} strokeWidth={3} aria-label="Concluída" /> : indice + 1}
                </span>
                <span>{etapa.rotulo}</span>
              </a>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
