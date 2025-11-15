// main.js

// 1. Configuração do Supabase
const SUPABASE_URL = "https://ubbbupjezikuucchcfcq.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViYmJ1cGplemlrdXVjY2hjZmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3MTg2MjQsImV4cCI6MjA3ODI5NDYyNH0.w9HotY4R6Yfh2y3pWoab9VQ1gQN4VstNpvRBgCyEEAw";

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 2. Elementos do DOM
const btnProcessarTexto = document.getElementById("btn-processar-texto");
const navButtons = document.querySelectorAll(".nav-btn");
const sections = document.querySelectorAll(".section");
const questoesGrid = document.getElementById("questoes-grid");
const btnNovaQuestao = document.getElementById("btn-nova-questao");
const modalQuestao = document.getElementById("modal-questao");
const modalClose = document.getElementById("modal-close");
const btnCancelar = document.getElementById("btn-cancelar");
const formQuestao = document.getElementById("form-questao");
const modalTitle = document.getElementById("modal-title");
const selectTipo = document.getElementById("tipo");
const opcoesContainer = document.getElementById("opcoes-container");
const certoErradoContainer = document.getElementById("certo-errado-container");
const opcoesList = document.getElementById("opcoes-list");
const btnAdicionarOpcao = document.getElementById("btn-adicionar-opcao");
const modalConfirmacao = document.getElementById("modal-confirmacao");
const btnCancelarExclusao = document.getElementById("btn-cancelar-exclusao");
const btnConfirmarExclusao = document.getElementById("btn-confirmar-exclusao");
const enunciadoEditor = document.getElementById("enunciado");

let questaoEmEdicaoId = null;
let questaoParaExcluirId = null;

// Variáveis para controle do quiz
let questoesQuiz = [];
let questaoAtualIndex = 0;
let questaoAtual = null;

// Carregar respostas salvas do localStorage
let respostasUsuario =
  JSON.parse(localStorage.getItem("respostasUsuario")) || {};

const quizContainer = document.getElementById("quiz-container");
const btnIniciarQuiz = document.getElementById("btn-iniciar-quiz");
const btnProximaQuestao = document.getElementById("btn-proxima-questao");
const btnQuestaoAnterior = document.getElementById("btn-questao-anterior");
const quizFiltroMateria = document.getElementById("quiz-filtro-materia");
const quizFiltroAssunto = document.getElementById("quiz-filtro-assunto");
const quizFiltroBanca = document.getElementById("quiz-filtro-banca");

// 3. Funções de Utilidade

/**
 * Alterna a seção ativa e o botão de navegação.
 * @param {string} sectionId - O ID da seção a ser ativada.
 */
function switchSection(sectionId) {
  sections.forEach((section) => {
    section.classList.remove("active");
  });
  document.getElementById(sectionId).classList.add("active");

  navButtons.forEach((btn) => {
    btn.classList.remove("active");
    if (btn.getAttribute("data-section") === sectionId) {
      btn.classList.add("active");
    }
  });

  // Ações específicas ao mudar de seção
  if (sectionId === "questoes") {
    carregarQuestao();
  } else if (sectionId === "dashboard") {
    carregarDashboard();
  } else if (sectionId === "responder") {
    // A lógica de iniciar quiz será tratada no passo 4
  }
}

// 4. Lógica de Navegação
navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const sectionId = btn.getAttribute("data-section");
    switchSection(sectionId);
  });
});

// 5. Lógica do Modal de Questão (CRUD - Create/Update)

/**
 * Processa o texto colado no editor para extrair enunciado, alternativas e resposta.
 */
function processarTexto() {
  const textoCompleto = enunciadoEditor.innerText.trim();
  if (!textoCompleto) {
    alert("Cole o texto da questão no campo acima antes de processar.");
    return;
  }

  // 1. Detectar a resposta correta no final do texto (RESPOSTA CORRETA: E ou GABARITO: E)
  let respostaCorretaLetra = null;
  const regexRespostaFinal = /(?:RESPOSTA\s*CORRETA|GABARITO)\s*:\s*([A-Ea-e]|Certo|Errado)\s*$/im;
  const matchRespostaFinal = textoCompleto.match(regexRespostaFinal);

  let textoSemResposta = textoCompleto;
  if (matchRespostaFinal) {
    respostaCorretaLetra = matchRespostaFinal[1];
    // Remove a linha da resposta correta
    textoSemResposta = textoCompleto.replace(regexRespostaFinal, "").trim();
  }

  // 2. Verificar se é uma questão de Certo/Errado
  const isCertoErrado = /(?:Certo|Errado|CERTO|ERRADO)/i.test(textoSemResposta) && 
                       (respostaCorretaLetra === 'Certo' || respostaCorretaLetra === 'Errado');

  if (isCertoErrado) {
    processarTextoCertouErrado(textoSemResposta, respostaCorretaLetra);
    return;
  }

  // 3. Dividir o texto em enunciado e alternativas (Múltipla Escolha)
  // Procura pela primeira alternativa (A, B, C, D, E ou a, b, c, d, e) seguida de quebra de linha ou espaço)
  const regexPrimeiraAlternativa = /^([\s\S]*?)\n\s*([A-Ea-e])\s*\n/m;
  const match = textoSemResposta.match(regexPrimeiraAlternativa);

  let enunciado = textoSemResposta;
  let textoAlternativas = textoSemResposta;

  if (match) {
    enunciado = match[1].trim();
    // Encontra a posição onde as alternativas começam
    const indexAlternativas = match.index + match[1].length;
    textoAlternativas = textoSemResposta.substring(indexAlternativas).trim();
  }

  // 4. Extrair as alternativas individuais
  // Padrão: [A-Ea-e] seguido de espaço ou quebra de linha, depois o texto
  const regexAlternativas = /([A-Ea-e])\s*\n([\s\S]*?)(?=\n[A-Ea-e]\s*\n|$)/g;
  let alternativas = [];
  let matchAlt;

  while ((matchAlt = regexAlternativas.exec(textoAlternativas)) !== null) {
    const letra = matchAlt[1].trim().toUpperCase(); // Normaliza para maiúscula
    let texto = matchAlt[2].trim();

    // Remove quebras de linha extras e normaliza espaços
    texto = texto.replace(/\n+/g, " ").trim();

    if (texto) {
      alternativas.push({
        letra,
        texto,
        isCorreta: letra === respostaCorretaLetra?.toUpperCase(),
      });
    }
  }

  // 5. Validar se encontrou alternativas
  if (alternativas.length < 2) {
    alert(
      "Não foi possível extrair as alternativas. Verifique o formato do texto. \n\nFormato esperado:\nEnunciado da questão...\nA\nTexto da alternativa A\nB\nTexto da alternativa B\n...\nRESPOSTA CORRETA: E\n\nPara questões de Certo/Errado, use:\nEnunciado da questão...\nRESPOSTA CORRETA: Certo"
    );
    return;
  }

  // 6. Preencher o formulário
  enunciadoEditor.innerHTML = enunciado;
  selectTipo.value = "multipla_escolha";
  selectTipo.dispatchEvent(new Event("change")); // Atualiza a exibição

  // Limpa e preenche as opções
  opcoesList.innerHTML = "";
  alternativas.forEach((alt) => {
    adicionarOpcao(alt.texto, alt.isCorreta);
  });

  alert(
    "Texto processado com sucesso! \n\nEnunciado: " +
      (enunciado.substring(0, 50) + "...") +
      "\nAlternativas: " +
      alternativas.length +
      "\nResposta correta: " +
      (respostaCorretaLetra || "Não identificada") +
      "\n\nVerifique e complete os campos de Matéria, Assunto, Banca e Dificuldade."
  );
}

