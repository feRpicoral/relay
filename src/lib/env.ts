export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function optionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

export function envOr(name: string, fallback: string): string {
  return optionalEnv(name) ?? fallback;
}

export const isProduction = process.env.NODE_ENV === "production";
export const isDevelopment = process.env.NODE_ENV === "development";
export const isTest = process.env.NODE_ENV === "test";
