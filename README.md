# 🔐 AlertaGolpe

> Plataforma de consulta e denúncia de golpes digitais — Trabalho de Conclusão de Curso (TCC)  
> Curso de Sistemas de Informação

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat&logo=firebase&logoColor=black)

---

## 📌 Sobre o projeto

O **AlertaGolpe** é uma aplicação web que permite aos usuários verificar se um número de telefone ou link suspeito já foi denunciado por outras pessoas, além de registrar novas denúncias com descrição do ocorrido.

O objetivo é criar uma base colaborativa de dados sobre golpes digitais, ajudando pessoas a se protegerem antes de cair em fraudes.

---

## 🎯 Funcionalidades

- 🔎 **Consulta** de telefones e links suspeitos em tempo real
- 📊 **Nível de risco** calculado automaticamente (baixo, médio ou alto)
- 📋 **Relatos reais** de outras vítimas exibidos na tela
- 🚨 **Registro de denúncias** com telefone, link e descrição
- 🤖 **Análise de risco com IA** (Google Gemini) antes de enviar
- 🏆 **Ranking de XP** com níveis
- ☁️ **Banco de dados online** via Firebase Firestore

---

## 🧠 Como funciona

### 🔎 Busca
O usuário digita um telefone ou link na tela inicial e clica em **Verificar**. O valor é passado pela URL para a página de resultado:

```
resultado.html?busca=VALOR
```

### 📊 Resultado
A página de resultado lê o valor da URL, consulta todas as denúncias no Firestore e filtra as que correspondem ao valor buscado. O nível de risco é calculado assim:

| Denúncias | Nível de risco |
|-----------|---------------|
| 0         | ✅ Baixo       |
| 1 a 3     | ⚠️ Médio       |
| 4 ou mais | 🚨 Alto        |

### 🚨 Denúncia
O usuário pode registrar uma denúncia informando telefone e/ou link suspeito e uma descrição do ocorrido. Os dados são salvos diretamente no Firestore com data e hora.

---

## 🗂️ Estrutura do projeto

```
alerta-golpe/
│
├── index.html          # Tela inicial com busca
├── resultado.html      # Resultado da consulta + relatos
├── denunciar.html      # Formulário de denúncia + análise com IA
├── ranking.html        # Ranking de XP
├── login.html / cadastro.html
│
├── css/style.css       # Estilos globais
│
├── js/
│   ├── firebase.js     # Inicialização do Firebase (config vem do .env)
│   ├── layout.js       # Proteção de rota + botão Sair (páginas logadas)
│   ├── usuarios.js     # Perfil privado (usuarios) e público (ranking)
│   ├── denuncia.js     # Envio da denúncia, XP e chamada à análise
│   └── ...             # Um script por página
│
├── server/analisar.js  # Chamada ao Gemini (roda só no servidor)
├── api/analisar.js     # Mesma rota como função serverless (Vercel)
└── firestore.rules     # Regras de segurança do Firestore
```

---

## 🔥 Tecnologias utilizadas

| Tecnologia | Uso |
|------------|-----|
| HTML5 + CSS3 | Estrutura e estilo das páginas |
| JavaScript (Vanilla, ES Modules) | Lógica do frontend |
| Vite | Servidor de desenvolvimento, build e rota `/api/analisar` |
| Firebase Auth + Firestore | Login e banco de dados |
| Google Gemini | Análise de risco das denúncias |
| Google Fonts (Syne + DM Sans) | Tipografia |

---

## 🚀 Como executar localmente

### Pré-requisitos
- [Node.js](https://nodejs.org/) 20 ou superior

### Passos

```bash
# 1. Instale as dependências
npm install

# 2. Crie o .env a partir do exemplo e preencha as chaves
cp .env.example .env

# 3. Rode o servidor de desenvolvimento
npm run dev
```

Acesse o endereço mostrado no terminal (normalmente `http://localhost:5173`).

> ⚠️ **Importante:** não use Live Server nem abra os arquivos direto (`file://`). A config do Firebase vem do `.env` e a análise com IA depende da rota `/api/analisar`, que só existe quando o projeto roda pelo Vite (`npm run dev` ou `npm run preview`).

### Chaves e segurança

- `GEMINI_API_KEY` **não** tem prefixo `VITE_`: fica só no servidor e nunca vai para o navegador. O front chama `/api/analisar`, que confere o login do usuário e só então fala com o Gemini.
- As variáveis `VITE_FIREBASE_*` vão para o navegador por design (o SDK do Firebase precisa delas). Elas identificam o projeto, não dão acesso; quem protege os dados são as regras em `firestore.rules`.

### Deploy

Na Vercel, o build (`npm run build`) gera o site em `dist/` e a pasta `api/` vira a função `/api/analisar`. Cadastre as mesmas variáveis do `.env` nas configurações do projeto.

---

## ☁️ Firebase

| Coleção | Conteúdo | Quem lê |
|---------|----------|---------|
| `usuarios/{uid}` | nome, CPF, email, XP | Só o próprio usuário |
| `ranking/{uid}` | nome, XP, nº de denúncias | Usuários logados |
| `denuncias/{id}` | telefone ou link, descrição, data, autor, análise da IA | Usuários logados |

Publique as regras colando `firestore.rules` em **Firebase Console → Firestore Database → Regras**.

---

## 🔮 Melhorias futuras

- [ ] Upload de imagens como prova do golpe
- [ ] Busca parcial (não exata)
- [ ] Filtros por data
- [x] Autenticação de usuários
- [x] Sistema de reputação (XP e ranking)
- [x] Proteção contra XSS
- [x] Análise de risco com IA (Gemini)
- [ ] Calcular o XP no servidor (hoje o cliente soma o XP, limitado pelas regras do Firestore)
- [ ] Notificações em tempo real com Firebase onSnapshot

---

## 👨‍💻 Autor

**Vitor Ferreira Mendes Justino**  
Trabalho de Conclusão de Curso — Sistemas de Informação

---

## 📄 Licença

Este projeto foi desenvolvido para fins acadêmicos.