/**
 * Processa questões do tipo Certo/Errado.
 */
function processarTextoCertouErrado(textoSemResposta, respostaCorreta) {
  // Remove possíveis indicações de alternativas que possam ter sido detectadas erroneamente
  const enunciado = textoSemResposta.replace(/(?:Certo|Errado|CERTO|ERRADO)[\s\S]*$/i, "").trim();

  // Preenche o formulário para questão Certo/Errado
  enunciadoEditor.innerHTML = enunciado;
  selectTipo.value = "certo_errado";
  selectTipo.dispatchEvent(new Event("change")); // Atualiza a exibição

  // Marca a resposta correta
  if (respostaCorreta) {
    const radio = formQuestao.querySelector(`input[name="resposta_correta"][value="${respostaCorreta}"]`);
    if (radio) radio.checked = true;
  }

  alert(
    "Questão de Certo/Errado processada com sucesso! \n\nEnunciado: " +
      (enunciado.substring(0, 50) + "...") +
      "\nResposta correta: " +
      respostaCorreta +
      "\n\nVerifique e complete os campos de Matéria, Assunto, Banca e Dificuldade."
  );
}

btnProcessarTexto.addEventListener("click", processarTexto);

/**
 * Abre o modal para criar uma nova questão.
 */
btnNovaQuestao.addEventListener("click", () => {
  questaoEmEdicaoId = null;
  modalTitle.textContent = "Nova Questão";
  formQuestao.reset();
  enunciadoEditor.innerHTML = ""; // Limpa o conteúdo do contenteditable
  opcoesList.innerHTML = ""; // Limpa as opções
  selectTipo.dispatchEvent(new Event("change")); // Reseta a exibição de opções
  modalQuestao.classList.add("active");
});

/**
 * Fecha o modal.
 */
[modalClose, btnCancelar].forEach((element) => {
  element.addEventListener("click", () => {
    modalQuestao.classList.remove("active");
  });
});

/**
 * Alterna a exibição dos campos de resposta com base no tipo de questão.
 */
selectTipo.addEventListener("change", () => {
  const tipo = selectTipo.value;
  opcoesContainer.style.display =
    tipo === "multipla_escolha" ? "block" : "none";
  certoErradoContainer.style.display =
    tipo === "certo_errado" ? "block" : "none";

  if (tipo === "multipla_escolha" && opcoesList.children.length === 0) {
    // Não adiciona automaticamente if estivermos no meio de um processamento de texto
    if (opcoesList.children.length === 0) {
      adicionarOpcao();
    }
  }
});

/**
 * Adiciona um campo de opção de resposta para Múltipla Escolha.
 * @param {string} texto - O texto da opção (opcional).
 * @param {boolean} isCorreta - Se a opção é a correta (opcional).
 */
function adicionarOpcao(texto = "", isCorreta = false) {
  const index = opcoesList.children.length;
  const div = document.createElement("div");
  div.classList.add("opcao-item-form");
  div.innerHTML = `
        <input type="text" name="opcao_texto_${index}" value="${texto}" placeholder="Texto da Opção" required>
        <label>
            <input type="radio" name="opcao_correta" value="${index}" ${
    isCorreta ? "checked" : ""
  }>
            Correta
        </label>
        <button type="button" class="btn-icon delete-option">
            <i class="fas fa-trash"></i>
        </button>
    `;
  div.querySelector(".delete-option").addEventListener("click", () => {
    div.remove();
  });
  opcoesList.appendChild(div);
}

btnAdicionarOpcao.addEventListener("click", () => adicionarOpcao());

/**
 * Salva ou atualiza a questão no Supabase.
 */
