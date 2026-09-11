// Os nomes dos campos seguem o formato da API Python (snake_case).

export type Presenca = 'presente' | 'parcial' | 'ausente';
export type Faixa = 'alta' | 'media' | 'baixa';

export interface Candidato {
  nome: string;
  email: string;
  telefone: string;
  linkedin: string;
  data_entrevista: string;
  entrevistador: string;
}

export interface Vaga {
  titulo: string;
  nivel: string;
  descricao: string;
}

export interface Pergunta {
  id: string;
  texto: string;
  resposta: string;
  avaliar_star: boolean;
}

export interface Observacao {
  marcadores: string[];
  notas: string;
}

export interface Entrevista {
  candidato: Candidato;
  vaga: Vaga;
  criterios: string[];
  perguntas: Pergunta[];
  raciocinio: Observacao;
  comunicacao: Observacao;
}

export interface AvaliacaoCriterio {
  criterio: string;
  nota: number;
  justificativa: string;
}

export interface AvaliacaoStar {
  pergunta_id: string;
  situacao: Presenca;
  tarefa: Presenca;
  acao: Presenca;
  resultado: Presenca;
  nota: number;
  comentario: string;
}

export interface AvaliacaoDimensao {
  nota: number;
  comentario: string;
}

export interface ComponenteNota {
  chave: string;
  rotulo: string;
  nota: number;
  peso: number;
  contribuicao: number;
}

export interface Avaliacao {
  nota_final: number;
  faixa: Faixa;
  recomendacao: string;
  resumo: string;
  highlights: string[];
  pontos_fortes: string[];
  pontos_fracos: string[];
  criterios: AvaliacaoCriterio[];
  star: AvaliacaoStar[];
  raciocinio: AvaliacaoDimensao;
  comunicacao: AvaliacaoDimensao;
  composicao: ComponenteNota[];
  modelo: string;
  gerado_em: string;
}

export interface Pesos {
  fit: number;
  star: number;
  raciocinio: number;
  comunicacao: number;
}

export interface ConfigServidor {
  ia_configurada: boolean;
  modelo: string;
  pesos: Pesos;
}
