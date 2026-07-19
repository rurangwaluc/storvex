import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import AuditLogs from "./legacy-pages/audit/AuditLogs";
import ConfirmSignup from "./legacy-pages/auth/ConfirmSignup";
import Login from "./legacy-pages/auth/Login";
import ForgotPassword from "./legacy-pages/auth/ForgotPassword";
import ResetPassword from "./legacy-pages/auth/ResetPassword";
import LandingPage from "./legacy-pages/public/LandingPage";
import MarketplaceHome from "./legacy-pages/marketplace/MarketplaceHome";
import MarketplaceProductDetails from "./legacy-pages/marketplace/MarketplaceProductDetails";
import MarketplaceRequests from "./legacy-pages/marketplace-owner/MarketplaceRequests";
import MarketplaceRequestDetail from "./legacy-pages/marketplace-owner/MarketplaceRequestDetail";

import Dashboard from "./legacy-pages/dashboard/Dashboard";
import Employees from "./legacy-pages/employees/EmployeesList";
import InterStoreDeals from "./legacy-pages/interstore/InterStoreDeals";
import InterStoreCreatePage from "./legacy-pages/interstore/InterStoreCreatePage";
import InterStoreDetail from "./legacy-pages/interstore/InterStoreDetail";

import InventoryCreate from "./legacy-pages/inventory/InventoryCreate";
import InventoryEdit from "./legacy-pages/inventory/InventoryEdit";
import InventoryList from "./legacy-pages/inventory/InventoryList";
import InventoryDetail from "./legacy-pages/inventory/InventoryDetail";
import ProductImages from "./legacy-pages/inventory/ProductImages";
import StockAdjustments from "./legacy-pages/inventory/StockAdjustments";
import Reorder from "./legacy-pages/inventory/Reorder";

import PosReceipt from "./legacy-pages/pos/PosReceipt";
import PosSale from "./legacy-pages/pos/PosSale";
import SalesList from "./legacy-pages/pos/SalesList";
import CreditDashboard from "./legacy-pages/pos/CreditDashboard";
import CashDrawer from "./legacy-pages/pos/CashDrawer";

import RepairCreate from "./legacy-pages/repairs/RepairCreate";
import Repairs from "./legacy-pages/repairs/Repairs";
import RepairEdit from "./legacy-pages/repairs/RepairEdit";

import Reports from "./legacy-pages/reports/Reports";
import CashFlowReport from "./legacy-pages/reports/CashFlowReport";
import IncomeStatement from "./legacy-pages/reports/IncomeStatement";
import TrialBalance from "./legacy-pages/reports/TrialBalance";
import ProfitTable from "./legacy-pages/reports/ProfitTable";
import ProductsReport from "./legacy-pages/reports/ProductsReport";
import OwnerChecksReport from "./legacy-pages/reports/OwnerChecksReport";

import CustomerCreate from "./legacy-pages/customers/CustomerCreate";
import CustomerEdit from "./legacy-pages/customers/CustomerEdit";
import CustomerList from "./legacy-pages/customers/CustomerList";
import CustomerView from "./legacy-pages/customers/CustomerView";

import RequireRole from "./auth/RequireRole";
import RequireTenantAuth from "./auth/requireTenantAuth";
import StoreLayout from "./components/StoreLayout";

import TenantIntent from "./legacy-pages/Tenant/TenantIntent";
import OwnerPayment from "./legacy-pages/Tenant/OwnerPayment";
import VerifyOtp from "./legacy-pages/Tenant/VerifyOtp";

import SubscriptionGate from "./components/SubscriptionGate";
import Renew from "./legacy-pages/Billing/Renew";

import SuppliersList from "./legacy-pages/suppliers/SuppliersList";
import SupplierCreate from "./legacy-pages/suppliers/SupplierCreate";
import SupplierEdit from "./legacy-pages/suppliers/SupplierEdit";
import SupplierView from "./legacy-pages/suppliers/SupplierView";
import SupplierSupplyCreate from "./legacy-pages/suppliers/SupplierSupplyCreate";