formQuestao.addEventListener("submit", async (e) => {
  e.preventDefault();

  const enunciado = enunciadoEditor.innerHTML.trim();
  const tipo = formQuestao.tipo.value;
  const dificuldade = formQuestao.dificuldade.value;
  const materia = formQuestao.materia.value;
  const assunto = formQuestao.assunto.value;
  const banca = formQuestao.banca.value;

  if (!enunciado || !tipo) {
    alert("Preencha o enunciado e o tipo da questão.");
    return;
  }

  let questaoData = { enunciado, tipo, dificuldade, materia, assunto, banca };
  let opcoesData = [];

  if (tipo === "multipla_escolha") {
    const opcoes = opcoesList.querySelectorAll(".opcao-item-form");
    const opcaoCorretaIndex = formQuestao.opcao_correta.value;

    if (opcoes.length < 2 || opcaoCorretaIndex === undefined) {
      alert(
        "Questões de Múltipla Escolha precisam de pelo menos 2 opções e uma correta."
      );
      return;
    }

    opcoes.forEach((opcao, index) => {
      const texto = opcao.querySelector('input[type="text"]').value;
      opcoesData.push({
        texto_opcao: texto,
        is_correta: index.toString() === opcaoCorretaIndex,
      });
    });
  } else if (tipo === "certo_errado") {
    const respostaCorreta = formQuestao.resposta_correta.value;
    if (!respostaCorreta) {
      alert("Selecione a resposta correta para a questão Certo/Errado.");
      return;
    }
    questaoData.resposta_certo_errado = respostaCorreta;
  }

  try {
    let result;
    if (questaoEmEdicaoId) {
      // Atualizar Questão
      result = await supabaseClient
        .from("questoes")
        .update(questaoData)
        .eq("id", questaoEmEdicaoId)
        .select();

      // Se for Múltipla Escolha, atualiza as opções
      if (tipo === "multipla_escolha") {
        // 1. Excluir opções antigas
        await supabaseClient
          .from("opcoes_multipla_escolha")
          .delete()
          .eq("questao_id", questaoEmEdicaoId);

        // 2. Inserir novas opções
        const opcoesComId = opcoesData.map((op) => ({
          ...op,
          questao_id: questaoEmEdicaoId,
        }));
        await supabaseClient
          .from("opcoes_multipla_escolha")
          .insert(opcoesComId);
      }
    } else {
      // Inserir Nova Questão
      result = await supabaseClient
        .from("questoes")
        .insert([questaoData])
        .select();

      const novaQuestaoId = result.data[0].id;

      // Se for Múltipla Escolha, insere as opções
      if (tipo === "multipla_escolha") {
        const opcoesComId = opcoesData.map((op) => ({
          ...op,
          questao_id: novaQuestaoId,
        }));
        await supabaseClient
          .from("opcoes_multipla_escolha")
          .insert(opcoesComId);
      }
    }

    if (result.error) throw result.error;

    modalQuestao.classList.remove("active");
    carregarQuestao(); // Recarrega a lista de questões
    alert("Questão salva com sucesso!");
  } catch (error) {
    console.error("Erro ao salvar questão:", error);
    alert("Erro ao salvar questão: " + error.message);
  }
});

/**
 * Abre o modal para editar uma questão existente.
 * @param {string} id - O ID da questão a ser editada.
 */
async function editarQuestao(id) {
  try {
    const { data: questao, error } = await supabaseClient
      .from("questoes")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    questaoEmEdicaoId = id;
    modalTitle.textContent = "Editar Questão";
    formQuestao.reset();

    // Preenche os campos
    enunciadoEditor.innerHTML = questao.enunciado;
    formQuestao.tipo.value = questao.tipo;
    formQuestao.dificuldade.value = questao.dificuldade || "";
    formQuestao.materia.value = questao.materia || "";
    formQuestao.assunto.value = questao.assunto || "";
    formQuestao.banca.value = questao.banca || "";

    // Dispara o evento para atualizar a exibição dos campos de resposta
    selectTipo.dispatchEvent(new Event("change"));

    opcoesList.innerHTML = ""; // Limpa as opções antigas

    if (questao.tipo === "multipla_escolha") {
      const { data: opcoes, error: opcoesError } = await supabaseClient
        .from("opcoes_multipla_escolha")
        .select("*")
        .eq("questao_id", id);

      if (opcoesError) throw opcoesError;

      opcoes.forEach((opcao) => {
        adicionarOpcao(opcao.texto_opcao, opcao.is_correta);
      });
    } else if (questao.tipo === "certo_errado") {
      const radio = formQuestao.querySelector(
        `input[name="resposta_correta"][value="${questao.resposta_certo_errado}"]`
      );
      if (radio) radio.checked = true;
    }

    modalQuestao.classList.add("active");
  } catch (error) {
    console.error("Erro ao carregar questão para edição:", error);
    alert("Erro ao carregar questão para edição: " + error.message);
  }
}

/**
 * Verifica se a questão tem dependências antes de excluir
 */
async function verificarDependenciasQuestao(questaoId) {
  try {
    // Verifica se existem respostas de quiz
    const { data: respostas, error: respostasError } = await supabaseClient
      .from("respostas_quiz")
      .select("id")
      .eq("questao_id", questaoId)
      .limit(1);

    if (respostasError) throw respostasError;

    return {
      temRespostasQuiz: respostas && respostas.length > 0,
      totalRespostas: respostas ? respostas.length : 0,
    };
  } catch (error) {
    console.error("Erro ao verificar dependências:", error);
    return { temRespostasQuiz: false, totalRespostas: 0 };
  }
}

/**
 * Exibe o modal de confirmação para exclusão com informações sobre dependências.
 */
async function confirmarExclusao(id) {
  try {
    const dependencias = await verificarDependenciasQuestao(id);

    if (dependencias.temRespostasQuiz) {
      const confirmar = confirm(
        `Esta questão possui ${dependencias.totalRespostas} resposta(s) de quiz vinculada(s). ` +
          `Ao excluir, todas as respostas associadas também serão removidas. ` +
          `Deseja continuar?`
      );

      if (!confirmar) return;
    }

    questaoParaExcluirId = id;
    modalConfirmacao.classList.add("active");
  } catch (error) {
    console.error("Erro ao verificar dependências:", error);
    // Se houver erro na verificação, prossegue com a exclusão normal
    questaoParaExcluirId = id;
    modalConfirmacao.classList.add("active");
  }
}

