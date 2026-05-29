export type BarberApi = {
  apiFetch: (path: string, options?: RequestInit) => Promise<Response>;
  apiJson: <T>(path: string, options?: RequestInit) => Promise<T>;
  apiList: <T>(path: string, options?: RequestInit) => Promise<T[]>;
  clearTokens: () => void | Promise<void>;
};

/** Web File yoki mobil { uri, name, type }. */
export type UploadFile = File | { uri: string; name: string; type: string };
