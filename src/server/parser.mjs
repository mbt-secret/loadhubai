const CITY_COUNTRY = [
  ['arad', 'Arad', 'Romania'],
  ['bucuresti', 'Bucuresti', 'Romania'],
  ['bucharest', 'Bucuresti', 'Romania'],
  ['timisoara', 'Timisoara', 'Romania'],
  ['oradea', 'Oradea', 'Romania'],
  ['cluj', 'Cluj-Napoca', 'Romania'],
  ['cluj napoca', 'Cluj-Napoca', 'Romania'],
  ['sibiu', 'Sibiu', 'Romania'],
  ['brasov', 'Brasov', 'Romania'],
  ['pitesti', 'Pitesti', 'Romania'],
  ['constanta', 'Constanta', 'Romania'],
  ['ploiesti', 'Ploiesti', 'Romania'],
  ['iasi', 'Iasi', 'Romania'],
  ['craiova', 'Craiova', 'Romania'],
  ['deva', 'Deva', 'Romania'],
  ['lugoj', 'Lugoj', 'Romania'],
  ['berlin', 'Berlin', 'Germania'],
  ['munchen', 'Munchen', 'Germania'],
  ['muenchen', 'Munchen', 'Germania'],
  ['munich', 'Munchen', 'Germania'],
  ['hamburg', 'Hamburg', 'Germania'],
  ['frankfurt', 'Frankfurt', 'Germania'],
  ['stuttgart', 'Stuttgart', 'Germania'],
  ['dortmund', 'Dortmund', 'Germania'],
  ['koln', 'Koln', 'Germania'],
  ['koeln', 'Koln', 'Germania'],
  ['hannover', 'Hannover', 'Germania'],
  ['milano', 'Milano', 'Italia'],
  ['milan', 'Milano', 'Italia'],
  ['torino', 'Torino', 'Italia'],
  ['verona', 'Verona', 'Italia'],
  ['bologna', 'Bologna', 'Italia'],
  ['roma', 'Roma', 'Italia'],
  ['rome', 'Roma', 'Italia'],
  ['wien', 'Wien', 'Austria'],
  ['vienna', 'Wien', 'Austria'],
  ['graz', 'Graz', 'Austria'],
  ['linz', 'Linz', 'Austria'],
  ['salzburg', 'Salzburg', 'Austria'],
  ['budapest', 'Budapesta', 'Ungaria'],
  ['gyor', 'Gyor', 'Ungaria'],
  ['paris', 'Paris', 'Franta'],
  ['lyon', 'Lyon', 'Franta'],
  ['marseille', 'Marseille', 'Franta'],
  ['lille', 'Lille', 'Franta'],
  ['madrid', 'Madrid', 'Spania'],
  ['barcelona', 'Barcelona', 'Spania'],
  ['valencia', 'Valencia', 'Spania'],
  ['amsterdam', 'Amsterdam', 'Olanda'],
  ['rotterdam', 'Rotterdam', 'Olanda'],
  ['eindhoven', 'Eindhoven', 'Olanda'],
  ['bruxelles', 'Bruxelles', 'Belgia'],
  ['brussels', 'Bruxelles', 'Belgia'],
  ['antwerpen', 'Antwerpen', 'Belgia'],
  ['antwerp', 'Antwerpen', 'Belgia'],
  ['varsovia', 'Varsovia', 'Polonia'],
  ['warsaw', 'Varsovia', 'Polonia'],
  ['krakow', 'Krakow', 'Polonia'],
  ['praga', 'Praga', 'Cehia'],
  ['prague', 'Praga', 'Cehia'],
  ['bratislava', 'Bratislava', 'Slovacia'],
  ['ljubljana', 'Ljubljana', 'Slovenia'],
  ['sofia', 'Sofia', 'Bulgaria'],
  ['istanbul', 'Istanbul', 'Turcia'],
  ['tbilisi', 'Tbilisi', 'Georgia'],
  ['sumy', 'Sumy', 'Ucraina'],
  ['sumi', 'Sumy', 'Ucraina'],
  ['kyiv', 'Kyiv', 'Ucraina'],
  ['kiev', 'Kyiv', 'Ucraina'],
  ['odesa', 'Odesa', 'Ucraina'],
  ['odessa', 'Odesa', 'Ucraina'],
  ['lviv', 'Lviv', 'Ucraina'],
  ['cernăuți', 'Cernauti', 'Ucraina'],
  ['cernauti', 'Cernauti', 'Ucraina'],
  ['chernivtsi', 'Cernauti', 'Ucraina'],
  ['chisinau', 'Chisinau', 'Moldova'],
  ['chișinău', 'Chisinau', 'Moldova'],
  ['orhei', 'Orhei', 'Moldova'],
  ['cahul', 'Cahul', 'Moldova'],
  ['straseni', 'Straseni', 'Moldova'],
  ['strășeni', 'Straseni', 'Moldova'],
  ['edinet', 'Edinet', 'Moldova'],
  ['edineț', 'Edinet', 'Moldova'],
  ['botosani', 'Botosani', 'Romania'],
  ['botoșani', 'Botosani', 'Romania']
];

