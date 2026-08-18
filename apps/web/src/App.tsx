import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout";

import DashboardPage from "./pages/DashboardPage";
import InventoryPage from "./pages/InventoryPage";
// import InventoryMovementsPage from "./pages/InventoryMovementsPage.tsx.backup";
// import MovementHistoryPage from "./pages/MovementHistoryPage.tsx.backup";
import ProductsPage from "./pages/ProductsPage";
import SaleDetailsPage from "./pages/SaleDetailsPage";
import SalesHistoryPage from "./pages/SalesHistoryPage";
import SalesPage from "./pages/SalesPage";
import SuppliersPage from "./pages/SuppliersPage";
import ReportsPage from "./pages/ReportsPage";

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route
            path="/"
            element={<Navigate to="/dashboard" replace />}
          />

          <Route
            path="/dashboard"
            element={<DashboardPage />}
          />

          <Route
            path="/inventory"
            element={<InventoryPage />}
          />

          {/* <Route */}
          {/*   path="/inventory/movements" */}
          {/*   element={<InventoryMovementsPage />} */}
          {/* /> */}
          {/**/}
          {/* <Route */}
          {/*   path="/inventory/history" */}
          {/*   element={<MovementHistoryPage />} */}
          {/* /> */}

          <Route
            path="/products"
            element={<ProductsPage />}
          />

          <Route
            path="/suppliers"
            element={<SuppliersPage />}
          />

          <Route
            path="/sales"
            element={<SalesPage />}
          />

          <Route
            path="/sales/history"
            element={<SalesHistoryPage />}
          />

          <Route
            path="/sales/:id"
            element={<SaleDetailsPage />}
          />

          <Route
            path="*"
            element={<Navigate to="/dashboard" replace />}
          />

          <Route
            path="/reports"
            element={<ReportsPage />}
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
