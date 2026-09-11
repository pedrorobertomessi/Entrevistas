import type { Entrevista, Pergunta } from '../types';

export function gerarId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `p-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function hojeISO(): string {
  const agora = new Date();
  const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function novaPergunta(): Pergunta {
  return { id: gerarId(), texto: '', resposta: '', avaliar_star: true };
}

export function novaEntrevista(): Entrevista {
  return {
    candidato: {
      nome: '',
      email: '',
      telefone: '',
      linkedin: '',
      data_entrevista: hojeISO(),
      entrevistador: '',
    },
    vaga: { titulo: '', nivel: '', descricao: '' },
    criterios: [],
    perguntas: [novaPergunta()],
    raciocinio: { marcadores: [], notas: '' },
    comunicacao: { marcadores: [], notas: '' },
  };
}

/** Pergunta com enunciado e resposta: é a única que entra na avaliação. */
export function perguntaCompleta(pergunta: Pergunta): boolean {
  return pergunta.texto.trim() !== '' && pergunta.resposta.trim() !== '';
}

/** Números (1, 2, 3...) das perguntas iniciadas, mas sem enunciado ou sem resposta. */
export function perguntasIncompletas(entrevista: Entrevista): number[] {
  return entrevista.perguntas.flatMap((pergunta, indice) => {
    const iniciada = pergunta.texto.trim() !== '' || pergunta.resposta.trim() !== '';
    return iniciada && !perguntaCompleta(pergunta) ? [indice + 1] : [];
  });
}

export function pendenciasAvaliacao(entrevista: Entrevista): string[] {
  const pendencias: string[] = [];
  if (entrevista.criterios.length === 0) {
    pendencias.push('Selecione pelo menos um critério de avaliação.');
  }
  if (!entrevista.perguntas.some(perguntaCompleta)) {
    pendencias.push('Registre pelo menos uma pergunta com a resposta do candidato.');
  }
  return pendencias;
}

/**
 * Representa o conteúdo que a IA avalia. Serve para saber se a entrevista mudou
 * depois da última avaliação. Dados do candidato ficam de fora porque não afetam a nota.
 */
export function assinaturaAvaliavel(entrevista: Entrevista): string {
  const { vaga, criterios, perguntas, raciocinio, comunicacao } = entrevista;
  return JSON.stringify({ vaga, criterios, perguntas, raciocinio, comunicacao });
}