const COUNTRY_ALIASES = new Map([
  ['ro', 'Romania'],
  ['romania', 'Romania'],
  ['romanija', 'Romania'],
  ['de', 'Germania'],
  ['germania', 'Germania'],
  ['germany', 'Germania'],
  ['deutschland', 'Germania'],
  ['it', 'Italia'],
  ['italia', 'Italia'],
  ['italy', 'Italia'],
  ['at', 'Austria'],
  ['austria', 'Austria'],
  ['hu', 'Ungaria'],
  ['ungaria', 'Ungaria'],
  ['hungary', 'Ungaria'],
  ['fr', 'Franta'],
  ['franta', 'Franta'],
  ['france', 'Franta'],
  ['es', 'Spania'],
  ['spania', 'Spania'],
  ['spain', 'Spania'],
  ['nl', 'Olanda'],
  ['olanda', 'Olanda'],
  ['netherlands', 'Olanda'],
  ['holland', 'Olanda'],
  ['be', 'Belgia'],
  ['belgia', 'Belgia'],
  ['belgium', 'Belgia'],
  ['pl', 'Polonia'],
  ['polonia', 'Polonia'],
  ['poland', 'Polonia'],
  ['by', 'Belarus'],
  ['belarus', 'Belarus'],
  ['беларусь', 'Belarus'],
  ['cz', 'Cehia'],
  ['cehia', 'Cehia'],
  ['czechia', 'Cehia'],
  ['sk', 'Slovacia'],
  ['slovacia', 'Slovacia'],
  ['slovakia', 'Slovacia'],
  ['si', 'Slovenia'],
  ['slovenia', 'Slovenia'],
  ['bg', 'Bulgaria'],
  ['bulgaria', 'Bulgaria'],
  ['tr', 'Turcia'],
  ['turcia', 'Turcia'],
  ['turkey', 'Turcia'],
  ['ge', 'Georgia'],
  ['georgia', 'Georgia'],
  ['sakartvelo', 'Georgia'],
  ['საქართველო', 'Georgia'],
  ['ua', 'Ucraina'],
  ['ucraina', 'Ucraina'],
  ['ukraina', 'Ucraina'],
  ['ukraine', 'Ucraina'],
  ['украина', 'Ucraina'],
  ['md', 'Moldova'],
  ['moldova', 'Moldova'],
  ['republica moldova', 'Moldova'],
  ['moldavia', 'Moldova'],
  ['gb', 'Regatul Unit'],
  ['uk', 'Regatul Unit'],
  ['regatul unit', 'Regatul Unit'],
  ['marea britanie', 'Regatul Unit'],
  ['united kingdom', 'Regatul Unit'],
  ['great britain', 'Regatul Unit'],
  ['ch', 'Elvetia'],
  ['elvetia', 'Elvetia'],
  ['switzerland', 'Elvetia'],
  ['se', 'Suedia'],
  ['suedia', 'Suedia'],
  ['sweden', 'Suedia'],
  ['no', 'Norvegia'],
  ['norvegia', 'Norvegia'],
  ['norway', 'Norvegia'],
  ['dk', 'Danemarca'],
  ['danemarca', 'Danemarca'],
  ['denmark', 'Danemarca'],
  ['fi', 'Finlanda'],
  ['finlanda', 'Finlanda'],
  ['finland', 'Finlanda'],
  ['ee', 'Estonia'],
  ['estonia', 'Estonia'],
  ['lv', 'Letonia'],
  ['letonia', 'Letonia'],
  ['latvia', 'Letonia'],
  ['lt', 'Lituania'],
  ['lituania', 'Lituania'],
  ['lithuania', 'Lituania'],
  ['hr', 'Croatia'],
  ['croatia', 'Croatia'],
  ['rs', 'Serbia'],
  ['serbia', 'Serbia'],
  ['ba', 'Bosnia si Hertegovina'],
  ['bosnia', 'Bosnia si Hertegovina'],
  ['me', 'Muntenegru'],
  ['muntenegru', 'Muntenegru'],
  ['montenegro', 'Muntenegru'],
  ['mk', 'Macedonia de Nord'],
  ['macedonia', 'Macedonia de Nord'],
  ['north macedonia', 'Macedonia de Nord'],
  ['al', 'Albania'],
  ['albania', 'Albania'],
  ['gr', 'Grecia'],
  ['grecia', 'Grecia'],
  ['greece', 'Grecia'],
  ['pt', 'Portugalia'],
  ['portugalia', 'Portugalia'],
  ['portugal', 'Portugalia'],
  ['ie', 'Irlanda'],
  ['irlanda', 'Irlanda'],
  ['ireland', 'Irlanda'],
  ['lu', 'Luxemburg'],
  ['luxemburg', 'Luxemburg'],
  ['luxembourg', 'Luxemburg'],
  ['li', 'Liechtenstein'],
  ['liechtenstein', 'Liechtenstein'],
  ['am', 'Armenia'],
  ['armenia', 'Armenia'],
  ['az', 'Azerbaidjan'],
  ['azerbaidjan', 'Azerbaidjan'],
  ['azerbaijan', 'Azerbaidjan'],
  ['kz', 'Kazahstan'],
  ['kazahstan', 'Kazahstan'],
  ['kazakhstan', 'Kazahstan'],
  ['ru', 'Rusia'],
  ['rusia', 'Rusia'],
  ['russia', 'Rusia']
]);

