import type { User } from "../types/roles";

export const formatRoleLabel = (role: string): string =>
    role
        .toLowerCase()
        .split("_")
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ");

export const formatJurisdiction = (user: User): string => {
    const role = (user.role || "").toUpperCase();
    if (["SUPER_ADMIN", "NATIONAL_OFFICER"].includes(role)) return "National";

    const county = (user.county_name || user.county_code || "").toString().trim();
    const constituency = (user.constituency_name || user.constituency_code || "")
        .toString()
        .trim();
    const ward = (user.ward_name || user.ward_code || "").toString().trim();
    const pollingStation = (user.polling_station_name || user.polling_station_id || "")
        .toString()
        .trim();

    if (!county && !constituency && !ward && !pollingStation) return "—";

    if (role === "COUNTY_OFFICER") return county || "County not set";
    if (role === "CONSTITUENCY_OFFICER") return [county, constituency].filter(Boolean).join(" / ");
    if (role === "WARD_OFFICER") return [county, constituency, ward].filter(Boolean).join(" / ");
    if (role === "AGENT") return [county, constituency, ward, pollingStation].filter(Boolean).join(" / ");

    return [county, constituency, ward, pollingStation].filter(Boolean).join(" / ") || "—";
};
