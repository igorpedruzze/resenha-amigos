import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import { Resend } from "resend";
import sharp from "sharp";
import bcrypt from "bcryptjs";
import session from "express-session";
import { randomBytes } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure database and upload directories exist
const dbDir = process.env.DB_PATH || path.join(__dirname, "data");
const uploadDir = path.join(dbDir, "uploads");
const perfilDir = path.join(dbDir, "perfil");

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(perfilDir)) {
  fs.mkdirSync(perfilDir, { recursive: true });
}

// Migration: Move files from old 'database' folder to new 'data' folder if 'database' exists
const legacyDbDir = path.join(__dirname, "database");
if (fs.existsSync(legacyDbDir) && legacyDbDir !== dbDir) {
  try {
    const files = fs.readdirSync(legacyDbDir);
    for (const file of files) {
      const oldPath = path.join(legacyDbDir, file);
      const newPath = path.join(dbDir, file);
      if (!fs.existsSync(newPath)) {
        fs.renameSync(oldPath, newPath);
        console.log(`Moved ${file} from database/ to data/ folder.`);
      }
    }
    // Optionally remove the old directory if empty
    if (fs.readdirSync(legacyDbDir).length === 0) {
      fs.rmdirSync(legacyDbDir);
    }
  } catch (e) {
    console.error("Error migrating from database/ to data/:", e);
  }
}

// Move existing database and settings files to the data folder if they exist in the root
const oldDbPath = path.join(__dirname, "eventpro.db");
const newDbPath = path.join(dbDir, "eventpro.db");
if (fs.existsSync(oldDbPath) && !fs.existsSync(newDbPath)) {
  try {
    fs.renameSync(oldDbPath, newDbPath);
    console.log("Moved eventpro.db to data/ folder.");
  } catch (e) {
    console.error("Error moving eventpro.db:", e);
  }
}

const oldSettingsPath = path.join(__dirname, "settings.json");
const newSettingsPath = path.join(dbDir, "settings.json");
if (fs.existsSync(oldSettingsPath) && !fs.existsSync(newSettingsPath)) {
  try {
    fs.renameSync(oldSettingsPath, newSettingsPath);
    console.log("Moved settings.json to data/ folder.");
  } catch (e) {
    console.error("Error moving settings.json:", e);
  }
}

const DEFAULT_TEMPLATES: Record<string, string> = {
  email_welcome: 'Fala {nome}! Recebi seu cadastro para o meu niver. Vou dar uma olhada aqui e já te libero!',
  email_approval_guest: 'Tudo certo! Você está confirmado na minha resenha. Use o ID {id} para entrar. Acesse seu painel em: {link}',
  email_approval_companion: 'Olá {nome}, seu acompanhante {nome_acomp} foi aprovado para a minha resenha!',
  email_payment_confirm: 'Olá {nome}, recebemos seu pagamento! Seu saldo atualizado para a resenha é {saldo}. Nos vemos lá!',
  email_password_recovery: 'Olá {nome}, você solicitou a recuperação de senha para a minha resenha. Clique no link abaixo para redefinir:\n\n{link}'
};

