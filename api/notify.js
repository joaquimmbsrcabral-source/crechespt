/**
 * Vercel Serverless Function — envia emails de notificação via Resend.
 *
 * Verifica que o caller é admin (Firebase ID token + admins/{uid} doc).
 * Templates fixos para evitar abuse.
 *
 * Env vars necessárias (Vercel → Settings → Environment Variables):
 *   - RESEND_API_KEY              (de resend.com)
 *   - FIREBASE_SERVICE_ACCOUNT    (JSON da service account, base64-encoded)
 */

import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

// ===== Templates =====
const TEMPLATES = {
  // Quando aplicas uma correção de idade reportada por um utilizador
  report_applied: {
    subject: (d) => `A tua correção em "${d.creche_name}" foi aplicada — obrigado!`,
    text: (d) => `Olá,

Recebi o teu report sobre ${d.creche_name} e acabei de aplicar a correção. A informação correta já está visível em creches.app para todos os pais.

Aplicado:
• Tipo: ${d.tipo || "—"}
• Idades: ${d.min}–${d.max} meses

Obrigado por ajudares a tornar isto melhor.

— Joaquim
creches.app`,
    html: (d) => `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;color:#2C2356;line-height:1.55">
  <p>Olá,</p>
  <p>Recebi o teu report sobre <b>${escapeHtml(d.creche_name)}</b> e acabei de aplicar a correção. A informação correta já está visível em <a href="https://creches.app" style="color:#FF6B9D">creches.app</a> para todos os pais.</p>
  <div style="background:#FFF6EE;border-radius:10px;padding:14px 16px;margin:16px 0">
    <b>Aplicado:</b><br>
    • Tipo: ${escapeHtml(d.tipo || "—")}<br>
    • Idades: ${d.min}–${d.max} meses
  </div>
  <p>Obrigado por ajudares a tornar isto melhor.</p>
  <p>— Joaquim<br><a href="https://creches.app" style="color:#FF6B9D">creches.app</a></p>
</div>`
  },

  // Pedir info completa a quem submeteu apenas dados parciais
  more_info_needed: {
    subject: (d) => `Para colocarmos a ${d.creche_name || "vossa creche"} no mapa, precisamos de mais 2 minutos do vosso tempo`,
    text: (d) => `Olá,

Obrigado por nos contactarem para listar a ${d.creche_name || "vossa creche"} no creches.app.

Para podermos colocar a vossa creche no mapa e acessível aos pais, precisamos de alguns dados adicionais que ainda não temos:

  • Morada completa (rua, número, código postal)
  • Idades atendidas (berçário 4-12m, creche 4-36m, JI 3-6 anos, ATL)
  • Telefone de contacto principal
  • Website ou rede social (se tiverem)
  • Horário de funcionamento (opcional)

Em vez de responderem por aqui, peço-vos que tornem a preencher o formulário aqui (5 minutos):

  https://creches.app/para-creches

Já agora — também é grátis e fica grátis. Não há subscrições, não há comissões.

Se tiverem alguma dúvida, respondam a este email.

— Joaquim
creches.app`,
    html: (d) => `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;color:#2C2356;line-height:1.55">
  <p>Olá,</p>
  <p>Obrigado por nos contactarem para listar a <b>${escapeHtml(d.creche_name || "vossa creche")}</b> no <a href="https://creches.app" style="color:#FF6B9D">creches.app</a>.</p>
  <p>Para podermos colocar a vossa creche no mapa e acessível aos pais, precisamos de alguns dados adicionais que ainda não temos:</p>
  <ul>
    <li>Morada completa (rua, número, código postal)</li>
    <li>Idades atendidas (berçário, creche, JI, ATL)</li>
    <li>Telefone de contacto principal</li>
    <li>Website ou rede social (se tiverem)</li>
    <li>Horário de funcionamento (opcional)</li>
  </ul>
  <p>Em vez de responderem por aqui, peço-vos que tornem a preencher o formulário (são 5 minutos):</p>
  <p><a href="https://creches.app/para-creches" style="display:inline-block;background:#FF6B9D;color:#fff;padding:12px 22px;border-radius:20px;text-decoration:none;font-weight:600">Preencher formulário</a></p>
  <p style="color:#6E6989;font-size:14px">Já agora — também é grátis e fica grátis. Não há subscrições, não há comissões.</p>
  <p>Se tiverem alguma dúvida, respondam a este email.</p>
  <p>— Joaquim<br><a href="https://creches.app" style="color:#FF6B9D">creches.app</a></p>
</div>`
  },

  // Quando aprovas uma creche que pediu para entrar
  creche_approved: {
    subject: (d) => `A ${d.creche_name} já está em creches.app`,
    text: (d) => `Olá,

Obrigado por nos contactarem. Acabei de adicionar a ${d.creche_name} ao mapa em creches.app — já está visível para todos os pais que procurem creche em ${d.distrito}.

Vejam aqui: https://creches.app

Se notarem alguma informação errada (idades, telefone, horário), respondam a este email e corrijo. Se quiserem sair do mapa no futuro, têm um botão "remover esta creche" na ficha da vossa instituição.

— Joaquim
creches.app`,
    html: (d) => `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:520px;color:#2C2356;line-height:1.55">
  <p>Olá,</p>
  <p>Obrigado por nos contactarem. Acabei de adicionar a <b>${escapeHtml(d.creche_name)}</b> ao mapa em <a href="https://creches.app" style="color:#FF6B9D">creches.app</a> — já está visível para todos os pais que procurem creche em ${escapeHtml(d.distrito || "Portugal")}.</p>
  <p><a href="https://creches.app" style="display:inline-block;background:#FF6B9D;color:#fff;padding:10px 18px;border-radius:20px;text-decoration:none;font-weight:600">Ver no mapa</a></p>
  <p>Se notarem alguma informação errada (idades, telefone, horário), respondam a este email e corrijo. Se quiserem sair do mapa no futuro, têm um botão "remover esta creche" na ficha da vossa instituição.</p>
  <p>— Joaquim<br><a href="https://creches.app" style="color:#FF6B9D">creches.app</a></p>
</div>`
  }
};