/**
 * Lógica de exclusão da questão.
 */
btnConfirmarExclusao.addEventListener("click", async () => {
  if (!questaoParaExcluirId) return;

  try {
    // 1. PRIMEIRO: Excluir as respostas do quiz associadas
    const { error: respostasError } = await supabaseClient
      .from("respostas_quiz")
      .delete()
      .eq("questao_id", questaoParaExcluirId);

    if (respostasError) throw respostasError;

    // 2. SEGUNDO: Excluir as opções de múltipla escolha (se houver)
    const { error: opcoesError } = await supabaseClient
      .from("opcoes_multipla_escolha")
      .delete()
      .eq("questao_id", questaoParaExcluirId);

    if (opcoesError) throw opcoesError;

    // 3. TERCEIRO: Excluir a questão
    const { error } = await supabaseClient
      .from("questoes")
      .delete()
      .eq("id", questaoParaExcluirId);

    if (error) throw error;

    modalConfirmacao.classList.remove("active");
    carregarQuestao(); // Recarrega a lista
    alert("Questão excluída com sucesso!");
  } catch (error) {
    console.error("Erro ao excluir questão:", error);

    // Mensagem mais amigável para o usuário
    if (error.code === "23503") {
      alert(
        "Não foi possível excluir a questão. Ela está vinculada a respostas de quiz. Tente novamente ou contate o administrador."
      );
    } else {
      alert("Erro ao excluir questão: " + error.message);
    }
  }
});

/**
 * Fecha o modal de confirmação.
 */
btnCancelarExclusao.addEventListener("click", () => {
  modalConfirmacao.classList.remove("active");
  questaoParaExcluirId = null;
});

// 6. Lógica de Carregamento e Renderização de Questões (CRUD - Read)

/**
 * Cria o HTML para um card de questão.
 * @param {object} questao - O objeto da questão.
 * @param {Array<object>} opcoes - As opções de resposta (se for Múltipla Escolha).
 * @returns {string} O HTML do card.
 */
function criarCardQuestao(questao, opcoes = []) {
  const tipoClass =
    questao.tipo === "multipla_escolha" ? "multipla-escolha" : "certo-errado";
  const tipoTexto =
    questao.tipo === "multipla_escolha"
      ? "Múltipla Escolha"
      : "Certo ou Errado";

  let opcoesHtml = "";
  if (questao.tipo === "multipla_escolha") {
    opcoesHtml = opcoes
      .map(
        (opcao) => `
            <div class="opcao-item ${opcao.is_correta ? "correta" : ""}">
                ${opcao.texto_opcao}
            </div>
        `
      )
      .join("");
  } else if (questao.tipo === "certo_errado") {
    opcoesHtml = `
            <div class="opcao-item correta">
                Resposta Correta: ${questao.resposta_certo_errado}
            </div>
        `;
  }

  return `
        <div class="questao-card" data-id="${questao.id}">
            <div class="questao-header">
                <span class="questao-tipo ${tipoClass}">${tipoTexto}</span>
                <div class="questao-actions">
                    <button class="btn-icon edit" data-id="${questao.id}">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete" data-id="${questao.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="questao-meta">
                ${
                  questao.materia
                    ? `<span class="meta-tag">${questao.materia}</span>`
                    : ""
                }
                ${
                  questao.assunto
                    ? `<span class="meta-tag">${questao.assunto}</span>`
                    : ""
                }
                ${
                  questao.banca
                    ? `<span class="meta-tag">${questao.banca}</span>`
                    : ""
                }
                ${
                  questao.dificuldade
                    ? `<span class="meta-tag">${questao.dificuldade.toUpperCase()}</span>`
                    : ""
                }
            </div>
            <div class="questao-enunciado">
                ${questao.enunciado.substring(0, 150)}...
            </div>
            <div class="questao-opcoes">
                ${opcoesHtml}
            </div>
        </div>
    `;
}

/**
 * Carrega e exibe as questões do Supabase.
 */
async function carregarQuestao() {
  questoesGrid.innerHTML = "Carregando questões...";

  // Aplica filtros
  const filtroMateria = document.getElementById("filtro-materia").value;
  const filtroAssunto = document.getElementById("filtro-assunto").value;
  const filtroDificuldade = document.getElementById("filtro-dificuldade").value;
  const filtroBanca = document.getElementById("filtro-banca").value;

  let query = supabaseClient
    .from("questoes")
    .select("*")
    .order("data_criacao", { ascending: false });

  if (filtroMateria) query = query.eq("materia", filtroMateria);
  if (filtroAssunto) query = query.eq("assunto", filtroAssunto);
  if (filtroDificuldade) query = query.eq("dificuldade", filtroDificuldade);
  if (filtroBanca) query = query.eq("banca", filtroBanca);

  try {
    const { data: questoes, error } = await query;

    if (error) throw error;

    questoesGrid.innerHTML = "";

    if (questoes.length === 0) {
      questoesGrid.innerHTML = "<p>Nenhuma questão encontrada.</p>";
      return;
    }

    // Busca as opções para todas as questões de múltipla escolha em uma única query
    const idsMultiplaEscolha = questoes
      .filter((q) => q.tipo === "multipla_escolha")
      .map((q) => q.id);

    let opcoesMap = new Map();
    if (idsMultiplaEscolha.length > 0) {
      const { data: opcoes, error: opcoesError } = await supabaseClient
        .from("opcoes_multipla_escolha")
        .select("*")
        .in("questao_id", idsMultiplaEscolha);

      if (opcoesError) throw opcoesError;

      opcoes.forEach((opcao) => {
        if (!opcoesMap.has(opcao.questao_id)) {
          opcoesMap.set(opcao.questao_id, []);
        }
        opcoesMap.get(opcao.questao_id).push(opcao);
      });
    }

    // Renderiza os cards
    questoes.forEach((questao) => {
      const opcoes = opcoesMap.get(questao.id) || [];
      questoesGrid.innerHTML += criarCardQuestao(questao, opcoes);
    });

    // Atualiza os filtros de seleção (datalists e selects)
    atualizarFiltros(questoes);
  } catch (error) {
    console.error("Erro ao carregar questões:", error);
    questoesGrid.innerHTML =
      "<p>Erro ao carregar questões. Verifique a conexão com o Supabase e as políticas RLS.</p>";
  }
}

