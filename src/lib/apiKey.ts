import * as SecureStore from 'expo-secure-store';

const KEY = 'gemini_api_key';

/** Önce telefonda kayıtlı anahtara, yoksa .env dosyasındaki anahtara bakar. */
export async function getApiKey(): Promise<string | null> {
  try {
    const stored = await SecureStore.getItemAsync(KEY);
    if (stored) return stored;
  } catch {
    // SecureStore kullanılamıyorsa .env'e düş
  }
  const fromEnv = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  return fromEnv && fromEnv.trim() ? fromEnv.trim() : null;
}

export async function getStoredApiKey(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

export async function setApiKey(value: string): Promise<void> {
  const trimmed = value.trim();
  if (trimmed) await SecureStore.setItemAsync(KEY, trimmed);
  else await SecureStore.deleteItemAsync(KEY);
}

export function hasEnvApiKey(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_GEMINI_API_KEY?.trim());
}
