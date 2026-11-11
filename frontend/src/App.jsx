import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppShell from './components/layout/AppShell';
import ProtectedRoute from './components/layout/ProtectedRoute';
import ErrorBoundary from './components/common/ErrorBoundary';

// Pages
import LandingPage from './pages/Landing/LandingPage';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import OnboardingPage from './pages/Onboarding/OnboardingPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import ClientsPage from './pages/Clients/ClientsPage';
import InvoicesPage from './pages/Invoices/InvoicesPage';
import CreateInvoicePage from './pages/Invoices/CreateInvoicePage';
import InvoiceDetailPage from './pages/Invoices/InvoiceDetailPage';
import PublicCheckoutPage from './pages/Invoices/PublicCheckoutPage';
import PaymentsPage from './pages/Payments/PaymentsPage';
import AIPilotPage from './pages/AI/AIPilotPage';
import RemindersPage from './pages/Reminders/RemindersPage';
import AnalyticsPage from './pages/Analytics/AnalyticsPage';
import NotificationsPage from './pages/Notifications/NotificationsPage';
import SettingsPage from './pages/Settings/SettingsPage';
import CreatorPage from './pages/Creator/CreatorPage';
import PublicTipPage from './pages/Creator/PublicTipPage';
import MarketplacePage from './pages/Marketplace/MarketplacePage';
import PublicStorePage from './pages/Marketplace/PublicStorePage';
import POSPage from './pages/POS/POSPage';
import ProductsPage from './pages/POS/ProductsPage';
import PublicPOSCheckoutPage from './pages/POS/PublicPOSCheckoutPage';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
          {/* Public Routes */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/pay/:invoiceNumber" element={<PublicCheckoutPage />} />
          <Route path="/tip/:creatorHandle" element={<PublicTipPage />} />
          <Route path="/@:creatorHandle" element={<PublicTipPage />} />
          <Route path="/marketplace/store" element={<PublicStorePage />} />
          <Route path="/pos/pay/:orderNumber" element={<PublicPOSCheckoutPage />} />

          {/* Onboarding Flow */}
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute requireOnboarding={false}>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />

          {/* Authenticated Workspace Routes */}
          <Route
            element={
              <ProtectedRoute requireOnboarding={true}>
                <AppShell />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route path="/invoices/new" element={<CreateInvoicePage />} />
            <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
            <Route path="/payments" element={<PaymentsPage />} />
            <Route path="/creator" element={<CreatorPage />} />
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/pos" element={<POSPage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/ai" element={<AIPilotPage />} />
            <Route path="/reminders" element={<RemindersPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </ErrorBoundary>
  );
}