/**
 * Atualiza as opções dos selects e datalists de filtro.
 * @param {Array<object>} questoes - A lista de questões para extrair os valores.
 */
function atualizarFiltros(questoes) {
  const materias = [...new Set(questoes.map((q) => q.materia).filter(Boolean))];
  const assuntos = [...new Set(questoes.map((q) => q.assunto).filter(Boolean))];
  const bancas = [...new Set(questoes.map((q) => q.banca).filter(Boolean))];

  const selects = [
    { id: "filtro-materia", values: materias },
    { id: "filtro-assunto", values: assuntos },
    { id: "filtro-banca", values: bancas },
    { id: "quiz-filtro-materia", values: materias },
    { id: "quiz-filtro-assunto", values: assuntos },
    { id: "quiz-filtro-banca", values: bancas },
  ];

  selects.forEach((item) => {
    const select = document.getElementById(item.id);
    if (select) {
      const currentValue = select.value;
      // Limpa todas as opções, exceto a primeira (Todas as...)
      while (select.options.length > 1) {
        select.remove(1);
      }
      // Adiciona as novas opções
      item.values.forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        option.textContent = value;
        select.appendChild(option);
      });
      // Tenta restaurar o valor selecionado
      select.value = currentValue;
    }
  });

  // Atualiza os datalists do modal de criação/edição
  const datalists = [
    { id: "materias-list", values: materias },
    { id: "assuntos-list", values: assuntos },
    { id: "bancas-list", values: bancas },
  ];

  datalists.forEach((item) => {
    const datalist = document.getElementById(item.id);
    if (datalist) {
      datalist.innerHTML = "";
      item.values.forEach((value) => {
        const option = document.createElement("option");
        option.value = value;
        datalist.appendChild(option);
      });
    }
  });
}

// 7. Lógica de Filtros
document.querySelectorAll(".filters .filter-select").forEach((select) => {
  select.addEventListener("change", carregarQuestao);
});

// Inicialização
document.addEventListener("DOMContentLoaded", () => {
  // Garante que a seção de Questões esteja ativa ao carregar
  switchSection("questoes");
});

// 8. Lógica do Quiz (Responder Questões)

/**
 * Inicia o quiz, carregando as questões com base nos filtros.
 */
async function iniciarQuiz() {
  quizContainer.innerHTML = "<p>Carregando questões...</p>";
  btnIniciarQuiz.style.display = "none";
  btnProximaQuestao.style.display = "none";
  btnQuestaoAnterior.style.display = "none";

  // NÃO reiniciamos as respostas aqui - elas são mantidas do localStorage
  questaoAtualIndex = 0;

  let query = supabaseClient.from("questoes").select("*");

  if (quizFiltroMateria.value)
    query = query.eq("materia", quizFiltroMateria.value);
  if (quizFiltroAssunto.value)
    query = query.eq("assunto", quizFiltroAssunto.value);
  if (quizFiltroBanca.value) query = query.eq("banca", quizFiltroBanca.value);

  try {
    const { data: questoes, error } = await query;

    if (error) throw error;

    if (questoes.length === 0) {
      quizContainer.innerHTML =
        "<p>Nenhuma questão encontrada com os filtros selecionados.</p>";
      btnIniciarQuiz.style.display = "inline-flex";
      return;
    }

    questoesQuiz = questoes;
    questaoAtualIndex = 0;

    // Busca as opções para todas as questões de múltipla escolha
    const idsMultiplaEscolha = questoes
      .filter((q) => q.tipo === "multipla_escolha")
      .map((q) => q.id);

    let opcoesMap = new Map();
    if (idsMultiplaEscolha.length > 0) {
      const { data: opcoes, error: opcoesError } = await supabaseClient
        .from("opcoes_multipla_escolha")
        .select("*")
        .in("questao_id", idsMultiplaEscolha);

      if (opcoesError) throw opcoesError;

      opcoes.forEach((opcao) => {
        if (!opcoesMap.has(opcao.questao_id)) {
          opcoesMap.set(opcao.questao_id, []);
        }
        opcoesMap.get(opcao.questao_id).push(opcao);
      });
    }

    // Armazena as opções nas questões
    questoesQuiz.forEach((questao) => {
      questao.opcoes = opcoesMap.get(questao.id) || [];
    });

    exibirQuestaoQuiz();
  } catch (error) {
    console.error("Erro ao carregar questões para o quiz:", error);
    quizContainer.innerHTML =
      "<p>Erro ao carregar questões. Tente novamente.</p>";
    btnIniciarQuiz.style.display = "inline-flex";
  }
}

/**
 * Exibe a questão atual do quiz.
 */
