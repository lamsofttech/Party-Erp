import {
  createContext,
  useContext,
  type ReactNode,
  useEffect,
  useState,
} from "react";


/* ======================== INTERFACES ========================== */

export interface User {
  id: string;
  username: string;
  email: string;
  name?: string | null;
  role: string;

  country_type: "KENYA" | "DIASPORA" | "UNKNOWN";

  scope_level:
  | "GLOBAL"
  | "NATIONAL"
  | "COUNTY"
  | "CONSTITUENCY"
  | "WARD"
  | "POLLING_STATION"
  | "DIASPORA_COUNTRY"
  | "DIASPORA_POLLING"
  | "UNKNOWN";

  county: string | null;

  country_id: number | null;
  county_id: number | null;
  constituency_id: number | null;
  ward_id: number | null;
  polling_station_id: number | null;

  scope_country_id: number | null;
  scope_county_id: number | null;
  scope_constituency_id: number | null;
  scope_ward_id: number | null;
  scope_polling_station_id: number | null;

  county_name: string | null;
  constituency_name: string | null;
  ward_name: string | null;

  permissions: string[];

  is_agent: boolean;
  agent_name: string | null;
  assigned_polling_station_id: string | null;

  tenant_uuid?: string | null;
  user_uuid?: string | null;
  sid?: string | null;

  bootstrap?: boolean;
}

export interface UserContextType {
  user: User | null;
  token: string | null;
  setUser: (user: User | null) => void;
  login: (pin: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  hasPermission: (permission: string) => boolean;
  isBootstrap?: boolean;
}

/* ====================== CONTEXT CREATION ====================== */
/** ✅ Exported so it can be imported in PrivateRoute.tsx */
export const UserContext = createContext<UserContextType | undefined>(undefined);

/* ======================= HELPERS ============================= */

const toBool = (val: any): boolean => {
  if (typeof val === "boolean") return val;
  if (typeof val === "number") return val === 1;
  if (typeof val === "string") {
    const v = val.trim().toLowerCase();
    return v === "1" || v === "true" || v === "yes";
  }
  return false;
};

const toNullableNumber = (val: any): number | null => {
  if (val === undefined || val === null || val === "") return null;
  const n = Number(val);
  return Number.isNaN(n) ? null : n;
};

const normalizePermissions = (raw: any): string[] => {
  if (!raw) return [];

  let list: string[] = [];

  if (Array.isArray(raw)) {
    list = raw.map((p) => {
      if (typeof p === "string") return p;
      if (p && typeof p === "object") {
        if ("permission_name" in p) return String((p as any).permission_name);
        if ("name" in p) return String((p as any).name);
      }
      return String(p);
    });
  } else if (typeof raw === "string") {
    list = raw.split(",");
  }

  return list
    .map((p) => p.trim().toLowerCase())
    .filter((p) => p.length > 0);
};

/* ======================== USER PROVIDER ======================= */

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isBootstrap, setIsBootstrap] = useState<boolean>(false);

  const normalizeUser = (raw: any): User => {
    const role = (raw.role ?? "").toString().toUpperCase();

    const countryType = (raw.country_type ?? "UNKNOWN")
      .toString()
      .toUpperCase() as User["country_type"];

    const scopeLevel = (raw.scope_level ?? "UNKNOWN")
      .toString()
      .toUpperCase() as User["scope_level"];

    const pollingStationRaw =
      raw.assigned_polling_station_id ??
      raw.agent_polling_station_id ??
      raw.polling_station_id ??
      null;

    return {
      id: raw.id != null ? String(raw.id) : "",
      username: raw.username ?? raw.email ?? "",
      email: raw.email ?? "",
      name: raw.name ?? null,
      role,

      country_type: countryType,
      scope_level: scopeLevel,

      county: raw.county ?? null,

      country_id: toNullableNumber(raw.country_id),
      county_id: toNullableNumber(raw.county_id),
      constituency_id: toNullableNumber(raw.constituency_id),
      ward_id: toNullableNumber(raw.ward_id),
      polling_station_id: toNullableNumber(raw.polling_station_id),

      scope_country_id: toNullableNumber(raw.scope_country_id ?? raw.country_id),
      scope_county_id: toNullableNumber(raw.scope_county_id ?? raw.county_id),
      scope_constituency_id: toNullableNumber(
        raw.scope_constituency_id ?? raw.constituency_id
      ),
      scope_ward_id: toNullableNumber(raw.scope_ward_id ?? raw.ward_id),
      scope_polling_station_id: toNullableNumber(
        raw.scope_polling_station_id ?? raw.polling_station_id
      ),

      county_name: raw.county_name ?? raw.county ?? null,
      constituency_name: raw.constituency_name ?? raw.constituency ?? null,
      ward_name: raw.ward_name ?? raw.ward ?? null,

      permissions: normalizePermissions(raw.permissions),

      is_agent:
        toBool(raw.is_agent) || role === "AGENT" || role === "DIASPORA_AGENT",
      agent_name: raw.agent_name ?? raw.name ?? null,
      assigned_polling_station_id:
        pollingStationRaw != null ? String(pollingStationRaw) : null,

      tenant_uuid: raw.tenant_uuid ?? null,
      user_uuid: raw.user_uuid ?? null,
      sid: raw.sid ?? null,
      bootstrap: toBool(raw.bootstrap),
    };
  };

  const login = async (pin: string): Promise<boolean> => {
    const response = await fetch("/API/pin-login.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ pin }),
    });

    const data = await response.json().catch(() => ({}));

    if (response.status === 401 || data.message === "Invalid PIN") {
      throw new Error("Invalid PIN");
    }

    if (!response.ok || !data.success || !data.token || !data.user) {
      throw new Error(data.message || "Login failed.");
    }

    const normalizedUser = normalizeUser(data.user);

    const bootstrapFlag =
      toBool(data.bootstrap) || toBool((normalizedUser as any).bootstrap);

    setIsBootstrap(bootstrapFlag);
    setToken(data.token);
    setUser(normalizedUser);

    localStorage.setItem("token", data.token);
    localStorage.setItem("authToken", data.token);
    localStorage.setItem("user", JSON.stringify(normalizedUser));
    localStorage.setItem("authUser", JSON.stringify(normalizedUser));
    localStorage.setItem("bootstrap", bootstrapFlag ? "1" : "0");

    return true;
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("user");
    localStorage.removeItem("authUser");
    localStorage.removeItem("bootstrap");
    setToken(null);
    setUser(null);
    setIsBootstrap(false);
  };

  useEffect(() => {
    const storedToken =
      localStorage.getItem("token") || localStorage.getItem("authToken");

    const storedUserJson =
      localStorage.getItem("user") || localStorage.getItem("authUser");

    const storedBootstrap = localStorage.getItem("bootstrap");

    if (storedToken && storedUserJson) {
      try {
        const parsedRaw = JSON.parse(storedUserJson);
        const parsedUser = normalizeUser(parsedRaw);

        setToken(storedToken);
        setUser(parsedUser);

        setIsBootstrap(
          storedBootstrap === "1" || toBool((parsedUser as any).bootstrap)
        );
      } catch (err) {
        console.error("Failed to restore session", err);
        logout();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;

    const role = user.role?.toUpperCase();
    if (role === "SUPER_ADMIN") return true;

    const key = permission.trim().toLowerCase();
    return user.permissions.includes(key);
  };

  return (
    <UserContext.Provider
      value={{
        user,
        token,
        setUser,
        login,
        logout,
        isAuthenticated: !!token && !!user,
        hasPermission,
        isBootstrap,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

/* ========================== HOOK ============================== */

export function useUser() {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
