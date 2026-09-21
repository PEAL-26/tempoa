# Tempoa

Aplicação **desktop para Windows** (Tauri + React + TypeScript + Tailwind) focada em agendamento
de tarefas e atividades com **alertas no momento certo**.

## Funcionalidades (MVP)

- Criar, editar, eliminar e concluir tarefas.
- Ecrã único com as tarefas do dia e destaque para o **próximo compromisso**.
- Calendário mensal para navegar entre dias (com indicador visual de dias com tarefas).
- **Alerta prioritário** em ecrã completo, sempre no topo, com som, à hora marcada.
- **Alertas repetidos** (5/10/15/30/60 min) até dispensar ou concluir.
- **Lembretes** no canto inferior direito (antes/depois da hora), empilháveis e fecháveis.
- **Bandeja do Windows**: Abrir Tempoa · Nova tarefa · Tarefas de hoje · Sair.
- Corre em **background** quando a janela é fechada; os agendamentos continuam ativos.
- Iniciar com o Windows (opcional, nas Definições).
- Persistência local em **SQLite** (`%APPDATA%\com.tempoa.desktop\tempoa.db`).

## Requisitos

- Node.js 20+ e npm
- Rust (toolchain MSVC) + Visual Studio Build Tools (C++)
- WebView2 Runtime (pré-instalado no Windows 10/11)

## Desenvolvimento

```sh
npm install
npm run tauri dev
```

## Construir o instalador

```sh
npm run tauri build
```

O instalador NSIS fica em `src-tauri/target/release/bundle/nsis/Tempoa_0.1.0_x64-setup.exe`.

## Notas

- Fechar a janela minimiza para a bandeja; para sair de vez usa o menu da bandeja → **Sair**.
- Os ícones são gerados por `scripts/gen-icons.mjs` (sem dependências) e ficam em `src-tauri/icons`.