function exibirQuestaoQuiz() {
  if (questaoAtualIndex >= questoesQuiz.length) {
    mostrarResumoQuiz();
    return;
  }

  questaoAtual = questoesQuiz[questaoAtualIndex];

  // Verificar se já respondeu esta questão anteriormente (por ID)
  const respostaAnterior = respostasUsuario[questaoAtual.id];
  let feedbackHtml = "";

  if (respostaAnterior) {
    feedbackHtml = respostaAnterior.acertou
      ? '<div class="feedback-acerto">✓ Acertou!</div>'
      : '<div class="feedback-erro">✗ Errou!</div>';
  }

  let html = `
        <div class="quiz-progress">
            <p>Questão ${questaoAtualIndex + 1} de ${questoesQuiz.length}</p>
        </div>
        ${feedbackHtml}
        <div class="quiz-question">
            ${questaoAtual.enunciado}
        </div>
    `;

  // SEMPRE mostrar as opções, SEM marcar nenhuma
  if (questaoAtual.tipo === "multipla_escolha") {
    html += '<div class="quiz-options">';
    questaoAtual.opcoes.forEach((opcao, index) => {
      // NÃO adicionar classes de marcação - alternativas sempre limpas
      html += `
                <div class="quiz-option" data-index="${index}" data-correta="${opcao.is_correta}">
                    ${opcao.texto_opcao}
                </div>
            `;
    });
    html += "</div>";
  } else if (questaoAtual.tipo === "certo_errado") {
    // NÃO marcar nenhuma opção - sempre limpas
    html += `
            <div class="quiz-options">
                <div class="quiz-option" data-resposta="Certo" data-correta="${
                  questaoAtual.resposta_certo_errado === "Certo"
                }">
                    Certo
                </div>
                <div class="quiz-option" data-resposta="Errado" data-correta="${
                  questaoAtual.resposta_certo_errado === "Errado"
                }">
                    Errado
                </div>
            </div>
        `;
  }

  quizContainer.innerHTML = html;

  // Controlar visibilidade dos botões
  btnQuestaoAnterior.style.display =
    questaoAtualIndex > 0 ? "inline-flex" : "none";
  btnProximaQuestao.style.display = "inline-flex";

  // SEMPRE adicionar listeners para as opções (permite responder novamente)
  document.querySelectorAll(".quiz-option").forEach((option) => {
    option.addEventListener("click", () => {
      selecionarOpcaoQuiz(option);
    });
  });
}

/**
 * Marca a opção selecionada e mostra se está correta ou incorreta.
 */
function selecionarOpcaoQuiz(element) {
  // Remove a seleção anterior
  document.querySelectorAll(".quiz-option").forEach((opt) => {
    opt.classList.remove("selected", "correct", "incorrect");
  });

  const isCorreta = element.getAttribute("data-correta") === "true";

  // Armazena a resposta do usuário pelo ID da questão
  const resposta = {
    acertou: isCorreta,
    opcaoIndex: element.getAttribute("data-index"),
    resposta: element.getAttribute("data-resposta"),
  };

  respostasUsuario[questaoAtual.id] = resposta;
  // Salva no localStorage
  localStorage.setItem("respostasUsuario", JSON.stringify(respostasUsuario));

  if (isCorreta) {
    element.classList.add("correct");
  } else {
    element.classList.add("incorrect");
    // Mostra a resposta correta
    document.querySelectorAll(".quiz-option").forEach((opt) => {
      if (opt.getAttribute("data-correta") === "true") {
        opt.classList.add("correct");
      }
    });
  }

  element.classList.add("selected");

  // Atualiza o feedback imediatamente
  const feedbackHtml = isCorreta
    ? '<div class="feedback-acerto">✓ Acertou!</div>'
    : '<div class="feedback-erro">✗ Errou!</div>';

  // Remove feedback anterior se existir
  const feedbackAnterior = document.querySelector(
    ".feedback-acerto, .feedback-erro"
  );
  if (feedbackAnterior) {
    feedbackAnterior.remove();
  }

  // Adiciona o novo feedback
  const quizQuestion = document.querySelector(".quiz-question");
  if (quizQuestion) {
    quizQuestion.insertAdjacentHTML("beforebegin", feedbackHtml);
  }
}

/**
 * Vai para a questão anterior no quiz.
 */
function questaoAnterior() {
  if (questaoAtualIndex > 0) {
    questaoAtualIndex--;
    exibirQuestaoQuiz();
  }
}

/**
 * Vai para a próxima questão no quiz.
 */
function proximaQuestao() {
  if (questaoAtualIndex < questoesQuiz.length - 1) {
    questaoAtualIndex++;
    exibirQuestaoQuiz();
  } else {
    // Última questão - mostrar resumo
    mostrarResumoQuiz();
  }
}

/**
 * Mostra o resumo do quiz com estatísticas.
 */
function mostrarResumoQuiz() {
  const totalQuestoes = questoesQuiz.length;
  const acertos = Object.values(respostasUsuario).filter(
    (r) => r.acertou
  ).length;
  const erros = totalQuestoes - acertos;

  // Calcular estatísticas por matéria e assunto
  const estatisticas = calcularEstatisticas();

  let html = `
        <div class="quiz-resumo">
            <h3>Quiz Concluído!</h3>
            <div class="resumo-geral">
                <div class="stat-item">
                    <span class="stat-label">Total de Questões:</span>
                    <span class="stat-value">${totalQuestoes}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Acertos:</span>
                    <span class="stat-value success">${acertos}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Erros:</span>
                    <span class="stat-value error">${erros}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Percentual de Acerto:</span>
                    <span class="stat-value">${(
                      (acertos / totalQuestoes) *
                      100
                    ).toFixed(1)}%</span>
                </div>
            </div>
            
            <div class="resumo-detalhado">
                <h4>Desempenho por Matéria e Assunto</h4>
                ${estatisticas}
            </div>
            
            <div class="resumo-botoes">
                <button class="btn btn-primary" id="btn-reiniciar-quiz">
                    <i class="fas fa-redo"></i> Reiniciar Quiz
                </button>
                <button class="btn btn-outline" id="btn-limpar-respostas">
                    <i class="fas fa-trash"></i> Limpar Respostas Salvas
                </button>
            </div>
        </div>
    `;

  quizContainer.innerHTML = html;
  btnProximaQuestao.style.display = "none";
  btnQuestaoAnterior.style.display = "none";

  document
    .getElementById("btn-reiniciar-quiz")
    .addEventListener("click", () => {
      questaoAtualIndex = 0;
      exibirQuestaoQuiz();
    });

  document
    .getElementById("btn-limpar-respostas")
    .addEventListener("click", () => {
      if (
        confirm(
          "Tem certeza que deseja limpar todas as respostas salvas? Esta ação não pode ser desfeita."
        )
      ) {
        localStorage.removeItem("respostasUsuario");
        respostasUsuario = {};
        alert("Respostas limpas com sucesso!");
        mostrarResumoQuiz(); // Recarrega o resumo
      }
    });
}