const TRUCK_TYPES = [
  ['prelata', 'Prelata'],
  ['prelată', 'Prelata'],
  ['tautliner', 'Prelata'],
  ['tent', 'Prelata'],
  ['тент', 'Prelata'],
  ['frigo', 'Frigo'],
  ['frig', 'Frigo'],
  ['refrigerat', 'Frigo'],
  ['реф', 'Frigo'],
  ['рефрижератор', 'Frigo'],
  ['duba', 'Duba'],
  ['dubă', 'Duba'],
  ['mega', 'Mega'],
  ['jumbo', 'Jumbo'],
  ['tandem', 'Tandem'],
  ['cisterna', 'Cisterna'],
  ['cisternă', 'Cisterna'],
  ['platforma', 'Platforma'],
  ['platformă', 'Platforma'],
  ['container', 'Container']
];

const WEEKDAYS = new Map([
  ['luni', 1],
  ['marti', 2],
  ['marți', 2],
  ['miercuri', 3],
  ['joi', 4],
  ['vineri', 5],
  ['sambata', 6],
  ['sâmbătă', 6],
  ['duminica', 0],
  ['duminică', 0]
]);

export function normalizeText(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}+€./:@-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeCityEntry(entry) {
  const source = Array.isArray(entry)
    ? { alias: entry[0], city: entry[1], country: entry[2] }
    : entry;
  const alias = normalizeText(source.alias ?? source.name ?? source.city);
  if (!alias || !source.city || !source.country) return null;
  return {
    alias,
    city: source.city,
    country: source.country,
    cityVerified: source.cityVerified !== false,
    lat: source.lat ?? null,
    lon: source.lon ?? null
  };
}

