import type { Avaliacao, ConfigServidor, Entrevista } from '../types';

const MSG_SEM_CONEXAO = 'Não foi possível conectar ao servidor. Verifique se o backend está em execução.';

async function mensagemDeErro(resposta: Response): Promise<string> {
  try {
    const corpo = (await resposta.json()) as { detail?: unknown };
    if (typeof corpo.detail === 'string') return corpo.detail;
    if (Array.isArray(corpo.detail)) {
      return 'Alguns campos foram enviados em formato inválido. Revise os dados e tente novamente.';
    }
  } catch {
    // Resposta sem JSON: geralmente o proxy do Vite sem backend disponível.
  }
  if ([500, 502, 503, 504].includes(resposta.status)) return MSG_SEM_CONEXAO;
  return `O servidor respondeu com um erro inesperado (${resposta.status}).`;
}

async function requisitar(url: string, corpo?: unknown): Promise<Response> {
  let resposta: Response;
  try {
    resposta = await fetch(url, {
      method: corpo === undefined ? 'GET' : 'POST',
      headers: corpo === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
  } catch {
    throw new Error(MSG_SEM_CONEXAO);
  }
  if (!resposta.ok) throw new Error(await mensagemDeErro(resposta));
  return resposta;
}

export async function obterConfiguracao(): Promise<ConfigServidor> {
  const resposta = await requisitar('/api/config');
  return (await resposta.json()) as ConfigServidor;
}

export async function avaliarEntrevista(entrevista: Entrevista): Promise<Avaliacao> {
  const resposta = await requisitar('/api/avaliar', entrevista);
  return (await resposta.json()) as Avaliacao;
}

function nomeDoArquivo(cabecalho: string | null): string {
  const encontrado = cabecalho?.match(/filename="?([^";]+)"?/i);
  return encontrado?.[1] ?? 'relatorio-entrevista.pdf';
}

export async function baixarPdf(entrevista: Entrevista, avaliacao: Avaliacao | null): Promise<void> {
  const resposta = await requisitar('/api/relatorio/pdf', { entrevista, avaliacao });
  const arquivo = await resposta.blob();
  const url = URL.createObjectURL(arquivo);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeDoArquivo(resposta.headers.get('Content-Disposition'));
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
