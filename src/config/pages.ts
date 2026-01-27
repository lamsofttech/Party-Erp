// src/config/pages.ts
export interface AppPage {
    id: string;
    label: string;
    path: string;
    icon?: React.ReactNode;
    /** permission name from DB, or null/undefined if public */
    requiredPermission?: string;
}

export const APP_PAGES: AppPage[] = [
    {
        id: "dashboard",
        label: "Main Dashboard",
        path: "/dashboard",
    },
    {
        id: "legal-dashboard",
        label: "Legal Dashboard",
        path: "/legal-dashboard",
        requiredPermission: "legal.dashboard.view",
    },
    {
        id: "admin-users",
        label: "User Management",
        path: "/admin/users",
        requiredPermission: "admin.users.manage",
    },
    // add more...
];