function builtInCityEntries() {
  return CITY_COUNTRY.map(([alias, city, country]) => ({
    alias,
    city,
    country,
    cityVerified: true,
    lat: null,
    lon: null
  }));
}

let cityEntries = [];
let cityAliasIndex = new Map();

function firstAliasToken(alias) {
  return normalizeText(alias).split(/\s+/).find(Boolean) ?? '';
}

function rebuildCityAliasIndex() {
  cityAliasIndex = new Map();
  for (const entry of cityEntries) {
    const token = firstAliasToken(entry.alias);
    if (!token) continue;
    if (!cityAliasIndex.has(token)) cityAliasIndex.set(token, []);
    cityAliasIndex.get(token).push(entry);
  }
  for (const entries of cityAliasIndex.values()) {
    entries.sort((a, b) => b.alias.length - a.alias.length);
  }
}

export function setPlaceEntries(entries = [], { includeBuiltins = true } = {}) {
  const next = [];
  const seen = new Set();
  const sources = includeBuiltins ? [...builtInCityEntries(), ...entries] : entries;
  for (const source of sources) {
    const entry = normalizeCityEntry(source);
    if (!entry) continue;
    const key = `${entry.alias}|${entry.city}|${entry.country}`;
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(entry);
  }
  cityEntries = next;
  rebuildCityAliasIndex();
}

setPlaceEntries();

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripUrls(value) {
  return String(value ?? '').replace(/https?:\/\/\S+/gi, ' ');
}

