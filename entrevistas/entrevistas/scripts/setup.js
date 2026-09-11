#!/usr/bin/env node
// Instala tudo o que o projeto precisa: ambiente Python, dependências e arquivo .env.
// Uso: npm run setup
import { copyFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import {
  BACKEND,
  FRONTEND,
  WINDOWS,
  cores,
  encontrarPythonDoSistema,
  executar,
  pythonDoVenv,
} from './utils.js';

function etapa(texto) {
  console.log(`\n${cores.azul('›')} ${texto}`);
}

async function principal() {
  const [maiorNode] = process.versions.node.split('.').map(Number);
  if (maiorNode < 18) {
    throw new Error(`O projeto precisa do Node.js 18 ou superior. Versão atual: ${process.versions.node}.`);
  }

  etapa('Procurando Python 3.10 ou superior');
  let python = pythonDoVenv();
  if (python) {
    console.log(cores.cinza(`  Ambiente virtual já existe em backend/.venv`));
  } else {
    const sistema = encontrarPythonDoSistema();
    if (!sistema) {
      throw new Error('Python 3.10 ou superior não encontrado. Instale em https://www.python.org/downloads/ e rode o setup novamente.');
    }
    console.log(cores.cinza(`  Python ${sistema.versao} encontrado`));

    etapa('Criando ambiente virtual em backend/.venv');
    await executar(sistema.comando, [...sistema.args, '-m', 'venv', '.venv'], { cwd: BACKEND });
    python = pythonDoVenv();
    if (!python) throw new Error('Não foi possível criar o ambiente virtual do Python.');
  }

  etapa('Instalando dependências do backend');
  await executar(python, ['-m', 'pip', 'install', '--upgrade', 'pip', '--quiet'], { cwd: BACKEND });
  await executar(python, ['-m', 'pip', 'install', '-r', 'requirements.txt'], { cwd: BACKEND });

  etapa('Instalando dependências do frontend');
  await executar('npm', ['install'], { cwd: FRONTEND, shell: WINDOWS });

  const env = path.join(BACKEND, '.env');
  if (!existsSync(env)) {
    copyFileSync(path.join(BACKEND, '.env.example'), env);
    etapa('Arquivo backend/.env criado a partir do modelo');
  }

  console.log(`\n${cores.verde('Instalação concluída.')}`);
  console.log(`\nPróximos passos:`);
  console.log(`  1. Abra ${cores.amarelo('backend/.env')} e preencha ANTHROPIC_API_KEY`);
  console.log(`  2. Rode ${cores.amarelo('npm run dev')} e acesse http://localhost:5173\n`);
}

principal().catch((erro) => {
  console.error(`\n${cores.vermelho('Erro:')} ${erro.message}\n`);
  process.exit(1);
});
