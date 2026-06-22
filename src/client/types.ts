export type WhatsappStatus = {
  connected: boolean;
  state: 'disconnected' | 'starting' | 'qr' | 'pairing' | 'connected' | 'error';
  message: string;
  lastSyncAt?: string | null;
  qrCodeDataUrl?: string | null;
  pairingCode?: string | null;
};

export type Group = {
  id: number;
  whatsappId: string | null;
  name: string;
  isActive: boolean;
  lastSyncAt: string | null;
  createdAt: string;
};

export type Load = {
  id: number;
  messageId: number;
  groupId: number;
  groupName: string;
  originalText: string;
  messageTime: string | null;
  capturedAt: string;
  loadCity: string | null;
  unloadCity: string | null;
  loadCountry: string | null;
  unloadCountry: string | null;
  loadCityVerified: boolean;
  unloadCityVerified: boolean;
  loadLat: number | null;
  loadLon: number | null;
  unloadLat: number | null;
  unloadLon: number | null;
  loadDate: string | null;
  truckType: string | null;
  weightTons: number | null;
  price: string | null;
  contact: string | null;
  detectedLanguage: string | null;
  translatedText: string | null;
  aiSummary: string | null;
  aiProvider: string | null;
  analysisVersion: string | null;
  confidence: number;
  isManual: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SavedSearch = {
  id: number;
  query: string;
  notificationsEnabled: boolean;
  createdAt: string;
};

export type LocalSettings = {
  notificationsEnabled: boolean;
  compactCards: boolean;
  aiEnabled: boolean;
  aiMode: 'local' | 'openai-compatible';
  aiEndpoint: string;
  aiModel: string;
  aiApiKey: string;
  aiApiKeySet?: boolean;
  translateLanguage: string;
  analysisVersion: string;
  lastAnalysisBackfillAt?: string;
  geotransEnabled: boolean;
  geotransLastSyncAt: string | null;
  geotransLastSyncCount: number;
  geotransLastSyncError: string;
  placesImportedAt?: string | null;
  placesImportedCount?: number;
};

export type DestinationType = 'all' | 'country' | 'city' | 'postal';

export type DestinationOption = {
  label: string;
  code: string;
  type: DestinationType;
  keywords?: string;
  isCustom?: boolean;
  verified?: boolean;
  countryCode?: string;
  countryName?: string;
  lat?: number | null;
  lon?: number | null;
  population?: number | null;
};

export type PlacesResponse = {
  items: DestinationOption[];
  stats: {
    count: number;
    countries: number;
  };
};

export type LoadSearchParams = {
  origin?: string;
  destination?: string;
  destinationType?: DestinationType;
  truckType?: string;
  weight?: string;
  cargoType?: string;
  loadDate?: string;
  price?: string;
  messageAge?: '10m' | '1h' | '5h' | '1d';
  radiusKm?: number;
  originLat?: number;
  originLng?: number;
};

export type AiAnalysis = {
  detectedLanguage: string;
  detectedLanguageLabel: string;
  translatedText: string;
  aiSummary: string;
  aiProvider: string;
  analysisVersion: string;
  parsed?: Partial<Load>;
  load?: Load;
};

export type ReanalysisResult = {
  total: number;
  updated: number;
  analysisVersion: string;
};

export type AiConnectionResult = {
  ok: boolean;
  mode: string;
  message: string;
};

export type GeotransSyncResult = {
  source: string;
  totalAvailable: number;
  checked: number;
  inserted: number;
  lastSyncAt: string;
  settings: LocalSettings;
};

export type AppEvent =
  | { type: 'status'; status: WhatsappStatus }
  | { type: 'load:new'; load: Load; matchedSearches: SavedSearch[] }
  | { type: 'groups:updated' }
  | { type: 'settings:updated'; settings: LocalSettings }
  | { type: 'loads:reanalyzed'; result: ReanalysisResult }
  | { type: 'error'; message: string };
