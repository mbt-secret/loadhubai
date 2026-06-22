import { EventEmitter } from 'node:events';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { defaultWhatsappProfileDir, nowIso } from './db.mjs';

// Logger minimal, silentios, compatibil cu interfata asteptata de Baileys.
const silentLogger = {
  level: 'silent',
  trace() {}, debug() {}, info() {}, warn() {}, error() {}, fatal() {},
  child() { return silentLogger; }
};

function digitsOnly(value) {
  return String(value ?? '').replace(/[^0-9]/g, '');
}

function extractText(msg) {
  const m = msg?.message;
  if (!m) return '';
  return (
    m.conversation ??
    m.extendedTextMessage?.text ??
    m.imageMessage?.caption ??
    m.videoMessage?.caption ??
    m.documentMessage?.caption ??
    m.buttonsResponseMessage?.selectedDisplayText ??
    m.listResponseMessage?.title ??
    m.templateButtonReplyMessage?.selectedDisplayText ??
    ''
  ) || '';
}

/**
 * Adaptor WhatsApp READ-ONLY bazat pe Baileys (protocol oficial multi-device, fara browser/Chromium).
 * Pastreaza aceeasi interfata publica precum vechiul adaptor Playwright:
 *   getStatus(), connect({phoneNumber}), disconnect(), refreshGroups(), importGroupMessages()
 *   + callback-urile onGroups(groups) / onMessage(message) si evenimentele 'status' / 'error'.
 *
 * Strict read-only: nu trimite mesaje, nu marcheaza citit, nu seteaza prezenta online.
 */
export class WhatsappAdapter extends EventEmitter {
  constructor({
    profileDir = defaultWhatsappProfileDir,
    onGroups = () => {},
    onMessage = () => {},
    activeGroupsProvider = () => []
  } = {}) {
    super();
    this.profileDir = resolve(profileDir);
    this.onGroups = onGroups;
    this.onMessage = onMessage;
    this.activeGroupsProvider = activeGroupsProvider;
    this.sock = null;
    this.saveCreds = null;
    this.starting = false;
    this.shouldReconnect = true;
    this.pendingPairingNumber = null;
    this.pairingRequested = false;
    this.reconnectAttempts = 0;
    this.groupCache = new Map();
    this.status = {
      connected: false,
      state: 'disconnected',
      message: 'WhatsApp nu este conectat.',
      lastSyncAt: null,
      qrCodeDataUrl: null,
      pairingCode: null
    };
  }

  getStatus() {
    return { ...this.status };
  }

  setStatus(patch) {
    this.status = { ...this.status, ...patch };
    this.emit('status', this.getStatus());
  }

  async connect({ phoneNumber } = {}) {
    if (this.status.connected && this.sock) return this.getStatus();
    if (phoneNumber) {
      this.pendingPairingNumber = digitsOnly(phoneNumber);
      this.pairingRequested = false;
    }
    this.shouldReconnect = true;
    if (!this.starting) {
      await this.startSocket();
    }
    return this.getStatus();
  }

  async loadBaileys() {
    const mod = await import('@whiskeysockets/baileys');
    const makeWASocket = mod.default ?? mod.makeWASocket;
    const pick = (key) => mod[key] ?? mod.default?.[key];
    return {
      makeWASocket,
      useMultiFileAuthState: pick('useMultiFileAuthState'),
      DisconnectReason: pick('DisconnectReason') ?? {},
      Browsers: pick('Browsers'),
      fetchLatestBaileysVersion: pick('fetchLatestBaileysVersion')
    };
  }

  async startSocket() {
    this.starting = true;
    mkdirSync(this.profileDir, { recursive: true });
    this.setStatus({ connected: false, state: 'starting', message: 'Se conecteaza la WhatsApp...', qrCodeDataUrl: null });

    let lib;
    try {
      lib = await this.loadBaileys();
    } catch (error) {
      this.starting = false;
      this.setStatus({
        connected: false,
        state: 'error',
        message: 'Libraria WhatsApp (baileys) nu este instalata. Ruleaza npm install.'
      });
      return;
    }

    const { makeWASocket, useMultiFileAuthState, DisconnectReason, Browsers, fetchLatestBaileysVersion } = lib;
    if (typeof makeWASocket !== 'function' || typeof useMultiFileAuthState !== 'function') {
      this.starting = false;
      this.setStatus({ connected: false, state: 'error', message: 'Versiune baileys incompatibila.' });
      return;
    }

    const { state, saveCreds } = await useMultiFileAuthState(this.profileDir);
    this.saveCreds = saveCreds;

    let version;
    try {
      if (fetchLatestBaileysVersion) ({ version } = await fetchLatestBaileysVersion());
    } catch {
      version = undefined;
    }

    const browser = (Browsers && typeof Browsers.ubuntu === 'function')
      ? Browsers.ubuntu('Chrome')
      : ['Ubuntu', 'Chrome', '22.04.4'];

    const sock = makeWASocket({
      auth: state,
      version,
      logger: silentLogger,
      browser,
      markOnlineOnConnect: false,
      syncFullHistory: false,
      generateHighQualityLinkPreview: false,
      shouldSyncHistoryMessage: () => false
    });
    this.sock = sock;
    this.starting = false;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        if (this.pendingPairingNumber && !this.pairingRequested && !sock.authState?.creds?.registered) {
          this.pairingRequested = true;
          try {
            const code = await sock.requestPairingCode(this.pendingPairingNumber);
            const pretty = String(code).match(/.{1,4}/g)?.join('-') ?? code;
            this.setStatus({
              connected: false,
              state: 'pairing',
              message: 'Deschide WhatsApp pe telefon -> Setari -> Dispozitive conectate -> Conecteaza cu numarul de telefon, apoi introdu codul.',
              pairingCode: pretty,
              qrCodeDataUrl: null
            });
          } catch (error) {
            this.setStatus({ connected: false, state: 'error', message: 'Nu am putut genera codul de asociere: ' + (error?.message ?? error) });
          }
        } else if (!this.pendingPairingNumber) {
          try {
            const QRCode = (await import('qrcode')).default;
            const dataUrl = await QRCode.toDataURL(qr);
            this.setStatus({
              connected: false,
              state: 'qr',
              message: 'Scaneaza codul QR cu WhatsApp de pe alt dispozitiv (Dispozitive conectate -> Conecteaza un dispozitiv).',
              qrCodeDataUrl: dataUrl,
              pairingCode: null
            });
          } catch {
            // pachetul qrcode lipseste; ignoram
          }
        }
        return;
      }