const emailTemplate = (content: string, event: any) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: sans-serif; line-height: 1.5; color: #333; margin: 0; padding: 0; }
    .container { max-width: 550px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px; }
    .header { text-align: center; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 20px; }
    .content { font-size: 16px; }
    .footer { margin-top: 30px; font-size: 12px; color: #888; text-align: center; border-top: 1px solid #eee; padding-top: 10px; }
    .btn { display: inline-block; padding: 12px 24px; background: #2563eb; color: #fff !important; text-decoration: none; border-radius: 6px; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin:0;">${event.nome}</h2>
    </div>
    <div class="content">
      ${content}
      <div style="text-align: center; margin-top: 25px;">
        <a href="${event.system_url || process.env.APP_URL || 'http://localhost:3000'}" class="btn">Acessar Painel</a>
      </div>
    </div>
    <div class="footer">
      <p>&copy; ${new Date().getFullYear()} ${event.nome}</p>
    </div>
  </div>
</body>
</html>
`;

async function startServer() {
  console.log("Initializing database...");
  const dbDir = process.env.DB_PATH || path.join(__dirname, "data");
  const dbPath = path.join(dbDir, "eventpro.db");
  const db = new Database(dbPath);
  const SETTINGS_FILE = path.join(dbDir, "settings.json");

  function saveSettingsBackup() {
    try {
      const event = db.prepare("SELECT * FROM eventos LIMIT 1").get() as any;
      const admin = db.prepare("SELECT nome, email, whatsapp, senha_hash FROM usuarios WHERE is_master = 1 LIMIT 1").get() as any;
      const templates = db.prepare("SELECT * FROM templates").all() as any[];
      
      if (event && admin) {
        const backup = { event, admin, templates };
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(backup, null, 2));
        console.log("Settings backup saved to settings.json (including templates)");
      }
    } catch (e) {
      console.error("Error saving settings backup:", e);
    }
  }

  function loadSettingsBackup() {
    try {
      if (fs.existsSync(SETTINGS_FILE)) {
        const backup = JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
        console.log("Checking for settings recovery from backup...");
        
        const eventExists = db.prepare("SELECT * FROM eventos LIMIT 1").get();
        if (!eventExists && backup.event) {
          const { id, ...eventData } = backup.event;
          const columns = Object.keys(eventData);
          const placeholders = columns.map(() => "?").join(", ");
          const values = Object.values(eventData);
          db.prepare(`INSERT INTO eventos (${columns.join(", ")}) VALUES (${placeholders})`).run(...values);
          console.log("Event restored from backup.");
        }

        const adminExists = db.prepare("SELECT * FROM usuarios WHERE role = 'admin'").get();
        if (!adminExists && backup.admin) {
          const { nome, email, whatsapp, senha_hash } = backup.admin;
          db.prepare("INSERT INTO usuarios (nome, email, whatsapp, senha_hash, role) VALUES (?, ?, ?, ?, ?)").run(
            nome, email, whatsapp, senha_hash, 'admin'
          );
          console.log("Admin restored from backup.");
        }

        const templatesCount = db.prepare("SELECT COUNT(*) as count FROM templates").get() as any;
        if (templatesCount.count === 0 && backup.templates && backup.templates.length > 0) {
          const insert = db.prepare("INSERT INTO templates (tipo, conteudo) VALUES (?, ?)");
          backup.templates.forEach((t: any) => {
            insert.run(t.tipo, t.conteudo);
          });
          console.log(`${backup.templates.length} templates restored from backup.`);
        }
      }
    } catch (e) {
      console.error("Error loading settings backup:", e);
    }
  }

  // Initialize Database with the manual validation schema
  db.exec(`
    CREATE TABLE IF NOT EXISTS eventos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      valor_por_pessoa REAL NOT NULL,
      pix_key TEXT,
      local TEXT,
      data TEXT,
      flyer_landing TEXT,
      flyer_dashboard TEXT,
      capacidade_maxima INTEGER DEFAULT 50,
      smtp_host TEXT,
      smtp_port INTEGER,
      smtp_user TEXT,
      smtp_pass TEXT,
      email_method TEXT DEFAULT 'smtp',
      resend_api_key TEXT,
      from_email TEXT,
      system_url TEXT,
      info_texto TEXT,
      flyer_info TEXT,
      limite_acompanhantes INTEGER DEFAULT 4,
      prazo_rsvp TEXT,
      admin2_email TEXT,
      admin3_email TEXT,
      tpl_welcome TEXT,
      tpl_approval_guest TEXT,
      tpl_approval_companion TEXT,
      tpl_payment_confirm TEXT,
      tpl_password_recovery TEXT
    );

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      whatsapp TEXT,
      instagram TEXT,
      senha_hash TEXT NOT NULL,
      confirmado INTEGER DEFAULT 0,
      role TEXT DEFAULT 'guest',
      valor_total REAL,
      codigo_convidado TEXT UNIQUE,
      acompanhantes_count INTEGER DEFAULT 0,
      status TEXT DEFAULT 'ativo', -- 'ativo', 'pendente', 'recusado'
      rsvp_status TEXT, -- 'confirmado', 'desistente', 'lista_espera'
      is_master INTEGER DEFAULT 0
    );

    -- Migration: Ensure role column exists if table was created without it
    PRAGMA table_info(usuarios);
  `);

  try {
    db.exec("ALTER TABLE usuarios ADD COLUMN is_master INTEGER DEFAULT 0");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE eventos ADD COLUMN admin2_email TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE eventos ADD COLUMN admin3_email TEXT");
  } catch (e) {}

  try {
    // Ensure the first admin is master
    const hasMaster = db.prepare("SELECT COUNT(*) as count FROM usuarios WHERE is_master = 1").get() as any;
    if (hasMaster.count === 0) {
      db.prepare("UPDATE usuarios SET is_master = 1 WHERE role = 'admin' AND id = (SELECT MIN(id) FROM usuarios WHERE role = 'admin')").run();
    }
  } catch (e) {}

  try {
    db.exec("ALTER TABLE usuarios ADD COLUMN acompanhantes_count INTEGER DEFAULT 0");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE eventos ADD COLUMN tpl_welcome TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE eventos ADD COLUMN limite_acompanhantes INTEGER DEFAULT 4");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE eventos ADD COLUMN tpl_approval_guest TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE eventos ADD COLUMN tpl_approval_companion TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE eventos ADD COLUMN tpl_payment_confirm TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE eventos ADD COLUMN tpl_password_recovery TEXT");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE eventos ADD COLUMN prazo_rsvp TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE usuarios ADD COLUMN rsvp_status TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE usuarios ADD COLUMN role TEXT DEFAULT 'guest'");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE usuarios ADD COLUMN whatsapp TEXT");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE usuarios ADD COLUMN instagram TEXT");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE usuarios ADD COLUMN valor_total REAL");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE usuarios ADD COLUMN codigo_convidado TEXT UNIQUE");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE usuarios ADD COLUMN status TEXT DEFAULT 'ativo'");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE usuarios ADD COLUMN reset_token TEXT");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE usuarios ADD COLUMN reset_token_expires INTEGER");
  } catch (e) {}

  try {
    // Migration: Populate status for existing users if NULL
    db.prepare("UPDATE usuarios SET status = 'ativo' WHERE status IS NULL").run();

    // Migration: Populate codigo_convidado for existing users
    const usersWithoutCode = db.prepare("SELECT id FROM usuarios WHERE codigo_convidado IS NULL AND role = 'guest' AND status = 'ativo'").all();
    for (const user of usersWithoutCode as any[]) {
      let code = '';
      let isUnique = false;
      while (!isUnique) {
        code = Math.floor(100000 + Math.random() * 900000).toString();
        const existing = db.prepare("SELECT id FROM usuarios WHERE codigo_convidado = ?").get(code);
        if (!existing) isUnique = true;
      }
      db.prepare("UPDATE usuarios SET codigo_convidado = ? WHERE id = ?").run(code, user.id);
    }
  } catch (e) {
    console.log("Migration error (status/code):", e);
  }

  try {
    db.exec("ALTER TABLE eventos ADD COLUMN pix_key TEXT");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE eventos ADD COLUMN local TEXT");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE eventos ADD COLUMN data TEXT");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE eventos ADD COLUMN flyer_landing TEXT");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE eventos ADD COLUMN flyer_dashboard TEXT");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE eventos ADD COLUMN capacidade_maxima INTEGER DEFAULT 50");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE eventos ADD COLUMN flyer_landing_mobile TEXT");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE eventos ADD COLUMN smtp_host TEXT");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE eventos ADD COLUMN smtp_port INTEGER");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE eventos ADD COLUMN smtp_user TEXT");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE eventos ADD COLUMN smtp_pass TEXT");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE eventos ADD COLUMN email_method TEXT DEFAULT 'smtp'");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE eventos ADD COLUMN resend_api_key TEXT");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE eventos ADD COLUMN from_email TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE eventos ADD COLUMN system_url TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE eventos ADD COLUMN info_texto TEXT");
  } catch (e) {}
  try {
    db.exec("ALTER TABLE eventos ADD COLUMN flyer_info TEXT");
  } catch (e) {}

  try {
    db.exec("ALTER TABLE usuarios ADD COLUMN foto_perfil TEXT");
  } catch (e) {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS pagamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      evento_id INTEGER NOT NULL,
      valor REAL NOT NULL,
      data_pagamento DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT DEFAULT 'pendente', -- 'pendente', 'concluido', 'rejeitado'
      comprovante_url TEXT,
      observacao TEXT,
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
      FOREIGN KEY (evento_id) REFERENCES eventos(id)
    );

    CREATE TABLE IF NOT EXISTS acompanhantes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario_id INTEGER NOT NULL,
      nome TEXT NOT NULL,
      instagram TEXT,
      status TEXT DEFAULT 'pendente_aprovacao', -- 'pendente_aprovacao', 'aprovado'
      FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    );

    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tipo TEXT UNIQUE NOT NULL,
      conteudo TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS logs_atividades (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
      usuario_id INTEGER,
      usuario_nome TEXT,
      acao TEXT,
      mensagem TEXT
    );

    CREATE TABLE IF NOT EXISTS custos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      evento_id INTEGER NOT NULL,
      descricao TEXT NOT NULL,
      quantidade REAL DEFAULT 1,
      unidade TEXT,
      valor_unitario REAL DEFAULT 0,
      total REAL DEFAULT 0,
      categoria TEXT,
      FOREIGN KEY (evento_id) REFERENCES eventos(id)
    );

    CREATE TABLE IF NOT EXISTS vendas_extras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      evento_id INTEGER NOT NULL,
      descricao TEXT NOT NULL,
      valor REAL NOT NULL,
      data_venda DATETIME DEFAULT CURRENT_TIMESTAMP,
      categoria TEXT,
      FOREIGN KEY (evento_id) REFERENCES eventos(id)
    );

    CREATE TABLE IF NOT EXISTS backups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
      nome TEXT NOT NULL,
      conteudo TEXT NOT NULL
    );
  `);

  try {
    db.exec("ALTER TABLE acompanhantes ADD COLUMN status TEXT DEFAULT 'pendente_aprovacao'");
  } catch (e) {}

  try {
    // Migration: Update existing templates and logs to the new branding
    db.prepare("UPDATE templates SET conteudo = REPLACE(conteudo, 'Churrave', 'Minha Resenha') WHERE conteudo LIKE '%Churrave%'").run();
    db.prepare("UPDATE logs_atividades SET mensagem = REPLACE(mensagem, 'Churrave', 'Minha Resenha') WHERE mensagem LIKE '%Churrave%'").run();
    db.prepare("UPDATE eventos SET nome = 'Minha Resenha de Aniversário' WHERE nome = 'Churrave' OR nome = 'Confraternização de Aniversário'").run();
    console.log("Branding migration completed.");
  } catch (e) {
    console.log("Migration error (branding):", e);
  }

  // Seed Initial Templates
  const defaultTemplates = [
    { tipo: 'wa_welcome', conteudo: 'Fala {nome}! Recebi seu cadastro para o meu niver. Vou dar uma olhada aqui e já te libero!' },
    { tipo: 'wa_approval_guest', conteudo: 'Tudo certo! Você está confirmado na minha resenha. Use o ID {id} para entrar. Acesse seu painel: {link}' },
    { tipo: 'wa_payment_confirm', conteudo: 'Recebemos seu pagamento! Seu saldo atualizado é {saldo}. Nos vemos lá!' },
    { tipo: 'wa_approval_companion', conteudo: 'O acompanhante {nome_acomp} foi aprovado e adicionado ao seu convite.' },
    { tipo: 'wa_cobranca', conteudo: 'Olá {nome}! Tudo bem? Passando para lembrar do seu saldo de R$ {saldo} para a minha resenha. Nossa chave Pix é: {chave_pix}. Qualquer dúvida estou aqui!' },
    { tipo: 'wa_confirmacao_pix', conteudo: 'Recebido, {nome}! Seu comprovante foi validado. Seu saldo atualizado agora é R$ {saldo}. Valeu!' },
    { tipo: 'wa_baixa_manual', conteudo: 'Oi {nome}! Registrei aqui o seu pagamento de R$ {valor_pago} feito em mãos. Seu saldo restante é R$ {saldo}.' },
    
    { tipo: 'email_welcome', conteudo: 'Fala {nome}! Recebi seu cadastro para o meu niver. Vou dar uma olhada aqui e já te libero!' },
    { tipo: 'email_approval_guest', conteudo: 'Tudo certo! Você está confirmado na minha resenha. Use o ID {id} para entrar. Acesse seu painel: {link}' },
    { tipo: 'email_payment_confirm', conteudo: 'Recebemos seu pagamento! Seu saldo atualizado é {saldo}. Nos vemos lá!' },
    { tipo: 'email_approval_companion', conteudo: 'O acompanhante {nome_acomp} foi aprovado e adicionado ao seu convite.' },
    { tipo: 'email_password_recovery', conteudo: 'Olá {nome}, você solicitou a recuperação de senha. Clique no link abaixo para redefinir:\n\n{link}' }
  ];

  for (const t of defaultTemplates) {
    const exists = db.prepare("SELECT * FROM templates WHERE tipo = ?").get(t.tipo);
    if (!exists) {
      db.prepare("INSERT INTO templates (tipo, conteudo) VALUES (?, ?)").run(t.tipo, t.conteudo);
    }
  }

  // Migration: Move email templates from eventos to templates table if they exist
  const currentEvent = db.prepare("SELECT * FROM eventos LIMIT 1").get() as any;
  if (currentEvent) {
    const migrations = [
      { col: 'tpl_welcome', tipo: 'email_welcome' },
      { col: 'tpl_approval_guest', tipo: 'email_approval_guest' },
      { col: 'tpl_approval_companion', tipo: 'email_approval_companion' },
      { col: 'tpl_payment_confirm', tipo: 'email_payment_confirm' },
      { col: 'tpl_password_recovery', tipo: 'email_password_recovery' }
    ];
    for (const m of migrations) {
      if (currentEvent[m.col]) {
        db.prepare("UPDATE templates SET conteudo = ? WHERE tipo = ?").run(currentEvent[m.col], m.tipo);
      }
    }
  }

  // Seed Initial Event and Admin
  loadSettingsBackup();

  const eventExists = db.prepare("SELECT * FROM eventos LIMIT 1").get();
  if (!eventExists) {
    db.prepare(`
      INSERT INTO eventos (
        nome, valor_por_pessoa, 
        tpl_welcome, tpl_approval_guest, tpl_approval_companion, 
        tpl_payment_confirm, tpl_password_recovery
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      "Minha Resenha de Aniversário",
      500.00,
      "Fala {nome}! Recebi seu cadastro para o meu niver. Vou dar uma olhada aqui e já te libero!",
      "Tudo certo! Você está confirmado na minha resenha. Use o ID {id} para entrar. Acesse seu painel em: {link}",
      "Olá {nome}, seu acompanhante foi aprovado para a minha resenha!",
      "Olá {nome}, confirmamos o recebimento do seu pagamento no valor de R$ {valor}. Valeu!",
      "Olá {nome}, para recuperar sua senha acesse o link: {link}"
    );
  }

  const adminExists = db.prepare("SELECT * FROM usuarios WHERE role = 'admin'").get();
  if (!adminExists) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync("imp598", salt);
    db.prepare("INSERT INTO usuarios (nome, email, senha_hash, role) VALUES (?, ?, ?, ?)").run(
      "Admin",
      "igorpedruzze@gmail.com",
      hash,
      "admin"
    );
  }

  // Migration: Ensure all passwords are BCrypt
  const allUsers = db.prepare("SELECT id, senha_hash FROM usuarios").all() as any[];
  const updatePass = db.prepare("UPDATE usuarios SET senha_hash = ? WHERE id = ?");
  for (const u of allUsers) {
    // BCrypt hashes usually start with $2a$ or $2b$
    if (!u.senha_hash.startsWith('$2a$') && !u.senha_hash.startsWith('$2b$')) {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(u.senha_hash, salt);
      updatePass.run(hash, u.id);
      console.log(`Migrated password to BCrypt for user ID: ${u.id}`);
    }
  }

  // Email helper
  async function sendEmail(to: string, subject: string, html: string) {
    const event = db.prepare("SELECT * FROM eventos LIMIT 1").get() as any;
    if (!event) {
      console.error("No event found in database, cannot send email.");
      return false;
    }

    const method = event.email_method || 'smtp';
    
    // Clean HTML from potential hidden characters/metadata
    let finalHtml = html && html.trim() !== "" ? html : `<p>Olá, este é um e-mail do evento ${event.nome}.</p>`;
    finalHtml = finalHtml.replace(/[\u200B-\u200D\uFEFF]/g, ''); // Remove zero-width spaces and other invisible characters

    // Dynamic Subject to prevent Gmail threading/clipping
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const dynamicSubject = `${subject} #${randomId}`;

    console.log(`Attempting to send email to ${to} using ${method}. Subject: ${dynamicSubject}`);

    if (method === 'resend') {
      if (!event.resend_api_key) {
        console.error("Resend API Key not configured, skipping email send.");
        return false;
      }
      try {
        const resend = new Resend(event.resend_api_key);
        const from = event.from_email || 'onboarding@resend.dev';
        const { data, error } = await resend.emails.send({
          from: `"${event.nome}" <${from}>`,
          to,
          subject: dynamicSubject,
          html: finalHtml,
        });

        if (error) {
          console.error("Resend error:", error);
          return false;
        }

        console.log("Email sent successfully via Resend:", data?.id);
        return true;
      } catch (error) {
        console.error("Error sending email via Resend:", error);
        return false;
      }
    } else {
      // SMTP Method
      if (!event.smtp_host || !event.smtp_user || !event.smtp_pass) {
        console.log("SMTP not configured, skipping email send.");
        return false;
      }

      try {
        const transporter = nodemailer.createTransport({
          host: event.smtp_host,
          port: event.smtp_port || 587,
          secure: event.smtp_port === 465,
          auth: {
            user: event.smtp_user,
            pass: event.smtp_pass,
          },
        });

        const from = event.from_email || event.smtp_user;
        const info = await transporter.sendMail({
          from: `"${event.nome}" <${from}>`,
          to,
          subject: dynamicSubject,
          html: finalHtml,
        });

        console.log("Email sent via SMTP: %s", info.messageId);
        return true;
      } catch (error) {
        console.error("Error sending email via SMTP:", error);
        return false;
      }
    }
  }

  function getTemplate(tipo: string): string {
    const template = db.prepare("SELECT conteudo FROM templates WHERE tipo = ?").get(tipo) as any;
    if (template && template.conteudo && template.conteudo.trim() !== "") {
      return template.conteudo;
    }
    return DEFAULT_TEMPLATES[tipo] || "";
  }

  function parseTemplate(template: string, data: any): string {
    let content = template || DEFAULT_TEMPLATES[data.tipo] || "";
    const tags: Record<string, string> = {
      '{nome}': data.nome || '',
      '{nome_convidado}': data.nome || '',
      '{id}': data.codigo_convidado || data.id || '',
      '{codigo_convidado}': data.codigo_convidado || '',
      '{valor}': data.valor || '',
      '{valor_pago}': data.valor || '',
      '{link}': data.link || '',
      '{evento}': data.evento || '',
      '{nome_evento}': data.evento || '',
      '{acompanhante}': data.acompanhante || '',
      '{nome_acomp}': data.acompanhante || '',
      '{saldo}': data.saldo || '',
      '{saldo_devedor}': data.saldo || '',
      '{chave_pix}': data.chave_pix || '',
      '{system_url}': data.system_url || data.link || ''
    };

    Object.entries(tags).forEach(([tag, value]) => {
      content = content.split(tag).join(String(value));
    });

    return content;
  }

  // Sanitization helper
  const sanitize = (str: string) => {
    if (!str || typeof str !== 'string') return str;
    return str.trim().replace(/[<>]/g, ''); // Basic XSS prevention, prepared statements handle SQLi
  };

  const validatePhone = (phone: string) => {
    if (!phone) return false;
    const digits = phone.replace(/\D/g, "");
    return digits.length >= 10 && digits.length <= 11;
  };

  const app = express();
  app.set('trust proxy', 1); // Trust first proxy (Railway/Cloud Run)
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ limit: '15mb', extended: true }));

  // Session configuration
  const sessionSecret = process.env.SESSION_SECRET || 'resenha-secret-key-default-123';
  app.use(session({
    secret: sessionSecret,
    resave: true,
    saveUninitialized: false,
    name: 'resenha_session',
    proxy: true,
    cookie: {
      httpOnly: true,
      secure: true, // Required for SameSite=None
      sameSite: 'none', // Required for Iframe compatibility
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/'
    }
  }));
  
  // Prevent directory listing middleware
  const noDirectoryListing = (req: any, res: any, next: any) => {
    if (req.url.endsWith('/')) {
      return res.status(403).send('Acesso negado');
    }
    next();
  };

  // Serve uploaded files
  app.use('/uploads', noDirectoryListing, express.static(uploadDir));
  app.use('/perfil', noDirectoryListing, express.static(perfilDir));

  // Helper to get current active event
  const getActiveEvent = () => db.prepare("SELECT * FROM eventos LIMIT 1").get() as any;

  // Helper to get current real occupancy (Confirmed RSVP)
  const getCurrentOccupancy = () => {
    const confirmedGuests = db.prepare("SELECT COUNT(*) as count FROM usuarios WHERE role = 'guest' AND status = 'ativo' AND rsvp_status = 'confirmado'").get() as any;
    const confirmedCompanions = db.prepare(`
      SELECT COUNT(*) as count 
      FROM acompanhantes a
      JOIN usuarios u ON a.usuario_id = u.id
      WHERE a.status = 'aprovado' AND u.rsvp_status = 'confirmado'
    `).get() as any;
    return (confirmedGuests.count || 0) + (confirmedCompanions.count || 0);
  };

  // Helper to save base64 image to disk
  const saveBase64Image = (base64Str: string, prefix: string, customName?: string) => {
    if (!base64Str || !base64Str.startsWith('data:image/')) return base64Str;
    
    try {
      const matches = base64Str.match(/^data:image\/([A-Za-z-+/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) return base64Str;
      
      const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
      const buffer = Buffer.from(matches[2], 'base64');
      const fileName = customName 
        ? `${customName}.${extension}`
        : `${prefix}_${Date.now()}.${extension}`;
      const filePath = path.join(uploadDir, fileName);
      
      fs.writeFileSync(filePath, buffer);
      return `/uploads/${fileName}`;
    } catch (err) {
      console.error(`Error saving ${prefix} image:`, err);
      return base64Str;
    }
  };

  function generateGuestCode(): string {
    let code = '';
    let isUnique = false;
    while (!isUnique) {
      code = Math.floor(100000 + Math.random() * 900000).toString();
      const existing = db.prepare("SELECT id FROM usuarios WHERE codigo_convidado = ?").get(code);
      if (!existing) isUnique = true;
    }
    return code;
  }

  function addLog(usuarioId: number | null, usuarioNome: string, acao: string, mensagem: string) {
    try {
      let finalNome = usuarioNome;
      if (usuarioId) {
        const user = db.prepare("SELECT codigo_convidado FROM usuarios WHERE id = ?").get(usuarioId) as any;
        if (user && user.codigo_convidado) {
          finalNome = `[ID: ${user.codigo_convidado}] ${usuarioNome}`;
        }
      }
      db.prepare("INSERT INTO logs_atividades (usuario_id, usuario_nome, acao, mensagem) VALUES (?, ?, ?, ?)").run(usuarioId, finalNome, acao, mensagem);
      // Cleanup logs older than 30 days
      db.prepare("DELETE FROM logs_atividades WHERE data_hora < datetime('now', '-30 days')").run();
    } catch (error) {
      console.error('Error adding log:', error);
    }
  }

  // API Routes
  // Public Event Info
  app.get("/api/public/event", (req, res) => {
    const event = getActiveEvent();
    if (!event) return res.status(404).json({ error: "Evento não encontrado" });
    
    const admin = db.prepare("SELECT foto_perfil, whatsapp FROM usuarios WHERE is_master = 1 LIMIT 1").get() as any;
    
    res.json({
      nome: event.nome,
      local: event.local || "Local a definir",
      data: event.data || "Data a definir",
      valor: event.valor_por_pessoa,
      flyer_landing: event.flyer_landing,
      flyer_landing_mobile: event.flyer_landing_mobile,
      flyer_dashboard: event.flyer_dashboard,
      limite_acompanhantes: event.limite_acompanhantes || 4,
      prazo_rsvp: event.prazo_rsvp,
      admin_foto: admin?.foto_perfil || null,
      admin_whatsapp: admin?.whatsapp || null,
      capacidade_maxima: event.capacidade_maxima || 50,
      ocupacao_atual: getCurrentOccupancy()
    });
  });

  app.post("/api/auth/signup", (req, res) => {
    let { name, email, whatsapp, instagram, password, companionsCount } = req.body;

    name = sanitize(name);
    email = sanitize(email);
    whatsapp = sanitize(whatsapp);
    instagram = sanitize(instagram);

    if (!name || !email || !whatsapp || !password) {
      return res.status(400).json({ error: "Nome, E-mail, WhatsApp e Senha são obrigatórios." });
    }

    if (!validatePhone(whatsapp)) {
      return res.status(400).json({ error: "Por favor, informe um número de WhatsApp válido com DDD (ex: 11 99999-9999)." });
    }

    // Validate companions count
    const event = getActiveEvent();
    if (!event) return res.status(404).json({ error: "Evento não encontrado" });

    // Security: Validate capacity before signup
    const currentOccupancy = getCurrentOccupancy();
    if (currentOccupancy >= (event.capacidade_maxima || 50)) {
      return res.status(400).json({ error: "Vagas Esgotadas! 🚀 Infelizmente atingimos o limite máximo de convidados." });
    }

    const limit = event.limite_acompanhantes || 4;
    const count = parseInt(companionsCount) || 0;

    if (count > limit) {
      return res.status(400).json({ error: `Desculpe, cada convidado pode levar no máximo ${limit} acompanhantes para garantir o conforto de todos na Resenha.` });
    }

    // Duplicity check
    const existingUser = db.prepare("SELECT status FROM usuarios WHERE LOWER(email) = LOWER(?) OR (instagram IS NOT NULL AND instagram != '' AND LOWER(instagram) = LOWER(?))").get(email, instagram) as any;
    if (existingUser) {
      if (existingUser.status === 'ativo') {
        return res.status(400).json({ error: "Você já está na lista! Verifique seu e-mail." });
      } else if (existingUser.status === 'pendente') {
        return res.status(400).json({ error: "Seu cadastro já foi recebido e está aguardando aprovação." });
      } else if (existingUser.status === 'recusado') {
        return res.status(400).json({ error: "Seu cadastro já foi realizado. Aguarde a ativação pelos organizadores." });
      }
      return res.status(400).json({ error: "Este e-mail ou instagram já está cadastrado." });
    }

    // Password complexity validation: min 6 chars, 1 letter
    const hasLetter = /[a-zA-Z]/.test(password);

    if (password.length < 6 || !hasLetter) {
      return res.status(400).json({ 
        error: "A senha deve ter no mínimo 6 caracteres e conter pelo menos 1 letra." 
      });
    }

    const perPerson = event ? event.valor_por_pessoa : 0;
    const defaultValue = perPerson * (1 + count);
    const guestCode = generateGuestCode();
    try {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(password, salt);
      const result = db.prepare(
        "INSERT INTO usuarios (nome, email, whatsapp, instagram, senha_hash, role, valor_total, status, codigo_convidado, acompanhantes_count) VALUES (?, ?, ?, ?, ?, 'guest', ?, 'pendente', ?, ?)"
      ).run(name, email, whatsapp, instagram, hash, defaultValue, guestCode, count);
      
      const user = db.prepare("SELECT * FROM usuarios WHERE id = ?").get(result.lastInsertRowid) as any;
      if (user && !user.role) user.role = 'guest';
      addLog(user.id, user.nome, 'Solicitação de Cadastro', `Convidado ${user.nome} solicitou cadastro e aguarda aprovação. ID: ${user.id}`);
      
      // Email Trigger: Signup
      if (event && email) {
        const template = getTemplate('email_welcome');
        const emailContent = parseTemplate(template, {
          tipo: 'email_welcome',
          nome: name,
          id: user.id,
          codigo_convidado: user.codigo_convidado,
          valor: defaultValue,
          evento: event.nome,
          link: event.system_url || process.env.APP_URL || "http://localhost:3000",
          system_url: event.system_url || process.env.APP_URL || "http://localhost:3000"
        });
        sendEmail(email, `Solicitação Recebida - ${event.nome}`, emailTemplate(emailContent, event)).then(success => {
          if (success) addLog(user.id, user.nome, 'E-mail Enviado', `E-mail de boas-vindas enviado para ${email}.`);
        });

        // Notify Admin
        const admin = db.prepare("SELECT email FROM usuarios WHERE is_master = 1 LIMIT 1").get() as any;
        if (admin && admin.email) {
          const adminContent = `
            <p>Olá Administrador,</p>
            <p>Um novo pré-cadastro foi realizado no sistema:</p>
            <ul>
              <li><strong>Nome:</strong> ${name}</li>
              <li><strong>E-mail:</strong> ${email}</li>
              <li><strong>WhatsApp:</strong> ${whatsapp || 'Não informado'}</li>
              <li><strong>Instagram:</strong> ${instagram || 'Não informado'}</li>
            </ul>
            <p>Acesse o painel para aprovar ou recusar este convidado.</p>
          `;
          sendEmail(admin.email, `Novo Pré-Cadastro: ${name}`, emailTemplate(adminContent, event));
        }
      }

      res.json(user);
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: "Este e-mail já está cadastrado." });
      }
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;
    const event = getActiveEvent();
    if (!event) return res.status(404).json({ error: "Evento não encontrado" });

    try {
      const user = db.prepare("SELECT * FROM usuarios WHERE LOWER(email) = LOWER(?)").get(email) as any;
      
      if (!user) {
        // For security, don't reveal if email exists, but the requirement says "verificar se o e-mail existe"
        return res.status(404).json({ error: "E-mail não encontrado em nossa base." });
      }

      if (user.role === 'guest' && user.status !== 'ativo') {
        return res.status(403).json({ error: "Sua conta ainda não foi aprovada pelo organizador." });
      }

      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const expires = Date.now() + 3600000; // 1 hour

      db.prepare("UPDATE usuarios SET reset_token = ?, reset_token_expires = ? WHERE id = ?").run(token, expires, user.id);

      const baseUrl = event.system_url || process.env.APP_URL || 'http://localhost:3000';
      const resetLink = `${baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl}/reset-password?token=${token}`;
      
      const template = getTemplate('email_password_recovery');
      const emailContent = parseTemplate(template, {
        tipo: 'email_password_recovery',
        nome: user.nome,
        link: resetLink,
        evento: event.nome
      });

      const success = await sendEmail(email, `Recuperação de Senha - ${event.nome}`, emailTemplate(emailContent, event));
      
      if (success) {
        addLog(user.id, user.nome, 'Recuperação de Senha', `E-mail de recuperação enviado para ${email}.`);
        res.json({ success: true, message: "E-mail de recuperação enviado com sucesso!" });
      } else {
        res.status(500).json({ error: "Erro ao enviar e-mail. Verifique as configurações de SMTP." });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/auth/reset-password", (req, res) => {
    const { token, newPassword } = req.body;
    try {
      const user = db.prepare("SELECT * FROM usuarios WHERE reset_token = ? AND reset_token_expires > ?").get(token, Date.now()) as any;
      
      if (!user) {
        return res.status(400).json({ error: "Token inválido ou expirado." });
      }

      // Password complexity validation: min 6 chars, 1 letter
      const hasLetter = /[a-zA-Z]/.test(newPassword);
      if (newPassword.length < 6 || !hasLetter) {
        return res.status(400).json({ 
          error: "A senha deve ter no mínimo 6 caracteres e conter pelo menos 1 letra." 
        });
      }

      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(newPassword, salt);
      db.prepare("UPDATE usuarios SET senha_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?").run(hash, user.id);
      
      addLog(user.id, user.nome, 'Senha Redefinida', `O usuário ${user.nome} redefiniu sua senha com sucesso.`);
      
      res.json({ success: true, message: "Senha redefinida com sucesso!" });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/auth/me", (req, res) => {
    const userId = (req.session as any).userId;
    if (!userId) return res.status(401).json({ error: "Não autenticado" });

    const user = db.prepare("SELECT * FROM usuarios WHERE id = ?").get(userId) as any;
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

    res.json(user);
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    try {
      const user = db.prepare("SELECT * FROM usuarios WHERE LOWER(email) = LOWER(?)").get(email) as any;
      if (user && bcrypt.compareSync(password, user.senha_hash)) {
        // Ensure role is set
        if (!user.role) user.role = 'guest';

        if (user.role === 'guest') {
          if (user.status === 'pendente') {
            return res.status(403).json({ error: "Cadastro recebido! O organizador está analisando sua solicitação. Você receberá uma confirmação em breve." });
          }
          if (user.status === 'recusado') {
            return res.status(403).json({ error: "Sua solicitação de cadastro foi recusada pelo organizador." });
          }
        }

        // Set session
        (req.session as any).userId = user.id;
        (req.session as any).userRole = user.role;

        res.json(user);
      } else {
        res.status(401).json({ error: "E-mail ou senha incorretos. Verifique seus dados." });
      }
    } catch (error: any) {
      console.error('Login error:', error);
      res.status(500).json({ error: "Erro interno no servidor" });
    }
  });

  app.get("/api/user/:id/balance", (req, res) => {
    const { id } = req.params;
    const event = getActiveEvent();
    if (!event) return res.status(404).json({ error: "Nenhum evento ativo encontrado" });
    
    const user = db.prepare("SELECT * FROM usuarios WHERE id = ?").get(id) as any;
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
    const userId = user.id;

    const totalDue = user.rsvp_status === 'desistente' ? 0 : (user.valor_total !== null ? user.valor_total : event.valor_por_pessoa);
    
    // Only count 'concluido' payments for balance
    const payments = db.prepare("SELECT SUM(valor) as total_paid FROM pagamentos WHERE usuario_id = ? AND evento_id = ? AND status = 'concluido'").get(userId, event.id);
    const history = db.prepare("SELECT * FROM pagamentos WHERE usuario_id = ? AND evento_id = ? ORDER BY data_pagamento DESC").all(userId, event.id);
    
    const totalPaid = (payments as any).total_paid || 0;
    const balance = totalDue - totalPaid;
    
    if (user.role === 'guest') {
      addLog(user.id, user.nome, 'Visualização', `Convidado ${user.nome} visualizou o painel do cliente.`);
    }
    
    res.json({
      totalDue,
      totalPaid,
      balance,
      history,
      pixKey: event.pix_key,
      info_texto: event.info_texto || "",
      flyer_info: event.flyer_info || ""
    });
  });

  app.post("/api/user/rsvp", (req, res) => {
    const { userId, action } = req.body;
    if (!userId || !action) return res.status(400).json({ error: "Dados incompletos" });

    const user = db.prepare("SELECT * FROM usuarios WHERE id = ?").get(userId) as any;
    if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

    const event = getActiveEvent();
    if (!event) return res.status(404).json({ error: "Evento não encontrado" });

    // Check deadline
    if (event.prazo_rsvp) {
      const deadline = new Date(event.prazo_rsvp);
      if (new Date() > deadline) {
        return res.status(400).json({ error: "O prazo para confirmação expirou" });
      }
    }

    if (action === 'confirm') {
      // Check capacity
      const currentConfirmed = getCurrentOccupancy();
      
      // Count this user + their approved companions
      const userCompanions = db.prepare("SELECT COUNT(*) as count FROM acompanhantes WHERE usuario_id = ? AND status = 'aprovado'").get(userId) as any;
      const userTotal = 1 + (userCompanions.count || 0);

      if (currentConfirmed + userTotal > (event.capacidade_maxima || 50)) {
        db.prepare("UPDATE usuarios SET rsvp_status = 'lista_espera' WHERE id = ?").run(userId);
        addLog(userId, user.nome, 'RSVP - Lista de Espera', `Entrou na lista de espera (Lotação atingida: ${currentConfirmed}/${event.capacidade_maxima})`);
        return res.json({ 
          success: true, 
          status: 'lista_espera',
          message: "Desculpe, a lotação máxima já foi atingida. Sua vaga foi para a lista de espera." 
        });
      }

      db.prepare("UPDATE usuarios SET rsvp_status = 'confirmado' WHERE id = ?").run(userId);
      addLog(userId, user.nome, 'RSVP - Confirmado', "Confirmou presença via RSVP");
      return res.json({ success: true, status: 'confirmado' });
    } else if (action === 'confirm_waitlist') {
      // Check capacity again
      const currentConfirmed = getCurrentOccupancy();
      const userCompanions = db.prepare("SELECT COUNT(*) as count FROM acompanhantes WHERE usuario_id = ? AND status = 'aprovado'").get(userId) as any;
      const userTotal = 1 + (userCompanions.count || 0);

      if (currentConfirmed + userTotal <= (event.capacidade_maxima || 50)) {
        db.prepare("UPDATE usuarios SET rsvp_status = 'confirmado' WHERE id = ?").run(userId);
        addLog(userId, user.nome, 'RSVP - Confirmado (Lista de Espera)', "Confirmou presença saindo da lista de espera");
        return res.json({ success: true, status: 'confirmado' });
      } else {
        return res.status(400).json({ error: "Ainda não há vagas disponíveis." });
      }
    } else if (action === 'decline') {
      // Auto-remove companions to free up space
      const companionsCount = db.prepare("SELECT COUNT(*) as count FROM acompanhantes WHERE usuario_id = ?").get(userId) as any;
      if (companionsCount.count > 0) {
        db.prepare("DELETE FROM acompanhantes WHERE usuario_id = ?").run(userId);
        // Reset valor_total to single person value since companions are gone
        db.prepare("UPDATE usuarios SET valor_total = ? WHERE id = ?").run(event.valor_por_pessoa, userId);
        addLog(userId, user.nome, 'RSVP - Desistente (Limpou Acompanhantes)', `Informou que não poderá comparecer e removeu automaticamente ${companionsCount.count} acompanhante(s). Valor total resetado.`);
      } else {
        addLog(userId, user.nome, 'RSVP - Desistente', "Informou que não poderá comparecer");
      }
      
      db.prepare("UPDATE usuarios SET rsvp_status = 'desistente' WHERE id = ?").run(userId);
      return res.json({ 
        success: true, 
        status: 'desistente',
        message: companionsCount.count > 0 ? "Desistência registrada. Seus acompanhantes foram removidos para liberar as vagas." : "Desistência registrada."
      });
    }

    res.status(400).json({ error: "Ação inválida" });
  });

  app.post("/api/user/profile-picture", async (req, res) => {
    const { userId, imageBase64 } = req.body;
    if (!userId || !imageBase64) return res.status(400).json({ error: "Dados incompletos" });

    try {
      const user = db.prepare("SELECT id, nome, role, codigo_convidado FROM usuarios WHERE id = ?").get(userId) as any;
      if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

      const matches = imageBase64.match(/^data:image\/([A-Za-z-+/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) return res.status(400).json({ error: "Formato de imagem inválido" });

      const buffer = Buffer.from(matches[2], 'base64');
      const type = user.role === 'admin' ? 'admin' : 'convidado';
      const identifier = user.role === 'admin' ? user.id : (user.codigo_convidado || user.id);
      const fileName = `perfil_${type}_${identifier}.jpg`;
      const filePath = path.join(perfilDir, fileName);

      await sharp(buffer)
        .resize(200, 200, { fit: 'cover' })
        .toFormat('jpeg')
        .jpeg({ quality: 80 })
        .toFile(filePath);

      const fotoUrl = `/perfil/${fileName}?t=${Date.now()}`;
      db.prepare("UPDATE usuarios SET foto_perfil = ? WHERE id = ?").run(fotoUrl, userId);

      addLog(userId, user.nome || 'Usuário', 'Foto de Perfil', `Usuário atualizou sua foto de perfil.`);
      res.json({ success: true, fotoUrl });
    } catch (error: any) {
      console.error("Profile picture upload error:", error);
      res.status(500).json({ error: "Erro ao processar imagem" });
    }
  });

  // Submit Payment Receipt
  app.post("/api/payments/submit", (req, res) => {
    const { userId, amount, comprovanteBase64 } = req.body;
    const event = getActiveEvent();
    
    if (!event) {
      return res.status(404).json({ error: "Nenhum evento ativo encontrado" });
    }
    
    const user = db.prepare("SELECT nome FROM usuarios WHERE id = ?").get(userId) as any;
    const sanitizedName = (user?.nome || 'usuario')
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_');
    
    const customFileName = `pagamento_${userId}_${sanitizedName}`;
    const comprovanteUrl = saveBase64Image(comprovanteBase64, 'comprovante', customFileName);

    try {
      db.prepare("INSERT INTO pagamentos (usuario_id, evento_id, valor, status, comprovante_url) VALUES (?, ?, ?, ?, ?)").run(
        userId, 
        event.id, 
        amount, 
        'pendente',
        comprovanteUrl
      );
      addLog(userId, user?.nome || 'Usuário', 'Envio de Comprovante', `Convidado ${user?.nome} enviou um comprovante de R$ ${amount} para análise.`);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Admin: List Pending Payments
  app.get("/api/admin/pending-payments", (req, res) => {
    const payments = db.prepare(`
      SELECT p.*, u.nome as user_name, u.email as user_email, u.whatsapp 
      FROM pagamentos p 
      JOIN usuarios u ON p.usuario_id = u.id 
      WHERE p.status = 'pendente'
      ORDER BY p.data_pagamento ASC
    `).all();
    res.json(payments);
  });

  app.post("/api/admin/guests/update-all-values", (req, res) => {
    const { valor } = req.body;
    if (valor === undefined || isNaN(Number(valor))) {
      return res.status(400).json({ error: "Valor inválido" });
    }

    try {
      const admin = db.prepare("SELECT id, nome FROM usuarios WHERE role = 'admin' LIMIT 1").get() as any;
      // Atualiza o valor total considerando o valor base por pessoa e a quantidade de acompanhantes declarada no cadastro
      db.prepare("UPDATE usuarios SET valor_total = ? * (1 + acompanhantes_count) WHERE role = 'guest'").run(Number(valor));
      addLog(admin?.id || null, admin?.nome || 'Adm', 'Atualização em Massa', `Adm ${admin?.nome} atualizou o valor base de todos os convidados para R$ ${valor}. O total de cada um foi recalculado com base nos acompanhantes.`);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Guest Management Endpoints
  app.get("/api/admin/guests", (req, res) => {
    const guests = db.prepare(`
      SELECT u.id, u.nome, u.email, u.whatsapp, u.instagram, u.confirmado, u.valor_total, u.codigo_convidado, u.status, u.acompanhantes_count,
      (SELECT COUNT(*) FROM acompanhantes WHERE usuario_id = u.id) as companion_count
      FROM usuarios u 
      WHERE u.role = 'guest' 
      ORDER BY u.nome ASC
    `).all();
    
    // Enrich with companion details
    const enrichedGuests = guests.map((g: any) => {
      const companions = db.prepare("SELECT id, nome, instagram, status FROM acompanhantes WHERE usuario_id = ?").all(g.id);
      return { ...g, companions };
    });
    
    res.json(enrichedGuests);
  });

  app.get("/api/companions/:userId", (req, res) => {
    const { userId } = req.params;
    const companions = db.prepare("SELECT * FROM acompanhantes WHERE usuario_id = ?").all(userId);
    res.json(companions);
  });

  app.post("/api/companions", (req, res) => {
    const { userId, nome, instagram } = req.body;
    const event = getActiveEvent();
    
    if (!event) {
      return res.status(404).json({ error: "Nenhum evento ativo encontrado" });
    }

    try {
      // Security Check: Must be confirmed to add companions
      const user = db.prepare("SELECT nome, rsvp_status FROM usuarios WHERE id = ?").get(userId) as any;
      if (!user || user.rsvp_status !== 'confirmado') {
        return res.status(403).json({ error: "Você precisa confirmar sua presença antes de adicionar acompanhantes." });
      }

      // Get limit from config
      const limit = event?.limite_acompanhantes || 4;

      // Check limit
      const count = db.prepare("SELECT COUNT(*) as count FROM acompanhantes WHERE usuario_id = ?").get(userId) as any;
      if (count.count >= limit) {
        return res.status(400).json({ error: `Desculpe, cada convidado pode levar no máximo ${limit} acompanhantes para garantir o conforto de todos na Resenha.` });
      }

      // Check if user has already paid (cannot add companions if paid/quitado)
      const guestStats = db.prepare(`
        SELECT u.valor_total, 
        COALESCE((SELECT SUM(valor) FROM pagamentos WHERE usuario_id = u.id AND status = 'concluido'), 0) as paid
        FROM usuarios u WHERE u.id = ?
      `).get(userId) as any;

      if (guestStats && guestStats.paid >= guestStats.valor_total) {
        return res.status(400).json({ error: "Não é possível adicionar acompanhantes após a quitação do convite." });
      }

      db.prepare("INSERT INTO acompanhantes (usuario_id, nome, instagram, status) VALUES (?, ?, ?, 'pendente_aprovacao')").run(userId, nome, instagram);
      
      addLog(userId, user?.nome || 'Usuário', 'Solicitação de Acompanhante', `Convidado ${user?.nome} solicitou a adição do acompanhante ${nome}. Aguardando aprovação.`);
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/admin/companions/:id/approve", (req, res) => {
    const { id } = req.params;
    const event = getActiveEvent();
    if (!event) return res.status(404).json({ error: "Evento não encontrado" });

    try {
      const companion = db.prepare("SELECT * FROM acompanhantes WHERE id = ?").get(id) as any;
      if (!companion) return res.status(404).json({ error: "Acompanhante não encontrado" });
      if (companion.status === 'aprovado') return res.json({ success: true });

      db.prepare("UPDATE acompanhantes SET status = 'aprovado' WHERE id = ?").run(id);
      
      // Update guest total value
      const guest = db.prepare("SELECT * FROM usuarios WHERE id = ?").get(companion.usuario_id) as any;
      const approvedCount = db.prepare("SELECT COUNT(*) as count FROM acompanhantes WHERE usuario_id = ? AND status = 'aprovado' AND id != ?").get(companion.usuario_id, id) as any;
      
      // Se o número de acompanhantes já aprovados for maior ou igual ao número inicial declarado no cadastro,
      // cada novo acompanhante aprovado incrementa o valor total.
      // Caso contrário, o valor já estava embutido no valor_total inicial.
      if (approvedCount.count >= (guest.acompanhantes_count || 0)) {
        const newValue = (guest?.valor_total || 0) + event.valor_por_pessoa;
        db.prepare("UPDATE usuarios SET valor_total = ? WHERE id = ?").run(newValue, companion.usuario_id);
      }
      
      const admin = db.prepare("SELECT id, nome FROM usuarios WHERE role = 'admin' LIMIT 1").get() as any;
      addLog(admin?.id || null, admin?.nome || 'Adm', 'Aprovação de Acompanhante', `Adm ${admin?.nome} aprovou o acompanhante ${companion.nome}. Valor total atualizado.`);
      
      // Email Trigger: Companion Approved
      if (guest && guest.email) {
        const template = getTemplate('email_approval_companion');
        const emailContent = parseTemplate(template, {
          tipo: 'email_approval_companion',
          nome: guest.nome,
          evento: event.nome,
          acompanhante: companion.nome
        });
        sendEmail(guest.email, `Acompanhante Aprovado - ${event.nome}`, emailTemplate(emailContent, event)).then(success => {
          if (success) addLog(guest.id, guest.nome, 'E-mail Enviado', `E-mail de aprovação de acompanhante (${companion.nome}) enviado para ${guest.email}.`);
        });
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/admin/companions/:id/reject", (req, res) => {
    const id = Number(req.params.id);
    console.log(`REJECT COMPANION REQUEST: id=${id}`);
    try {
      const companion = db.prepare("SELECT * FROM acompanhantes WHERE id = ?").get(id) as any;
      if (!companion) return res.status(404).json({ error: "Acompanhante não encontrado" });

      db.prepare("DELETE FROM acompanhantes WHERE id = ?").run(id);
      
      const admin = db.prepare("SELECT id, nome FROM usuarios WHERE role = 'admin' LIMIT 1").get() as any;
      addLog(admin?.id || null, admin?.nome || 'Adm', 'Rejeição de Acompanhante', `Adm ${admin?.nome} rejeitou o acompanhante ${companion.nome}.`);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Reject companion error:", error);
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/companions/:id", (req, res) => {
    const id = Number(req.params.id);
    const userId = req.query.userId || req.body.userId;
    const isAdmin = req.query.isAdmin === 'true' || req.body.isAdmin === true;
    
    console.log(`DELETE COMPANION REQUEST: id=${id}, userId=${userId}, isAdmin=${isAdmin}`);
    const event = getActiveEvent();

    try {
      const companion = db.prepare("SELECT * FROM acompanhantes WHERE id = ?").get(id) as any;
      if (!companion) {
        console.log(`Companion not found: ${id}`);
        return res.status(404).json({ error: `Acompanhante ID ${id} não encontrado.` });
      }

      const targetUserId = Number(userId || companion.usuario_id);
      console.log(`Deleting companion ${companion.nome} for user ${targetUserId}`);

      // Check if user has already paid (only for non-admin requests)
      if (!isAdmin) {
        const guestStats = db.prepare(`
          SELECT u.valor_total, 
          COALESCE((SELECT SUM(valor) FROM pagamentos WHERE usuario_id = u.id AND status = 'concluido'), 0) as paid
          FROM usuarios u WHERE u.id = ?
        `).get(targetUserId) as any;

        if (guestStats && guestStats.paid >= guestStats.valor_total && guestStats.valor_total > 0) {
          console.log(`Cannot delete companion: user ${targetUserId} already paid.`);
          return res.status(400).json({ error: "Não é possível remover acompanhantes após a quitação do convite. Entre em contato com o organizador." });
        }
      }

      const guestStats = db.prepare(`
        SELECT u.valor_total, u.nome
        FROM usuarios u WHERE u.id = ?
      `).get(targetUserId) as any;

      const deleteInfo = db.prepare("DELETE FROM acompanhantes WHERE id = ?").run(id);
      console.log(`Delete result:`, deleteInfo);
      
      if (deleteInfo.changes > 0 && companion.status === 'aprovado') {
        const newValue = Math.max(0, (guestStats?.valor_total || 0) - (event?.valor_por_pessoa || 0));
        db.prepare("UPDATE usuarios SET valor_total = ? WHERE id = ?").run(newValue, targetUserId);
        console.log(`Updated user ${targetUserId} valor_total to ${newValue}`);
      }
      
      const logUser = isAdmin ? "Administrador" : (guestStats?.nome || 'Usuário');
      addLog(targetUserId, logUser, 'Remoção de Acompanhante', `${logUser} removeu o acompanhante ${companion.nome}.`);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete companion error:", error);
      res.status(500).json({ error: "Erro interno ao excluir acompanhante: " + error.message });
    }
  });

  app.post("/api/admin/guests", (req, res) => {
    let { nome, email, whatsapp, instagram, password, valor_total, acompanhantes_count, rsvp_status } = req.body;
    
    nome = sanitize(nome);
    email = sanitize(email);
    whatsapp = sanitize(whatsapp);
    instagram = sanitize(instagram);

    if (!validatePhone(whatsapp)) {
      return res.status(400).json({ error: "Por favor, informe um número de WhatsApp válido com DDD." });
    }

    const event = getActiveEvent();
    const count = parseInt(acompanhantes_count) || 0;
    const perPerson = event ? event.valor_por_pessoa : 0;
    const finalValue = valor_total !== undefined ? Number(valor_total) : (perPerson * (1 + count));
    const guestCode = generateGuestCode();
    try {
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(password || '123456', salt);
      const result = db.prepare(
        "INSERT INTO usuarios (nome, email, whatsapp, instagram, senha_hash, role, valor_total, codigo_convidado, acompanhantes_count, rsvp_status) VALUES (?, ?, ?, ?, ?, 'guest', ?, ?, ?, ?)"
      ).run(nome, email, whatsapp, instagram, hash, finalValue, guestCode, count, rsvp_status || null);
      const guest = db.prepare("SELECT * FROM usuarios WHERE id = ?").get(result.lastInsertRowid) as any;
      const admin = db.prepare("SELECT nome FROM usuarios WHERE is_master = 1 LIMIT 1").get() as any;
      addLog(admin?.id || null, admin?.nome || 'Adm', 'Criação de Convidado', `Adm ${admin?.nome} cadastrou o convidado ${nome} com valor de R$ ${finalValue}.`);
      res.json(guest);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.put("/api/admin/guests/:id", (req, res) => {
    const { nome, email, whatsapp, instagram, valor_total, acompanhantes_count, rsvp_status } = req.body;
    const { id } = req.params;

    if (!validatePhone(whatsapp)) {
      return res.status(400).json({ error: "Por favor, informe um número de WhatsApp válido com DDD." });
    }

    try {
      const oldGuest = db.prepare("SELECT * FROM usuarios WHERE id = ?").get(id) as any;
      db.prepare(
        "UPDATE usuarios SET nome = ?, email = ?, whatsapp = ?, instagram = ?, valor_total = ?, acompanhantes_count = ?, rsvp_status = ? WHERE id = ?"
      ).run(nome, email, whatsapp, instagram, valor_total, acompanhantes_count, rsvp_status, id);
      
      const admin = db.prepare("SELECT id, nome FROM usuarios WHERE role = 'admin' LIMIT 1").get() as any;
      let msg = `Adm ${admin?.nome} alterou dados de ${nome}.`;
      if (oldGuest.valor_total !== Number(valor_total)) {
        msg = `Adm ${admin?.nome} alterou o valor do convite de ${nome} de R$ ${oldGuest.valor_total} para R$ ${valor_total}.`;
      }
      addLog(admin?.id || null, admin?.nome || 'Adm', 'Edição de Convidado', msg);
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete("/api/admin/guests/:id", (req, res) => {
    const id = Number(req.params.id);
    console.log(`DELETE GUEST REQUEST: id=${id}`);
    try {
      const guest = db.prepare("SELECT nome FROM usuarios WHERE id = ?").get(id) as any;
      if (!guest) {
        console.log(`Guest not found: ${id}`);
        return res.status(404).json({ error: "Convidado não encontrado" });
      }

      // Delete associated data
      db.prepare("DELETE FROM pagamentos WHERE usuario_id = ?").run(id);
      db.prepare("DELETE FROM acompanhantes WHERE usuario_id = ?").run(id);
      db.prepare("DELETE FROM logs_atividades WHERE usuario_id = ?").run(id);
      const deleteInfo = db.prepare("DELETE FROM usuarios WHERE id = ?").run(id);
      console.log(`Delete result:`, deleteInfo);
      
      if (deleteInfo.changes === 0) {
        return res.status(500).json({ error: "Falha ao excluir convidado do banco de dados." });
      }

      const admin = db.prepare("SELECT id, nome FROM usuarios WHERE role = 'admin' LIMIT 1").get() as any;
      addLog(admin?.id || null, admin?.nome || 'Adm', 'Exclusão de Convidado', `Adm ${admin?.nome} excluiu o convidado ${guest?.nome}.`);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Delete guest error:", error);
      res.status(500).json({ error: "Erro interno ao excluir convidado: " + error.message });
    }
  });

  // Admin: Refund Payment
  app.post("/api/admin/guests/:id/refund", (req, res) => {
    const { id } = req.params;
    const { amount, reason } = req.body;
    const event = getActiveEvent();

    if (!event) return res.status(404).json({ error: "Evento não encontrado" });

    try {
      const guest = db.prepare("SELECT * FROM usuarios WHERE id = ?").get(id) as any;
      if (!guest) return res.status(404).json({ error: "Convidado não encontrado" });

      // Insert a negative payment record to represent the refund
      db.prepare("INSERT INTO pagamentos (usuario_id, evento_id, valor, status, observacao) VALUES (?, ?, ?, ?, ?)").run(
        id,
        event.id,
        -Math.abs(amount),
        'concluido',
        reason || 'Devolução de Valor (Estorno)'
      );

      const admin = db.prepare("SELECT id, nome FROM usuarios WHERE role = 'admin' LIMIT 1").get() as any;
      addLog(admin?.id || null, admin?.nome || 'Adm', 'Devolução de Valor', `Adm ${admin?.nome} devolveu R$ ${amount} para ${guest.nome}. Motivo: ${reason || 'Não informado'}`);

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Change RSVP Status
  app.post("/api/admin/guests/:id/rsvp-status", (req, res) => {
    const { id } = req.params;
    const { status } = req.body; // 'confirmado', 'desistente', 'lista_espera'

    try {
      const guest = db.prepare("SELECT * FROM usuarios WHERE id = ?").get(id) as any;
      if (!guest) return res.status(404).json({ error: "Convidado não encontrado" });

      db.prepare("UPDATE usuarios SET rsvp_status = ? WHERE id = ?").run(status, id);

      const admin = db.prepare("SELECT id, nome FROM usuarios WHERE role = 'admin' LIMIT 1").get() as any;
      addLog(admin?.id || null, admin?.nome || 'Adm', 'Alteração RSVP', `Adm ${admin?.nome} alterou o status de presença de ${guest.nome} para ${status}.`);

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Admin: Manual Payment Entry
  app.post("/api/admin/payments/manual", (req, res) => {
    const { userId, amount, observation } = req.body;
    const event = getActiveEvent();
    
    if (!event) {
      return res.status(404).json({ error: "Nenhum evento ativo encontrado" });
    }
    
    try {
      db.prepare("INSERT INTO pagamentos (usuario_id, evento_id, valor, status, observacao) VALUES (?, ?, ?, ?, ?)").run(
        userId, 
        event.id, 
        amount, 
        'concluido',
        observation || 'Recebimento Manual pelo Organizador'
      );
      const guest = db.prepare("SELECT nome FROM usuarios WHERE id = ?").get(userId) as any;
      const admin = db.prepare("SELECT id, nome FROM usuarios WHERE role = 'admin' LIMIT 1").get() as any;
      addLog(admin?.id || null, admin?.nome || 'Adm', 'Baixa Manual', `Adm ${admin?.nome} registrou baixa manual de R$ ${amount} para ${guest?.nome}.`);
      
      // Email Trigger: Payment Receipt
      const user = db.prepare("SELECT * FROM usuarios WHERE id = ?").get(userId) as any;
      if (user && user.email) {
        const totalPaidResult = db.prepare("SELECT SUM(valor) as total FROM pagamentos WHERE usuario_id = ? AND status = 'concluido'").get(userId) as any;
        const totalPaid = totalPaidResult.total || 0;
        const balance = Math.max(0, user.valor_total - totalPaid);

        const template = getTemplate('email_payment_confirm');
        const emailContent = parseTemplate(template, {
          tipo: 'email_payment_confirm',
          nome: user.nome,
          valor: Number(amount).toFixed(2),
          saldo: balance.toFixed(2),
          evento: event.nome
        });
        sendEmail(user.email, `Recibo de Pagamento - ${event.nome}`, emailTemplate(emailContent, event)).then(success => {
          if (success) addLog(user.id, user.nome, 'E-mail Enviado', `E-mail de recibo de pagamento (R$ ${amount}) enviado para ${user.email}.`);
        });
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // Admin: Approve/Reject Payment
  app.post("/api/admin/payments/:id/action", (req, res) => {
    const { id } = req.params;
    const { action } = req.body; // 'approve' or 'reject'
    const status = action === 'approve' ? 'concluido' : 'rejeitado';
    
    try {
      const payment = db.prepare("SELECT p.*, u.nome as user_name, u.email as user_email, u.valor_total FROM pagamentos p JOIN usuarios u ON p.usuario_id = u.id WHERE p.id = ?").get(id) as any;
      
      if (!payment) {
        return res.status(404).json({ error: "Pagamento não encontrado" });
      }

      // Physical deletion of the receipt file
      if (payment.comprovante_url && payment.comprovante_url.startsWith('/uploads/')) {
        try {
          const fileName = payment.comprovante_url.replace('/uploads/', '');
          const filePath = path.join(uploadDir, fileName);
          
          // Security check: ensure the path is still inside uploadDir
          if (filePath.startsWith(uploadDir) && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log(`Physical file deleted: ${filePath}`);
          }
        } catch (err) {
          console.error("Error deleting physical file:", err);
          // We continue anyway to update the database
        }
      }

      db.prepare("UPDATE pagamentos SET status = ?, comprovante_url = NULL WHERE id = ?").run(status, id);
      
      const admin = db.prepare("SELECT id, nome FROM usuarios WHERE role = 'admin' LIMIT 1").get() as any;
      const acao = action === 'approve' ? 'Aprovação de Pix' : 'Rejeição de Pix';
      const msg = action === 'approve' 
        ? `Adm ${admin?.nome} aprovou o Pix de R$ ${payment.valor} de ${payment.user_name}.`
        : `Adm ${admin?.nome} rejeitou o Pix de R$ ${payment.valor} de ${payment.user_name}.`;
      
      addLog(admin?.id || null, admin?.nome || 'Adm', acao, msg);

      // Email Trigger: Payment Approved
      if (action === 'approve') {
        const event = getActiveEvent();
        const totalPaidResult = db.prepare("SELECT SUM(valor) as total FROM pagamentos WHERE usuario_id = ? AND status = 'concluido'").get(payment.usuario_id) as any;
        const totalPaid = totalPaidResult.total || 0;
        const balance = Math.max(0, payment.valor_total - totalPaid);

        const template = getTemplate('email_payment_confirm');
        const emailContent = parseTemplate(template, {
          tipo: 'email_payment_confirm',
          nome: payment.user_name,
          valor: payment.valor.toFixed(2),
          saldo: balance.toFixed(2),
          evento: event.nome
        });
        sendEmail(payment.user_email, `Pagamento Confirmado - ${event.nome}`, emailTemplate(emailContent, event)).then(success => {
          if (success) addLog(payment.usuario_id, payment.user_name, 'E-mail Enviado', `E-mail de confirmação de pagamento Pix (R$ ${payment.valor}) enviado para ${payment.user_email}.`);
        });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/admin/stats", (req, res) => {
    const event = getActiveEvent();
    if (!event) {
      return res.status(404).json({ error: "Nenhum evento ativo encontrado" });
    }
    const totalArrecadado = db.prepare("SELECT COALESCE(SUM(valor), 0) as total FROM pagamentos WHERE evento_id = ? AND status = 'concluido'").get(event.id) as any;
    const totalEsperadoResult = db.prepare("SELECT COALESCE(SUM(COALESCE(valor_total, ?)), 0) as total FROM usuarios WHERE role = 'guest' AND status = 'ativo' AND (rsvp_status IS NULL OR rsvp_status != 'desistente')").get(event.valor_por_pessoa) as any;
    const totalEsperado = totalEsperadoResult?.total || 0;

    // RSVP Confirmed Stats
    const confirmedCount = getCurrentOccupancy();

    const totalGuests = db.prepare("SELECT COUNT(*) as count FROM usuarios WHERE role = 'guest'").get() as any;
    const totalCompanions = db.prepare("SELECT COUNT(*) as count FROM acompanhantes").get() as any;
    const totalRequests = (totalGuests?.count || 0) + (totalCompanions?.count || 0);

    const totalCustos = db.prepare("SELECT COALESCE(SUM(total), 0) as total FROM custos WHERE evento_id = ?").get(event.id) as any;
    const custos = db.prepare("SELECT * FROM custos WHERE evento_id = ?").all(event.id);

    const totalVendasExtras = db.prepare("SELECT COALESCE(SUM(valor), 0) as total FROM vendas_extras WHERE evento_id = ?").get(event.id) as any;
    const vendasExtras = db.prepare("SELECT * FROM vendas_extras WHERE evento_id = ?").all(event.id);

    const guests = db.prepare(`
      SELECT 
        u.*, 
        COALESCE(SUM(CASE WHEN p.status = 'concluido' THEN p.valor ELSE 0 END), 0) as paid,
        (SELECT COUNT(*) FROM acompanhantes WHERE usuario_id = u.id) as companion_count
      FROM usuarios u 
      LEFT JOIN pagamentos p ON u.id = p.usuario_id AND p.evento_id = ?
      WHERE u.role = 'guest'
      GROUP BY u.id
    `).all(event.id);

    res.json({
      totalArrecadado: totalArrecadado?.total || 0,
      totalVendasExtras: totalVendasExtras?.total || 0,
      vendasExtras,
      totalEsperado,
      confirmedCount,
      totalRequests,
      totalCustos: totalCustos?.total || 0,
      custos,
      capacity: event.capacidade_maxima || 50,
      guests: guests.map((g: any) => {
        const companions = db.prepare("SELECT id, nome, instagram, status FROM acompanhantes WHERE usuario_id = ?").all(g.id);
        return {
          ...g,
          status: g.status || 'ativo',
          companions
        };
      }),
      eventValue: event.valor_por_pessoa,
      pixKey: event.pix_key
    });
  });

  app.get("/api/admin/costs", (req, res) => {
    const event = getActiveEvent();
    if (!event) return res.status(404).json({ error: "Evento não encontrado" });
    const costs = db.prepare("SELECT * FROM custos WHERE evento_id = ?").all(event.id);
    res.json(costs);
  });

  app.post("/api/admin/costs", (req, res) => {
    const { costs } = req.body; // Array of costs
    const event = getActiveEvent();
    if (!event) return res.status(404).json({ error: "Evento não encontrado" });

    try {
      db.transaction(() => {
        // Simple approach: delete all and re-insert for bulk update
        // Or we could do a more sophisticated sync. For now, let's do bulk sync.
        db.prepare("DELETE FROM custos WHERE evento_id = ?").run(event.id);
        const insert = db.prepare(`
          INSERT INTO custos (evento_id, descricao, quantidade, unidade, valor_unitario, total, categoria)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        for (const cost of costs) {
          insert.run(
            event.id,
            cost.descricao,
            cost.quantidade || 1,
            cost.unidade || "",
            cost.valor_unitario || 0,
            (cost.quantidade || 1) * (cost.valor_unitario || 0),
            cost.categoria || "Geral"
          );
        }
      })();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/sales", (req, res) => {
    const { sales } = req.body; // Array of sales
    const event = getActiveEvent();
    if (!event) return res.status(404).json({ error: "Evento não encontrado" });

    try {
      db.transaction(() => {
        db.prepare("DELETE FROM vendas_extras WHERE evento_id = ?").run(event.id);
        const insert = db.prepare(`
          INSERT INTO vendas_extras (evento_id, descricao, valor, categoria)
          VALUES (?, ?, ?, ?)
        `);
        for (const sale of sales) {
          insert.run(
            event.id,
            sale.descricao,
            sale.valor || 0,
            sale.categoria || "Outros"
          );
        }
      })();
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/approve-guest", (req, res) => {
    const { guestId, adminId, adminName } = req.body;
    try {
      const guest = db.prepare("SELECT * FROM usuarios WHERE id = ?").get(guestId) as any;
      if (!guest) return res.status(404).json({ error: "Convidado não encontrado" });

      db.prepare("UPDATE usuarios SET status = 'ativo' WHERE id = ?").run(guestId);
      
      addLog(adminId, adminName, 'Aprovação de Convidado', `O administrador ${adminName} aprovou o cadastro de ${guest.nome}.`);
      
      // Email Trigger: Guest Approved
      const event = getActiveEvent();
      if (guest && guest.email && event) {
        const template = getTemplate('email_approval_guest');
        const emailContent = parseTemplate(template, {
          tipo: 'email_approval_guest',
          nome: guest.nome,
          id: guestId,
          codigo_convidado: guest.codigo_convidado,
          valor: guest.valor_total || event.valor_por_pessoa,
          evento: event.nome,
          link: event.system_url || process.env.APP_URL || "http://localhost:3000",
          system_url: event.system_url || process.env.APP_URL || "http://localhost:3000"
        });
        sendEmail(guest.email, `Cadastro Aprovado! - ${event.nome}`, emailTemplate(emailContent, event)).then(success => {
          if (success) addLog(guest.id, guest.nome, 'E-mail Enviado', `E-mail de aprovação enviado para ${guest.email}.`);
        });
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/reject-guest", (req, res) => {
    const { guestId, adminId, adminName } = req.body;
    console.log(`REJECT GUEST REQUEST: guestId=${guestId}, adminId=${adminId}`);
    try {
      const guest = db.prepare("SELECT nome FROM usuarios WHERE id = ?").get(guestId) as any;
      if (!guest) {
        console.log(`Guest not found for rejection: ${guestId}`);
        return res.status(404).json({ error: "Convidado não encontrado" });
      }

      // Just update status to 'recusado'
      db.prepare("UPDATE usuarios SET status = 'recusado' WHERE id = ?").run(guestId);
      
      addLog(adminId, adminName, 'Recusa de Convidado', `O administrador ${adminName} recusou o cadastro de ${guest.nome}.`);
      
      res.json({ success: true });
    } catch (error: any) {
      console.error("Reject guest error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/reactivate-guest", (req, res) => {
    const { guestId, adminId, adminName } = req.body;
    try {
      const guest = db.prepare("SELECT nome FROM usuarios WHERE id = ?").get(guestId) as any;
      if (!guest) return res.status(404).json({ error: "Convidado não encontrado" });

      db.prepare("UPDATE usuarios SET status = 'ativo' WHERE id = ?").run(guestId);
      addLog(adminId, adminName, 'Reativação de Convidado', `O administrador ${adminName} reativou o cadastro de ${guest.nome}.`);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete("/api/admin/guests/:id", (req, res) => {
    const { id } = req.params;
    const { adminId, adminName } = req.query;
    try {
      const guest = db.prepare("SELECT nome FROM usuarios WHERE id = ?").get(id) as any;
      if (!guest) return res.status(404).json({ error: "Convidado não encontrado" });

      db.prepare("DELETE FROM pagamentos WHERE usuario_id = ?").run(id);
      db.prepare("DELETE FROM acompanhantes WHERE usuario_id = ?").run(id);
      db.prepare("DELETE FROM logs_atividades WHERE usuario_id = ?").run(id);
      db.prepare("DELETE FROM usuarios WHERE id = ?").run(id);
      
      if (adminId && adminName) {
        addLog(Number(adminId), String(adminName), 'Exclusão Permanente', `O administrador ${adminName} excluiu permanentemente o cadastro de ${guest.nome}.`);
      }
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Maintenance / Backup Routes
  app.get("/api/admin/backups", (req, res) => {
    if ((req.session as any).userRole !== 'admin') return res.status(403).json({ error: "Acesso negado" });
    const user = db.prepare("SELECT is_master FROM usuarios WHERE id = ?").get((req.session as any).userId) as any;
    if (!user || user.is_master !== 1) return res.status(403).json({ error: "Acesso negado" });

    const backups = db.prepare("SELECT id, data_hora, nome FROM backups ORDER BY data_hora DESC").all();
    res.json(backups);
  });

  app.post("/api/admin/backups", (req, res) => {
    if ((req.session as any).userRole !== 'admin') return res.status(403).json({ error: "Acesso negado" });
    const user = db.prepare("SELECT is_master FROM usuarios WHERE id = ?").get((req.session as any).userId) as any;
    if (!user || user.is_master !== 1) return res.status(403).json({ error: "Acesso negado" });

    const { nome } = req.body;
    
    try {
      const tables = ['eventos', 'usuarios', 'pagamentos', 'acompanhantes', 'templates', 'logs_atividades', 'custos', 'vendas_extras'];
      const data: any = {};
      for (const table of tables) {
        data[table] = db.prepare(`SELECT * FROM ${table}`).all();
      }
      
      const conteudo = JSON.stringify(data);
      db.prepare("INSERT INTO backups (nome, conteudo) VALUES (?, ?)").run(nome || `Backup ${new Date().toLocaleString()}`, conteudo);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error creating backup:", error);
      res.status(500).json({ error: "Erro ao criar backup" });
    }
  });

  app.get("/api/admin/backups/:id/download", (req, res) => {
    if ((req.session as any).userRole !== 'admin') return res.status(403).json({ error: "Acesso negado" });
    const user = db.prepare("SELECT is_master FROM usuarios WHERE id = ?").get((req.session as any).userId) as any;
    if (!user || user.is_master !== 1) return res.status(403).json({ error: "Acesso negado" });

    const backup = db.prepare("SELECT * FROM backups WHERE id = ?").get(req.params.id) as any;
    if (!backup) return res.status(404).json({ error: "Backup não encontrado" });
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=backup_${backup.nome.replace(/\s+/g, '_')}.json`);
    res.send(backup.conteudo);
  });

  app.post("/api/admin/backups/:id/restore", (req, res) => {
    if ((req.session as any).userRole !== 'admin') return res.status(403).json({ error: "Acesso negado" });
    const user = db.prepare("SELECT is_master FROM usuarios WHERE id = ?").get((req.session as any).userId) as any;
    if (!user || user.is_master !== 1) return res.status(403).json({ error: "Acesso negado" });

    const backup = db.prepare("SELECT * FROM backups WHERE id = ?").get(req.params.id) as any;
    if (!backup) return res.status(404).json({ error: "Backup não encontrado" });
    
    try {
      const data = JSON.parse(backup.conteudo);
      restoreData(data);
      res.json({ success: true });
    } catch (error) {
      console.error("Error restoring backup:", error);
      res.status(500).json({ error: "Erro ao restaurar backup" });
    }
  });

  app.delete("/api/admin/backups/:id", (req, res) => {
    if ((req.session as any).userRole !== 'admin') return res.status(403).json({ error: "Acesso negado" });
    const user = db.prepare("SELECT is_master FROM usuarios WHERE id = ?").get((req.session as any).userId) as any;
    if (!user || user.is_master !== 1) return res.status(403).json({ error: "Acesso negado" });

    db.prepare("DELETE FROM backups WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/admin/backups/import", express.json({ limit: '50mb' }), (req, res) => {
    if ((req.session as any).userRole !== 'admin') return res.status(403).json({ error: "Acesso negado" });
    const user = db.prepare("SELECT is_master FROM usuarios WHERE id = ?").get((req.session as any).userId) as any;
    if (!user || user.is_master !== 1) return res.status(403).json({ error: "Acesso negado" });

    const { data } = req.body;
    try {
      restoreData(data);
      res.json({ success: true });
    } catch (error) {
      console.error("Error importing backup:", error);
      res.status(500).json({ error: "Erro ao importar backup" });
    }
  });

  app.post("/api/admin/maintenance/cleanup", (req, res) => {
    if ((req.session as any).userRole !== 'admin') return res.status(403).json({ error: "Acesso negado" });
    const user = db.prepare("SELECT is_master FROM usuarios WHERE id = ?").get((req.session as any).userId) as any;
    if (!user || user.is_master !== 1) return res.status(403).json({ error: "Acesso negado" });

    const { type } = req.body;
    
    try {
      db.transaction(() => {
        switch (type) {
          case 'financial':
            db.prepare("DELETE FROM pagamentos").run();
            db.prepare("DELETE FROM custos").run();
            db.prepare("DELETE FROM vendas_extras").run();
            db.prepare("UPDATE usuarios SET valor_total = 0").run();
            break;
          case 'guests_all':
            db.prepare("DELETE FROM acompanhantes").run();
            db.prepare("DELETE FROM pagamentos").run();
            db.prepare("DELETE FROM usuarios WHERE is_master = 0 AND role != 'admin'").run();
            break;
          case 'companions_only':
            db.prepare("DELETE FROM acompanhantes").run();
            break;
          case 'unapproved_only':
            db.prepare("DELETE FROM acompanhantes WHERE status = 'pendente_aprovacao'").run();
            db.prepare("DELETE FROM usuarios WHERE status IN ('pendente', 'recusado') AND is_master = 0 AND role != 'admin'").run();
            break;
          case 'logs':
            db.prepare("DELETE FROM logs_atividades").run();
            break;
          case 'reset_event':
            db.prepare(`
              UPDATE eventos SET 
                data = NULL, 
                local = NULL, 
                pix_key = NULL, 
                capacidade_maxima = 50, 
                prazo_rsvp = NULL,
                info_texto = NULL
            `).run();
            break;
          default:
            throw new Error("Tipo de limpeza inválido");
        }
      })();
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error during cleanup:", error);
      res.status(500).json({ error: "Erro ao realizar limpeza" });
    }
  });

  function restoreData(data: any) {
    const tables = ['eventos', 'usuarios', 'pagamentos', 'acompanhantes', 'templates', 'logs_atividades', 'custos', 'vendas_extras'];
    
    db.transaction(() => {
      for (const table of tables) {
        if (data[table]) {
          db.prepare(`DELETE FROM ${table}`).run();
          const rows = data[table];
          if (rows.length > 0) {
            const columns = Object.keys(rows[0]);
            const placeholders = columns.map(() => "?").join(", ");
            const insert = db.prepare(`INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`);
            for (const row of rows) {
              insert.run(Object.values(row));
            }
          }
        }
      }
    })();
  }

  app.get("/api/admin/config", (req, res) => {
    const event = getActiveEvent();
    const admin = db.prepare("SELECT id, nome, email, whatsapp FROM usuarios WHERE is_master = 1 LIMIT 1").get() as any;
    
    if (!event || !admin) return res.status(404).json({ error: "Configurações não encontradas" });
    
    res.json({
      event: {
        nome: event.nome,
        local: event.local || "",
        data: event.data || "",
        valor: event.valor_por_pessoa,
        pixKey: event.pix_key || "",
        flyer_landing: event.flyer_landing || "",
        flyer_landing_mobile: event.flyer_landing_mobile || "",
        flyer_dashboard: event.flyer_dashboard || "",
        capacidade_maxima: event.capacidade_maxima || 50,
        smtp_host: event.smtp_host || "",
        smtp_port: event.smtp_port || 587,
        smtp_user: event.smtp_user || "",
        smtp_pass: event.smtp_pass || "",
        email_method: event.email_method || "smtp",
        resend_api_key: event.resend_api_key || "",
        from_email: event.from_email || "",
        system_url: event.system_url || "",
        info_texto: event.info_texto || "",
        flyer_info: event.flyer_info || "",
        limite_acompanhantes: event.limite_acompanhantes || 4,
        prazo_rsvp: event.prazo_rsvp || "",
        admin2_email: event.admin2_email || "",
        admin3_email: event.admin3_email || ""
      },
      organizador: {
        nome: admin.nome,
        email: admin.email,
        whatsapp: admin.whatsapp || ""
      }
    });
  });

  app.post("/api/admin/config", (req, res) => {
    const { event, organizador } = req.body;

    if (!validatePhone(organizador.whatsapp)) {
      return res.status(400).json({ error: "Por favor, informe um número de WhatsApp válido para o organizador." });
    }

    console.log("Receiving config update:", { event, organizador });
    const activeEvent = getActiveEvent();
    const admin = db.prepare("SELECT id FROM usuarios WHERE is_master = 1 LIMIT 1").get() as any;

    const flyerLanding = saveBase64Image(event.flyer_landing, 'flyer_landing');
    const flyerLandingMobile = saveBase64Image(event.flyer_landing_mobile, 'flyer_landing_mobile');
    const flyerDashboard = saveBase64Image(event.flyer_dashboard, 'flyer_dashboard');
    const flyerInfo = saveBase64Image(event.flyer_info, 'flyer_info');

    try {
      db.transaction(() => {
        db.prepare(`
          UPDATE eventos SET 
            nome = ?, 
            local = ?, 
            data = ?, 
            valor_por_pessoa = ?, 
            pix_key = ?,
            flyer_landing = ?,
            flyer_landing_mobile = ?,
            flyer_dashboard = ?,
            flyer_info = ?,
            info_texto = ?,
            capacidade_maxima = ?,
            smtp_host = ?,
            smtp_port = ?,
            smtp_user = ?,
            smtp_pass = ?,
            email_method = ?,
            resend_api_key = ?,
            from_email = ?,
            system_url = ?,
            limite_acompanhantes = ?,
            prazo_rsvp = ?,
            admin2_email = ?,
            admin3_email = ?
          WHERE id = ?
        `).run(
          event.nome, 
          event.local, 
          event.data, 
          event.valor, 
          event.pixKey, 
          flyerLanding, 
          flyerLandingMobile,
          flyerDashboard, 
          flyerInfo,
          event.info_texto,
          event.capacidade_maxima,
          event.smtp_host,
          event.smtp_port,
          event.smtp_user,
          event.smtp_pass,
          event.email_method,
          event.resend_api_key,
          event.from_email,
          event.system_url,
          event.limite_acompanhantes || 4,
          event.prazo_rsvp,
          event.admin2_email,
          event.admin3_email,
          activeEvent.id
        );

        // Update roles for secondary admins
        const adminConfigs = [
          { email: event.admin2_email, password: event.admin2_password },
          { email: event.admin3_email, password: event.admin3_password }
        ].filter(c => c.email);
        
        // Reset old secondary admins to guest (if they are not master)
        db.prepare("UPDATE usuarios SET role = 'guest' WHERE role = 'admin' AND is_master = 0").run();
        
        // Set new secondary admins
        for (const config of adminConfigs) {
          const existing = db.prepare("SELECT id FROM usuarios WHERE LOWER(email) = LOWER(?)").get(config.email) as any;
          
          if (existing) {
            // Update existing user
            if (config.password) {
              const hash = bcrypt.hashSync(config.password, 10);
              db.prepare("UPDATE usuarios SET role = 'admin', senha_hash = ? WHERE id = ? AND is_master = 0").run(hash, existing.id);
            } else {
              db.prepare("UPDATE usuarios SET role = 'admin' WHERE id = ? AND is_master = 0").run(existing.id);
            }
          } else if (config.password) {
            // Create new admin user if password provided
            const hash = bcrypt.hashSync(config.password, 10);
            db.prepare(`
              INSERT INTO usuarios (nome, email, senha_hash, role, status, is_master) 
              VALUES (?, ?, ?, 'admin', 'ativo', 0)
            `).run(config.email.split('@')[0], config.email, hash);
          }
        }

        db.prepare(`
          UPDATE usuarios SET 
            nome = ?, 
            email = ?, 
            whatsapp = ? 
          WHERE id = ?
        `).run(organizador.nome, organizador.email, organizador.whatsapp, admin.id);
      })();
      
      saveSettingsBackup();
      addLog(admin.id, organizador.nome, 'Configuração', `Adm ${organizador.nome} atualizou as configurações do evento e/ou flyers.`);
      
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/admin/test-email", async (req, res) => {
    const { email, config } = req.body;
    const event = getActiveEvent();
    
    // Temporarily update DB to test with provided config
    // Actually, it's better to just use the provided config directly in a test function
    
    try {
      const method = config.email_method || 'smtp';
      let success = false;

      const testHtml = `
        <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 8px; max-width: 500px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Teste de Configuração</h2>
          <p>Este é um e-mail de teste enviado para validar suas configurações no sistema <strong>${event.nome}</strong>.</p>
          <p>Se você recebeu este e-mail, sua configuração de <strong>${method.toUpperCase()}</strong> está funcionando corretamente!</p>
        </div>
      `;

      const finalTestHtml = testHtml.replace(/[\u200B-\u200D\uFEFF]/g, '');
      const randomId = Math.floor(1000 + Math.random() * 9000);
      const dynamicSubject = `Teste de E-mail #${randomId} - ${event.nome}`;

      if (method === 'resend') {
        if (!config.resend_api_key) throw new Error("API Key do Resend não informada");
        const resend = new Resend(config.resend_api_key);
        const from = config.from_email || 'onboarding@resend.dev';
        
        const { data, error } = await resend.emails.send({
          from: `"${event.nome}" <${from}>`,
          to: email,
          subject: dynamicSubject,
          html: finalTestHtml,
        });

        if (error) {
          console.error("Resend test error:", error);
          throw new Error(error.message || "Erro retornado pelo Resend");
        }
        success = true;
      } else {
        const transporter = nodemailer.createTransport({
          host: config.smtp_host,
          port: config.smtp_port || 587,
          secure: config.smtp_port === 465,
          auth: {
            user: config.smtp_user,
            pass: config.smtp_pass,
          },
        });

        const from = config.from_email || config.smtp_user;
        await transporter.sendMail({
          from: `"${event.nome}" <${from}>`,
          to: email,
          subject: dynamicSubject,
          html: finalTestHtml,
        });
        success = true;
      }

      if (success) {
        res.json({ success: true, message: "E-mail de teste enviado com sucesso!" });
      } else {
        throw new Error("Falha ao enviar e-mail de teste.");
      }
    } catch (error: any) {
      console.error("Test email error:", error);
      res.status(400).json({ error: error.message || "Erro ao enviar e-mail de teste." });
    }
  });

  app.post("/api/admin/change-password", (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const admin = db.prepare("SELECT id, senha_hash FROM usuarios WHERE is_master = 1 LIMIT 1").get() as any;

    if (admin.senha_hash !== currentPassword) {
      return res.status(401).json({ error: "Senha atual incorreta" });
    }

    // Password complexity validation: min 6 chars, 1 letter
    const hasLetter = /[a-zA-Z]/.test(newPassword);
    if (newPassword.length < 6 || !hasLetter) {
      return res.status(400).json({ 
        error: "A senha deve ter no mínimo 6 caracteres e conter pelo menos 1 letra." 
      });
    }

    try {
      db.prepare("UPDATE usuarios SET senha_hash = ? WHERE id = ?").run(newPassword, admin.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post("/api/admin/config/pix", (req, res) => {
    const { pixKey } = req.body;
    const event = getActiveEvent();
    if (!event) return res.status(404).json({ error: "Evento não encontrado" });
    
    try {
      db.prepare("UPDATE eventos SET pix_key = ? WHERE id = ?").run(pixKey, event.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get("/api/admin/templates", (req, res) => {
    const templates = db.prepare("SELECT * FROM templates").all();
    res.json(templates);
  });

  app.put("/api/admin/templates", (req, res) => {
    const { templates } = req.body;
    if (!Array.isArray(templates)) return res.status(400).json({ error: "Formato inválido" });

    const update = db.prepare("UPDATE templates SET conteudo = ? WHERE tipo = ?");
    const transaction = db.transaction((templatesToUpdate) => {
      for (const t of templatesToUpdate) {
        update.run(t.conteudo, t.tipo);
      }
    });

    try {
      transaction(templates);
      const admin = db.prepare("SELECT id, nome FROM usuarios WHERE role = 'admin' LIMIT 1").get() as any;
      addLog(admin?.id || null, admin?.nome || 'Adm', 'Templates', `Adm ${admin?.nome} atualizou os templates de mensagens.`);
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/admin/send-custom-email", async (req, res) => {
    const { userId, email, subject, message } = req.body;
    const event = getActiveEvent();
    
    if (!event) return res.status(404).json({ error: "Evento não encontrado" });
    if (!email || !message) return res.status(400).json({ error: "E-mail e mensagem são obrigatórios" });

    try {
      // Format message with line breaks to HTML
      const formattedMessage = message.replace(/\n/g, '<br>');
      
      const success = await sendEmail(email, subject, emailTemplate(formattedMessage, event));
      
      if (success) {
        if (userId) {
          const user = db.prepare("SELECT nome FROM usuarios WHERE id = ?").get(userId) as any;
          addLog(userId, user?.nome || 'Usuário', 'Informativo Enviado', `Informativo enviado por e-mail: ${subject}`);
        }
        res.json({ success: true });
      } else {
        res.status(500).json({ error: "Falha ao enviar e-mail" });
      }
    } catch (error: any) {
      console.error("Send custom email error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/admin/logs", (req, res) => {
    try {
      const logs = db.prepare("SELECT * FROM logs_atividades ORDER BY data_hora DESC").all();
      res.json(logs);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite middleware loaded");
    } catch (err) {
      console.error("Failed to create Vite server:", err);
    }
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
// Last update: 2026-03-10 16:17
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("CRITICAL: Failed to start server:", err);
});