function escapeHtml(s) {
  return String(s || "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"})[c]);
}

// ===== Firebase Admin init (uma vez) =====
function initFirebase() {
  if (getApps().length) return;
  const sa = JSON.parse(
    Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT, "base64").toString("utf-8")
  );
  initializeApp({ credential: cert(sa) });
}

// ===== Handler =====
export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "https://creches.app");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    if (!process.env.RESEND_API_KEY) throw new Error("RESEND_API_KEY missing");
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) throw new Error("FIREBASE_SERVICE_ACCOUNT missing");

    initFirebase();

    // Verify Firebase ID token
    const authHeader = req.headers.authorization || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ error: "Missing auth token" });

    let decoded;
    try {
      decoded = await getAuth().verifyIdToken(token);
    } catch (e) {
      return res.status(401).json({ error: "Invalid token", details: e.message });
    }

    // Verify caller is admin
    const adminDoc = await getFirestore().doc(`admins/${decoded.uid}`).get();
    if (!adminDoc.exists) return res.status(403).json({ error: "Not an admin" });

    // Validate payload
    const { template, to, data } = req.body || {};
    if (!template || !TEMPLATES[template]) {
      return res.status(400).json({ error: "Invalid template", available: Object.keys(TEMPLATES) });
    }
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return res.status(400).json({ error: "Invalid recipient email" });
    }

    const tpl = TEMPLATES[template];
    const payload = {
      from: "Creches.app <onboarding@resend.dev>",
      to: [to],
      reply_to: "geral@creches.app",
      subject: tpl.subject(data || {}),
      text: tpl.text(data || {}),
      html: tpl.html(data || {})
    };

    // Send via Resend
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await resp.json();
    if (!resp.ok) {
      console.error("Resend error:", result);
      return res.status(502).json({ error: "Resend rejected", details: result });
    }

    return res.status(200).json({ success: true, id: result.id });
  } catch (e) {
    console.error("notify error:", e);
    return res.status(500).json({ error: e.message });
  }
}
