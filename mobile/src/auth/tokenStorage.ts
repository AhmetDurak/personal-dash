import * as SecureStore from 'expo-secure-store'

const KEY = 'mobile_bearer_token'

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(KEY)
}

export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(KEY, token)
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY)
}
