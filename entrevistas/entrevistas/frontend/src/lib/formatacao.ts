const numero1 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const numero2 = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const percentual = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const lista = new Intl.ListFormat('pt-BR', { style: 'long', type: 'conjunction' });

export const formatarNota = (valor: number): string => numero1.format(valor);
export const formatarContribuicao = (valor: number): string => numero2.format(valor);
export const formatarPercentual = (valor: number): string => `${percentual.format(valor)}%`;
export const formatarLista = (itens: string[]): string => lista.format(itens);

export function formatarDataHora(iso: string): string {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) return iso;
  return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
