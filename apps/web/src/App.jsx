import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import AuditLogs from "./pages/audit/AuditLogs";
import ConfirmSignup from "./pages/auth/ConfirmSignup";
import Login from "./pages/auth/Login";
import LandingPage from "./pages/public/LandingPage";

import Dashboard from "./pages/dashboard/Dashboard";
import Employees from "./pages/employees/EmployeesList";
import InterStoreDeals from "./pages/interstore/InterStoreDeals";
import InterStoreDetail from "./pages/interstore/InterStoreDetail";

import InventoryCreate from "./pages/inventory/InventoryCreate";
import InventoryEdit from "./pages/inventory/InventoryEdit";
import InventoryList from "./pages/inventory/InventoryList";
import InventoryDetail from "./pages/inventory/InventoryDetail";
import StockAdjustments from "./pages/inventory/StockAdjustments";
import Reorder from "./pages/inventory/Reorder";

import PosReceipt from "./pages/pos/PosReceipt";
import PosSale from "./pages/pos/PosSale";
import SalesList from "./pages/pos/SalesList";
import CreditDashboard from "./pages/pos/CreditDashboard";
import CashDrawer from "./pages/pos/CashDrawer";

import RepairCreate from "./pages/repairs/RepairCreate";
import Repairs from "./pages/repairs/Repairs";
import RepairEdit from "./pages/repairs/RepairEdit";

import Reports from "./pages/reports/Reports";
import CashFlowReport from "./pages/reports/CashFlowReport";
import IncomeStatement from "./pages/reports/IncomeStatement";
import TrialBalance from "./pages/reports/TrialBalance";
import ProfitTable from "./pages/reports/ProfitTable";

import CustomerCreate from "./pages/customers/CustomerCreate";
import CustomerEdit from "./pages/customers/CustomerEdit";
import CustomerList from "./pages/customers/CustomerList";

import RequireRole from "./auth/RequireRole";
import RequireTenantAuth from "./auth/requireTenantAuth";
import StoreLayout from "./components/StoreLayout";

import TenantIntent from "./pages/Tenant/TenantIntent";
import OwnerPayment from "./pages/Tenant/OwnerPayment";
import VerifyOtp from "./pages/Tenant/VerifyOtp";

import SubscriptionGate from "./components/SubscriptionGate";
import Renew from "./pages/Billing/Renew";

import SuppliersList from "./pages/suppliers/SuppliersList";
import SupplierCreate from "./pages/suppliers/SupplierCreate";
import SupplierEdit from "./pages/suppliers/SupplierEdit";
import SupplierView from "./pages/suppliers/SupplierView";
import SupplierSupplyCreate from "./pages/suppliers/SupplierSupplyCreate";

import DeliveryNoteCreate from "./pages/deliveryNotes/DeliveryNoteCreate";
import DeliveryNoteEdit from "./pages/deliveryNotes/DeliveryNoteEdit";

import SettingsLayout from "./pages/settings/SettingsLayout";
import SettingsGeneral from "./pages/settings/SettingsGeneral";
import SettingsBranches from "./pages/settings/SettingsBranches";
import SettingsBilling from "./pages/settings/SettingsBilling";
import SettingsRoles from "./pages/settings/SettingsRoles";
import SettingsMembers from "./pages/settings/SettingsMembers";
import SettingsSecurity from "./pages/settings/SettingsSecurity";
import SettingsAudit from "./pages/settings/SettingsAudit";

import WhatsAppInbox from "./pages/whatsapp/WhatsAppInbox";

import DocumentListPage from "./pages/documents/DocumentListPage";
import DocumentPreviewRoute from "./pages/documents/DocumentPreviewRoute";
import DocumentCenterPage from "./pages/documents/DocumentCenterPage";

import { listReceipts } from "./services/receiptsApi";
import { listInvoices } from "./services/invoicesApi";
import { listProformas } from "./services/proformasApi";
import ProformaCreate from "./pages/proformas/ProformaCreate";
import ProformaEdit from "./pages/proformas/ProformaEdit";

import { listWarranties } from "./services/warrantiesApi";
import WarrantyCreate from "./pages/warranties/WarrantyCreate";
import WarrantyEdit from "./pages/warranties/WarrantyEdit";

import { listDeliveryNotes } from "./services/deliveryNotesApi";
import Expenses from "./pages/expenses/Expenses";

import SupportTickets from "./pages/support/SupportTickets";
import SupportTicketDetail from "./pages/support/SupportTicketDetail";

