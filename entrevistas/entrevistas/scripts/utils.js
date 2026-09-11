// Utilitários compartilhados pelos scripts de instalação e execução.
import { spawn, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const BACKEND = path.join(RAIZ, 'backend');
export const FRONTEND = path.join(RAIZ, 'frontend');
export const WINDOWS = process.platform === 'win32';

export const cores = {
  azul: (texto) => `\x1b[34m${texto}\x1b[0m`,
  verde: (texto) => `\x1b[32m${texto}\x1b[0m`,
  amarelo: (texto) => `\x1b[33m${texto}\x1b[0m`,
  vermelho: (texto) => `\x1b[31m${texto}\x1b[0m`,
  cinza: (texto) => `\x1b[90m${texto}\x1b[0m`,
};

/** Python do ambiente virtual do backend, se já tiver sido criado. */
export function pythonDoVenv() {
  const caminho = WINDOWS
    ? path.join(BACKEND, '.venv', 'Scripts', 'python.exe')
    : path.join(BACKEND, '.venv', 'bin', 'python');
  return existsSync(caminho) ? caminho : null;
}

/** Procura um Python 3.10+ instalado no sistema. Retorna { comando, args } ou null. */
export function encontrarPythonDoSistema() {
  const candidatos = WINDOWS
    ? [
        { comando: 'py', args: ['-3'] },
        { comando: 'python', args: [] },
      ]
    : [
        { comando: 'python3', args: [] },
        { comando: 'python', args: [] },
      ];

  for (const candidato of candidatos) {
    const resultado = spawnSync(
      candidato.comando,
      [...candidato.args, '-c', 'import sys; print("%d.%d" % sys.version_info[:2])'],
      { encoding: 'utf8' },
    );
    if (resultado.status !== 0) continue;
    const [maior, menor] = resultado.stdout.trim().split('.').map(Number);
    if (maior === 3 && menor >= 10) return { ...candidato, versao: `${maior}.${menor}` };
  }
  return null;
}

/** Executa um comando mostrando a saída no terminal. */
export function executar(comando, args, opcoes = {}) {
  return new Promise((resolver, rejeitar) => {
    const processo = spawn(comando, args, { stdio: 'inherit', ...opcoes });
    processo.on('error', rejeitar);
    processo.on('exit', (codigo) =>
      codigo === 0
        ? resolver()
        : rejeitar(new Error(`O comando "${comando} ${args.join(' ')}" terminou com código ${codigo}.`)),
    );
  });
}
