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
                "DIASPORA_OFFICER",
                "DIASPORA_AGENT",
            ];
        case "NATIONAL_OFFICER":
            return ["COUNTY_OFFICER", "CONSTITUENCY_OFFICER", "WARD_OFFICER", "AGENT"];
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
