import Cookies from "js-cookie";
import { create } from "zustand";
import { ApiError, api, getData } from "@/lib/api";
import type { Role, User } from "@/types";

export const ROLE_HOME: Record<Role, string> = {
  admin: "/admin/dashboard",
  student: "/student/dashboard",
  company: "/company/dashboard",
  supervisor: "/supervisor/dashboard",
};

interface AuthState {
  user: User | null;
  initializing: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    role: Role;
  }) => Promise<User>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<User | null>;
  setUser: (user: User) => void;
}

function persist(user: User, token?: string) {
  Cookies.set("sims_role", user.role);
  if (token) Cookies.set("sims_token", token, { expires: 30 });
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  initializing: true,

  login: async (email, password) => {
    const res = await api.post<{ data: { user: User; token: string } }>("/auth/login", {
      email,
      password,
    });
    const { user, token } = res.data.data;
    persist(user, token);
    set({ user });
    return user;
  },

  register: async (payload) => {
    const res = await api.post<{ data: { user: User; token: string } }>("/auth/register", payload);
    const { user, token } = res.data.data;
    persist(user, token);
    set({ user });
    return user;
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 401) throw err;
    }
    Cookies.remove("sims_token");
    Cookies.remove("sims_role");
    set({ user: null });
  },

  fetchMe: async () => {
    if (!Cookies.get("sims_token")) {
      set({ user: null, initializing: false });
      return null;
    }
    try {
      const user = await getData<User>("/auth/me");
      persist(user);
      set({ user, initializing: false });
      return user;
    } catch {
      Cookies.remove("sims_token");
      Cookies.remove("sims_role");
      set({ user: null, initializing: false });
      return null;
    }
  },

  setUser: (user) => {
    persist(user);
    set({ user });
  },
}));
