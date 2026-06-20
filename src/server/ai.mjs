import { parseLoadMessage } from './parser.mjs';

export const ANALYSIS_VERSION = '2026-06-16-original-route-v3';

const LANGUAGE_RULES = [
  ['ru', /(груз|место\s*погр|место\s*разгр|погрузк|выгрузк|вес|машин|контакт|номер\s*тел)/i],
  ['ro', /\b(cursa|incarcare|incarca|descarcare|prelata|maine|azi|greutate|pret|telefon|sofer)\b/i],
  ['en', /\b(load|loading|pickup|delivery|unload|truck|curtain|tomorrow|today|price|contact)\b/i],
  ['de', /\b(ladung|laden|abholung|entladung|lieferung|lkw|plane|morgen|heute|preis|kontakt)\b/i],
  ['it', /\b(carico|scarico|camion|telonato|domani|oggi|prezzo|contatto)\b/i],
  ['fr', /\b(chargement|dechargement|camion|bache|demain|aujourd|prix|contact)\b/i],
  ['es', /\b(carga|descarga|camion|lona|manana|precio|contacto)\b/i],
  ['hu', /\b(rakodas|lerakas|kamion|ponyv|holnap|ar|kapcsolat)\b/i],
  ['pl', /\b(zaladunek|rozladunek|ciezarowka|plandeka|jutro|cena|kontakt)\b/i]
];

const REPLACEMENTS = [
  [/\b(load|loading|pickup|collection)\b/gi, 'incarcare'],
  [/\b(delivery|unload|unloading|dropoff)\b/gi, 'descarcare'],
  [/\b(truck|lorry)\b/gi, 'camion'],
  [/\b(curtain|curtainsider|tautliner)\b/gi, 'prelata'],
  [/\b(reefer|refrigerated)\b/gi, 'frigo'],
  [/\b(tomorrow)\b/gi, 'maine'],
  [/\b(today)\b/gi, 'azi'],
  [/\b(price|rate)\b/gi, 'pret'],
  [/\b(contact|phone)\b/gi, 'contact'],
  [/\bladung\b/gi, 'cursa'],
  [/\bladen\b/gi, 'incarcare'],
  [/\babholung\b/gi, 'incarcare'],
  [/\bentladung\b/gi, 'descarcare'],
  [/\blieferung\b/gi, 'descarcare'],
  [/\blkw\b/gi, 'camion'],
  [/\bplane\b/gi, 'prelata'],
  [/\bmorgen\b/gi, 'maine'],
  [/\bheute\b/gi, 'azi'],
  [/\bpreis\b/gi, 'pret'],
  [/\bkontakt\b/gi, 'contact'],
  [/\bcarico\b/gi, 'incarcare'],
  [/\bscarico\b/gi, 'descarcare'],
  [/\btelonato\b/gi, 'prelata'],
  [/\bdomani\b/gi, 'maine'],
  [/\boggi\b/gi, 'azi'],
  [/\bprezzo\b/gi, 'pret'],
  [/\bchargement\b/gi, 'incarcare'],
  [/\bdechargement\b/gi, 'descarcare'],
  [/\bbache\b/gi, 'prelata'],
  [/\bdemain\b/gi, 'maine'],
  [/\bprix\b/gi, 'pret'],
  [/\bcarga\b/gi, 'incarcare'],
  [/\bdescarga\b/gi, 'descarcare'],
  [/\blona\b/gi, 'prelata'],
  [/\bmanana\b/gi, 'maine'],
  [/\brakodas\b/gi, 'incarcare'],
  [/\blerakas\b/gi, 'descarcare'],
  [/\bponyv\b/gi, 'prelata'],
  [/\bholnap\b/gi, 'maine'],
  [/\bzaladunek\b/gi, 'incarcare'],
  [/\brozladunek\b/gi, 'descarcare'],
  [/\bplandeka\b/gi, 'prelata'],
  [/\bjutro\b/gi, 'maine'],
  [/тип\s*загрузки/gi, 'tip incarcare'],
  [/(?<!\p{L})груз(?!\p{L})/giu, 'marfa'],
  [/место\s*погрузки/gi, 'loc incarcare'],
  [/место\s*погр\.?/gi, 'loc incarcare'],
  [/место\s*выгрузки/gi, 'loc descarcare'],
  [/место\s*разгр\.?/gi, 'loc descarcare'],
  [/дата\s*погрузки/gi, 'data incarcare'],
  [/дата\s*погр\.?/gi, 'data incarcare'],
  [/вес/gi, 'greutate'],
  [/об[ъь]?[её]м/gi, 'volum'],
  [/тип\s*машины/gi, 'tip camion'],
  [/тент/gi, 'prelata'],
  [/полная/gi, 'completa'],
  [/фрахт/gi, 'pret transport'],
  [/комментарий/gi, 'comentariu'],
  [/(?<!\p{L})детал(?:и|ь|ей)?(?!\p{L})/giu, 'detalii'],
  [/компания/gi, 'companie'],
  [/контактное\s*лицо/gi, 'contact'],
  [/номер\s*тел\.?/gi, 'telefon'],
  [/(?<=\d)\s*т(?=$|\s|\/)/giu, 't'],
  [/м3/gi, 'mc']
];