function addDays(baseDate, days) {
  const date = new Date(baseDate);
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function nextWeekday(baseDate, targetDay) {
  const date = new Date(baseDate);
  const currentDay = date.getDay();
  let offset = (targetDay - currentDay + 7) % 7;
  if (offset === 0) offset = 7;
  return addDays(date, offset);
}

function findShortCountryCode(rawText, alias) {
  const source = stripUrls(rawText);
  const code = escapeRegExp(alias.toUpperCase());
  const regex = new RegExp(`(^|[\\s([{/>,;:-])${code}($|[\\s)\\]}/<,;:-])`);
  const match = source.match(regex);
  return match && match.index != null ? match.index + match[1].length : -1;
}

function findCountries(rawText) {
  const text = normalizeText(stripUrls(rawText));
  const matches = [];

  for (const [alias, country] of COUNTRY_ALIASES) {
    if (alias.length <= 2) {
      const index = findShortCountryCode(rawText, alias);
      if (index >= 0) matches.push({ type: 'country', label: country, country, index });
      continue;
    }

    const regex = new RegExp(`(^|\\s|[-/>])${escapeRegExp(alias)}($|\\s|[-/<])`, 'i');
    const match = text.match(regex);
    if (match) {
      matches.push({ type: 'country', label: country, country, index: match.index ?? 0 });
    }
  }

  return matches.sort((a, b) => a.index - b.index);
}

function findCities(rawText) {
  const text = normalizeText(stripUrls(rawText));
  const cities = [];
  const candidates = new Map();

  for (const token of new Set(text.split(/\s+/).filter(Boolean))) {
    for (const entry of cityAliasIndex.get(token) ?? []) {
      const key = `${entry.alias}|${entry.city}|${entry.country}`;
      if (!candidates.has(key)) candidates.set(key, entry);
    }
  }

  for (const entry of candidates.values()) {
    const regex = new RegExp(`(^|\\s|[-/>])${escapeRegExp(entry.alias)}($|\\s|[-/<])`, 'i');
    const match = text.match(regex);
    if (match) {
      cities.push({
        type: 'city',
        label: entry.city,
        city: entry.city,
        country: entry.country,
        cityVerified: entry.cityVerified,
        lat: entry.lat,
        lon: entry.lon,
        index: match.index ?? 0
      });
    }
  }

  return cities;
}

export function findLocations(rawText) {
  const locations = findCities(rawText);
  locations.push(...findCountries(rawText));
  return locations
    .sort((a, b) => a.index - b.index || b.label.length - a.label.length)
    .filter((location, index, array) => {
      const previous = array.findIndex(
        (candidate) => candidate.label === location.label && Math.abs(candidate.index - location.index) < 2
      );
      return previous === index;
    });
}

export function findTruckType(rawText) {
  const text = normalizeText(rawText);
  for (const [alias, label] of TRUCK_TYPES) {
    const regex = new RegExp(`(^|\\s|/)${escapeRegExp(normalizeText(alias))}($|\\s|/)`, 'i');
    if (regex.test(text)) return label;
  }
  return null;
}

export function findWeightTons(rawText) {
  const text = normalizeText(rawText).replace(',', '.');
  const tonMatch = text.match(/(\d{1,3}(?:\.\d{1,2})?)\s*(?:t|т|to|tone|tona|tons?|тонн?[аы]?)(?=$|\s|\/)/u);
  if (tonMatch) return Number.parseFloat(tonMatch[1]);

  const kgMatch = text.match(/(\d{4,6})\s*(?:kg|kilograme)\b/);
  if (kgMatch) {
    const kg = Number.parseInt(kgMatch[1], 10);
    if (kg >= 1000) return Math.round((kg / 1000) * 10) / 10;
  }

  return null;
}

export function findPrice(rawText) {
  const text = String(rawText ?? '');
  const match = text.match(/(?:€\s*\d{2,6}(?:[.,]\d{1,2})?|\b\d{2,6}(?:[.,]\d{1,2})?\s*(?:€|eur|euro|lei|ron)\b)/i);
  return match ? match[0].replace(/\s+/g, ' ').trim() : null;
}

export function findContact(rawText) {
  const text = String(rawText ?? '');
  const waMatch = text.match(/https?:\/\/wa\.me\/\d+|wa\.me\/\d+/i);
  if (waMatch) return waMatch[0];

  const phoneMatches = text.matchAll(/(?:\+?\d[\d\s().-]{6,}\d)/g);
  for (const phoneMatch of phoneMatches) {
    const candidate = phoneMatch[0].replace(/\s+/g, ' ').trim();
    const digits = candidate.replace(/\D/g, '');
    const looksLikeDate = /^\d{1,2}[./-]\d{1,2}[./-]\d{2,4}$/.test(candidate);
    if (!looksLikeDate && digits.length >= 9) return candidate;
  }

  const contactMatch = text.match(
    /(?:contact|tel|telefon|sunati|sunați|контакт|номер\s*тел)\s*[:.-]?\s*([A-ZĂÂÎȘȚa-zăâîșț\p{L}][\p{L}\s.-]{2,40})/u
  );
  return contactMatch ? contactMatch[1].trim() : null;
}

export function findLoadDate(rawText, baseDate = new Date()) {
  const text = normalizeText(rawText);
  if (/(^|\s)azi($|\s)/.test(text)) return addDays(baseDate, 0);
  if (/(^|\s)maine($|\s)/.test(text)) return addDays(baseDate, 1);
  if (/(^|\s)poimaine($|\s)/.test(text)) return addDays(baseDate, 2);

  for (const [weekday, day] of WEEKDAYS) {
    if (new RegExp(`(^|\\s)${normalizeText(weekday)}($|\\s)`).test(text)) {
      return nextWeekday(baseDate, day);
    }
  }

  const explicit = text.match(/\b(\d{1,2})[./-](\d{1,2})(?:[./-](\d{2,4}))?\b/);
  if (explicit) {
    const day = Number.parseInt(explicit[1], 10);
    const month = Number.parseInt(explicit[2], 10) - 1;
    const currentYear = baseDate.getFullYear();
    const year = explicit[3]
      ? Number.parseInt(explicit[3].length === 2 ? `20${explicit[3]}` : explicit[3], 10)
      : currentYear;
    const date = new Date(year, month, day, 12, 0, 0, 0);
    if (!Number.isNaN(date.getTime())) return date.toISOString().slice(0, 10);
  }

  return null;
}

const LOAD_LOCATION_MARKER =
  /(?:loc(?:ul)?\s*(?:de\s*)?(?:incar(?:care|cat|\.?)|încărcare)|incarcare|loading(?:\s+place)?|pickup(?:\s+place)?|место\s*(?:погр\.?|погрузки)|адрес\s*погрузки)\s*[:.-]?\s*/iu;

const UNLOAD_LOCATION_MARKER =
  /(?:loc(?:ul)?\s*(?:de\s*)?(?:desc(?:arcare|\.?)|descarcare|descărcare)|descarcare|delivery(?:\s+place)?|unload(?:\s+place)?|dropoff|destinatie|destinație|место\s*(?:разгр\.?|выгрузки)|адрес\s*выгрузки)\s*[:.-]?\s*/iu;

const FIELD_STOP_MARKER =
  /(?:\b(?:data|date|loc|incarcare|descarcare|loading|pickup|delivery|unload|greutate|weight|tip|camion|truck|pret|price|contact|telefon|tel|companie|company|firma|freight|rate)\b|дата|место|вес|об[ъь]?[её]м|тип|компания|контакт|номер|фрахт|https?:\/\/)/iu;

function findLocationFragment(rawText, markerRegex) {
  const text = stripUrls(rawText);
  const marker = markerRegex.exec(text);
  if (!marker || marker.index == null) return null;

  const afterMarker = text
    .slice(marker.index + marker[0].length)
    .replace(/^[\s:.-]+/, '');
  const stopIndex = afterMarker.search(FIELD_STOP_MARKER);
  const fragment = (stopIndex >= 0 ? afterMarker.slice(0, stopIndex) : afterMarker).trim();
  return fragment || null;
}

function findCountryCodeAtStart(fragment) {
  const match = stripUrls(fragment)
    .trim()
    .match(/^[\s(:.-]*([a-z]{2})(?=$|[\s)\/,;:-])/i);
  if (!match) return null;
  const country = COUNTRY_ALIASES.get(normalizeText(match[1]));
  return country ? { type: 'country', label: country, country, index: 0, code: match[1] } : null;
}

function titleCasePlaceName(value) {
  return String(value ?? '')
    .trim()
    .split(/\s+/)
    .map((word) => (word ? `${word[0].toLocaleUpperCase('ro-RO')}${word.slice(1).toLocaleLowerCase('ro-RO')}` : word))
    .join(' ');
}

function extractCityAfterCountryCode(fragment) {
  const withoutCode = stripUrls(fragment)
    .trim()
    .replace(/^[\s(:.-]*[a-z]{2}(?=$|[\s)\/,;:-])[\s)\/,;:-]*/i, '')
    .trim();
  if (!withoutCode) return null;

  const genericPlaceStart =
    /^(?:drumul|drum|road|strada|street|satul|sat|zona|zone|raion|raionul|metropolitan|area|acces|access|улица|район)\b/i;
  if (genericPlaceStart.test(withoutCode)) return null;

  const match = withoutCode.match(/^[\p{L}\p{M}'’.-]+(?:\s+[\p{L}\p{M}'’.-]+){0,2}/u);
  if (!match) return null;

  const city = titleCasePlaceName(match[0].replace(/[.,;:()]+$/g, ''));
  return city.length >= 2 ? city : null;
}

