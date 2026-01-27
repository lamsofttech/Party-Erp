export type County = {
    id: string | number
    name: string
    code?: string | null
}

export type Constituency = {
    id: string | number
    name: string
    code?: string | null
    county_id?: string | number | null
}

export type Ward = {
    id: string | number
    name: string
    code?: string | null
    constituency_id?: string | number | null
}

export type PollingStation = {
    id: string | number
    name: string
    ward_id?: string | number | null
}

export interface User {
    id: string | number
    name: string
    username?: string
    email: string
    role: string

    // ------------------------------
    // Kenya & Diaspora geo fields
    // ------------------------------
    country_id?: number | null
    country_type?: string | null

    county_id?: string | number | null
    county_name?: string | null
    county_code?: string | null

    constituency_id?: string | number | null
    constituency_name?: string | null
    constituency_code?: string | null

    ward_id?: string | number | null
    ward_name?: string | null
    ward_code?: string | null

    polling_station_id?: string | number | null
    polling_station_name?: string | null

    // ------------------------------
    // From jurisdiction.php
    // ------------------------------
    jurisdiction_type?: string | null
    jurisdiction_value?: string | null
    jurisdiction_label?: string | null
}
