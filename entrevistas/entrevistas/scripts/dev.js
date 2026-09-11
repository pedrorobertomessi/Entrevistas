#!/usr/bin/env node
// Sobe o backend (FastAPI) e o frontend (Vite) no mesmo terminal.
//
//   npm run dev   modo desenvolvimento, com recarga automática: http://localhost:5173
//   npm start     modo produção, o backend serve o frontend compilado: http://localhost:8000
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import {
  BACKEND,
  FRONTEND,
  WINDOWS,
  cores,
  encontrarPythonDoSistema,
  pythonDoVenv,
} from './utils.js';

const producao = process.argv.includes('--producao');
const processos = [];
let encerrando = false;

function falhar(mensagem) {
  console.error(`\n${cores.vermelho('Erro:')} ${mensagem}\n`);
  process.exit(1);
}

/** Repassa a saída do processo filho com um prefixo, linha a linha. */
function repassar(fluxo, destino, prefixo) {
  let resto = '';
  fluxo.on('data', (bloco) => {
    const linhas = (resto + bloco.toString()).split(/\r?\n/);
    resto = linhas.pop() ?? '';
    for (const linha of linhas) destino.write(`${prefixo} ${linha}\n`);
  });
  fluxo.on('end', () => {
    if (resto) destino.write(`${prefixo} ${resto}\n`);
  });
}

function iniciar(nome, colorir, comando, args, opcoes) {
  // Fora do Windows, cada processo ganha o próprio grupo para ser encerrado com seus subprocessos.
  const processo = spawn(comando, args, { stdio: ['ignore', 'pipe', 'pipe'], detached: !WINDOWS, ...opcoes });
  const prefixo = colorir(`[${nome}]`);
  repassar(processo.stdout, process.stdout, prefixo);
  repassar(processo.stderr, process.stderr, prefixo);
  processo.on('error', (erro) => {
    console.error(`${prefixo} Não foi possível iniciar: ${erro.message}`);
    encerrar(1);
  });
  processo.on('exit', (codigo) => {
    if (!encerrando) {
      console.error(`${prefixo} Encerrado com código ${codigo}. Parando os demais processos.`);
      encerrar(codigo ?? 1);
    }
  });
  processos.push(processo);
  return processo;
}

function matar(processo) {
  if (processo.exitCode !== null || processo.pid === undefined) return;
  if (WINDOWS) {
    spawn('taskkill', ['/pid', String(processo.pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }
  try {
    process.kill(-processo.pid, 'SIGTERM');
  } catch {
    processo.kill('SIGTERM');
  }
}

function encerrar(codigo = 0) {
  if (encerrando) return;
  encerrando = true;
  processos.forEach(matar);
  setTimeout(() => process.exit(codigo), 600);
}

process.on('SIGINT', () => encerrar(0));
process.on('SIGTERM', () => encerrar(0));

// ---------------------------------------------------------------------------

const python = pythonDoVenv() ?? encontrarPythonDoSistema()?.comando;
if (!python) falhar('Python não encontrado. Rode "npm run setup" antes.');
if (!pythonDoVenv()) {
  console.log(cores.amarelo('Aviso: backend/.venv não encontrado. Usando o Python do sistema. Rode "npm run setup" se faltar alguma dependência.'));
}
if (!existsSync(path.join(BACKEND, '.env'))) {
  console.log(cores.amarelo('Aviso: backend/.env não encontrado. A avaliação com IA ficará indisponível até você criá-lo.'));
}

const argsUvicorn = ['-m', 'uvicorn', 'main:app', '--host', '127.0.0.1', '--port', '8000'];

if (producao) {
  if (!existsSync(path.join(FRONTEND, 'dist', 'index.html'))) {
    falhar('Frontend não compilado. Rode "npm run build" antes de "npm start".');
  }
  iniciar('api', cores.azul, python, argsUvicorn, { cwd: BACKEND });
  console.log(`\n${cores.verde('Aplicação disponível em http://localhost:8000')}  ${cores.cinza('(Ctrl+C para parar)')}\n`);
} else {
  const vite = path.join(FRONTEND, 'node_modules', 'vite', 'bin', 'vite.js');
  if (!existsSync(vite)) {
    falhar('Dependências do frontend não instaladas. Rode "npm run setup" antes.');
  }
  iniciar('api', cores.azul, python, [...argsUvicorn, '--reload'], { cwd: BACKEND });
  // Executa o Vite direto pelo Node, sem o npm no meio, para o Ctrl+C encerrar tudo corretamente.
  iniciar('web', cores.verde, process.execPath, [vite], { cwd: FRONTEND });
  console.log(`\n${cores.verde('Aplicação disponível em http://localhost:5173')}  ${cores.cinza('(Ctrl+C para parar)')}\n`);
}
