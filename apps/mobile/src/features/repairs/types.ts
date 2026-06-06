export type RepairStatus = "RECEIVED" | "IN_PROGRESS" | "COMPLETED" | "DELIVERED" | string;

export type RepairPerson = {
  id?: string | null;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  role?: string | null;
};

export type RepairCustomer = {
  id: string;
  name?: string | null;
  phone?: string | null;
  email?: string | null;
  isActive?: boolean | null;
};

export type RepairStoreLocation = {
  id?: string | null;
  name?: string | null;
  code?: string | null;
  label?: string | null;
};

export type RepairRecord = {
  id: string;
  customerId?: string | null;
  customer?: RepairCustomer | null;
  device?: string | null;
  serial?: string | null;
  issue?: string | null;
  status?: RepairStatus | null;
  warrantyEnd?: string | null;
  technicianId?: string | null;
  technician?: RepairPerson | null;
  storeLocation?: RepairStoreLocation | null;
  branch?: RepairStoreLocation | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

export type RepairsResponse = {
  repairs?: RepairRecord[];
  count?: number;
  storeLocationScope?: unknown;
};

export type RepairTechniciansResponse = {
  technicians?: RepairPerson[];
  count?: number;
  storeLocationScope?: unknown;
};

export type RepairPayload = {
  customerId: string;
  device: string;
  serial?: string | null;
  issue: string;
  warrantyEnd?: string | null;
};

export type CustomersResponse = {
  customers?: RepairCustomer[];
  items?: RepairCustomer[];
  count?: number;
};
