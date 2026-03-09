# Resenha entre Amigos - Sistema de Gestão de Eventos

Este é um sistema completo para gestão de convidados, pagamentos e acompanhantes para o seu evento.

## 🚀 Como rodar localmente

1.  **Instale as dependências:**
    ```bash
    npm install
    ```

2.  **Configure as variáveis de ambiente:**
    Crie um arquivo `.env` baseado no `.env.example`.

3.  **Inicie o servidor de desenvolvimento:**
    ```bash
    npm run dev
    ```
    O sistema estará disponível em `http://localhost:3000`.

---

## 🚂 Deploy no Railway.app (Com Persistência)

Para garantir que o seu banco de dados (`eventpro.db`) não seja apagado toda vez que o servidor reiniciar ou você fizer um novo deploy, siga estes passos:

### 1. Criar um Volume
No painel do seu projeto no Railway:
1.  Clique em **+ New** -> **Volume**.
2.  Dê um nome ao volume (ex: `event-data`).
3.  No campo **Mount Path**, digite: `/app/data`
4.  Clique em **Create**.

### 2. Configurar Variáveis de Ambiente
Vá na aba **Variables** do seu serviço no Railway e adicione:

| Variável | Valor | Descrição |
| :--- | :--- | :--- |
| `DATABASE_PATH` | `/app/data/eventpro.db` | Caminho do banco de dados no volume persistente |
| `SETTINGS_PATH` | `/app/data/settings.json` | Caminho do backup de configurações |
| `APP_URL` | `https://seu-app.up.railway.app` | A URL final do seu site (importante para os links de e-mail) |
| `GEMINI_API_KEY` | `sua_chave_aqui` | Sua chave da API do Gemini |
| `NODE_ENV` | `production` | Define o ambiente como produção |

### 3. Por que isso é importante?
Por padrão, o Railway usa um sistema de arquivos efêmero. Isso significa que qualquer arquivo criado durante a execução (como o banco de dados SQLite) é deletado quando o app reinicia. Ao usar um **Volume** montado em `/app/data` e apontar o `DATABASE_PATH` para lá, o arquivo passará a viver em um disco rígido persistente que não é apagado.

---

## 🛠️ Tecnologias Utilizadas
- **Frontend:** React, TypeScript, Tailwind CSS, Motion.
- **Backend:** Node.js, Express, Better-SQLite3.
- **E-mail:** Nodemailer e Resend.