/**
 * Calcula estatísticas por matéria e assunto.
 */
function calcularEstatisticas() {
  const estatisticas = {};

  questoesQuiz.forEach((questao, index) => {
    const resposta = respostasUsuario[questao.id];
    if (!resposta) return; // Só conta questões respondidas

    const materia = questao.materia || "Sem matéria";
    const assunto = questao.assunto || "Sem assunto";

    if (!estatisticas[materia]) {
      estatisticas[materia] = {};
    }

    if (!estatisticas[materia][assunto]) {
      estatisticas[materia][assunto] = { total: 0, erros: 0 };
    }

    estatisticas[materia][assunto].total++;
    if (!resposta.acertou) {
      estatisticas[materia][assunto].erros++;
    }
  });

  let html = "";
  Object.keys(estatisticas).forEach((materia) => {
    html += `<div class="materia-stats"><strong>${materia}</strong>`;
    Object.keys(estatisticas[materia]).forEach((assunto) => {
      const stats = estatisticas[materia][assunto];
      const percentualErro =
        stats.total > 0 ? ((stats.erros / stats.total) * 100).toFixed(1) : 0;
      html += `
                <div class="assunto-stat">
                    <span>${assunto}:</span>
                    <span>${stats.erros} erro(s) de ${stats.total} (${percentualErro}%)</span>
                </div>
            `;
    });
    html += "</div>";
  });

  return (
    html ||
    "<p>Nenhuma estatística disponível. Responda algumas questões primeiro.</p>"
  );
}

/**
 * Inicia o quiz ao clicar no botão.
 */
btnIniciarQuiz.addEventListener("click", iniciarQuiz);

/**
 * Vai para a próxima questão.
 */
btnProximaQuestao.addEventListener("click", proximaQuestao);

/**
 * Vai para a questão anterior.
 */
btnQuestaoAnterior.addEventListener("click", questaoAnterior);

// 9. Lógica do Dashboard

const dashboardGrid = document.getElementById("dashboard-grid");
const btnAtualizarDashboard = document.getElementById(
  "btn-atualizar-dashboard"
);

/**
 * Carrega e exibe as estatísticas do dashboard.
 */
async function carregarDashboard() {
  dashboardGrid.innerHTML = "Carregando estatísticas...";

  try {
    const { data: questoes, error } = await supabaseClient
      .from("questoes")
      .select("*");

    if (error) throw error;

    const totalQuestoes = questoes.length;
    const multiplaEscolha = questoes.filter(
      (q) => q.tipo === "multipla_escolha"
    ).length;
    const certoErrado = questoes.filter(
      (q) => q.tipo === "certo_errado"
    ).length;

    const materias = [
      ...new Set(questoes.map((q) => q.materia).filter(Boolean)),
    ];
    const assuntos = [
      ...new Set(questoes.map((q) => q.assunto).filter(Boolean)),
    ];

    // Calcular estatísticas REAIS baseadas nas respostas salvas
    const estatisticasReais = calcularEstatisticasReais(questoes);

    dashboardGrid.innerHTML = `
            <div class="dashboard-card">
                <h3>Resumo Geral</h3>
                <div class="stat-item">
                    <span class="stat-label">Total de Questões</span>
                    <span class="stat-value">${totalQuestoes}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Múltipla Escolha</span>
                    <span class="stat-value">${multiplaEscolha}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Certo ou Errado</span>
                    <span class="stat-value">${certoErrado}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Questões Respondidas</span>
                    <span class="stat-value">${
                      estatisticasReais.totalRespondidas
                    }</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Taxa de Acerto Geral</span>
                    <span class="stat-value ${
                      estatisticasReais.taxaAcerto >= 70
                        ? "success"
                        : estatisticasReais.taxaAcerto >= 50
                        ? "warning"
                        : "error"
                    }">${estatisticasReais.taxaAcerto}%</span>
                </div>
            </div>

            <div class="dashboard-card">
                <h3>Matérias</h3>
                ${materias
                  .map(
                    (materia) =>
                      `<div class="stat-item">
                    <span class="stat-label">${materia}</span>
                    <span class="stat-value">${
                      questoes.filter((q) => q.materia === materia).length
                    }</span>
                </div>`
                  )
                  .join("")}
            </div>

            <div class="dashboard-card">
                <h3>Estatísticas de Desempenho</h3>
                <div class="stat-item">
                    <span class="stat-label">Total de Acertos</span>
                    <span class="stat-value success">${
                      estatisticasReais.totalAcertos
                    }</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Total de Erros</span>
                    <span class="stat-value error">${
                      estatisticasReais.totalErros
                    }</span>
                </div>
                <div class="stat-subtitle">Desempenho por Matéria:</div>
                ${estatisticasReais.porMateria
                  .map(
                    (item) => `
                    <div class="stat-item">
                        <span class="stat-label">${item.materia}</span>
                        <span class="stat-value ${
                          item.taxaAcerto >= 70
                            ? "success"
                            : item.taxaAcerto >= 50
                            ? "warning"
                            : "error"
                        }">${item.taxaAcerto}% (${item.acertos}/${
                      item.total
                    })</span>
                    </div>
                `
                  )
                  .join("")}
                <div class="stat-subtitle">Desempenho por Assunto:</div>
                ${estatisticasReais.porAssunto
                  .slice(0, 5)
                  .map(
                    (item) => `
                    <div class="stat-item">
                        <span class="stat-label">${item.assunto}</span>
                        <span class="stat-value ${
                          item.taxaAcerto >= 70
                            ? "success"
                            : item.taxaAcerto >= 50
                            ? "warning"
                            : "error"
                        }">${item.taxaAcerto}% (${item.acertos}/${
                      item.total
                    })</span>
                    </div>
                `
                  )
                  .join("")}
                ${
                  estatisticasReais.porAssunto.length > 5
                    ? '<div class="stat-more">...</div>'
                    : ""
                }
            </div>
            
            <div class="dashboard-card">
                <h3>Áreas que Precisam de Revisão</h3>
                ${
                  estatisticasReais.areasRevisao.length > 0
                    ? estatisticasReais.areasRevisao
                        .map(
                          (item) => `
                    <div class="stat-item">
                        <span class="stat-label">${item.materia} - ${item.assunto}</span>
                        <span class="stat-value error">${item.taxaAcerto}% de acerto</span>
                    </div>
                  `
                        )
                        .join("")
                    : '<p class="no-data">Nenhuma área identificada para revisão. Continue assim!</p>'
                }
            </div>
        `;
  } catch (error) {
    console.error("Erro ao carregar dashboard:", error);
    dashboardGrid.innerHTML =
      "<p>Erro ao carregar estatísticas. Tente novamente.</p>";
  }
}

