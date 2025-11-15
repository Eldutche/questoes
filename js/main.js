// main_modified.js
// Versão melhorada do main.js com OCR pré-processamento para Tesseract.js
// Gereada pelo assistente — substitua seu main.js por este arquivo.
// OBS: o HTML deve incluir <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
// e manter os elementos com os mesmos IDs usados aqui.

const SUPABASE_URL = "https://ubbbupjezikuucchcfcq.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InViYmJ1cGplemlrdXVjY2hjZmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI3MTg2MjQsImV4cCI6MjA3ODI5NDYyNH0.w9HotY4R6Yfh2y3pWoab9VQ1gQN4VstNpvRBgCyEEAw";

const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---------------- DOM ELEMENTS ----------------
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

// Quiz elements
const quizContainer = document.getElementById("quiz-container");
const btnIniciarQuiz = document.getElementById("btn-iniciar-quiz");
const btnProximaQuestao = document.getElementById("btn-proxima-questao");
const btnQuestaoAnterior = document.getElementById("btn-questao-anterior");
const quizFiltroMateria = document.getElementById("quiz-filtro-materia");
const quizFiltroAssunto = document.getElementById("quiz-filtro-assunto");
const quizFiltroBanca = document.getElementById("quiz-filtro-banca");

// State
let questoesQuiz = [];
let questaoAtualIndex = 0;
let questaoAtual = null;
let respostasUsuario = JSON.parse(
  localStorage.getItem("respostasUsuario") || "{}"
);

// ---------------- Utilities ----------------

function switchSection(sectionId) {
  sections.forEach((s) => s.classList.remove("active"));
  const target = document.getElementById(sectionId);
  if (target) target.classList.add("active");

  navButtons.forEach((btn) => {
    btn.classList.toggle(
      "active",
      btn.getAttribute("data-section") === sectionId
    );
  });

  if (sectionId === "questoes") carregarQuestao();
  if (sectionId === "dashboard") carregarDashboard && carregarDashboard();
}

// navigation
navButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const sectionId = btn.getAttribute("data-section");
    switchSection(sectionId);
  });
});

// --------------- TEXT PROCESSING FOR QUESTIONS ---------------

function processarTexto() {
  const textoCompleto = enunciadoEditor.innerText.trim();
  if (!textoCompleto) {
    alert("Cole o texto da questão no campo acima antes de processar.");
    return;
  }

  // Remove espaços extras nas quebras
  let texto = textoCompleto.replace(/\r/g, "");
  // Detecta resposta no final: RESPOSTA: E ou GABARITO: E ou RESPOSTA CORRETA: E
  const regexRespostaFinal =
    /(?:RESPOSTA(?:\s*CORRETA)?|GABARITO)\s*[:\-]?\s*(Certo|Errado|[A-Ea-e])\s*$/im;
  const matchRespostaFinal = texto.match(regexRespostaFinal);

  let respostaCorretaLetra = null;
  if (matchRespostaFinal) {
    respostaCorretaLetra = matchRespostaFinal[1];
    texto = texto.replace(regexRespostaFinal, "").trim();
  }

  // Detecta Certo/Errado por palavra-chave simples no final ou presença de "Certo" e "Errado"
  const isCertoErrado =
    /\b(Certo|Errado)\b/i.test(textoCompleto) &&
    /Certo|Errado/i.test(respostaCorretaLetra || "");

  if (isCertoErrado) {
    processarTextoCertouErrado(texto, respostaCorretaLetra);
    return;
  }

  // Tentativa de separar enunciado e alternativas
  // Procura linha que começa com A ou a, seguido de quebra de linha
  const alternativasIndex = texto.search(/\n[Aa]\s*\n/);
  let enunciado = texto;
  let textoAlternativas = "";

  if (alternativasIndex !== -1) {
    // Divide pelo início da primeira alternativa
    const parts = texto.split(/\n(?=[A-Ea-e]\s*\n)/);
    enunciado = parts.shift().trim();
    textoAlternativas = parts.join("\n").trim();
  } else {
    // Tenta detectar padrões A) ou A. ou "A -"
    const matchAltStart = texto.match(/\n([A-Ea-e][\)\.\-])\s*/m);
    if (matchAltStart) {
      const idx = matchAltStart.index;
      enunciado = texto.substring(0, idx).trim();
      textoAlternativas = texto.substring(idx).trim();
    }
  }

  // Extrair alternativas: aceita A, A), A. , A -
  const regexAlternativas =
    /([A-Ea-e])(?:\)|\.|-)?\s*(?:\n)?([\s\S]*?)(?=(?:\n[A-Ea-e](?:\)|\.|-)?\s)|$)/g;
  let matchAlt;
  const alternativas = [];
  while ((matchAlt = regexAlternativas.exec(textoAlternativas)) !== null) {
    const letra = matchAlt[1].toUpperCase();
    let textoAlt = matchAlt[2].trim().replace(/\n+/g, " ");
    alternativas.push({
      letra,
      texto: textoAlt,
      isCorreta: respostaCorretaLetra
        ? letra === respostaCorretaLetra.toString().toUpperCase()
        : false,
    });
  }

  if (alternativas.length < 2) {
    alert(
      "Não foi possível extrair alternativas. Verifique o formato do texto. Tente usar o formato:\n\nEnunciado\nA) Alternativa A\nB) Alternativa B\n...\nRESPOSTA: E"
    );
    return;
  }

  // Preencher o formulário
  enunciadoEditor.innerHTML = enunciado;
  selectTipo.value = "multipla_escolha";
  selectTipo.dispatchEvent(new Event("change"));

  opcoesList.innerHTML = "";
  alternativas.forEach((alt) => adicionarOpcao(alt.texto, alt.isCorreta));

  alert(
    "Texto processado com sucesso! Verifique e complete os campos restantes."
  );
}