      if (connection === 'open') {
        this.reconnectAttempts = 0;
        this.pendingPairingNumber = null;
        this.pairingRequested = false;
        this.setStatus({
          connected: true,
          state: 'connected',
          message: 'WhatsApp este conectat.',
          lastSyncAt: nowIso(),
          qrCodeDataUrl: null,
          pairingCode: null
        });
        this.refreshGroups().catch((error) => this.emit('error', error));
        return;
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const loggedOut = DisconnectReason && statusCode === DisconnectReason.loggedOut;
        this.sock = null;

        if (loggedOut) {
          this.shouldReconnect = false;
          try { rmSync(this.profileDir, { recursive: true, force: true }); } catch {}
          this.setStatus({
            connected: false,
            state: 'disconnected',
            message: 'WhatsApp a fost deconectat (delogat). Conecteaza din nou.',
            qrCodeDataUrl: null,
            pairingCode: null
          });
          return;
        }

        if (this.shouldReconnect) {
          this.reconnectAttempts += 1;
          const delay = Math.min(30000, 2000 * this.reconnectAttempts);
          this.setStatus({ connected: false, state: 'starting', message: 'Reconectare la WhatsApp...' });
          setTimeout(() => {
            if (this.shouldReconnect && !this.starting) {
              this.startSocket().catch((error) => this.emit('error', error));
            }
          }, delay);
        }
      }
    });

    sock.ev.on('messages.upsert', async (payload) => {
      if (payload?.type !== 'notify') return;
      const messages = payload.messages ?? [];
      const activeIds = new Set(this.activeGroupsProvider().map((group) => String(group.whatsappId ?? '')));
      if (activeIds.size === 0) return; // niciun grup activ -> nu ingeram nimic

      for (const msg of messages) {
        try {
          const jid = msg?.key?.remoteJid ?? '';
          if (!jid.endsWith('@g.us')) continue;       // doar grupuri
          if (msg?.key?.fromMe) continue;
          if (!activeIds.has(jid)) continue;           // doar grupuri active
          const text = extractText(msg).trim();
          if (!text) continue;

          const groupName = (await this.getGroupSubject(jid)) ?? jid;
          const ts = Number(msg.messageTimestamp ?? 0);

          await this.onMessage({
            groupName,
            groupWhatsappId: jid,
            whatsappMessageId: msg?.key?.id ?? null,
            author: msg?.pushName ?? msg?.key?.participant ?? null,
            messageTime: ts ? new Date(ts * 1000).toISOString() : null,
            capturedAt: nowIso(),
            text
          });
        } catch (error) {
          this.emit('error', error);
        }
      }
    });
  }

  async getGroupSubject(jid) {
    if (this.groupCache.has(jid)) return this.groupCache.get(jid);
    if (!this.sock) return null;
    try {
      const meta = await this.sock.groupMetadata(jid);
      const subject = meta?.subject ?? null;
      if (subject) this.groupCache.set(jid, subject);
      return subject;
    } catch {
      return null;
    }
  }

  async refreshGroups() {
    if (!this.sock || !this.status.connected) return [];
    let groups = [];
    try {
      const all = await this.sock.groupFetchAllParticipating();
      groups = Object.values(all ?? {}).map((g) => {
        if (g?.id && g?.subject) this.groupCache.set(g.id, g.subject);
        return { name: g?.subject ?? g?.id, whatsappId: g?.id };
      });
    } catch (error) {
      this.emit('error', error);
      return [];
    }
    this.onGroups(groups);
    this.setStatus({ lastSyncAt: nowIso() });
    return groups;
  }

  // Read-only, event-driven: mesajele noi vin live prin messages.upsert.
  // Nu tragem istoric (amprenta minima, cel mai putin bot-like).
  async importGroupMessages() {
    return [];
  }

  async disconnect() {
    this.shouldReconnect = false;
    const sock = this.sock;
    this.sock = null;
    try { if (sock) await sock.logout(); } catch {}
    try { if (sock) sock.end?.(undefined); } catch {}
    try { rmSync(this.profileDir, { recursive: true, force: true }); } catch {}
    this.setStatus({
      connected: false,
      state: 'disconnected',
      message: 'WhatsApp a fost deconectat.',
      qrCodeDataUrl: null,
      pairingCode: null
    });
    return this.getStatus();
  }
}
