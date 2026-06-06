export type Branch = {
  id: string;
  tenantId?: string;
  assignmentId?: string | null;

  name: string;
  code?: string | null;
  type?: string | null;
  status?: string | null;

  phone?: string | null;
  email?: string | null;
  countryCode?: string | null;
  district?: string | null;
  sector?: string | null;
  address?: string | null;

  isMain?: boolean;
  isActive?: boolean;
  isDefault?: boolean;

  canOperate?: boolean;
  canViewReports?: boolean;

  assignedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};