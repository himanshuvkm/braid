import { validateWebSocketUrl } from './ws-config';

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  env: {
    nodeEnv: string;
    databaseType: 'postgres' | 'sqlite';
    hasDatabaseUrl: boolean;
    hasWsUrl: boolean;
    port: number;
  };
}

export function validateEnvironment(): EnvValidationResult {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';
  const errors: string[] = [];
  const warnings: string[] = [];

  const databaseUrl = process.env.DATABASE_URL;
  let databaseType: 'postgres' | 'sqlite' = 'sqlite';

  if (databaseUrl) {
    if (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://')) {
      databaseType = 'postgres';
    } else {
      errors.push(`Invalid DATABASE_URL scheme. Must start with postgresql:// or postgres://`);
    }
  } else if (isProduction) {
    errors.push('DATABASE_URL is required in production environment (e.g. postgresql://user:password@host:5432/braid)');
  } else {
    warnings.push('DATABASE_URL is not set; falling back to local SQLite at .data/braid.db');
  }

  const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
  if (wsUrl) {
    const wsValidation = validateWebSocketUrl(wsUrl);
    if (!wsValidation.valid) {
      if (isProduction) {
        errors.push(`NEXT_PUBLIC_WS_URL: ${wsValidation.error}`);
      } else {
        warnings.push(`NEXT_PUBLIC_WS_URL: ${wsValidation.error}`);
      }
    }
  } else if (isProduction) {
    warnings.push('NEXT_PUBLIC_WS_URL is not set in production. Client will attempt same-origin /ws connection.');
  }

  const port = parseInt(process.env.PORT || '4444', 10);
  if (isNaN(port) || port <= 0 || port > 65535) {
    errors.push(`Invalid PORT configuration: "${process.env.PORT}". Must be integer 1-65535.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    env: {
      nodeEnv,
      databaseType,
      hasDatabaseUrl: Boolean(databaseUrl),
      hasWsUrl: Boolean(wsUrl),
      port,
    },
  };
}

/**
 * Asserts environment correctness on application bootstrap.
 * Throws in production if critical variables are missing or malformed.
 */
export function assertValidEnvironment(): void {
  const result = validateEnvironment();
  if (!result.valid) {
    const message = `[Braid Environment Configuration Error]\n${result.errors.map((e) => `  - ${e}`).join('\n')}`;
    if (process.env.NODE_ENV === 'production') {
      throw new Error(message);
    } else {
      console.warn(message);
    }
  }
}
