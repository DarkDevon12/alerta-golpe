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
├── resultado.html      # Exibe resultado da consulta
├── denunciar.html      # Formulário de denúncia
│
├── css/
│   └── style.css       # Estilos globais (Flexbox, responsivo)
│
└── js/
    ├── firebase.js     # Configuração e conexão com o Firebase
    ├── main.js         # Lógica da busca (index)
    ├── resultado.js    # Lógica da consulta ao Firestore
    └── denuncia.js     # Lógica do envio de denúncias
```

---

## 🔥 Tecnologias utilizadas

| Tecnologia | Uso |
|------------|-----|
| HTML5 | Estrutura das páginas |
| CSS3 + Flexbox | Estilização responsiva sem media queries |
| JavaScript (Vanilla) | Lógica do frontend |
| Firebase Firestore | Banco de dados em tempo real |
| Google Fonts (Syne + DM Sans) | Tipografia |

---

## 🚀 Como executar localmente

### Pré-requisitos
- [VS Code](https://code.visualstudio.com/)
- Extensão [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)

### Passos

```bash
# 1. Clone o repositório
git clone https://github.com/seu-usuario/alerta-golpe.git

# 2. Abra a pasta no VS Code
cd alerta-golpe
code .

# 3. Clique em "Go Live" no canto inferior direito do VS Code
```

Acesse via:
```
http://127.0.0.1:5500
```

> ⚠️ **Importante:** o projeto usa `type="module"` nos scripts, por isso **não funciona** abrindo o arquivo diretamente pelo navegador (`file://`). É necessário usar o Live Server ou outro servidor local.

---

## ☁️ Firebase

O projeto utiliza o **Firebase Firestore** como banco de dados. As denúncias são salvas na coleção `denuncias` com a seguinte estrutura:

```json
{
  "telefone": "11999998888",
  "link": "",
  "descricao": "Recebi mensagem pedindo dados bancários",
  "data": "2024-06-01T14:32:00Z"
}
```

A conexão é feita via CDN, sem necessidade de instalar dependências.

---

## 🔮 Melhorias futuras

- [ ] Upload de imagens como prova do golpe
- [ ] Busca parcial (não exata)
- [ ] Filtros por data
- [ ] Autenticação de usuários
- [ ] Sistema de reputação para denúncias
- [ ] Proteção contra XSS e dados maliciosos
- [ ] Notificações em tempo real com Firebase onSnapshot

---

## 👨‍💻 Autor

**Vitor Ferreira Mendes Justino**  
Trabalho de Conclusão de Curso — Sistemas de Informação

---

## 📄 Licença

Este projeto foi desenvolvido para fins acadêmicos.