function GuardedStoreLayout() {
  return (
    <SubscriptionGate>
      <StoreLayout />
    </SubscriptionGate>
  );
}

function GuardedRenewPage() {
  return (
    <SubscriptionGate>
      <Renew />
    </SubscriptionGate>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/signup" element={<TenantIntent />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/owner-payment" element={<OwnerPayment />} />
        <Route path="/confirm-signup" element={<ConfirmSignup />} />
        <Route path="/login" element={<Login />} />

        <Route path="/renew" element={<RequireTenantAuth />}>
          <Route index element={<GuardedRenewPage />} />
        </Route>

        <Route path="/app" element={<RequireTenantAuth />}>
          <Route element={<GuardedStoreLayout />}>
            <Route
              index
              element={
                <RequireRole
                  roles={[
                    "OWNER",
                    "MANAGER",
                    "CASHIER",
                    "SELLER",
                    "STOREKEEPER",
                    "TECHNICIAN",
                  ]}
                >
                  <Dashboard />
                </RequireRole>
              }
            />

            <Route element={<RequireRole roles={["OWNER", "MANAGER"]} />}>
              <Route path="employees" element={<Employees />} />

              <Route path="settings" element={<SettingsLayout />}>
                <Route index element={<SettingsGeneral />} />
                <Route path="branches" element={<SettingsBranches />} />
                <Route path="members" element={<SettingsMembers />} />
                <Route path="roles" element={<SettingsRoles />} />

                <Route
                  path="billing"
                  element={
                    <RequireRole roles={["OWNER"]}>
                      <SettingsBilling />
                    </RequireRole>
                  }
                />

                <Route path="security" element={<SettingsSecurity />} />
                <Route path="audit" element={<SettingsAudit />} />
              </Route>
            </Route>

            <Route element={<RequireRole roles={["OWNER"]} />}>
              <Route path="audit" element={<AuditLogs />} />
              <Route
                path="billing"
                element={<Navigate to="/app/settings/billing" replace />}
              />
            </Route>

            <Route
              element={
                <RequireRole roles={["OWNER", "MANAGER", "STOREKEEPER"]} />
              }
            >
              <Route path="inventory" element={<InventoryList />} />
              <Route path="inventory/:id" element={<InventoryDetail />} />
              <Route path="inventory/reorder" element={<Reorder />} />
              <Route
                path="inventory/stock-history"
                element={<StockAdjustments />}
              />

              <Route path="suppliers" element={<SuppliersList />} />
              <Route path="suppliers/:id" element={<SupplierView />} />
            </Route>

            <Route element={<RequireRole roles={["OWNER", "MANAGER"]} />}>
              <Route path="inventory/new" element={<InventoryCreate />} />
              <Route path="inventory/:id/edit" element={<InventoryEdit />} />

              <Route path="suppliers/new" element={<SupplierCreate />} />
              <Route path="suppliers/:id/edit" element={<SupplierEdit />} />
              <Route
                path="suppliers/:id/supplies/new"
                element={<SupplierSupplyCreate />}
              />
            </Route>

            <Route
              element={
                <RequireRole roles={["OWNER", "MANAGER", "CASHIER", "SELLER"]} />
              }
            >
              <Route path="pos" element={<PosSale />} />
              <Route path="pos/sales" element={<SalesList />} />
              <Route path="pos/sales/:id" element={<PosReceipt />} />
              <Route
                path="pos/sales/:id/receipt"
                element={<Navigate to=".." replace />}
              />
              <Route path="pos/credit" element={<CreditDashboard />} />
              <Route path="pos/drawer" element={<CashDrawer />} />

              <Route path="expenses" element={<Expenses />} />

              <Route path="customers" element={<CustomerList />} />
              <Route path="customers/new" element={<CustomerCreate />} />
              <Route path="customers/:id" element={<CustomerEdit />} />
            </Route>

            <Route
              element={
                <RequireRole
                  roles={[
                    "OWNER",
                    "MANAGER",
                    "STOREKEEPER",
                    "SELLER",
                    "CASHIER",
                    "TECHNICIAN",
                  ]}
                />
              }
            >
              <Route path="documents" element={<DocumentCenterPage />} />

              <Route
                path="documents/receipts"
                element={
                  <DocumentListPage
                    type="receipts"
                    title="Receipts"
                    subtitle="Sales payment records and branded receipt previews."
                    listFn={listReceipts}
                  />
                }
              />

              <Route
                path="documents/invoices"
                element={
                  <DocumentListPage
                    type="invoices"
                    title="Invoices"
                    subtitle="Formal billing documents with owner branding and terms."
                    listFn={listInvoices}
                  />
                }
              />

              <Route
                path="documents/delivery-notes"
                element={
                  <DocumentListPage
                    type="delivery-notes"
                    title="Delivery Notes"
                    subtitle="Goods handover confirmation with branded print layout."
                    listFn={listDeliveryNotes}
                  />
                }
              />

              <Route
                path="documents/proformas"
                element={
                  <DocumentListPage
                    type="proformas"
                    title="Proformas"
                    subtitle="Preliminary quotations before final billing."
                    listFn={listProformas}
                  />
                }
              />

              <Route
                path="documents/warranties"
                element={
                  <DocumentListPage
                    type="warranties"
                    title="Warranties"
                    subtitle="After-sales warranty certificates and coverage records."
                    listFn={listWarranties}
                  />
                }
              />

              <Route
                path="documents/:resource/:id/preview"
                element={<DocumentPreviewRoute />}
              />

              <Route
                path="receipts"
                element={<Navigate to="/app/documents/receipts" replace />}
              />
              <Route
                path="invoices"
                element={<Navigate to="/app/documents/invoices" replace />}
              />
              <Route
                path="delivery-notes"
                element={
                  <Navigate to="/app/documents/delivery-notes" replace />
                }
              />
              <Route
                path="proformas"
                element={<Navigate to="/app/documents/proformas" replace />}
              />
              <Route
                path="warranties"
                element={<Navigate to="/app/documents/warranties" replace />}
              />
            </Route>

            <Route
              element={
                <RequireRole roles={["OWNER", "MANAGER", "CASHIER", "SELLER"]} />
              }
            >
              <Route
                path="documents/proformas/create"
                element={<ProformaCreate />}
              />
              <Route
                path="documents/proformas/:id/edit"
                element={<ProformaEdit />}
              />

              <Route
                path="documents/delivery-notes/create"
                element={<DeliveryNoteCreate />}
              />
              <Route
                path="documents/delivery-notes/:id/edit"
                element={<DeliveryNoteEdit />}
              />

              <Route
                path="documents/warranties/create"
                element={<WarrantyCreate />}
              />
              <Route
                path="documents/warranties/:id/edit"
                element={<WarrantyEdit />}
              />
            </Route>

            <Route
              element={
                <RequireRole
                  roles={[
                    "OWNER",
                    "MANAGER",
                    "CASHIER",
                    "SELLER",
                    "STOREKEEPER",
                    "TECHNICIAN",
                  ]}
                />
              }
            >
              <Route path="whatsapp" element={<WhatsAppInbox />} />
              <Route path="support" element={<SupportTickets />} />
              <Route path="support/:id" element={<SupportTicketDetail />} />

              <Route
                path="whatsapp/inbox"
                element={<Navigate to="/app/whatsapp" replace />}
              />
              <Route
                path="whatsapp/drafts"
                element={<Navigate to="/app/whatsapp" replace />}
              />
              <Route
                path="whatsapp/accounts"
                element={<Navigate to="/app/whatsapp" replace />}
              />
              <Route
                path="whatsapp/activity"
                element={<Navigate to="/app/whatsapp" replace />}
              />
              <Route
                path="whatsapp/broadcasts"
                element={<Navigate to="/app/whatsapp" replace />}
              />
            </Route>

            <Route element={<RequireRole roles={["OWNER", "MANAGER", "CASHIER"]} />}>
              <Route path="interstore" element={<InterStoreDeals />} />
              <Route path="interstore/:id" element={<InterStoreDetail />} />
            </Route>

            <Route element={<RequireRole roles={["OWNER", "MANAGER"]} />}>
              <Route path="reports" element={<Reports />} />
              <Route path="reports/cash-flow" element={<CashFlowReport />} />
              <Route
                path="reports/income-statement"
                element={<IncomeStatement />}
              />
              <Route path="reports/trial-balance" element={<TrialBalance />} />
              <Route path="reports/profit-table" element={<ProfitTable />} />
            </Route>

            <Route
              element={<RequireRole roles={["OWNER", "CASHIER", "TECHNICIAN"]} />}
            >
              <Route path="repairs" element={<Repairs />} />
            </Route>

            <Route
              element={
                <RequireRole
                  roles={["OWNER", "CASHIER", "MANAGER", "TECHNICIAN"]}
                />
              }
            >
              <Route path="repairs/new" element={<RepairCreate />} />
              <Route path="/app/repairs/:id/edit" element={<RepairEdit />} />
            </Route>

            <Route path="*" element={<Navigate to="/app" replace />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}