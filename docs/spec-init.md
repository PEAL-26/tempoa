# Tempoa — Especificação inicial

Criar uma aplicação desktop para Windows usando Tauri, focada exclusivamente em agendamento de tarefas e atividades com alertas no momento certo. A aplicação deve ser extremamente simples, rápida e visualmente limpa, sem excesso de configurações ou funcionalidades.

## Objetivo

Permitir ao utilizador:
- Criar tarefas/atividades para uma data e hora específicas.
- Visualizar todas as tarefas do dia numa única tela.
- Consultar outros dias através de um calendário.
- Definir alertas recorrentes para uma tarefa, indicando de quanto em quanto tempo o utilizador deve ser lembrado quando chegar o momento da atividade.
- Manter a aplicação em execução em background, minimizada na bandeja do Windows.
- Receber alertas visuais e sonoros sem precisar manter a janela aberta.

## Interface principal

A aplicação deve ter uma única tela principal, simples e bonita, contendo:
- Data atual e indicação do dia.
- Lista cronológica das tarefas do dia.
- Cada tarefa deve apresentar hora, título, estado e indicador de recorrência/alerta quando aplicável.
- Botão principal para adicionar tarefa.
- Acesso a um calendário para navegar para outra data e visualizar/adicionar tarefas.
- Ações simples para editar, concluir ou eliminar uma tarefa.

Não criar uma sidebar complexa nem múltiplas páginas. Configurações e ações secundárias devem aparecer em modais.

## Criar/editar tarefa

Modal contendo apenas os campos necessários:
- Título da tarefa/atividade.
- Data.
- Hora.
- Observação opcional.
- Opção para configurar alertas.
- Opção para definir recorrência, caso necessário.

A criação deve ser rápida, com poucos cliques.

## Sistema de alertas

Existem dois tipos de alerta:

### 1. Alerta da atividade

Quando chega exatamente a hora definida para realizar a atividade:
- Abrir uma janela em tela cheia sobre todas as outras janelas.
- Exibir claramente o nome da atividade e a hora.
- Reproduzir um som de alerta predefinido.
- Permitir fechar/dispensar o alerta.
- Se existir uma configuração de repetição do alerta, continuar a alertar conforme o intervalo definido até o utilizador dispensar/concluir a atividade.

Este é o alerta prioritário e deve chamar imediatamente a atenção do utilizador.

### 2. Lembrete

Antes ou depois do momento principal da atividade, conforme configuração:
- Exibir uma notificação no canto inferior direito.
- A notificação deve aparecer no canto do monitor.
- O utilizador deve poder fechá-la.
- Notificações não fechadas devem permanecer empilhadas.
- Não abrir a aplicação em tela cheia para este tipo de alerta.

## Alertas recorrentes

Uma tarefa pode ter um intervalo de lembrete configurado, por exemplo:
- A cada 5 minutos.
- A cada 10 minutos.
- A cada 15 minutos.
- A cada 30 minutos.
- A cada 1 hora.

O objetivo é permitir que uma atividade continue a lembrar o utilizador até que seja concluída ou dispensada.

Os intervalos podem ser inicialmente predefinidos, sem permitir configurações avançadas.

## Bandeja do Windows

A aplicação deve funcionar normalmente em background:
- Ao fechar a janela principal, a aplicação continua em execução na bandeja.
- Ícone visível na área de notificações do Windows.
- Menu da bandeja:
  - Abrir Tempoa.
  - Nova tarefa.
  - Tarefas de hoje.
  - Sair.
- A aplicação deve poder iniciar com o Windows.
- O agendamento e os alertas devem funcionar mesmo com a janela principal fechada.

## Calendário

Um calendário simples deve permitir:
- Navegar entre meses.
- Selecionar um dia.
- Visualizar as tarefas daquele dia.
- Adicionar uma tarefa diretamente para o dia selecionado.
- Indicar visualmente dias que possuem tarefas.

Não é necessário implementar uma agenda visual complexa por horas ou estilo Google Calendar.

## Persistência

Os dados devem ser armazenados localmente no computador. Não existe necessidade de backend, conta ou sincronização nesta primeira versão.

Guardar pelo menos:
- Tarefas.
- Data e hora.
- Estado da tarefa.
- Configuração de alertas.
- Configuração de recorrência.
- Preferências básicas da aplicação.

## Tecnologia

- Tauri.
- Frontend React + TypeScript.
- UI simples e moderna.
- Tailwind CSS.
- Componentes minimalistas.
- Persistência local.
- Recursos nativos do Windows para notificações, áudio, tray e execução em background.
- O processamento dos agendamentos deve continuar ativo mesmo quando a janela principal estiver fechada.

## Design

Interface minimalista, limpa e profissional:
- Uma tela principal.
- Hierarquia visual clara.
- Poucos botões.
- Sem dashboards desnecessários.
- Sem configurações avançadas nesta versão.
- Modais para funcionalidades secundárias.
- Foco na tarefa atual e no próximo compromisso.

## MVP

A primeira versão deve conter apenas:
1. Criar tarefa.
2. Editar tarefa.
3. Eliminar tarefa.
4. Concluir tarefa.
5. Visualizar tarefas do dia.
6. Calendário para navegar entre dias.
7. Agendamento de alertas.
8. Alertas nativos do Windows.
9. Alerta prioritário em tela cheia com som.
10. Alertas recorrentes.
11. Execução em background.
12. Ícone e menu na bandeja do Windows.
13. Persistência local.
14. Inicialização com o Windows.

Evitar no MVP: contas, sincronização, cloud, colaboração, categorias complexas, tags, integrações externas, temas personalizados, sons personalizados, configurações avançadas, estatísticas e qualquer funcionalidade que não seja necessária para agendar atividades e receber os respetivos alertas.