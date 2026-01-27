// src/config/dashboardModules.ts
import type { ReactNode } from 'react';

export interface DashboardModule {
  id: string;
  title: string;
  path: string;
  description?: string;
  icon?: ReactNode;
}

const dashboardModules: DashboardModule[] = [
  { id: 'members', title: 'Members', path: '/members', description: 'Manage party member records' },
  // add more modules as needed, e.g.:
  // { id: 'campaigns', title: 'Campaigns', path: '/campaigns', description: 'Plan and track campaigns' },
  // { id: 'finances', title: 'Finances', path: '/finances', description: 'Budgets, allocations, and spend' },
  // { id: 'events', title: 'Events', path: '/events', description: 'Rallies, meetings, and outreach' },
  // { id: 'reports', title: 'Reports', path: '/reports', description: 'Analytics & performance' },
];

export default dashboardModules;

