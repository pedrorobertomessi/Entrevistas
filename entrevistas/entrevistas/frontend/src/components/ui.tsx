import { useLayoutEffect, useRef, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { CircleAlert, Info, TriangleAlert } from 'lucide-react';

interface SecaoProps {
  id: string;
  titulo: string;
  descricao?: string;
  children: ReactNode;
}

export function Secao({ id, titulo, descricao, children }: SecaoProps) {
  return (
    <section id={id} className="secao" aria-labelledby={`secao-${id}-titulo`}>
      <header className="secao__cabecalho">
        <h2 id={`secao-${id}-titulo`} className="secao__titulo">
          {titulo}
        </h2>
        {descricao && <p className="secao__descricao">{descricao}</p>}
      </header>
      <div className="secao__corpo">{children}</div>
    </section>
  );
}

interface CampoProps {
  id: string;
  rotulo: string;
  obrigatorio?: boolean;
  ajuda?: string;
  children: ReactNode;
}

export function Campo({ id, rotulo, obrigatorio, ajuda, children }: CampoProps) {
  return (
    <div className="campo">
      <label htmlFor={id} className="campo__rotulo">
        {rotulo}
        {obrigatorio && (
          <span className="campo__obrigatorio" aria-hidden="true">
            {' '}*
          </span>
        )}
      </label>
      {children}
      {ajuda && <p className="campo__ajuda">{ajuda}</p>}
    </div>
  );
}

type AreaTextoProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { linhasMinimas?: number };

/** Textarea que cresce conforme o conteúdo, útil para transcrições longas. */
export function AreaTexto({ linhasMinimas = 3, value, className, ...props }: AreaTextoProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const elemento = ref.current;
    if (!elemento) return;
    elemento.style.height = 'auto';
    const borda = elemento.offsetHeight - elemento.clientHeight;
    elemento.style.height = `${elemento.scrollHeight + borda}px`;
  }, [value]);

  return (
    <textarea
      ref={ref}
      rows={linhasMinimas}
      value={value}
      className={`entrada entrada--area ${className ?? ''}`}
      {...props}
    />
  );
}

interface AvisoProps {
  tipo: 'erro' | 'alerta' | 'info';
  children: ReactNode;
}

export function Aviso({ tipo, children }: AvisoProps) {
  const Icone = tipo === 'erro' ? CircleAlert : tipo === 'alerta' ? TriangleAlert : Info;
  return (
    <div className={`aviso aviso--${tipo}`} role={tipo === 'erro' ? 'alert' : 'status'}>
      <Icone size={16} aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
