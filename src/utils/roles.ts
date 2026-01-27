import type { User } from "../types/users";

/* ============================================================
   ROLE HIERARCHY HELPERS
   ============================================================ */

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

// Diaspora roles
export const getDiasporaCreatableRoles = (creatorRole: string): string[] => {
    const role = creatorRole.toUpperCase();

    switch (role) {
        case "SUPER_ADMIN":
            return ["DIASPORA_OFFICER", "DIASPORA_AGENT"];
        case "DIASPORA_OFFICER":
            return ["DIASPORA_AGENT"];
        default:
            return [];
    }
};

export const getAssignableRolesForUser = (
    creatorRole: string,
    targetCurrentRole: string
): string[] => {
    const upperCreator = creatorRole.toUpperCase();

    const kenyaCreatable = getCreatableRoles(upperCreator);
    const diasporaCreatable = getDiasporaCreatableRoles(upperCreator);

    const creatable = [...kenyaCreatable, ...diasporaCreatable];

    const current = targetCurrentRole.toUpperCase();
    const set = new Set<string>(creatable);
    set.add(current);

    return Array.from(set);
};

/* ============================================================
   JURISDICTION FORMATTER — ONLY MOST SPECIFIC NAME
   ============================================================ */

export const formatJurisdiction = (user: User): string => {
    const role = (user.role || "").toUpperCase();

    // 1️⃣ If backend gives full jurisdiction label, return ONLY the last specific part
    if (user.jurisdiction_label && user.jurisdiction_label.trim() !== "") {
        const parts = user.jurisdiction_label
            .split("/")
            .map((p) => p.trim())
            .filter(Boolean);

        return parts.length > 0 ? parts[parts.length - 1] : "—";
    }

    // 2️⃣ Diaspora — show only the country name
    if (role === "DIASPORA_OFFICER" || role === "DIASPORA_AGENT") {
        return (
            user.country_type ||
            (user as any).country_name ||
            (user.country_id != null ? `Country ID ${user.country_id}` : "Diaspora")
        );
    }

    // 3️⃣ National-level roles
    if (role === "SUPER_ADMIN" || role === "NATIONAL_OFFICER") {
        return "National";
    }

    // 4️⃣ Use MOST SPECIFIC field available
    const mostSpecific =
        (user.polling_station_name || "").toString().trim() ||
        (user.ward_name || "").toString().trim() ||
        (user.constituency_name || "").toString().trim() ||
        (user.county_name || "").toString().trim();

    return mostSpecific || "—";
};