function parsePlaceFragment(fragment) {
  const countryFromCode = findCountryCodeAtStart(fragment);
  const locations = findLocations(fragment);

  if (countryFromCode) {
    const city = locations.find((location) => location.type === 'city' && location.country === countryFromCode.country);
    const fallbackCity = city ? null : extractCityAfterCountryCode(fragment);
    return city ?? (fallbackCity ? {
      type: 'city',
      label: fallbackCity,
      city: fallbackCity,
      country: countryFromCode.country,
      cityVerified: false,
      lat: null,
      lon: null,
      index: 0
    } : countryFromCode);
  }

  return locations[0] ?? null;
}

function findExplicitRoute(rawText) {
  const loadFragment = findLocationFragment(rawText, LOAD_LOCATION_MARKER);
  const unloadFragment = findLocationFragment(rawText, UNLOAD_LOCATION_MARKER);

  return {
    load: loadFragment ? parsePlaceFragment(loadFragment) : null,
    unload: unloadFragment ? parsePlaceFragment(unloadFragment) : null
  };
}

function findAfterMarker(rawText, markerRegex) {
  const normalized = normalizeText(stripUrls(rawText));
  const marker = normalized.match(markerRegex);
  if (!marker || marker.index == null) return null;
  const after = normalized.slice(marker.index + marker[0].length);
  return findLocations(after)[0] ?? null;
}

