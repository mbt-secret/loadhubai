import {
  findLoadDate,
  findLocations,
  findTruckType,
  findWeightTons,
  normalizeText
} from './parser.mjs';

function tokenize(query) {
  return normalizeText(query)
    .split(' ')
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

export function parseSearchQuery(query, options = {}) {
  const text = String(query ?? '').trim();
  const locations = preferExactCountryLocations(text, findLocations(text));
  const truckType = findTruckType(text);
  const weightTons = findWeightTons(text);
  const loadDate = findLoadDate(text, options.baseDate ?? new Date());
  const tokens = tokenize(text);
  const normalized = normalizeText(text);
  const hasOriginMarker = /\b(?:din|de la|incarcare|incarca|plecare|loading|pickup)\b/.test(normalized);
  const hasDestinationMarker = /\b(?:spre|catre|destinatie|descarcare|descarca|delivery|unload)\b/.test(normalized);

  return {
    text,
    tokens,
    locations,
    truckType,
    weightTons,
    loadDate,
    originOnly: hasOriginMarker && !hasDestinationMarker
  };
}

function hasBoundary(value, index, length) {
  const before = index <= 0 ? ' ' : value[index - 1];
  const after = index + length >= value.length ? ' ' : value[index + length];
  return !/[a-z0-9]/i.test(before) && !/[a-z0-9]/i.test(after);
}

function preferExactCountryLocations(text, locations) {
  const normalized = normalizeText(text);
  const exactCountryRanges = locations
    .filter((location) => location.type === 'country')
    .map((location) => {
      const country = normalizeText(location.country ?? location.label);
      const start = normalized.indexOf(country);
      return country && start >= 0 && hasBoundary(normalized, start, country.length)
        ? { start, end: start + country.length }
        : null;
    })
    .filter(Boolean);

  if (exactCountryRanges.length === 0) return locations;
  return locations.filter((location) => {
    if (location.type === 'country') return true;
    const exactCityLabel = locationLabels(location, { allowCountryForCity: false })
      .some((label) => normalized.includes(label) && hasBoundary(normalized, normalized.indexOf(label), label.length));
    if (exactCityLabel) return true;
    return !exactCountryRanges.some((range) => location.index >= range.start - 1 && location.index <= range.end);
  });
}

function loadHaystack(load) {
  return normalizeText(
    [
      load.loadCity,
      load.unloadCity,
      load.loadCountry,
      load.unloadCountry,
      load.truckType,
      load.weightTons ? `${load.weightTons}t` : '',
      load.price,
      load.groupName,
      load.originalText,
      load.translatedText,
      load.aiSummary
    ].join(' ')
  );
}

function routeHaystack(load) {
  return normalizeText(
    [
      load.loadCity,
      load.unloadCity,
      load.loadCountry,
      load.unloadCountry,
      load.originalText,
      load.translatedText,
      load.aiSummary
    ].join(' ')
  );
}

function cleanMessageSearchText(text) {
  return normalizeText(
    String(text ?? '')
    .replace(/https?:\/\/\S+/gi, ' ')
    .replace(/\b(?:www\.)?\S+\.(?:com|net|org|ro|md|de|it|fr|es|at|bg|hu|pl|cz|sk|ua|tr|nl|be|ch)\S*/gi, ' ')
  );
}

function messageHaystacks(load) {
  return [load.originalText, load.translatedText, load.aiSummary]
    .filter(Boolean)
    .map((text) => ({
      raw: String(text ?? '').replace(/https?:\/\/\S+/gi, ' '),
      normalized: cleanMessageSearchText(text)
    }))
    .filter((message) => message.normalized);
}

const COUNTRY_CODE_LABELS = new Map([
  ['Romania', ['ro']],
  ['Germania', ['de']],
  ['Italia', ['it']],
  ['Austria', ['at']],
  ['Ungaria', ['hu']],
  ['Franta', ['fr']],
  ['Spania', ['es']],
  ['Olanda', ['nl']],
  ['Belgia', ['be']],
  ['Polonia', ['pl']],
  ['Belarus', ['by']],
  ['Cehia', ['cz']],
  ['Slovacia', ['sk']],
  ['Slovenia', ['si']],
  ['Bulgaria', ['bg']],
  ['Turcia', ['tr']],
  ['Georgia', ['ge']],
  ['Ucraina', ['ua']],
  ['Moldova', ['md']],
  ['Regatul Unit', ['gb', 'uk']],
  ['Elvetia', ['ch']],
  ['Suedia', ['se']],
  ['Norvegia', ['no']],
  ['Danemarca', ['dk']],
  ['Finlanda', ['fi']],
  ['Estonia', ['ee']],
  ['Letonia', ['lv']],
  ['Lituania', ['lt']],
  ['Croatia', ['hr']],
  ['Serbia', ['rs']],
  ['Bosnia si Hertegovina', ['ba']],
  ['Muntenegru', ['me']],
  ['Macedonia de Nord', ['mk']],
  ['Albania', ['al']],
  ['Grecia', ['gr']],
  ['Portugalia', ['pt']],
  ['Irlanda', ['ie']],
  ['Luxemburg', ['lu']],
  ['Armenia', ['am']],
  ['Azerbaidjan', ['az']],
  ['Kazahstan', ['kz']],
  ['Rusia', ['ru']]
]);

function countryCodeLabels(location) {
  const countryCodes = COUNTRY_CODE_LABELS.get(location.country) ?? COUNTRY_CODE_LABELS.get(location.label) ?? [];
  return countryCodes.map(normalizeText).filter(Boolean);
}

function locationLabels(location, { allowCountryForCity = false, includeCountryCodes = false } = {}) {
  const labels = [location.label, location.city].filter(Boolean);
  const includeCountry = location.type === 'country' || allowCountryForCity;
  if (includeCountry && location.country) labels.push(location.country);
  const countryCodes = includeCountry && includeCountryCodes ? countryCodeLabels(location) : [];
  return [...new Set([...labels, ...countryCodes].map(normalizeText).filter(Boolean))];
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function haystackHasLabel(haystack, label) {
  if (!label) return false;
  if (label.length <= 3) {
    return new RegExp(`(^|\\s|[-/>])${escapeRegExp(label)}($|\\s|[-/<])`, 'i').test(haystack);
  }
  return haystack.includes(label);
}

function labelIndex(haystack, label, fromIndex = 0) {
  if (!label) return -1;
  const source = haystack.slice(fromIndex);
  if (label.length <= 3) {
    const match = source.match(new RegExp(`(^|\\s|[-/>])${escapeRegExp(label)}($|\\s|[-/<])`, 'i'));
    return match && match.index != null ? fromIndex + match.index : -1;
  }
  const index = source.indexOf(label);
  return index < 0 ? -1 : fromIndex + index;
}

function explicitCountryCodeIndex(rawText, code, fromIndex = 0) {
  if (!code || code.length < 2 || code.length > 3) return -1;
  const source = String(rawText ?? '').slice(Math.max(0, fromIndex));
  const escaped = escapeRegExp(code.toUpperCase());
  const match = source.match(new RegExp(`(^|[\\s([{/>,;:-])${escaped}($|[\\s)\\]}/<,;:-])`));
  return match && match.index != null ? Math.max(0, fromIndex) + match.index + match[1].length : -1;
}

function messageLocationIndices(message, location, fromIndex = 0) {
  const fullLabelIndices = locationLabels(location)
    .map((label) => labelIndex(message.normalized, label, fromIndex))
    .filter((index) => index >= 0);
  const explicitCodeIndices = countryCodeLabels(location)
    .map((code) => explicitCountryCodeIndex(message.raw, code, fromIndex))
    .filter((index) => index >= 0);
  return [...fullLabelIndices, ...explicitCodeIndices];
}

function matchesLocationInMessage(load, location) {
  return messageHaystacks(load).some((message) => messageLocationIndices(message, location).length > 0);
}

function matchesLocation(load, location) {
  const haystack = loadHaystack(load);
  const labels = locationLabels(location);
  if (labels.some((label) => haystackHasLabel(haystack, label))) return true;
  if (matchesLocationSide(load, location, 'load') || matchesLocationSide(load, location, 'unload')) return true;
  return matchesLocationInMessage(load, location);
}

function matchesLocationInRouteText(load, location) {
  const haystack = routeHaystack(load);
  const labels = locationLabels(location);
  return labels.some((label) => haystackHasLabel(haystack, label));
}

function sideHaystack(load, side) {
  return normalizeText(
    side === 'load'
      ? [load.loadCity, load.loadCountry].join(' ')
      : [load.unloadCity, load.unloadCountry].join(' ')
  );
}

function matchesLocationSide(load, location, side) {
  const haystack = sideHaystack(load, side);
  const labels = locationLabels(location, { includeCountryCodes: true });
  return labels.some((label) => haystackHasLabel(haystack, label));
}

function parsedFilterTokens(parsed) {
  const values = [];
  for (const location of parsed.locations) {
    values.push(...locationLabels(location, { allowCountryForCity: true, includeCountryCodes: true }));
  }
  if (parsed.truckType) values.push(normalizeText(parsed.truckType));
  if (parsed.weightTons) {
    values.push(String(parsed.weightTons), `${parsed.weightTons}t`);
    if (Number.isInteger(parsed.weightTons)) values.push(String(Math.trunc(parsed.weightTons)));
  }
  if (parsed.loadDate) values.push(parsed.loadDate);
  return values
    .flatMap((value) => normalizeText(value).split(' '))
    .filter(Boolean);
}

function isSearchSyntaxToken(token, parsed) {
  if (/^(?:din|de|la|spre|catre|incarcare|incarca|plecare|loading|pickup|destinatie|descarcare|descarca|delivery|unload)$/i.test(token)) {
    return true;
  }
  if (parsed.loadDate && /^(?:azi|maine|poimaine|luni|marti|miercuri|joi|vineri|sambata|duminica|\d{1,2}[./-]\d{1,2}(?:[./-]\d{2,4})?)$/.test(token)) {
    return true;
  }
  return false;
}

function unmatchedFreeTokens(parsed) {
  const represented = parsedFilterTokens(parsed);
  return parsed.tokens.filter((token) => {
    if (isSearchSyntaxToken(token, parsed)) return false;
    return !represented.some((value) => value === token || value.includes(token) || token.includes(value));
  });
}

function matchesLocationsInOrder(load, locations) {
  return messageHaystacks(load).some((message) => {
    let cursor = 0;

    for (const location of locations) {
      const indices = messageLocationIndices(message, location, cursor);

      if (indices.length === 0) return false;
      cursor = Math.min(...indices) + 1;
    }

    return true;
  });
}

function loadWithQueryRoute(load, parsed) {
  if (parsed.locations.length < 2) return load;

  const [origin, destination] = parsed.locations;
  const routeMatches =
    matchesLocationSide(load, origin, 'load') &&
    matchesLocationSide(load, destination, 'unload');

  if (routeMatches || !matchesLocationsInOrder(load, parsed.locations)) return load;

  return {
    ...load,
    loadCity: load.loadCity ?? origin.city ?? null,
    loadCountry: origin.country ?? (origin.type === 'country' ? origin.country : load.loadCountry),
    unloadCity: load.unloadCity && !matchesLocationSide(load, origin, 'unload') ? load.unloadCity : destination.city ?? null,
    unloadCountry: destination.country ?? (destination.type === 'country' ? destination.country : load.unloadCountry)
  };
}

function firstLocationFromText(value, options = {}) {
  const parsed = parseSearchQuery(value, options);
  return parsed.locations[0] ?? null;
}

function normalizedCountry(location) {
  return normalizeText(location?.country ?? (location?.type === 'country' ? location.label : ''));
}

function messageCountries(load) {
  const countries = new Set();
  for (const message of messageHaystacks(load)) {
    for (const location of findLocations(message.raw)) {
      const country = normalizedCountry(location);
      if (country) countries.add(country);
    }
  }
  return countries;
}

function messageHasRouteSignal(load) {
  const text = cleanMessageSearchText([load.originalText, load.translatedText, load.aiSummary].filter(Boolean).join(' '));
  return /\b(?:incarcare|incarca|plecare|pickup|loading|descarcare|descarca|destinatie|delivery|unload|loc|mesto|pog|razg)\b|->|=>|[-–—]\s*>/.test(text);
}

function messageAllowsStructuredDestination(load, destination) {
  const country = normalizedCountry(destination);
  if (!country) return true;

  const countries = messageCountries(load);
  if (countries.size < 2) return true;
  if (countries.has(country)) return true;

  return !messageHasRouteSignal(load);
}

function matchesStructuredRoute(load, origin, destination, { near = false } = {}) {
  const locations = [origin, destination].filter(Boolean);
  const orderMatches = locations.length > 1 && matchesLocationsInOrder(load, locations);
  const originMatches = !origin || matchesLocationSide(load, origin, 'load') || near;
  const destinationMatches = !destination || matchesLocationSide(load, destination, 'unload');

  if (origin && !originMatches) return false;
  if (destination && !destinationMatches && !orderMatches) return false;
  if (orderMatches) return true;
  if (destination && !messageAllowsStructuredDestination(load, destination)) return false;
  return true;
}

function isConcreteFilterValue(value) {
  const normalized = normalizeText(value);
  return Boolean(normalized) && !['orice', 'oricand', 'toate', 'all'].includes(normalized);
}

const MESSAGE_AGE_WINDOWS_MS = new Map([
  ['10m', 10 * 60 * 1000],
  ['1h', 60 * 60 * 1000],
  ['5h', 5 * 60 * 60 * 1000],
  ['1d', 24 * 60 * 60 * 1000]
]);

export function filterLoadsByMessageAge(loads, messageAge, now = new Date()) {
  const windowMs = MESSAGE_AGE_WINDOWS_MS.get(String(messageAge ?? '').trim());
  if (!windowMs) return loads;

  const nowMs = new Date(now).getTime();
  if (!Number.isFinite(nowMs)) return [];

  const cutoffMs = nowMs - windowMs;
  return loads.filter((load) => {
    const capturedAtMs = new Date(load.capturedAt).getTime();
    return Number.isFinite(capturedAtMs) && capturedAtMs >= cutoffMs;
  });
}

function toRad(value) {
  return (Number(value) * Math.PI) / 180;
}

function haversineKm(a, b) {
  if (!a || !b) return Infinity;
  const lat1 = Number(a.lat);
  const lng1 = Number(a.lng ?? a.lon);
  const lat2 = Number(b.lat);
  const lng2 = Number(b.lng ?? b.lon);
  if (![lat1, lng1, lat2, lng2].every(Number.isFinite)) return Infinity;
  const earthKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const sin = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(toRad(lat1)) * Math.cos(toRad(lat2));
  return 2 * earthKm * Math.asin(Math.sqrt(sin));
}

function normalizeGeoFilter(geo) {
  if (!geo) return null;
  const lat = Number(geo.lat);
  const lng = Number(geo.lng ?? geo.lon);
  const radiusKm = Number(geo.radiusKm);
  if (![lat, lng].every(Number.isFinite) || !Number.isFinite(radiusKm) || radiusKm <= 0) return null;
  return { lat, lng, radiusKm };
}

function defaultLoadCoord(load) {
  const lat = Number(load.loadLat);
  const lng = Number(load.loadLon);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function isWithinRadius(coord, geo) {
  if (!coord || !geo) return false;
  return haversineKm(coord, geo) <= geo.radiusKm;
}

function parseMinPrice(value) {
  if (!value) return null;
  const match = String(value).match(/(\d{2,6})/);
  return match ? Number(match[1]) : null;
}

export function parsePriceValue(price) {
  if (!price) return null;
  const match = String(price).toLowerCase().match(/\d[\d.,\s]*/);
  if (!match) return null;
  let token = match[0].replace(/\s+/g, '');
  token = token.replace(/[.,](?=\d{3}(?:\D|$))/g, '');
  token = token.replace(',', '.');
  const num = Number(token);
  return Number.isFinite(num) ? num : null;
}

export function rankLoadForQuery(load, query, options = {}) {
  const parsed = typeof query === 'string' ? parseSearchQuery(query, options) : query;
  if (!parsed.text) return 1;

  const haystack = loadHaystack(load);
  const freeTokens = unmatchedFreeTokens(parsed);
  if (freeTokens.some((token) => !haystackHasLabel(haystack, token))) return 0;
  let score = 0;
  let requiredMatches = 0;
  let matchedRequired = 0;

  if (parsed.locations.length > 1) {
    requiredMatches += parsed.locations.length;

    const [origin, destination] = parsed.locations;
    const routeMatches =
      matchesLocationSide(load, origin, 'load') &&
      matchesLocationSide(load, destination, 'unload');

    if (routeMatches) {
      matchedRequired += parsed.locations.length;
      score += 0.5;
    } else if (matchesLocationsInOrder(load, parsed.locations)) {
      matchedRequired += parsed.locations.length;
      score += 0.34;
    } else {
      return 0;
    }
  } else if (parsed.locations.length === 1) {
    requiredMatches += 1;
    const [location] = parsed.locations;
    const locationMatches = parsed.originOnly
      ? matchesLocationSide(load, location, 'load')
      : matchesLocation(load, location);

    if (locationMatches) {
      matchedRequired += 1;
      score += 0.28;
    }
  }

  if (parsed.truckType) {
    requiredMatches += 1;
    if (normalizeText(load.truckType).includes(normalizeText(parsed.truckType)) || haystack.includes(normalizeText(parsed.truckType))) {
      matchedRequired += 1;
      score += 0.18;
    }
  }

  if (parsed.weightTons) {
    requiredMatches += 1;
    const loadWeight = Number(load.weightTons);
    if (Number.isFinite(loadWeight) && Math.abs(loadWeight - parsed.weightTons) <= 0.5) {
      matchedRequired += 1;
      score += 0.16;
    } else if (haystack.includes(`${parsed.weightTons}`)) {
      matchedRequired += 1;
      score += 0.1;
    }
  }

  if (parsed.loadDate) {
    requiredMatches += 1;
    if (load.loadDate === parsed.loadDate || haystack.includes(parsed.loadDate)) {
      matchedRequired += 1;
      score += 0.14;
    }
  }

  const tokenMatches = parsed.tokens.filter((token) => haystack.includes(token));
  score += Math.min(0.24, tokenMatches.length * 0.04);

  if (requiredMatches > 0 && matchedRequired === 0) return 0;
  if (parsed.locations.length > 1 && matchedRequired < parsed.locations.length) return 0;
  if (requiredMatches > 1 && matchedRequired / requiredMatches < 0.5) return 0;
  return Math.min(1, Math.round(score * 100) / 100);
}

export function searchLoads(loads, query, options = {}) {
  const parsed = parseSearchQuery(query, options);
  if (!parsed.text) return loads;

  return loads
    .map((load) => ({ load, score: rankLoadForQuery(load, parsed, options) }))
    .filter(({ score }) => score > 0.18)
    .sort((a, b) => b.score - a.score || new Date(b.load.capturedAt).getTime() - new Date(a.load.capturedAt).getTime())
    .map(({ load }) => loadWithQueryRoute(load, parsed));
}

export function searchLoadsStructured(loads, filters = {}, options = {}) {
  const origin = firstLocationFromText(filters.origin, options);
  const destination =
    filters.destinationType === 'all' ? null : firstLocationFromText(filters.destination, options);
  const geo = normalizeGeoFilter(filters.geo);
  const resolveLoadCoord = typeof options.resolveLoadCoord === 'function' ? options.resolveLoadCoord : defaultLoadCoord;
  const minPrice = parseMinPrice(filters.price);
  const hasRouteFilter = Boolean(origin || destination);
  const criteriaQuery = [filters.truckType, filters.weight, filters.cargoType, filters.loadDate]
    .filter(isConcreteFilterValue)
    .join(' ');

  let results = hasRouteFilter || geo
    ? loads.filter((load) => {
        const near = geo ? isWithinRadius(resolveLoadCoord(load), geo) : false;
        if (geo && !origin) {
          if (!near) return false;
          return !destination || matchesStructuredRoute(load, null, destination);
        }
        return matchesStructuredRoute(load, origin, destination, { near });
      })
    : loads;

  if (origin && destination) {
    results = results.map((load) => loadWithQueryRoute(load, { locations: [origin, destination] }));
  }

  if (minPrice != null) {
    results = results.filter((load) => {
      const value = parsePriceValue(load.price);
      return value != null && value >= minPrice;
    });
  }

  return criteriaQuery ? searchLoads(results, criteriaQuery, options) : results;
}

export function savedSearchMatchesLoad(load, savedSearch) {
  if (!savedSearch.notificationsEnabled) return false;
  return rankLoadForQuery(load, savedSearch.query) > 0.3;
}

export function buildFtsQuery(query) {
  const tokens = tokenize(query)
    .filter((token) => /^[a-z0-9]+$/i.test(token))
    .slice(0, 8);
  if (tokens.length === 0) return null;
  return tokens.map((token) => `${token}*`).join(' OR ');
}
