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

export type AddUserFormData = {
    email: string;
    name: string;
    role: string;
    county_id: string;
    constituency_id: string;
    ward_id: string;
    polling_station_id?: string;
    country_id?: string;
    positions: number[];
    can_transmit: boolean;
};
