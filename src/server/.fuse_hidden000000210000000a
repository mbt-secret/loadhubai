import { resolveKnownCoordinates } from './coordinates.mjs';

export const GEOTRANS_SOURCE_NAME = 'GeoTrans.md';
export const GEOTRANS_SOURCE_ID = 'source:geotrans.md';

const geotransApiUrl = 'https://api.geotrans.md/api/cargo/search';

const countryNames = new Map([
  ['AT', 'Austria'],
  ['BE', 'Belgia'],
  ['BG', 'Bulgaria'],
  ['BY', 'Belarus'],
  ['CH', 'Elvetia'],
  ['CZ', 'Cehia'],
  ['DE', 'Germania'],
  ['ES', 'Spania'],
  ['FR', 'Franta'],
  ['GB', 'Regatul Unit'],
  ['GE', 'Georgia'],
  ['GR', 'Grecia'],
  ['HU', 'Ungaria'],
  ['IT', 'Italia'],
  ['LT', 'Lituania'],
  ['MD', 'Moldova'],
  ['NL', 'Olanda'],
  ['PL', 'Polonia'],
  ['RO', 'Romania'],
  ['RU', 'Rusia'],
  ['SK', 'Slovacia'],
  ['TR', 'Turcia'],
  ['UA', 'Ucraina']
]);

const countryNameAliases = new Map([
  ['BELARUS', 'Belarus'],
  ['CEHIA', 'Cehia'],
  ['FRANTA', 'Franta'],
  ['GERMANIA', 'Germania'],
  ['ITALIA', 'Italia'],
  ['LITUANIA', 'Lituania'],
  ['MOLDOVA', 'Moldova'],
  ['OLANDA', 'Olanda'],
  ['ROMANIA', 'Romania'],
  ['SLOVACIA', 'Slovacia'],
  ['TURCIA', 'Turcia'],
  ['UCRAINA', 'Ucraina']
]);

const transportTypeNames = new Map([
  ['124', 'Frigo'],
  ['130', 'Mega'],
  ['134', 'Duba'],
  ['138', 'Prelata'],
  ['141', 'Tandem'],
  ['202', 'Duba']
]);

function clean(value) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return text || null;
}

function titleCase(value) {
  const text = clean(value);
  if (!text) return null;
  return text
    .toLocaleLowerCase('ro-RO')
    .split(/([\s-]+)/)
    .map((part) => (/[\s-]+/.test(part) ? part : part.charAt(0).toLocaleUpperCase('ro-RO') + part.slice(1)))
    .join('');
}

function countryName(country) {
  const abbr = clean(country?.countryAbbr)?.toUpperCase();
  if (abbr && countryNames.has(abbr)) return countryNames.get(abbr);

  const raw = clean(country?.countryName)?.toUpperCase();
  if (raw && countryNameAliases.has(raw)) return countryNameAliases.get(raw);
  return titleCase(country?.countryName);
}

function cityName(point) {
  return titleCase(point?.city ?? point?.cityName);
}

function isoDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function contactFrom(item) {
  return clean([item.userFullName, item.companyName].filter(Boolean).join(' / '));
}

function truckTypeFrom(item) {
  const info = `${item.cargo?.info ?? ''} ${item.cargo?.name ?? ''}`.toLocaleLowerCase('ro-RO');
  if (/\b(frigo|ref|refriger|temperatur|regim\s*[-+]?\d+)/i.test(info)) return 'Frigo';
  if (/\bmega\b/i.test(info)) return 'Mega';
  if (/\b(tandem)\b/i.test(info)) return 'Tandem';
  if (/\b(duba|dubita|van)\b/i.test(info)) return 'Duba';
  if (/\b(tent|prelat|тент)\b/i.test(info)) return 'Prelata';

  const mapped = (item.transportTypes ?? [])
    .map((type) => transportTypeNames.get(String(type)))
    .filter(Boolean);
  return mapped[0] ?? null;
}

function pointCoordinates(point) {
  const lat = Number(point?.lat ?? point?.latitude ?? point?.geoLat);
  const lon = Number(point?.lon ?? point?.lng ?? point?.longitude ?? point?.geoLon);
  if (Number.isFinite(lat) && Number.isFinite(lon)) return { lat, lon };
  return resolveKnownCoordinates(cityName(point), countryName(point));
}

