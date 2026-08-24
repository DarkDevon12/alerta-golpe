import {
    db,
    collection,
    getDocs
} from "./firebase.js";


async function carregarRanking() {

    const tabela = document.getElementById("ranking-body");

    try {

        const usuariosSnapshot = await getDocs(
            collection(db, "usuarios")
        );

        const ranking = [];

        usuariosSnapshot.forEach((usuarioDoc) => {

            const usuario = usuarioDoc.data();

            ranking.push({
                nome: usuario.nome || "Usuário sem nome",
                xp: usuario.xp || 0,
                denuncias: usuario.denuncias || 0
            });

        });


        // Ordena do maior XP para o menor
        ranking.sort((a, b) => b.xp - a.xp);


        tabela.innerHTML = "";


        ranking.slice(0, 100).forEach((usuario, index) => {

            let posicao = index + 1;

            let medalha = posicao;

            if (posicao === 1) medalha = "🥇";
            if (posicao === 2) medalha = "🥈";
            if (posicao === 3) medalha = "🥉";


            const linha = document.createElement("tr");

            linha.innerHTML = `
                <td>${medalha}</td>
                <td>${usuario.nome}</td>
                <td>${usuario.xp} XP</td>
                <td>${usuario.denuncias}</td>
            `;

            tabela.appendChild(linha);

        });


        // Caso não tenha usuários
        if (ranking.length === 0) {

            tabela.innerHTML = `
                <tr>
                    <td colspan="4">
                        Nenhum usuário encontrado.
                    </td>
                </tr>
            `;

        }

    } catch (erro) {

        console.error("Erro ao carregar ranking:", erro);

    }

}

document.getElementById("btn-sair").addEventListener("click", () => {
    window.location.href = "index.html";
});


carregarRanking();