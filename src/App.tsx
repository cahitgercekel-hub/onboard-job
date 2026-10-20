import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth";
import { AiAccessProvider } from "@/lib/aiAccess";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import Tracker from "./pages/Tracker";
import Assistant from "./pages/Assistant";
import ChatAssistant from "./pages/assistant/ChatAssistant";
import ToneAssistant from "./pages/assistant/ToneAssistant";
import TranslatorAssistant from "./pages/assistant/TranslatorAssistant";
import PolishAssistant from "./pages/assistant/PolishAssistant";
import InterviewAssistant from "./pages/assistant/InterviewAssistant";
import CvAssistant from "./pages/assistant/CvAssistant";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Billing from "./pages/Billing";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound.tsx";
import Privacy from "./pages/legal/Privacy";
import Terms from "./pages/legal/Terms";
import Imprint from "./pages/legal/Imprint";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AiAccessProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            {/* Public: reachable without signing in */}
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/imprint" element={<Imprint />} />
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/" element={<Tracker />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/assistant" element={<Assistant />} />
              <Route path="/assistant/chat" element={<ChatAssistant />} />
              <Route path="/assistant/tone" element={<ToneAssistant />} />
              <Route path="/assistant/translator" element={<TranslatorAssistant />} />
              <Route path="/assistant/polish" element={<PolishAssistant />} />
              <Route path="/assistant/interview" element={<InterviewAssistant />} />
              <Route path="/assistant/cv" element={<CvAssistant />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/billing" element={<Billing />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
          </AiAccessProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