import DeliveryNoteCreate from "./legacy-pages/deliveryNotes/DeliveryNoteCreate";
import DeliveryNoteEdit from "./legacy-pages/deliveryNotes/DeliveryNoteEdit";

import SettingsLayout from "./legacy-pages/settings/SettingsLayout";
import SettingsGeneral from "./legacy-pages/settings/SettingsGeneral";
import SettingsMarketplace from "./legacy-pages/settings/SettingsMarketplace";
import SettingsDocuments from "./legacy-pages/settings/SettingsDocuments";
import SettingsBranches from "./legacy-pages/settings/SettingsBranches";
import SettingsBilling from "./legacy-pages/settings/SettingsBilling";
import SettingsRoles from "./legacy-pages/settings/SettingsRoles";
import SettingsMembers from "./legacy-pages/settings/SettingsMembers";
import SettingsSecurity from "./legacy-pages/settings/SettingsSecurity";
import SettingsAudit from "./legacy-pages/settings/SettingsAudit";

import WhatsAppInbox from "./legacy-pages/whatsapp/WhatsAppInbox";

import DocumentListPage from "./legacy-pages/documents/DocumentListPage";
import DocumentPreviewRoute from "./legacy-pages/documents/DocumentPreviewRoute";
import DocumentCenterPage from "./legacy-pages/documents/DocumentCenterPage";

import { listReceipts } from "./services/receiptsApi";
import { listInvoices } from "./services/invoicesApi";
import { listProformas } from "./services/proformasApi";
import ProformaCreate from "./legacy-pages/proformas/ProformaCreate";
import ProformaEdit from "./legacy-pages/proformas/ProformaEdit";

import { listWarranties } from "./services/warrantiesApi";
import WarrantyCreate from "./legacy-pages/warranties/WarrantyCreate";
import WarrantyEdit from "./legacy-pages/warranties/WarrantyEdit";

import { listDeliveryNotes } from "./services/deliveryNotesApi";
import Expenses from "./legacy-pages/expenses/Expenses";
import Money from "./legacy-pages/money/Money";

import SupportTickets from "./legacy-pages/support/SupportTickets";
import SupportTicketDetail from "./legacy-pages/support/SupportTicketDetail";

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
        <Route path="/marketplace" element={<MarketplaceHome />} />
        <Route
          path="/marketplace/:storeSlug/:productSlug"
          element={<MarketplaceProductDetails />}
        />
        <Route path="/signup" element={<TenantIntent />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/owner-payment" element={<OwnerPayment />} />
        <Route path="/confirm-signup" element={<ConfirmSignup />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

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
                <Route path="documents" element={<SettingsDocuments />} />
                <Route path="branches" element={<SettingsBranches />} />

                <Route
                  path="marketplace"
                  element={
                    <RequireRole roles={["OWNER"]}>
                      <SettingsMarketplace />
                    </RequireRole>
                  }
                />

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
              <Route path="marketplace" element={<MarketplaceRequests />} />
              <Route
                path="marketplace/requests/:requestId"
                element={<MarketplaceRequestDetail />}
              />

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
              <Route path="inventory/:id/images" element={<ProductImages />} />
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
              <Route path="money" element={<Money />} />

              <Route path="customers" element={<CustomerList />} />
              <Route path="customers/new" element={<CustomerCreate />} />
              <Route path="customers/:id" element={<CustomerView />} />
              <Route path="customers/:id/edit" element={<CustomerEdit />} />
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
                <RequireRole roles={["OWNER", "CASHIER", "MANAGER", "SELLER"]} />
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
              <Route path="interstore/new" element={<InterStoreCreatePage />} />
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
              <Route path="reports/products" element={<ProductsReport />} />
              <Route path="reports/owner-checks" element={<OwnerChecksReport />} />
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
