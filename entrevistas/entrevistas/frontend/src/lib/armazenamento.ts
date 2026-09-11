import type { Avaliacao, Entrevista } from '../types';
import { novaEntrevista } from './entrevista';

// Rascunho salvo no navegador para não perder a transcrição ao recarregar a página.
const CHAVE_RASCUNHO = 'entrevistas:rascunho:v1';
const CHAVE_CRITERIOS = 'entrevistas:criterios-personalizados:v1';

export interface Rascunho {
  entrevista: Entrevista;
  avaliacao: Avaliacao | null;
  assinaturaAvaliada: string | null;
}

function lerJson(chave: string): unknown {
  try {
    const bruto = localStorage.getItem(chave);
    return bruto ? JSON.parse(bruto) : null;
  } catch {
    return null;
  }
}

function gravarJson(chave: string, valor: unknown): boolean {
  try {
    localStorage.setItem(chave, JSON.stringify(valor));
    return true;
  } catch {
    return false; // armazenamento cheio ou bloqueado
  }
}

export function carregarRascunho(): Rascunho | null {
  const dados = lerJson(CHAVE_RASCUNHO) as Partial<Rascunho> | null;
  if (!dados?.entrevista) return null;

  // Completa campos ausentes em rascunhos de versões anteriores.
  const base = novaEntrevista();
  const salva = dados.entrevista;
  const entrevista: Entrevista = {
    candidato: { ...base.candidato, ...salva.candidato },
    vaga: { ...base.vaga, ...salva.vaga },
    criterios: Array.isArray(salva.criterios) ? salva.criterios : [],
    perguntas: Array.isArray(salva.perguntas) && salva.perguntas.length > 0 ? salva.perguntas : base.perguntas,
    raciocinio: { ...base.raciocinio, ...salva.raciocinio },
    comunicacao: { ...base.comunicacao, ...salva.comunicacao },
  };
  return {
    entrevista,
    avaliacao: dados.avaliacao ?? null,
    assinaturaAvaliada: dados.assinaturaAvaliada ?? null,
  };
}

export function salvarRascunho(rascunho: Rascunho): boolean {
  return gravarJson(CHAVE_RASCUNHO, rascunho);
}

export function carregarCriteriosPersonalizados(): string[] {
  const dados = lerJson(CHAVE_CRITERIOS);
  return Array.isArray(dados) ? dados.filter((item): item is string => typeof item === 'string') : [];
}

export function salvarCriteriosPersonalizados(criterios: string[]): void {
  gravarJson(CHAVE_CRITERIOS, criterios);
}