const LANGUAGE_LABELS = {
  ro: 'Romana',
  en: 'Engleza',
  de: 'Germana',
  it: 'Italiana',
  fr: 'Franceza',
  es: 'Spaniola',
  hu: 'Maghiara',
  pl: 'Poloneza',
  ru: 'Rusa',
  unknown: 'Necunoscuta'
};

export function detectLanguage(text) {
  const value = stripTransportNoise(text).normalize('NFD').replace(/\p{Diacritic}/gu, '');
  if (/\p{Script=Cyrillic}/u.test(value)) return 'ru';
  for (const [language, regex] of LANGUAGE_RULES) {
    if (regex.test(value)) return language;
  }
  return 'unknown';
}

function stripTransportNoise(text) {
  return String(text ?? '')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/\b(?:www\.)?\S+\.(?:com|net|org|ro|md|de|it|fr|es|at|bg|hu|pl|cz|sk|ua|tr|nl|be|ch)\S*/gi, ' ')
    .replace(/\b[a-z-]+-view\?\S+/gi, ' ');
}

export function translateLocally(text) {
  let translated = String(text ?? '');
  for (const [regex, replacement] of REPLACEMENTS) {
    translated = translated.replace(regex, replacement);
  }
  return cleanTranslatedText(translated);
}

function cleanTranslatedText(text) {
  return String(text ?? '')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSummary(parsed, translatedText, language) {
  const route = [
    [parsed.loadCity, parsed.loadCountry].filter(Boolean).join(', '),
    [parsed.unloadCity, parsed.unloadCountry].filter(Boolean).join(', ')
  ]
    .filter(Boolean)
    .join(' -> ');
  const parts = [
    route || 'Ruta incompleta',
    parsed.truckType,
    parsed.weightTons ? `${parsed.weightTons}t` : null,
    parsed.price,
    parsed.loadDate ? `incarcare ${parsed.loadDate}` : null
  ].filter(Boolean);
  return `${parts.join(' · ')}. Limba detectata: ${LANGUAGE_LABELS[language] ?? language}.`;
}

function mergeParsedResults(originalParsed, translatedParsed) {
  const merged = { ...translatedParsed };
  for (const field of [
    'loadCity',
    'unloadCity',
    'loadCountry',
    'unloadCountry',
    'loadDate',
    'truckType',
    'weightTons',
    'price',
    'contact'
  ]) {
    if (originalParsed[field] !== null && originalParsed[field] !== undefined) {
      merged[field] = originalParsed[field];
    }
  }
  merged.confidence = Math.max(originalParsed.confidence ?? 0, translatedParsed.confidence ?? 0);
  return merged;
}

async function analyzeWithOpenAiCompatible(text, settings) {
  if (!settings.aiApiKey || !settings.aiEndpoint || !settings.aiModel) return null;

  const systemPrompt =
    'Esti un asistent pentru curse de transport. Raspunde doar JSON valid cu cheile: detectedLanguage, translatedText, summary.';

  if (String(settings.aiEndpoint).includes('/responses')) {
    const response = await fetch(settings.aiEndpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${settings.aiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: settings.aiModel,
        instructions: systemPrompt,
        input: `Tradu in romana si rezuma anuntul de cursa:\n${text}`,
        max_output_tokens: 600,
        text: {
          format: {
            type: 'text'
          }
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`AI endpoint a raspuns cu ${response.status}${errorText ? `: ${errorText}` : ''}.`);
    }

    const payload = await response.json();
    const content =
      payload.output_text ??
      payload.output
        ?.flatMap((item) => item.content ?? [])
        ?.filter((part) => part.type === 'output_text')
        ?.map((part) => part.text)
        ?.join('\n') ??
      '';
    const jsonText = content.match(/\{[\s\S]*\}/)?.[0] ?? content;
    return JSON.parse(jsonText);
  }

  const response = await fetch(settings.aiEndpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${settings.aiApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: settings.aiModel,
      messages: [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: `Tradu in romana si rezuma anuntul de cursa:\n${text}`
        }
      ],
      temperature: 0.1
    })
  });

  if (!response.ok) {
    throw new Error(`AI endpoint a raspuns cu ${response.status}.`);
  }

  const payload = await response.json();
  const content = payload.choices?.[0]?.message?.content ?? '';
  const jsonText = content.match(/\{[\s\S]*\}/)?.[0] ?? content;
  return JSON.parse(jsonText);
}

