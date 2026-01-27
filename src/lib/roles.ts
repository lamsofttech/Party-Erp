// src/lib/roles.ts

export interface User {
    id: string;
    username: string;
    email: string;
    name: string;
    role: string;

    county_code?: string | null;
    county_name?: string | null;
    constituency_code?: string | null;
    constituency_name?: string | null;
    ward_code?: string | null;
    ward_name?: string | null;

    polling_station_id?: string | null;
    polling_station_name?: string | null;

    created_by_name?: string | null;
}

export interface Permission {
    permission_id: number;
    permission_name: string;
    action: string;
    assigned: boolean;
}

export interface RoleModule {
    module: string;
    permissions: Permission[];
}

export interface County {
    id: string;
    name: string;
    code: string;
}

export interface Constituency {
    id: string;
    name: string;
    county_code: string;
}

export interface Ward {
    id: string;
    name: string;
    const_code: string;
}

export interface PollingStation {
    id: string;
    name: string;
    ward_code: string;
}

// ----------------------------------------------------
// Role Hierarchy Logic
// ----------------------------------------------------

export const getCreatableRoles = (creatorRole: string): string[] => {
    const role = creatorRole.toUpperCase();
    switch (role) {
        case "SUPER_ADMIN":
            return [
                "NATIONAL_OFFICER",
                "COUNTY_OFFICER",
                "CONSTITUENCY_OFFICER",
                "WARD_OFFICER",
                "AGENT",
            ];
        case "NATIONAL_OFFICER":
            return [
                "COUNTY_OFFICER",
                "CONSTITUENCY_OFFICER",
                "WARD_OFFICER",
                "AGENT",
            ];
        case "COUNTY_OFFICER":
            return ["CONSTITUENCY_OFFICER", "WARD_OFFICER", "AGENT"];
        case "CONSTITUENCY_OFFICER":
            return ["WARD_OFFICER", "AGENT"];
        case "WARD_OFFICER":
            return ["AGENT"];
        default:
            return [];
    }
};

export const getAssignableRolesForUser = (
    creatorRole: string,
    targetCurrentRole: string
): string[] => {
    const creatable = getCreatableRoles(creatorRole);
    const current = targetCurrentRole.toUpperCase();

    const set = new Set<string>(creatable);
    set.add(current);

    return Array.from(set);
};

// ----------------------------------------------------
// Jurisdiction Formatting
// ----------------------------------------------------

export const formatJurisdiction = (user: User): string => {
    const role = (user.role || "").toUpperCase();

    if (["SUPER_ADMIN", "NATIONAL_OFFICER"].includes(role)) return "National";

    const county = (user.county_name || user.county_code || "").trim();
    const constituency =
        (user.constituency_name || user.constituency_code || "").trim();
    const ward = (user.ward_name || user.ward_code || "").trim();
    const station =
        (user.polling_station_name || user.polling_station_id || "").trim();

    const list = [county, constituency, ward, station].filter(Boolean);
    if (list.length === 0) return "—";

    return list.join(" / ");
};
