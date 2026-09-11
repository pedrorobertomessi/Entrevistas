import { useEffect, useMemo, useState } from 'react';
import { Download, FilePlus, LoaderCircle, X } from 'lucide-react';
import { NavegacaoEtapas, type Etapa } from './components/NavegacaoEtapas';
import { SecaoAvaliacao } from './components/SecaoAvaliacao';
import { SecaoCandidato } from './components/SecaoCandidato';
import { SecaoObservacoes } from './components/SecaoObservacoes';
import { SecaoPerguntas } from './components/SecaoPerguntas';
import { SecaoVaga } from './components/SecaoVaga';
import { Aviso } from './components/ui';
import { avaliarEntrevista, baixarPdf, obterConfiguracao } from './lib/api';
import {
  carregarCriteriosPersonalizados,
  carregarRascunho,
  salvarCriteriosPersonalizados,
  salvarRascunho,
} from './lib/armazenamento';
import { assinaturaAvaliavel, novaEntrevista, perguntaCompleta } from './lib/entrevista';
import type { Avaliacao, ConfigServidor, Entrevista } from './types';

export default function App() {
  const [rascunhoInicial] = useState(carregarRascunho);
  const [entrevista, setEntrevista] = useState<Entrevista>(rascunhoInicial?.entrevista ?? novaEntrevista);
  const [avaliacao, setAvaliacao] = useState<Avaliacao | null>(rascunhoInicial?.avaliacao ?? null);
  const [assinaturaAvaliada, setAssinaturaAvaliada] = useState<string | null>(
    rascunhoInicial?.assinaturaAvaliada ?? null,
  );
  const [criteriosPersonalizados, setCriteriosPersonalizados] = useState<string[]>(carregarCriteriosPersonalizados);

  const [config, setConfig] = useState<ConfigServidor | null>(null);
  const [erroConexao, setErroConexao] = useState<string | null>(null);
  const [avaliando, setAvaliando] = useState(false);
  const [erroAvaliacao, setErroAvaliacao] = useState<string | null>(null);
  const [exportando, setExportando] = useState(false);
  const [erroExportacao, setErroExportacao] = useState<string | null>(null);
  const [rascunhoSalvo, setRascunhoSalvo] = useState(true);

  useEffect(() => {
    obterConfiguracao()
      .then((dados) => {
        setConfig(dados);
        setErroConexao(null);
      })
      .catch((erro: Error) => setErroConexao(erro.message));
  }, []);

  // Salva o rascunho automaticamente no navegador.
  useEffect(() => {
    const temporizador = setTimeout(() => {
      setRascunhoSalvo(salvarRascunho({ entrevista, avaliacao, assinaturaAvaliada }));
    }, 400);
    return () => clearTimeout(temporizador);
  }, [entrevista, avaliacao, assinaturaAvaliada]);

  useEffect(() => salvarCriteriosPersonalizados(criteriosPersonalizados), [criteriosPersonalizados]);

  const desatualizada = useMemo(
    () => avaliacao !== null && assinaturaAvaliada !== assinaturaAvaliavel(entrevista),
    [avaliacao, assinaturaAvaliada, entrevista],
  );

  const atualizar = <K extends keyof Entrevista>(campo: K, valor: Entrevista[K]) =>
    setEntrevista((atual) => ({ ...atual, [campo]: valor }));

  const avaliar = async () => {
    const instantanea = entrevista;
    setAvaliando(true);
    setErroAvaliacao(null);
    try {
      const resultado = await avaliarEntrevista(instantanea);
      setAvaliacao(resultado);
      setAssinaturaAvaliada(assinaturaAvaliavel(instantanea));
      requestAnimationFrame(() =>
        document.getElementById('resultado')?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      );
    } catch (erro) {
      setErroAvaliacao((erro as Error).message);
    } finally {
      setAvaliando(false);
    }
  };

  const exportar = async () => {
    setErroExportacao(null);
    if (!entrevista.candidato.nome.trim()) {
      setErroExportacao('Informe o nome do candidato para exportar o PDF.');
      const campo = document.getElementById('candidato-nome');
      campo?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      campo?.focus({ preventScroll: true });
      return;
    }
    setExportando(true);
    try {
      await baixarPdf(entrevista, avaliacao);
    } catch (erro) {
      setErroExportacao((erro as Error).message);
    } finally {
      setExportando(false);
    }
  };

  const iniciarNova = () => {
    const confirmado = window.confirm(
      'Iniciar uma nova entrevista? Os dados atuais serão apagados deste navegador. Exporte o PDF antes, se precisar guardar.',
    );
    if (!confirmado) return;
    setEntrevista(novaEntrevista());
    setAvaliacao(null);
    setAssinaturaAvaliada(null);
    setErroAvaliacao(null);
    setErroExportacao(null);
    window.scrollTo({ top: 0 });
  };

  const etapas: Etapa[] = [
    { id: 'candidato', rotulo: 'Candidato', completa: entrevista.candidato.nome.trim() !== '' },
    { id: 'vaga', rotulo: 'Vaga e critérios', completa: entrevista.criterios.length > 0 },
    { id: 'perguntas', rotulo: 'Perguntas', completa: entrevista.perguntas.some(perguntaCompleta) },
    {
      id: 'observacoes',
      rotulo: 'Raciocínio e comunicação',
      completa: [entrevista.raciocinio, entrevista.comunicacao].every(
        (obs) => obs.marcadores.length > 0 || obs.notas.trim() !== '',
      ),
    },
    { id: 'avaliacao', rotulo: 'Avaliação', completa: avaliacao !== null && !desatualizada },
  ];

  return (
    <div className="app">
      <header className="topo">
        <div className="topo__interno">
          <div className="marca">
            <span className="marca__nome">Entrevistas</span>
            <span className="marca__status">
              {rascunhoSalvo ? 'Rascunho salvo neste navegador' : 'Não foi possível salvar o rascunho'}
            </span>
          </div>
          <div className="topo__acoes">
            <button type="button" className="btn btn--fantasma" onClick={iniciarNova} aria-label="Nova entrevista">
              <FilePlus size={16} aria-hidden="true" />
              <span className="btn__rotulo-opcional">Nova entrevista</span>
            </button>
            <button type="button" className="btn btn--secundario" onClick={exportar} disabled={exportando}>
              {exportando ? (
                <LoaderCircle size={16} className="girando" aria-hidden="true" />
              ) : (
                <Download size={16} aria-hidden="true" />
              )}
              {exportando ? 'Exportando…' : 'Exportar PDF'}
            </button>
          </div>
        </div>
      </header>

      {(erroConexao || erroExportacao) && (
        <div className="avisos-globais">
          {erroConexao && (
            <Aviso tipo="erro">
              {erroConexao} Em desenvolvimento, use <code>npm run dev</code> na pasta raiz do projeto.
            </Aviso>
          )}
          {erroExportacao && (
            <div className="aviso-dispensavel">
              <Aviso tipo="erro">{erroExportacao}</Aviso>
              <button
                type="button"
                className="botao-icone"
                aria-label="Fechar aviso"
                onClick={() => setErroExportacao(null)}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      )}

      <div className="layout">
        <NavegacaoEtapas etapas={etapas} />

        <main className="conteudo">
          <SecaoCandidato candidato={entrevista.candidato} onChange={(valor) => atualizar('candidato', valor)} />
          <SecaoVaga
            vaga={entrevista.vaga}
            criterios={entrevista.criterios}
            criteriosPersonalizados={criteriosPersonalizados}
            onChangeVaga={(valor) => atualizar('vaga', valor)}
            onChangeCriterios={(valor) => atualizar('criterios', valor)}
            onChangeCriteriosPersonalizados={setCriteriosPersonalizados}
          />
          <SecaoPerguntas perguntas={entrevista.perguntas} onChange={(valor) => atualizar('perguntas', valor)} />
          <SecaoObservacoes
            raciocinio={entrevista.raciocinio}
            comunicacao={entrevista.comunicacao}
            onChangeRaciocinio={(valor) => atualizar('raciocinio', valor)}
            onChangeComunicacao={(valor) => atualizar('comunicacao', valor)}
          />
          <SecaoAvaliacao
            entrevista={entrevista}
            config={config}
            avaliacao={avaliacao}
            desatualizada={desatualizada}
            avaliando={avaliando}
            erro={erroAvaliacao}
            exportando={exportando}
            onAvaliar={avaliar}
            onExportar={exportar}
          />
        </main>
      </div>
    </div>
  );
}
