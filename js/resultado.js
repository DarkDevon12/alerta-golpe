import { auth, db, collection, getDocs, signInAnonymously } from "./firebase.js";
import { escapeHtml } from "./util.js";
import { usuarioPronto } from "./layout.js";
import { ehVisitante } from "./route-guard.js";
import { podeConsultarGratis, registrarConsultaGratis } from "./consulta-gratis.js";
import { detectarTipo, telefonesBatem, analisarLink, analisarEmail, nomesParecidos } from "./alvos.js";

const ROTULOS = {
  telefone: "Consulta de telefone",
  link: "Consulta de link",
  email: "Consulta de email"
};

/**
 * Separa as denúncias do alvo buscado (exatas, contam no risco) das de
 * alvos parecidos: link com o mesmo nome e outra terminação
 * (casasbahia.com.br × casasbahia.org) ou email do mesmo domínio.
 * Assim o site verdadeiro não é marcado como golpe por causa de um falso.
 */
function separarDenuncias(todas, tipo, valor) {
  const doTipo = todas.filter((d) => d[tipo]);
  const exatas = [];
  const parecidas = [];

  if (tipo === "telefone") {
    exatas.push(...doTipo.filter((d) => telefonesBatem(d.telefone, valor)));
    return { exatas, parecidas };
  }

  const analisar = tipo === "link" ? analisarLink : analisarEmail;
  const alvo = analisar(valor);
  if (!alvo) return { exatas, parecidas };

  doTipo.forEach((d) => {
    const outro = analisar(d[tipo]);
    if (!outro) return;

    if (outro.chave === alvo.chave) {
      exatas.push(d);
    } else if (tipo === "link" ? nomesParecidos(alvo.nome, outro.nome)
                               : !alvo.gratuito && outro.dominio === alvo.dominio) {
      parecidas.push({ ...d, exibicao: outro.exibicao });
    }
  });

  return { exatas, parecidas };
}

const ICONES = {
  baixo: '<svg class="icon" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
  alerta: '<svg class="icon" viewBox="0 0 24 24"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
  cadeado: '<svg class="icon" viewBox="0 0 24 24"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
};

function formatarData(data) {
  const d = data?.toDate ? data.toDate() : null;
  return d ? d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" }) : "";
}

async function carregarResultados() {
  const valorBuscado = new URLSearchParams(window.location.search).get("busca")?.trim();

  if (!valorBuscado) {
    window.location.replace("index.html");
    return;
  }

  const user = await usuarioPronto;
  const visitante = ehVisitante(user);

  // Visitante: só uma consulta grátis (recarregar a mesma vale)
  if (visitante && !podeConsultarGratis(valorBuscado)) {
    window.location.replace("login.html?aviso=limite");
    return;
  }

  const tipo = detectarTipo(valorBuscado);

  document.getElementById("numero").textContent = valorBuscado;
  document.getElementById("tipo-busca").textContent = ROTULOS[tipo];

  const riscoEl = document.getElementById("risco");
  const relatosEl = document.getElementById("relatos");

  let filtradas, parecidas;
  try {
    // As regras do Firestore exigem uma sessão; o visitante ganha uma anônima
    if (!user) await signInAnonymously(auth);

    const snapshot = await getDocs(collection(db, "denuncias"));
    const todas = snapshot.docs.map((d) => d.data());

    ({ exatas: filtradas, parecidas } = separarDenuncias(todas, tipo, valorBuscado));
  } catch (erro) {
    console.error("Erro ao consultar denúncias:", erro);
    if (erro.code === "auth/admin-restricted-operation") {
      console.error("Ative o provedor Anônimo em Firebase Console → Authentication → Sign-in method.");
    }
    riscoEl.textContent = "Erro na consulta";
    riscoEl.className = "risco alto";
    return;
  }

  if (visitante) registrarConsultaGratis(valorBuscado);

  const qtd = filtradas.length;
  document.getElementById("denuncias").textContent =
    qtd === 1 ? "1 denúncia registrada" : `${qtd} denúncias registradas`;

  if (qtd === 0) {
    riscoEl.innerHTML = `${ICONES.baixo} Risco baixo`;
    riscoEl.className = "risco baixo";
  } else if (qtd <= 3) {
    riscoEl.innerHTML = `${ICONES.alerta} Risco médio`;
    riscoEl.className = "risco medio";
  } else {
    riscoEl.innerHTML = `${ICONES.alerta} Risco alto`;
    riscoEl.className = "risco alto";
  }

  mostrarParecidas(parecidas, tipo);

  if (visitante) {
    mostrarConviteCadastro(relatosEl, qtd);
    return;
  }

  const titulo = document.createElement("h2");
  titulo.textContent = "Relatos da comunidade";
  relatosEl.replaceChildren(titulo);

  if (qtd === 0) {
    const vazio = document.createElement("p");
    vazio.className = "vazio";
    vazio.textContent = "Ninguém denunciou este contato ainda. Isso não garante que seja seguro: na dúvida, não envie dinheiro nem códigos.";
    relatosEl.appendChild(vazio);
    return;
  }

  filtradas
    .sort((a, b) => (b.data?.seconds || 0) - (a.data?.seconds || 0))
    .forEach((d) => {
      const div = document.createElement("article");
      div.className = "relato";
      div.textContent = d.descricao || "Sem descrição informada.";

      const data = formatarData(d.data);
      if (data) {
        const time = document.createElement("time");
        time.textContent = data;
        div.appendChild(time);
      }
      relatosEl.appendChild(div);
    });
}