function originalTextFrom(item) {
  const from = [cityName(item.from), countryName(item.from)].filter(Boolean).join(', ');
  const to = [cityName(item.to), countryName(item.to)].filter(Boolean).join(', ');
  const parts = [
    `Sursa: ${GEOTRANS_SOURCE_NAME}`,
    `ID anunt: ${item.itemId}`,
    from ? `Incarcare: ${from}` : null,
    to ? `Descarcare: ${to}` : null,
    isoDate(item.from?.date) ? `Data incarcarii: ${isoDate(item.from?.date)}` : null,
    item.cargo?.name ? `Marfa: ${item.cargo.name}` : null,
    truckTypeFrom(item) ? `Tip camion: ${truckTypeFrom(item)}` : null,
    item.cargo?.weight ? `Greutate: ${item.cargo.weight} ${item.cargo.weightUnit ?? 't'}` : null,
    clean(item.cargo?.volume) ? `Volum: ${item.cargo.volume} ${item.cargo.volumeUnit ?? ''}` : null,
    clean(item.cargo?.price) ? `Pret: ${item.cargo.price}` : null,
    contactFrom(item) ? `Contact: ${contactFrom(item)}` : null,
    clean(item.cargo?.info) ? `Comentariu: ${clean(item.cargo.info)}` : null,
    `Link: https://geotrans.md/cargo/${item.itemId}`
  ];
  return parts.filter(Boolean).join('\n');
}

export function mapGeotransCargoItem(item) {
  const messageTime = item.refDate ?? item.updateDate ?? item.createDate ?? item.insertedOn ?? null;
  const price = clean(item.cargo?.price);
  const weightTons = Number(item.cargo?.weight);
  const loadCoords = pointCoordinates(item.from);
  const unloadCoords = pointCoordinates(item.to);
  const parsedPatch = {
    loadCity: cityName(item.from),
    unloadCity: cityName(item.to),
    loadCountry: countryName(item.from),
    unloadCountry: countryName(item.to),
    loadLat: loadCoords?.lat ?? null,
    loadLon: loadCoords?.lon ?? null,
    unloadLat: unloadCoords?.lat ?? null,
    unloadLon: unloadCoords?.lon ?? null,
    loadDate: isoDate(item.from?.date),
    truckType: truckTypeFrom(item),
    weightTons: Number.isFinite(weightTons) && weightTons > 0 ? weightTons : null,
    price,
    contact: contactFrom(item),
    confidence: 0.96
  };

  return {
    groupName: GEOTRANS_SOURCE_NAME,
    groupWhatsappId: GEOTRANS_SOURCE_ID,
    whatsappMessageId: `geotrans:${item.itemId}`,
    author: contactFrom(item) ?? GEOTRANS_SOURCE_NAME,
    text: originalTextFrom(item),
    messageTime,
    parsedPatch
  };
}

export async function fetchGeotransCargo({ pageIndex = 0, pageSize = 50 } = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const body = {
    lang: 'ro',
    clientName: 'LoadHUBAI Local',
    query: {
      filterKey: 'auto',
      countriesFrom: [],
      countriesTo: [],
      dateLoadingFrom: today,
      isAdr: false,
      adrClass: 1,
      isClimateControl: false,
      isGrouping: false,
      isOversized: false,
      isOnlyProvedCompanies: false,
      isOnlyFromMyCountry: false
    },
    queryStr: `Toate tarile - Toate tarile ${today}`,
    pageIndex,
    pageSize,
    sortBy: 'date-add',
    dateScope: 'all',
    autoupdate: true,
    log: true
  };

  const response = await fetch(geotransApiUrl, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://geotrans.md',
      referer: 'https://geotrans.md/cargo/search',
      'user-agent': 'Mozilla/5.0 LoadHUBAI Local'
    },
    body: JSON.stringify(body)
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.message ?? `GeoTrans.md a raspuns cu status ${response.status}.`);
  }

  return {
    totalItems: Number(payload.d?.totalItems ?? 0),
    items: Array.isArray(payload.d?.items) ? payload.d.items : []
  };
}