export async function analyzeMessage(text, settings = {}) {
  const detectedLanguage = detectLanguage(text);
  let translatedText = detectedLanguage === 'ro' ? String(text ?? '') : translateLocally(text);
  let provider = 'local';
  let summary = null;

  if (settings.aiEnabled && settings.aiMode !== 'local') {
    try {
      const aiResult = await analyzeWithOpenAiCompatible(text, settings);
      if (aiResult?.translatedText) translatedText = cleanTranslatedText(aiResult.translatedText);
      if (aiResult?.detectedLanguage) provider = 'ai';
      summary = aiResult?.summary ?? null;
    } catch (error) {
      summary = `AI extern indisponibil: ${error.message}. Am folosit analiza locala.`;
      provider = 'local-fallback';
    }
  }

  const parsed = mergeParsedResults(parseLoadMessage(text), parseLoadMessage(translatedText || text));
  const authoritativeSummary = buildSummary(parsed, translatedText, detectedLanguage);
  return {
    detectedLanguage,
    detectedLanguageLabel: LANGUAGE_LABELS[detectedLanguage] ?? detectedLanguage,
    translatedText,
    aiSummary: authoritativeSummary,
    aiProvider: provider,
    analysisVersion: ANALYSIS_VERSION,
    parsed
  };
}

export async function testAiConnection(settings = {}) {
  if (!settings.aiEnabled) {
    return {
      ok: true,
      mode: 'local',
      message: 'AI local activ: analiza si traducerea euristica sunt disponibile fara cheie externa.'
    };
  }

  if (settings.aiMode === 'local' || !settings.aiApiKey) {
    return {
      ok: true,
      mode: 'local',
      message: 'AI local conectat. Adauga o cheie API pentru analiza externa.'
    };
  }

  const result = await analyzeWithOpenAiCompatible('Load Arad to Germany tomorrow 24t curtain 2400 EUR', settings);
  return {
    ok: Boolean(result),
    mode: 'external',
    message: 'AI extern conectat si a raspuns la test.'
  };
}