// Alerta com as denúncias de alvos parecidos, agrupadas por endereço
function mostrarParecidas(parecidas, tipo) {
  if (!parecidas.length) return;

  const porAlvo = new Map();
  parecidas.forEach((d) => porAlvo.set(d.exibicao, (porAlvo.get(d.exibicao) || 0) + 1));

  const total = parecidas.length;
  const qtdTexto = total === 1 ? "1 denúncia" : `${total} denúncias`;
  const secao = document.getElementById("parecidos");

  secao.innerHTML = `
    <h2>${ICONES.alerta}<span></span></h2>
    <p></p>
    <ul>
      ${[...porAlvo].map(([alvo, qtd]) => `
        <li><span>${escapeHtml(alvo)}</span><b>${qtd === 1 ? "1 denúncia" : `${qtd} denúncias`}</b></li>`).join("")}
    </ul>`;

  if (tipo === "link") {
    secao.querySelector("h2 span").textContent = `${qtdTexto} em sites com nome parecido`;
    secao.querySelector("p").textContent = "Golpistas costumam imitar lojas e bancos trocando só a terminação do endereço (.com, .org, .net) ou acrescentando palavras. Confira o endereço letra por letra antes de comprar ou informar dados.";
  } else {
    secao.querySelector("h2 span").textContent = `${qtdTexto} de outros emails do mesmo domínio`;
    secao.querySelector("p").textContent = "Outros endereços deste mesmo domínio já foram denunciados. Desconfie de mensagens vindas dele, principalmente se pedirem dados, senhas ou pagamentos.";
  }
  secao.hidden = false;
}

// No lugar dos relatos, o visitante vê um convite para criar conta
function mostrarConviteCadastro(relatosEl, qtd) {
  const convite = document.createElement("div");
  convite.className = "card convite-cadastro";
  convite.innerHTML = `
    <span class="convite-icone">${ICONES.cadeado}</span>
    <h2></h2>
    <p>Você usou sua consulta grátis. Crie uma conta para ler o que a comunidade relatou, fazer novas consultas e denunciar golpes.</p>
    <div class="resultado-acoes">
      <a href="cadastro.html" class="btn btn-primary">Criar conta grátis</a>
      <a href="login.html" class="btn btn-secondary">Já tenho conta</a>
    </div>`;
  convite.querySelector("h2").textContent = qtd > 0
    ? "Os relatos são exclusivos para quem tem conta"
    : "Quer consultar outros números e links?";
  relatosEl.replaceChildren(convite);
}

carregarResultados();