function processarTextoCertouErrado(textoSemResposta, respostaCorreta) {
  const enunciado = textoSemResposta
    .replace(/(?:Certo|Errado)[\s\S]*$/i, "")
    .trim();
  enunciadoEditor.innerHTML = enunciado;
  selectTipo.value = "certo_errado";
  selectTipo.dispatchEvent(new Event("change"));

  if (respostaCorreta) {
    const radios = formQuestao.querySelectorAll(
      'input[name="resposta_correta"]'
    );
    radios.forEach((r) => {
      if (r.value.toLowerCase() === respostaCorreta.toLowerCase())
        r.checked = true;
    });
  }

  alert(
    "Questão de Certo/Errado processada. Verifique se a resposta foi marcada corretamente."
  );
}

// ----------------- OCR (Tesseract) with preprocessing -----------------

async function carregarTesseract() {
  return new Promise((resolve, reject) => {
    if (typeof Tesseract !== "undefined") return resolve();
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js";
    script.onload = () => {
      // opcionalmente carregar langdata? para agora basta resolver
      resolve();
    };
    script.onerror = () => reject(new Error("Falha ao carregar Tesseract.js"));
    document.head.appendChild(script);
  });
}

/**
 * Pré-processa a imagem em um canvas: upscale, grayscale, despeckle (básico), binarização adaptativa simples.
 * Retorna o canvas pronto.
 */
