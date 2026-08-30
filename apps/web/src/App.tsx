import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";

import DashboardPage from "./pages/DashboardPage";
import InventoryPage from "./pages/InventoryPage";
import ProductsPage from "./pages/ProductsPage";
import SaleDetailsPage from "./pages/SaleDetailsPage";
import SalesHistoryPage from "./pages/SalesHistoryPage";
import SalesPage from "./pages/SalesPage";
import SuppliersPage from "./pages/SuppliersPage";
import ReportsPage from "./pages/ReportsPage";
import LoginPage from "./pages/LoginPage";

export default function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route
              path="/"
              element={
                <Layout>
                  <Navigate to="/dashboard" replace />
                </Layout>
              }
            />
            <Route
              path="/dashboard"
              element={
                <Layout>
                  <DashboardPage />
                </Layout>
              }
            />
            <Route
              path="/inventory"
              element={
                <Layout>
                  <InventoryPage />
                </Layout>
              }
            />
            <Route
              path="/products"
              element={
                <Layout>
                  <ProductsPage />
                </Layout>
              }
            />
            <Route
              path="/suppliers"
              element={
                <Layout>
                  <SuppliersPage />
                </Layout>
              }
            />
            <Route
              path="/sales"
              element={
                <Layout>
                  <SalesPage />
                </Layout>
              }
            />
            <Route
              path="/sales/history"
              element={
                <Layout>
                  <SalesHistoryPage />
                </Layout>
              }
            />
            <Route
              path="/sales/:id"
              element={
                <Layout>
                  <SaleDetailsPage />
                </Layout>
              }
            />
            <Route
              path="/reports"
              element={
                <Layout>
                  <ReportsPage />
                </Layout>
              }
            />
            <Route
              path="*"
              element={
                <Layout>
                  <Navigate to="/dashboard" replace />
                </Layout>
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </HelmetProvider>
  );
}
