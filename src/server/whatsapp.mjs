import { EventEmitter } from 'node:events';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { defaultWhatsappProfileDir, nowIso } from './db.mjs';

function findChromeExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/microsoft-edge'
  ].filter(Boolean);

  return candidates.find((candidate) => existsSync(candidate)) ?? undefined;
}

function shouldRunHeadless() {
  const raw = process.env.WHATSAPP_HEADLESS;
  if (raw != null) return !/^(0|false|no)$/i.test(raw.trim());
  return process.env.NODE_ENV === 'production';
}

function parseWhatsappPrePlainText(value) {
  const match = String(value ?? '').match(/^\[(.+?)\]\s*([^:]+)?:?\s*$/);
  if (!match) return { messageTime: null, author: null };

  const rawDate = match[1].trim();
  const author = match[2]?.trim() || null;
  const dateParts = rawDate.match(/(\d{1,2}):(\d{2}),\s*(\d{1,2})[./](\d{1,2})[./](\d{2,4})/);
  if (!dateParts) return { messageTime: null, author };

  const [, hour, minute, day, month, yearPart] = dateParts;
  const year = Number(yearPart.length === 2 ? `20${yearPart}` : yearPart);
  const date = new Date(year, Number(month) - 1, Number(day), Number(hour), Number(minute), 0, 0);
  return {
    messageTime: Number.isNaN(date.getTime()) ? null : date.toISOString(),
    author
  };
}

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
    this.context = null;
    this.page = null;
    this.monitorTimer = null;
    this.qrTimer = null;
    this.status = {
      connected: false,
      state: 'disconnected',
      message: 'WhatsApp nu este conectat.',
      lastSyncAt: null,
      qrCodeDataUrl: null
    };
  }

  getStatus() {
    return { ...this.status };
  }

  setStatus(patch) {
    const nextStatus = { ...this.status, ...patch };
    if (patch.state && patch.state !== 'qr' && patch.qrCodeDataUrl === undefined) {
      nextStatus.qrCodeDataUrl = null;
    }
    this.status = nextStatus;
    this.emit('status', this.getStatus());
  }

  async connect() {
    if (this.context) return this.getStatus();

    mkdirSync(this.profileDir, { recursive: true });
    this.setStatus({
      connected: false,
      state: 'starting',
      message: 'Se deschide WhatsApp Web...'
    });

    const executablePath = findChromeExecutable();
    const { chromium } = await import('playwright-core');
    const headless = shouldRunHeadless();

    try {
      this.context = await chromium.launchPersistentContext(this.profileDir, {
        headless,
        executablePath,
        viewport: { width: 1280, height: 900 },
        args: ['--disable-dev-shm-usage', '--no-first-run', '--no-sandbox', '--disable-setuid-sandbox']
      });
    } catch (error) {
      const message = String(error?.message ?? error);
      this.context = null;
      this.page = null;

      if (/existing browser session|profile is already in use|user data directory is already in use/i.test(message)) {
        this.setStatus({
          connected: false,
          state: 'error',
          message:
            'WhatsApp Web este deja deschis cu profilul local. Inchide fereastra Chrome WhatsApp ramasa deschisa, apoi apasa din nou Conecteaza WhatsApp.'
        });
        return this.getStatus();
      }

      if (/executable doesn't exist|playwright.*install|download new browsers/i.test(message)) {
        this.setStatus({
          connected: false,
          state: 'error',
          message:
            'Chromium nu este instalat pe server. In cPanel ruleaza scriptul install:chromium din Run JS script, apoi reporneste aplicatia.'
        });
        return this.getStatus();
      }

      this.setStatus({
        connected: false,
        state: 'error',
        message: `WhatsApp Web nu a putut porni: ${message}`
      });
      return this.getStatus();
    }

    this.page = this.context.pages()[0] ?? (await this.context.newPage());
    this.page.on('close', () => {
      this.context = null;
      this.page = null;
      this.stopQrMonitor();
      this.stopMonitor();
      this.setStatus({
        connected: false,
        state: 'disconnected',
        message: 'Fereastra WhatsApp a fost inchisa.'
      });
    });

    await this.page.goto('https://web.whatsapp.com', { waitUntil: 'domcontentloaded' });
    this.setStatus({
      connected: false,
      state: 'qr',
      message: headless
        ? 'Scaneaza codul QR afisat aici cu WhatsApp de pe telefon.'
        : 'Scaneaza codul QR in fereastra Chrome deschisa.'
    });
    await this.page
      .waitForSelector('canvas, #pane-side, [aria-label*="Chat"], [aria-label*="chat"]', { timeout: 30000 })
      .catch(() => {});
    await this.updateQrCode().catch(() => {});
    this.startQrMonitor();

    this.waitForReady().catch((error) => {
      this.stopQrMonitor();
      this.setStatus({
        connected: false,
        state: 'error',
        message: `WhatsApp Web nu a putut fi conectat: ${error.message}`
      });
    });

    return this.getStatus();
  }

  async waitForReady() {
    if (!this.page) return;
    await this.page.waitForFunction(
      () =>
        Boolean(
          document.querySelector('#pane-side') ||
            document.querySelector('[aria-label*="Chat"]') ||
            document.querySelector('[aria-label*="chat"]')
        ),
      null,
      { timeout: 300000 }
    );

    this.stopQrMonitor();
    this.setStatus({
      connected: true,
      state: 'connected',
      message: 'WhatsApp Web este conectat.',
      lastSyncAt: nowIso()
    });
    await this.refreshGroups();
    this.startMonitor();
  }

  async disconnect() {
    this.stopQrMonitor();
    this.stopMonitor();
    if (this.context) {
      await this.context.close();
    }
    this.context = null;
    this.page = null;
    this.setStatus({
      connected: false,
      state: 'disconnected',
      message: 'WhatsApp a fost deconectat.'
    });
    return this.getStatus();
  }

  async updateQrCode() {
    if (!this.page || this.status.connected) return;

    const ready = await this.page
      .locator('#pane-side, [aria-label*="Chat"], [aria-label*="chat"]')
      .first()
      .count()
      .catch(() => 0);
    if (ready) return;

    const canvas = this.page.locator('canvas').first();
    const count = await canvas.count().catch(() => 0);
    if (!count) return;

    const png = await canvas.screenshot({ type: 'png' }).catch(() => null);
    if (!png) return;

    const qrCodeDataUrl = `data:image/png;base64,${png.toString('base64')}`;
    if (qrCodeDataUrl && qrCodeDataUrl !== this.status.qrCodeDataUrl) {
      this.setStatus({
        connected: false,
        state: 'qr',
        message: 'Scaneaza codul QR afisat aici cu WhatsApp de pe telefon.',
        qrCodeDataUrl
      });
    }
  }

  startQrMonitor() {
    this.stopQrMonitor();
    this.qrTimer = setInterval(() => {
      this.updateQrCode().catch((error) => this.emit('error', error));
    }, 3000);
  }

  stopQrMonitor() {
    if (this.qrTimer) clearInterval(this.qrTimer);
    this.qrTimer = null;
  }

  async refreshGroups() {
    if (!this.page) return [];

    const ready = await this.page
      .locator('#pane-side, [aria-label*="Chat"], [aria-label*="chat"]')
      .first()
      .count()
      .catch(() => 0);
    if (!ready) return [];

    if (!this.status.connected) {
      this.setStatus({
        connected: true,
        state: 'connected',
        message: 'WhatsApp Web este conectat.',
        lastSyncAt: nowIso()
      });
    }

    const groupFilter = this.page
      .locator('button, div[role="button"]')
      .filter({ hasText: /^(Groups|Grupuri|Grupos|Gruppen|Groupes|Gruppi)$/i })
      .first();
    if ((await groupFilter.count().catch(() => 0)) > 0) {
      await groupFilter.click({ timeout: 1500 }).catch(() => {});
      await this.page.waitForTimeout(400);
    }

    const groups = await this.page.evaluate(() => {
      const sidebar =
        document.querySelector('#pane-side') ??
        document.querySelector('[aria-label*="Chat"]') ??
        document.querySelector('[aria-label*="chat"]') ??
        document;
      const ignored = /^(online|typing|search|cauta|arhivat|archived|toate|all|necitite|unread|favorite|favourites|groups|grupuri)$/i;
      const keywords = [
        'curs',
        'transport',
        'logistic',
        'lojistik',
        'locistik',
        'nakliye',
        'yuk',
        'yük',
        'marf',
        'gruz',
        'груз',
        'perevoz',
        'перевоз',
        'incarc',
        'tir',
        'camion',
        'lkw',
        'truck',
        'dorse',
        'bursa',
        'sped',
        'cargo',
        'frigo',
        'transfer',
        'tasimacilik',
        'taşımac',
        'tasıma'
      ];
      const routeWords = ['romania', 'turcia', 'turkiye', 'ukraina', 'germania', 'italia', 'bulgaria', 'avrupa', 'europa', 'balkan'];
      const names = [];

      const add = (value) => {
        const rawName = String(value ?? '');
        if (/[\r\n\u202A-\u202E]/.test(rawName)) return;
        const name = rawName.replace(/\s+/g, ' ').trim();
        const normalized = name.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
        if (!name) return;
        if (name.length < 2 || name.length > 120) return;
        if (/^\d{1,2}:\d{2}$/.test(name)) return;
        if (/^\+?[\d\s().-]{7,}$/.test(name)) return;
        if (/^\d+\s*(mesaje?|messages?)$/i.test(name)) return;
        if (ignored.test(name)) return;
        if (!keywords.some((keyword) => normalized.includes(keyword))) {
          const routeHits = routeWords.filter((word) => normalized.includes(word)).length;
          if (routeHits < 2) return;
        }
        names.push(name);
      };

      const rows = Array.from(sidebar.querySelectorAll('[role="row"], [role="listitem"], [data-testid="cell-frame-container"]'));
      if (rows.length > 0) {
        for (const row of rows) {
          add(row.querySelector('span[title]')?.getAttribute('title'));
        }
      } else {
        for (const node of sidebar.querySelectorAll('span[title]')) {
          add(node.getAttribute('title'));
        }
      }

      return Array.from(new Set(names)).map((name) => ({ name, whatsappId: name }));
    });
    this.onGroups(groups);
    this.setStatus({ lastSyncAt: nowIso() });
    return groups;
  }

  async importGroupMessages(group, { maxMessages = 40 } = {}) {
    if (!this.page || !this.status.connected) return [];

    const target = this.page.locator('span[title]').filter({ hasText: group.name }).first();
    await target.click({ timeout: 7000 });
    await this.page.waitForTimeout(900);

    const rows = await this.page.evaluate((limit) => {
      const nodes = Array.from(document.querySelectorAll('[data-pre-plain-text]')).slice(-limit);
      return nodes
        .map((node) => {
          const rawMeta = node.getAttribute('data-pre-plain-text') ?? '';
          const text = (node.innerText ?? '')
            .split('\n')
            .filter((line) => !/^\d{1,2}:\d{2}$/.test(line.trim()))
            .join('\n')
            .trim();
          const id =
            node.closest('[data-id]')?.getAttribute('data-id') ??
            node.closest('[id]')?.getAttribute('id') ??
            null;
          return { rawMeta, text, whatsappMessageId: id };
        })
        .filter((row) => row.text.length > 0);
    }, maxMessages);

    const imported = [];
    for (const row of rows) {
      const meta = parseWhatsappPrePlainText(row.rawMeta);
      const message = {
        groupName: group.name,
        groupWhatsappId: group.whatsappId ?? group.name,
        whatsappMessageId: row.whatsappMessageId,
        author: meta.author,
        messageTime: meta.messageTime,
        capturedAt: nowIso(),
        text: row.text
      };
      imported.push(message);
      await this.onMessage(message);
    }

    this.setStatus({ lastSyncAt: nowIso() });
    return imported;
  }

  startMonitor() {
    this.stopMonitor();
    this.monitorTimer = setInterval(async () => {
      try {
        const activeGroups = this.activeGroupsProvider();
        for (const group of activeGroups) {
          await this.importGroupMessages(group, { maxMessages: 20 });
        }
        await this.refreshGroups();
      } catch (error) {
        this.emit('error', error);
      }
    }, 30000);
  }

  stopMonitor() {
    if (this.monitorTimer) clearInterval(this.monitorTimer);
    this.monitorTimer = null;
  }
}