function inferRoute(rawText) {
  const explicit = findExplicitRoute(rawText);
  const loadMarker = /\b(?:incarcare|incarca|loading|load|pickup|plecare|din)\b/;
  const unloadMarker = /\b(?:descarcare|descarca|delivery|unload|destinatie|catre|spre|in)\b/;
  const loadFromMarker = findAfterMarker(rawText, loadMarker);
  const unloadFromMarker = findAfterMarker(rawText, unloadMarker);
  const locations = findLocations(rawText);

  let load = explicit.load ?? loadFromMarker;
  let unload = explicit.unload ?? unloadFromMarker;

  if (!load || !unload || load.label === unload.label) {
    const unique = [];
    for (const location of locations) {
      if (!unique.some((candidate) => candidate.label === location.label)) unique.push(location);
    }
    load = load ?? unique[0] ?? null;
    unload = unload && unload.label !== load?.label ? unload : unique.find((location) => location.label !== load?.label) ?? null;
  }

  return { load, unload };
}

export function parseLoadMessage(rawText, options = {}) {
  const text = String(rawText ?? '').trim();
  const { load, unload } = inferRoute(text);
  const truckType = findTruckType(text);
  const weightTons = findWeightTons(text);
  const price = findPrice(text);
  const contact = findContact(text);
  const loadDate = findLoadDate(text, options.baseDate ?? new Date());

  const result = {
    loadCity: load?.city ?? null,
    unloadCity: unload?.city ?? null,
    loadCountry: load?.country ?? (load?.type === 'country' ? load.country : null),
    unloadCountry: unload?.country ?? (unload?.type === 'country' ? unload.country : null),
    loadCityVerified: Boolean(load?.city && load.cityVerified !== false),
    unloadCityVerified: Boolean(unload?.city && unload.cityVerified !== false),
    loadLat: load?.lat ?? null,
    loadLon: load?.lon ?? null,
    unloadLat: unload?.lat ?? null,
    unloadLon: unload?.lon ?? null,
    loadDate,
    truckType,
    weightTons,
    price,
    contact,
    confidence: 0
  };

  let score = 0;
  if (result.loadCity || result.loadCountry) score += 0.18;
  if (result.unloadCity || result.unloadCountry) score += 0.18;
  if (result.truckType) score += 0.14;
  if (result.weightTons) score += 0.12;
  if (result.price) score += 0.1;
  if (result.loadDate) score += 0.12;
  if (result.contact) score += 0.08;
  if (/\b(?:cursa|transport|marfa|incarcare|descarcare|disponibil|camion)\b/i.test(normalizeText(text))) score += 0.08;

  result.confidence = Math.min(1, Math.round(score * 100) / 100);
  return result;
}

export const dictionaries = {
  cityCountry: CITY_COUNTRY,
  countryAliases: COUNTRY_ALIASES,
  truckTypes: TRUCK_TYPES
};
