import axios, { AxiosError } from "axios";
import Cookies from "js-cookie";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;

  constructor(message: string, status = 500, errors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }

  /** First validation message for a field, if any. */
  fieldError(field: string): string | undefined {
    return this.errors?.[field]?.[0];
  }
}

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = Cookies.get("sims_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; errors?: Record<string, string[]> }>) => {
    const status = error.response?.status ?? 500;

    if (status === 401 && typeof window !== "undefined") {
      Cookies.remove("sims_token");
      Cookies.remove("sims_role");
      // A full reload is intentional: it drops every in-memory store and cached route.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/login";
    }

    return Promise.reject(
      new ApiError(
        error.response?.data?.message ?? "Something went wrong",
        status,
        error.response?.data?.errors
      )
    );
  }
);

/** Unwrap the Laravel { success, message, data } envelope. */
export async function getData<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const { data } = await api.get<{ data: T }>(url, { params });
  return data.data;
}

/** Fetch a list endpoint; returns items plus pagination meta. */
export async function getPage<T>(url: string, params?: Record<string, unknown>): Promise<import("@/types").Page<T>> {
  const { data } = await api.get<import("@/types").ApiEnvelope<T[]>>(url, { params });
  return { items: data.data, meta: data.meta };
}

export async function sendData<T = unknown>(
  method: "post" | "put" | "delete",
  url: string,
  payload?: unknown
): Promise<T> {
  const config =
    payload instanceof FormData ? { headers: { "Content-Type": "multipart/form-data" } } : {};
  const { data } = await api[method]<T>(url, payload, config);
  return data;
}

/** Download an authenticated endpoint (CSV exports) as a file. */
export async function downloadFile(url: string, fallbackName: string): Promise<void> {
  const response = await api.get<Blob>(url, { responseType: "blob" });

  const disposition = response.headers["content-disposition"] as string | undefined;
  const match = disposition?.match(/filename="?([^";]+)"?/);
  const name = match?.[1] ?? fallbackName;

  const href = URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(href);
}
