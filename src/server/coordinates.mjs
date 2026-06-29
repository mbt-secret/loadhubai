import { normalizeText } from './parser.mjs';

const COUNTRY_COORDINATES = new Map(
  [
    ['Austria', 47.5162, 14.5501],
    ['Belarus', 53.7098, 27.9534],
    ['Belgia', 50.5039, 4.4699],
    ['Bulgaria', 42.7339, 25.4858],
    ['Cehia', 49.8175, 15.473],
    ['Elvetia', 46.8182, 8.2275],
    ['Franta', 46.2276, 2.2137],
    ['Germania', 51.1657, 10.4515],
    ['Italia', 41.8719, 12.5674],
    ['Moldova', 47.0105, 28.8638],
    ['Olanda', 52.1326, 5.2913],
    ['Polonia', 51.9194, 19.1451],
    ['Romania', 45.9432, 24.9668],
    ['Rusia', 55.7558, 37.6173],
    ['Slovacia', 48.669, 19.699],
    ['Turcia', 39.9334, 32.8597],
    ['Ucraina', 49.4872, 31.2718],
    ['Ungaria', 47.1625, 19.5033]
  ].map(([country, lat, lon]) => [normalizeText(country), { lat, lon }])
);

const CITY_COORDINATES = new Map();

function addCity(country, aliases, lat, lon) {
  for (const alias of aliases) {
    CITY_COORDINATES.set(`${normalizeText(country)}|${normalizeText(alias)}`, { lat, lon });
  }
}

addCity('Romania', ['Arad'], 46.1866, 21.3123);
addCity('Romania', ['Bucuresti', 'Bucharest'], 44.4268, 26.1025);
addCity('Romania', ['Brasov'], 45.6427, 25.5887);
addCity('Romania', ['Cluj-Napoca', 'Cluj'], 46.7712, 23.6236);
addCity('Romania', ['Constanta'], 44.1598, 28.6348);
addCity('Romania', ['Iasi'], 47.1585, 27.6014);
addCity('Romania', ['Ramnicu Valcea'], 45.1047, 24.3756);
addCity('Romania', ['Reghin'], 46.7742, 24.7022);
addCity('Moldova', ['Chisinau'], 47.0105, 28.8638);
addCity('Moldova', ['Balti'], 47.7617, 27.9289);
addCity('Moldova', ['Tiraspol'], 46.8482, 29.5968);
addCity('Moldova', ['Rezina'], 47.7493, 28.9622);
addCity('Turcia', ['Istanbul', 'Istanbul european Side', 'Istanbul asian Side'], 41.0082, 28.9784);
addCity('Turcia', ['Konya'], 37.8746, 32.4932);
addCity('Turcia', ['Manisa'], 38.614, 27.4296);
addCity('Turcia', ['Zonguldak'], 41.4564, 31.7987);
addCity('Ucraina', ['Odesa', 'Odessa'], 46.4825, 30.7233);
addCity('Ucraina', ['Kyiv', 'Kiev'], 50.4501, 30.5234);
addCity('Ucraina', ['Lviv'], 49.8397, 24.0297);
addCity('Ucraina', ['Bila Tserkva'], 49.7989, 30.1153);
addCity('Ucraina', ['Cherkasy'], 49.4444, 32.0598);
addCity('Ucraina', ['Kostopol'], 50.8786, 26.4519);
addCity('Ucraina', ['Stryi'], 49.2622, 23.8561);
addCity('Ucraina', ['Ternopil'], 49.5535, 25.5948);
addCity('Ucraina', ['Zhitomir', 'Zhytomyr'], 50.2547, 28.6587);
addCity('Rusia', ['Nizhniy Novgorod'], 56.2965, 43.9361);
addCity('Belarus', ['Minsk'], 53.9006, 27.559);
addCity('Germania', ['Osnabruck', 'Osnabrueck'], 52.2799, 8.0472);
addCity('Italia', ['Padova'], 45.4064, 11.8768);
addCity('Polonia', ['Bialystok'], 53.1325, 23.1688);
addCity('Polonia', ['Czestochowa'], 50.8118, 19.1203);
addCity('Polonia', ['Krakow'], 50.0647, 19.945);
addCity('Polonia', ['Leszno'], 51.8419, 16.5938);
addCity('Polonia', ['Lodz'], 51.7592, 19.456);
addCity('Polonia', ['Przemysl'], 49.7839, 22.7678);
addCity('Bulgaria', ['Varna'], 43.2141, 27.9147);
addCity('Ungaria', ['Vasarosnameny'], 48.125, 22.313);

function cityVariants(cityName) {
  const raw = String(cityName ?? '').trim();
  if (!raw) return [];
  const withoutParentheses = raw.replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+/g, ' ').trim();
  return Array.from(new Set([raw, withoutParentheses].filter(Boolean)));
}

export function resolveKnownCoordinates(cityName, countryName, { allowCountry = true } = {}) {
  const countryKey = normalizeText(countryName);
  if (!countryKey) return null;

  for (const city of cityVariants(cityName)) {
    const cityCoords = CITY_COORDINATES.get(`${countryKey}|${normalizeText(city)}`);
    if (cityCoords) return cityCoords;
  }

  // allowCountry=false => nu plasam un punct pe centrul tarii cand orasul nu e gasit
  // (altfel toate ofertele negeolocalizate s-ar aduna intr-un singur punct).
  return allowCountry ? (COUNTRY_COORDINATES.get(countryKey) ?? null) : null;
}