async function preprocessImageToCanvas(file, opts = {}) {
  opts = Object.assign({ scale: 2.2, threshold: 160, dpi: 300 }, opts);

  // Cria ImageBitmap para desenhar direto
  let imgBitmap;
  try {
    imgBitmap = await createImageBitmap(file);
  } catch (err) {
    // fallback para FileReader + Image
    const dataURL = await new Promise((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(fr.result);
      fr.onerror = rej;
      fr.readAsDataURL(file);
    });
    const img = await new Promise((res, rej) => {
      const image = new Image();
      image.onload = () => res(image);
      image.onerror = rej;
      image.src = dataURL;
    });
    const canvasTmp = document.createElement("canvas");
    canvasTmp.width = img.width;
    canvasTmp.height = img.height;
    const ctxTmp = canvasTmp.getContext("2d");
    ctxTmp.drawImage(img, 0, 0);
    imgBitmap = await createImageBitmap(canvasTmp);
  }

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = Math.max(800, Math.round(imgBitmap.width * opts.scale));
  canvas.height = Math.max(600, Math.round(imgBitmap.height * opts.scale));

  // Desenha com upscale para melhorar legibilidade
  ctx.drawImage(imgBitmap, 0, 0, canvas.width, canvas.height);

  // Ajustes simples: aumentar contraste/levels (linear stretch)
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  // Primeiro converte para grayscale
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i],
      g = data[i + 1],
      b = data[i + 2];
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    data[i] = data[i + 1] = data[i + 2] = lum;
  }

  // Aplicar um leve filtro de redução de ruído: blur box 3x3 (despeckle)
  const w = canvas.width,
    h = canvas.height;
  const copy = new Uint8ClampedArray(data); // grayscale copy
  const kernel = [-1, -1, -1, -1, 9, -1, -1, -1, -1]; // unsharp-ish kernel
  // Aplicar convolution simples -- para desempenho usamos uma aproximação leve
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let sum = 0;
      let k = 0;
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * w + (x + kx)) * 4;
          sum += copy[idx] * kernel[k++];
        }
      }
      const idxC = (y * w + x) * 4;
      const v = Math.min(255, Math.max(0, sum));
      data[idxC] = data[idxC + 1] = data[idxC + 2] = v;
    }
  }

  // Binarização simples (global threshold) - ajustável
  const threshold = opts.threshold;
  for (let i = 0; i < data.length; i += 4) {
    const v = data[i] > threshold ? 255 : 0;
    data[i] = data[i + 1] = data[i + 2] = v;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas;
}