/**
 * Calcula estatísticas REAIS baseadas nas respostas salvas
 */
function calcularEstatisticasReais(questoes) {
  const desempenhoPorMateria = {};
  const desempenhoPorAssunto = {};
  let totalAcertos = 0;
  let totalErros = 0;
  let totalRespondidas = 0;

  // Processar todas as questões
  questoes.forEach((questao) => {
    const resposta = respostasUsuario[questao.id];
    if (!resposta) return; // Só conta questões respondidas

    const materia = questao.materia || "Sem matéria";
    const assunto = questao.assunto || "Sem assunto";

    // Inicializar contadores por matéria
    if (!desempenhoPorMateria[materia]) {
      desempenhoPorMateria[materia] = { total: 0, acertos: 0, erros: 0 };
    }

    // Inicializar contadores por assunto
    if (!desempenhoPorAssunto[assunto]) {
      desempenhoPorAssunto[assunto] = { total: 0, acertos: 0, erros: 0 };
    }

    // Atualizar contadores
    desempenhoPorMateria[materia].total++;
    desempenhoPorAssunto[assunto].total++;

    if (resposta.acertou) {
      desempenhoPorMateria[materia].acertos++;
      desempenhoPorAssunto[assunto].acertos++;
      totalAcertos++;
    } else {
      desempenhoPorMateria[materia].erros++;
      desempenhoPorAssunto[assunto].erros++;
      totalErros++;
    }

    totalRespondidas++;
  });

  // Calcular taxas de acerto e preparar dados para exibição
  const porMateria = Object.keys(desempenhoPorMateria)
    .map((materia) => {
      const stats = desempenhoPorMateria[materia];
      const taxaAcerto =
        stats.total > 0 ? Math.round((stats.acertos / stats.total) * 100) : 0;
      return {
        materia,
        ...stats,
        taxaAcerto,
      };
    })
    .sort((a, b) => a.taxaAcerto - b.taxaAcerto); // Ordenar por pior desempenho

  const porAssunto = Object.keys(desempenhoPorAssunto)
    .map((assunto) => {
      const stats = desempenhoPorAssunto[assunto];
      const taxaAcerto =
        stats.total > 0 ? Math.round((stats.acertos / stats.total) * 100) : 0;
      return {
        assunto,
        ...stats,
        taxaAcerto,
      };
    })
    .sort((a, b) => a.taxaAcerto - b.taxaAcerto); // Ordenar por pior desempenho

  // Identificar áreas que precisam de revisão (taxa de acerto < 60%)
  const areasRevisao = [];
  porMateria.forEach((item) => {
    if (item.taxaAcerto < 60 && item.total >= 3) {
      // Pelo menos 3 questões para considerar
      areasRevisao.push({
        materia: item.materia,
        assunto: "Geral",
        taxaAcerto: item.taxaAcerto,
      });
    }
  });

  porAssunto.forEach((item) => {
    if (item.taxaAcerto < 60 && item.total >= 2) {
      // Pelo menos 2 questões para considerar
      areasRevisao.push({
        materia: "Várias",
        assunto: item.assunto,
        taxaAcerto: item.taxaAcerto,
      });
    }
  });

  // Calcular taxa de acerto geral
  const taxaAcertoGeral =
    totalRespondidas > 0
      ? Math.round((totalAcertos / totalRespondidas) * 100)
      : 0;

  return {
    totalAcertos,
    totalErros,
    totalRespondidas,
    taxaAcerto: taxaAcertoGeral,
    porMateria,
    porAssunto,
    areasRevisao: areasRevisao.slice(0, 5), // Limitar a 5 áreas
  };
}

btnAtualizarDashboard.addEventListener("click", carregarDashboard);

// Delegação de eventos para editar e deletar questões (ATUALIZADA)
document.addEventListener("click", async (e) => {
  // Editar questão
  if (e.target.closest(".btn-icon.edit")) {
    const id = e.target.closest(".btn-icon.edit").getAttribute("data-id");
    editarQuestao(id);
  }

  // Deletar questão (AGORA CHAMA A FUNÇÃO APRIMORADA)
  if (e.target.closest(".btn-icon.delete")) {
    const id = e.target.closest(".btn-icon.delete").getAttribute("data-id");
    await confirmarExclusao(id); // Adiciona await pois a função agora é async
  }
});

// Recarregar página do quiz
document.getElementById("btn-recarregar-quiz").addEventListener("click", () => {
  location.reload();
});
