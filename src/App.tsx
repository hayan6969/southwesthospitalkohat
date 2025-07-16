import React from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DirectionProvider } from "@radix-ui/react-direction";
import { AuthProvider } from "./hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      refetchInterval: 1000 * 60,
      retry: 1,
    },
  },
});

// Fully restored app with all providers
const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <DirectionProvider dir="ltr">
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/" element={<Index />} />
              <Route path="*" element={
                <div className="min-h-screen bg-background text-foreground p-8">
                  <h1 className="text-2xl font-bold">Page Not Found</h1>
                  <p className="mt-4">The requested page was not found.</p>
                </div>
              } />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </DirectionProvider>
    </QueryClientProvider>
  );
};

export default App;