async function processarImagem() {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/*";

  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const oldContent = enunciadoEditor.innerHTML;
    enunciadoEditor.innerHTML =
      '<div style="text-align:center;padding:1rem;color:var(--text-secondary)"><i class="fas fa-spinner fa-spin"></i> Processando imagem...</div>';

    try {
      if (typeof Tesseract === "undefined") {
        await carregarTesseract();
      }

      // Pré-processamento
      const canvas = await preprocessImageToCanvas(file, {
        scale: 2.2,
        threshold: 160,
      });

      // Mostrar uma miniatura processada no editor (opcional)
      const preview = document.createElement("div");
      preview.style.textAlign = "center";
      preview.style.marginBottom = "0.5rem";
      const dataUrl = canvas.toDataURL("image/png");
      preview.innerHTML = `<img src="${dataUrl}" alt="preview" style="max-width:100%;border:1px solid var(--border-color);border-radius:6px">`;
      enunciadoEditor.innerHTML = "";
      enunciadoEditor.appendChild(preview);

      // OCR com configurações avançadas
      const worker = Tesseract.createWorker({
        logger: (m) => {
          if (m.status === "recognizing text") {
            preview.innerHTML = `<div style="padding:0.5rem;color:var(--text-secondary)"><i class="fas fa-spinner fa-spin"></i> OCR: ${Math.round(
              m.progress * 100
            )}%</div>`;
          }
        },
      });

      await worker.load();
      await worker.loadLanguage("por");
      await worker.initialize("por");
      // Ajustes finos
      await worker.setParameters({
        tessedit_pageseg_mode: "6", // Assume um bloco de texto
        preserve_interword_spaces: "1",
        user_defined_dpi: "300",
        tessedit_char_blacklist: "|[]{}~^•·●",
      });

      const {
        data: { text },
      } = await worker.recognize(canvas);
      await worker.terminate();

      // Inserir resultado no editor
      enunciadoEditor.innerHTML = text.trim();

      alert(
        'Imagem processada com sucesso. Use "Processar Texto" para extrair enunciado e alternativas.'
      );
    } catch (err) {
      console.error("Erro no OCR:", err);
      enunciadoEditor.innerHTML = oldContent;
      alert("Erro ao processar imagem: " + (err.message || err));
    }
  };

  input.click();
}

// Add button to modal (if not present)
function adicionarBotaoProcessarImagem() {
  // Avoid duplicates
  if (document.getElementById("btn-processar-imagem")) return;

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn btn-outline btn-small";
  btn.id = "btn-processar-imagem";
  btn.innerHTML = '<i class="fas fa-image"></i> Processar Imagem';
  btn.addEventListener("click", processarImagem);

  // Find container to append (near enunciado)
  const formGroup = enunciadoEditor ? enunciadoEditor.parentElement : null;
  if (formGroup) {
    const container = formGroup.querySelector(".button-container");
    if (container) container.appendChild(btn);
    else {
      const buttonContainer = document.createElement("div");
      buttonContainer.className = "button-container";
      buttonContainer.style.display = "flex";
      buttonContainer.style.gap = "0.5rem";
      buttonContainer.style.marginTop = "0.5rem";
      buttonContainer.appendChild(btn);
      formGroup.appendChild(buttonContainer);
    }
  }
}

// ----------------- Form helpers -----------------
selectTipo &&
  selectTipo.addEventListener("change", () => {
    const tipo = selectTipo.value;
    if (opcoesContainer)
      opcoesContainer.style.display =
        tipo === "multipla_escolha" ? "block" : "none";
    if (certoErradoContainer)
      certoErradoContainer.style.display =
        tipo === "certo_errado" ? "block" : "none";
    if (
      tipo === "multipla_escolha" &&
      opcoesList &&
      opcoesList.children.length === 0
    ) {
      adicionarOpcao();
    }
  });

function adicionarOpcao(texto = "", isCorreta = false) {
  if (!opcoesList) return;
  const index = opcoesList.children.length;
  const div = document.createElement("div");
  div.classList.add("opcao-item-form");
  div.innerHTML = `
    <input type="text" name="opcao_texto_${index}" value="${texto.replace(
    /"/g,
    "&quot;"
  )}" placeholder="Texto da Opção" required>
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
  div
    .querySelector(".delete-option")
    .addEventListener("click", () => div.remove());
  opcoesList.appendChild(div);
}

btnAdicionarOpcao &&
  btnAdicionarOpcao.addEventListener("click", () => adicionarOpcao());

// ----------------- Save / Update question -----------------
formQuestao &&
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
      const opcaoCorretaIndex =
        formQuestao.opcao_correta && formQuestao.opcao_correta.value;

      if (opcoes.length < 2) {
        alert("Questões de Múltipla Escolha precisam de pelo menos 2 opções.");
        return;
      }

      opcoes.forEach((opcao, index) => {
        const texto = opcao.querySelector('input[type="text"]').value;
        opcoesData.push({
          texto_opcao: texto,
          is_correta: index.toString() === (opcaoCorretaIndex || "0"),
        });
      });
    } else if (tipo === "certo_errado") {
      const respostaCorreta =
        formQuestao.resposta_correta && formQuestao.resposta_correta.value;
      if (!respostaCorreta) {
        alert("Selecione a resposta correta para a questão Certo/Errado.");
        return;
      }
      questaoData.resposta_certo_errado = respostaCorreta;
    }

    try {
      let result;
      if (questaoEmEdicaoId) {
        result = await supabaseClient
          .from("questoes")
          .update(questaoData)
          .eq("id", questaoEmEdicaoId)
          .select();
        if (tipo === "multipla_escolha") {
          await supabaseClient
            .from("opcoes_multipla_escolha")
            .delete()
            .eq("questao_id", questaoEmEdicaoId);
          const opcoesComId = opcoesData.map((op) => ({
            ...op,
            questao_id: questaoEmEdicaoId,
          }));
          await supabaseClient
            .from("opcoes_multipla_escolha")
            .insert(opcoesComId);
        }
      } else {
        result = await supabaseClient
          .from("questoes")
          .insert([questaoData])
          .select();
        const novaQuestaoId =
          result.data && result.data[0] && result.data[0].id;
        if (tipo === "multipla_escolha" && novaQuestaoId) {
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
      carregarQuestao();
      alert("Questão salva com sucesso!");
    } catch (err) {
      console.error("Erro ao salvar:", err);
      alert("Erro ao salvar questão: " + (err.message || err));
    }
  });

// --------------- Load & render questions ---------------

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
        (op) =>
          `<div class="opcao-item ${op.is_correta ? "correta" : ""}">${
            op.texto_opcao
          }</div>`
      )
      .join("");
  } else if (questao.tipo === "certo_errado") {
    opcoesHtml = `<div class="opcao-item correta">Resposta Correta: ${
      questao.resposta_certo_errado || ""
    }</div>`;
  }

  return `
    <div class="questao-card" data-id="${questao.id}">
      <div class="questao-header">
        <span class="questao-tipo ${tipoClass}">${tipoTexto}</span>
        <div class="questao-actions">
          <button class="btn-icon edit" data-id="${
            questao.id
          }"><i class="fas fa-edit"></i></button>
          <button class="btn-icon delete" data-id="${
            questao.id
          }"><i class="fas fa-trash"></i></button>
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
        ${questao.banca ? `<span class="meta-tag">${questao.banca}</span>` : ""}
        ${
          questao.dificuldade
            ? `<span class="meta-tag">${questao.dificuldade.toUpperCase()}</span>`
            : ""
        }
      </div>
      <div class="questao-enunciado">${(questao.enunciado || "").substring(
        0,
        150
      )}...</div>
      <div class="questao-opcoes">${opcoesHtml}</div>
    </div>
  `;
}

async function carregarQuestao() {
  if (!questoesGrid) return;
  questoesGrid.innerHTML = "Carregando questões...";

  const filtroMateria = document.getElementById("filtro-materia").value;
  const filtroAssunto = document.getElementById("filtro-assunto").value;
  const filtroDificuldade = document.getElementById("filtro-dificuldade").value;
  const filtroBanca = document.getElementById("filtro-banca").value;

  try {
    let query = supabaseClient
      .from("questoes")
      .select("*")
      .order("data_criacao", { ascending: false });
    if (filtroMateria) query = query.eq("materia", filtroMateria);
    if (filtroAssunto) query = query.eq("assunto", filtroAssunto);
    if (filtroDificuldade) query = query.eq("dificuldade", filtroDificuldade);
    if (filtroBanca) query = query.eq("banca", filtroBanca);

    const { data: questoes, error } = await query;
    if (error) throw error;
    questoesGrid.innerHTML = "";

    if (!questoes || questoes.length === 0) {
      questoesGrid.innerHTML = "<p>Nenhuma questão encontrada.</p>";
      atualizarFiltros([]);
      return;
    }

    const idsMultipla = questoes
      .filter((q) => q.tipo === "multipla_escolha")
      .map((q) => q.id);
    let opcoesMap = new Map();

    if (idsMultipla.length > 0) {
      const { data: opcoes, error: opErr } = await supabaseClient
        .from("opcoes_multipla_escolha")
        .select("*")
        .in("questao_id", idsMultipla);
      if (opErr) throw opErr;
      opcoes.forEach((op) => {
        if (!opcoesMap.has(op.questao_id)) opcoesMap.set(op.questao_id, []);
        opcoesMap.get(op.questao_id).push(op);
      });
    }

    questoes.forEach((q) => {
      const ops = opcoesMap.get(q.id) || [];
      questoesGrid.innerHTML += criarCardQuestao(q, ops);
    });

    atualizarFiltros(questoes);

    // add event listeners for edit/delete
    document.querySelectorAll(".btn-icon.edit").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const id = btn.getAttribute("data-id");
        abrirEdicaoQuestao(id);
      });
    });
    document.querySelectorAll(".btn-icon.delete").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const id = btn.getAttribute("data-id");
        questaoParaExcluirId = id;
        modalConfirmacao.classList.add("active");
      });
    });
  } catch (err) {
    console.error("Erro ao carregar questões:", err);
    questoesGrid.innerHTML =
      "<p>Erro ao carregar questões. Verifique a conexão.</p>";
  }
}

function atualizarFiltros(questoes) {
  const materias = [
    ...new Set((questoes || []).map((q) => q.materia).filter(Boolean)),
  ];
  const assuntos = [
    ...new Set((questoes || []).map((q) => q.assunto).filter(Boolean)),
  ];
  const bancas = [
    ...new Set((questoes || []).map((q) => q.banca).filter(Boolean)),
  ];

  const selects = [
    { id: "filtro-materia", values: materias },
    { id: "filtro-assunto", values: assuntos },
    { id: "filtro-banca", values: bancas },
    { id: "quiz-filtro-materia", values: materias },
    { id: "quiz-filtro-assunto", values: assuntos },
    { id: "quiz-filtro-banca", values: bancas },
  ];

  selects.forEach((item) => {
    const selectEl = document.getElementById(item.id);
    if (!selectEl) return;
    const curVal = selectEl.value;
    while (selectEl.options.length > 1) selectEl.remove(1);
    item.values.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      selectEl.appendChild(opt);
    });
    selectEl.value = curVal;
  });

  const datalists = [
    { id: "materias-list", values: materias },
    { id: "assuntos-list", values: assuntos },
    { id: "bancas-list", values: bancas },
  ];
  datalists.forEach((item) => {
    const dl = document.getElementById(item.id);
    if (!dl) return;
    dl.innerHTML = "";
    item.values.forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v;
      dl.appendChild(opt);
    });
  });
}

// --------------- Modal / Create / Edit helpers ---------------

btnNovaQuestao &&
  btnNovaQuestao.addEventListener("click", () => {
    questaoEmEdicaoId = null;
    modalTitle.textContent = "Nova Questão";
    formQuestao.reset();
    enunciadoEditor.innerHTML = "";
    opcoesList.innerHTML = "";
    selectTipo.dispatchEvent(new Event("change"));
    modalQuestao.classList.add("active");
  });

[modalClose, btnCancelar].forEach((el) => {
  el &&
    el.addEventListener("click", () => modalQuestao.classList.remove("active"));
});

btnCancelarExclusao &&
  btnCancelarExclusao.addEventListener("click", () =>
    modalConfirmacao.classList.remove("active")
  );
btnConfirmarExclusao &&
  btnConfirmarExclusao.addEventListener("click", async () => {
    if (!questaoParaExcluirId) return;
    try {
      await supabaseClient
        .from("questoes")
        .delete()
        .eq("id", questaoParaExcluirId);
      await supabaseClient
        .from("opcoes_multipla_escolha")
        .delete()
        .eq("questao_id", questaoParaExcluirId);
      modalConfirmacao.classList.remove("active");
      carregarQuestao();
      alert("Questão excluída.");
    } catch (err) {
      console.error("Erro ao excluir:", err);
      alert("Erro ao excluir: " + (err.message || err));
    }
  });

// abrir edição
async function abrirEdicaoQuestao(id) {
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
    enunciadoEditor.innerHTML = questao.enunciado || "";
    formQuestao.dificuldade.value = questao.dificuldade || "";
    formQuestao.materia.value = questao.materia || "";
    formQuestao.assunto.value = questao.assunto || "";
    formQuestao.banca.value = questao.banca || "";
    selectTipo.value = questao.tipo;
    selectTipo.dispatchEvent(new Event("change"));

    if (questao.tipo === "multipla_escolha") {
      const { data: opcoes } = await supabaseClient
        .from("opcoes_multipla_escolha")
        .select("*")
        .eq("questao_id", id);
      opcoesList.innerHTML = "";
      opcoes &&
        opcoes.forEach((op) => adicionarOpcao(op.texto_opcao, op.is_correta));
    } else if (questao.tipo === "certo_errado") {
      // marcar radio
      const radios = formQuestao.querySelectorAll(
        'input[name="resposta_correta"]'
      );
      radios.forEach((r) => {
        if (r.value === questao.resposta_certo_errado) r.checked = true;
      });
    }

    modalQuestao.classList.add("active");
  } catch (err) {
    console.error("Erro ao abrir edição:", err);
    alert("Erro ao carregar questão para edição.");
  }
}

// --------------- Quiz Logic ---------------

btnIniciarQuiz && btnIniciarQuiz.addEventListener("click", iniciarQuiz);
btnProximaQuestao &&
  btnProximaQuestao.addEventListener("click", proximaQuestao);
btnQuestaoAnterior &&
  btnQuestaoAnterior.addEventListener("click", questaoAnterior);

async function iniciarQuiz() {
  quizContainer.innerHTML = "<p>Carregando questões...</p>";
  btnIniciarQuiz.style.display = "none";

  try {
    let query = supabaseClient.from("questoes").select("*");
    if (quizFiltroMateria.value)
      query = query.eq("materia", quizFiltroMateria.value);
    if (quizFiltroAssunto.value)
      query = query.eq("assunto", quizFiltroAssunto.value);
    if (quizFiltroBanca.value) query = query.eq("banca", quizFiltroBanca.value);

    const { data: questoes, error } = await query;
    if (error) throw error;
    if (!questoes || questoes.length === 0) {
      quizContainer.innerHTML =
        "<p>Nenhuma questão encontrada com os filtros selecionados.</p>";
      btnIniciarQuiz.style.display = "inline-flex";
      return;
    }
    questoesQuiz = questoes;
    // carregar opcoes para multiplas
    const idsMult = questoesQuiz
      .filter((q) => q.tipo === "multipla_escolha")
      .map((q) => q.id);
    let opcoesMap = new Map();
    if (idsMult.length > 0) {
      const { data: opcoes } = await supabaseClient
        .from("opcoes_multipla_escolha")
        .select("*")
        .in("questao_id", idsMult);
      opcoes &&
        opcoes.forEach((op) => {
          if (!opcoesMap.has(op.questao_id)) opcoesMap.set(op.questao_id, []);
          opcoesMap.get(op.questao_id).push(op);
        });
    }
    questoesQuiz.forEach((q) => (q.opcoes = opcoesMap.get(q.id) || []));
    questaoAtualIndex = 0;
    exibirQuestaoQuiz();
  } catch (err) {
    console.error("Erro ao iniciar quiz:", err);
    quizContainer.innerHTML = "<p>Erro ao carregar quiz.</p>";
    btnIniciarQuiz.style.display = "inline-flex";
  }
}

function exibirQuestaoQuiz() {
  if (!questoesQuiz || questaoAtualIndex >= questoesQuiz.length) {
    mostrarResumoQuiz();
    return;
  }
  questaoAtual = questoesQuiz[questaoAtualIndex];
  let html = `<div class="quiz-progress"><p>Questão ${
    questaoAtualIndex + 1
  } de ${questoesQuiz.length}</p></div>
              <div class="quiz-question">${questaoAtual.enunciado || ""}</div>`;

  if (questaoAtual.tipo === "multipla_escolha") {
    html += '<div class="quiz-options">';
    questaoAtual.opcoes.forEach((op, idx) => {
      html += `<div class="quiz-option" data-index="${idx}" data-correta="${op.is_correta}">${op.texto_opcao}</div>`;
    });
    html += "</div>";
  } else {
    html += `<div class="quiz-options">
      <div class="quiz-option" data-resposta="Certo" data-correta="${
        questaoAtual.resposta_certo_errado === "Certo"
      }">Certo</div>
      <div class="quiz-option" data-resposta="Errado" data-correta="${
        questaoAtual.resposta_certo_errado === "Errado"
      }">Errado</div>
    </div>`;
  }

  quizContainer.innerHTML = html;
  btnQuestaoAnterior.style.display =
    questaoAtualIndex > 0 ? "inline-flex" : "none";
  btnProximaQuestao.style.display = "inline-flex";

  document.querySelectorAll(".quiz-option").forEach((opt) => {
    opt.addEventListener("click", () => selecionarOpcaoQuiz(opt));
  });
}

function selecionarOpcaoQuiz(element) {
  document
    .querySelectorAll(".quiz-option")
    .forEach((opt) => opt.classList.remove("selected", "correct", "incorrect"));
  const isCorreta = element.getAttribute("data-correta") === "true";
  const opcIndex = element.getAttribute("data-index");
  const resposta = {
    acertou: isCorreta,
    opcaoIndex: opcIndex,
    resposta: element.getAttribute("data-resposta") || null,
  };
  respostasUsuario[questaoAtual.id] = resposta;
  localStorage.setItem("respostasUsuario", JSON.stringify(respostasUsuario));

  if (isCorreta) element.classList.add("correct");
  else {
    element.classList.add("incorrect");
    document.querySelectorAll(".quiz-option").forEach((opt) => {
      if (opt.getAttribute("data-correta") === "true")
        opt.classList.add("correct");
    });
  }
  element.classList.add("selected");

  const feedbackAnterior = document.querySelector(
    ".feedback-acerto, .feedback-erro"
  );
  if (feedbackAnterior) feedbackAnterior.remove();
  const feedbackHtml = isCorreta
    ? '<div class="feedback-acerto">✓ Acertou!</div>'
    : '<div class="feedback-erro">✗ Errou!</div>';
  const quizQ = document.querySelector(".quiz-question");
  if (quizQ) quizQ.insertAdjacentHTML("beforebegin", feedbackHtml);
}

function questaoAnterior() {
  if (questaoAtualIndex > 0) {
    questaoAtualIndex--;
    exibirQuestaoQuiz();
  }
}
function proximaQuestao() {
  if (questaoAtualIndex < questoesQuiz.length - 1) {
    questaoAtualIndex++;
    exibirQuestaoQuiz();
  } else mostrarResumoQuiz();
}

function calcularEstatisticas() {
  // devolve html simples para o resumo
  if (!questoesQuiz || questoesQuiz.length === 0)
    return "<p class='no-data'>Sem dados</p>";
  const total = questoesQuiz.length;
  const acertos = Object.values(respostasUsuario).filter(
    (r) => r.acertou
  ).length;
  return `<div class="stat-item"><span class="stat-label">Total</span><span class="stat-value">${total}</span></div>
          <div class="stat-item"><span class="stat-label">Acertos</span><span class="stat-value success">${acertos}</span></div>`;
}

function mostrarResumoQuiz() {
  const total = questoesQuiz.length || 0;
  const acertos =
    Object.values(respostasUsuario).filter((r) => r.acertou).length || 0;
  const erros = total - acertos;
  const html = `<div class="quiz-resumo">
    <h3>Quiz Concluído!</h3>
    <div class="resumo-geral">
      <div class="stat-item"><span class="stat-label">Total de Questões:</span><span class="stat-value">${total}</span></div>
      <div class="stat-item"><span class="stat-label">Acertos:</span><span class="stat-value success">${acertos}</span></div>
      <div class="stat-item"><span class="stat-label">Erros:</span><span class="stat-value error">${erros}</span></div>
      <div class="stat-item"><span class="stat-label">Percentual:</span><span class="stat-value">${
        total ? ((acertos / total) * 100).toFixed(1) + "%" : "0%"
      }</span></div>
    </div>
    <div class="resumo-detalhado">${calcularEstatisticas()}</div>
  </div>`;
  quizContainer.innerHTML = html;
  btnIniciarQuiz.style.display = "inline-flex";
}

// --------------- Dashboard placeholder ---------------
async function carregarDashboard() {
  const dash = document.getElementById("dashboard-grid");
  if (!dash) return;
  dash.innerHTML =
    "<div class='dashboard-card'><h3>Resumo</h3><p>Carregue questões para ver estatísticas.</p></div>";
}

// ---------------- Initialization ----------------
document.addEventListener("DOMContentLoaded", () => {
  adicionarBotaoProcessarImagem();
  switchSection("questoes");
  // Attach text processor
  btnProcessarTexto &&
    btnProcessarTexto.addEventListener("click", processarTexto);
  // Load initial questions
  carregarQuestao();
});
