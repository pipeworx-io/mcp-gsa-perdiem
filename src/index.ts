interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * GSA Per Diem MCP — wraps the GSA Per Diem API v2 (api.gsa.gov)
 *
 * US federal per diem rates: government travel lodging and meal allowances.
 * Returns GSA per diem by city/state or by zip code — the daily lodging
 * ceiling (which varies by month/season) and the flat M&IE (meals &
 * incidental expenses) daily rate.
 *
 * Dual key model: pass your own api.data.gov / GSA API key via _apiKey for
 * higher rate limits, or omit it to use the shared Pipeworx key. The key is
 * sent in the X-Api-Key header (api.data.gov convention).
 *
 * Tools:
 * - rates_by_city: federal per diem rates for a city + state (+ optional year)
 * - rates_by_zip: federal per diem rates for a zip code (+ optional year)
 */


const BASE_URL = 'https://api.gsa.gov/travel/perdiem/v2';

const tools: McpToolExport['tools'] = [
  {
    name: 'rates_by_city',
    description:
      'Get US federal per diem rates (government travel lodging and meal allowances) for a city by name and state. Returns the monthly lodging ceiling (per-diem lodging varies by month/season) and the flat M&IE (meals & incidental expenses) daily rate. Example: rates_by_city({ city: "Denver", state: "CO" }).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        city: {
          type: 'string',
          description: 'City name, e.g. "Denver", "San Francisco".',
        },
        state: {
          type: 'string',
          description: 'Two-letter state abbreviation, e.g. "CO", "CA".',
        },
        year: {
          type: 'number',
          description: 'Fiscal/rate year, e.g. 2026. Defaults to the current year.',
        },
        _apiKey: {
          type: 'string',
          description:
            'Optional — your own api.data.gov / GSA API key for higher limits; omit to use the shared Pipeworx key.',
        },
      },
      required: ['city', 'state'],
    },
  },
  {
    name: 'rates_by_zip',
    description:
      'Get US federal per diem rates (government travel lodging and meal allowances) for a location by zip code. Returns the monthly lodging ceiling (per-diem lodging varies by month/season) and the flat M&IE (meals & incidental expenses) daily rate. Example: rates_by_zip({ zip: "80202" }).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        zip: {
          type: 'string',
          description: '5-digit US zip code, e.g. "80202".',
        },
        year: {
          type: 'number',
          description: 'Fiscal/rate year, e.g. 2026. Defaults to the current year.',
        },
        _apiKey: {
          type: 'string',
          description:
            'Optional — your own api.data.gov / GSA API key for higher limits; omit to use the shared Pipeworx key.',
        },
      },
      required: ['zip'],
    },
  },
];

// GSA Per Diem v2 response shape (partial — only the fields we compact).
interface PerDiemMonthEntry {
  short?: string;
  value?: number | string;
}
interface PerDiemRate {
  city?: string;
  county?: string;
  meals?: number | string;
  months?: { month?: PerDiemMonthEntry[] };
}
interface PerDiemResponse {
  rates?: Array<{ rate?: PerDiemRate[] }>;
}

function compactRates(rates: PerDiemResponse['rates']) {
  return (rates?.[0]?.rate || []).map((r) => ({
    destination: r.city || r.county,
    meals_mie: r.meals,
    monthly_lodging: (r.months?.month || []).map((m) => ({
      month: m.short,
      lodging: m.value,
    })),
  }));
}

async function gsaGet(apiKey: string, path: string): Promise<unknown> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'X-Api-Key': apiKey,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    return { error: res.status, message: text };
  }
  return res.json();
}

async function ratesByCity(
  city: string,
  state: string,
  year: number,
  apiKey: string,
) {
  const path = `/rates/city/${encodeURIComponent(city)}/state/${encodeURIComponent(
    state,
  )}/year/${year}`;
  const data = (await gsaGet(apiKey, path)) as PerDiemResponse & { error?: unknown };
  if ((data as { error?: unknown }).error !== undefined) return data;

  const rates = data.rates;
  return {
    city,
    state,
    year,
    found: !!rates?.length,
    rates: compactRates(rates),
  };
}

async function ratesByZip(zip: string, year: number, apiKey: string) {
  const path = `/rates/zip/${encodeURIComponent(zip)}/year/${year}`;
  const data = (await gsaGet(apiKey, path)) as PerDiemResponse & { error?: unknown };
  if ((data as { error?: unknown }).error !== undefined) return data;

  const rates = data.rates;
  return {
    zip,
    year,
    found: !!rates?.length,
    rates: compactRates(rates),
  };
}

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const apiKey = args._apiKey as string;
  delete args._apiKey;

  if (!apiKey) {
    return { error: 'api_key_required', message: 'No GSA/api.data.gov key available.' };
  }

  const year = (args.year as number | undefined) ?? new Date().getFullYear();

  switch (name) {
    case 'rates_by_city':
      return ratesByCity(args.city as string, args.state as string, year, apiKey);
    case 'rates_by_zip':
      return ratesByZip(args.zip as string, year, apiKey);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
