import React from 'react';
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DirectionProvider } from "@radix-ui/react-direction";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30,
      refetchInterval: 1000 * 60,
      retry: 1,
    },
  },
});

// App with QueryClient and DirectionProvider added back
const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <DirectionProvider dir="ltr">
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={
              <div className="min-h-screen bg-blue-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-lg">
                  <h1 className="text-2xl font-bold text-gray-900">Auth Page</h1>
                  <p className="text-gray-600 mt-2">Authentication will be restored</p>
                </div>
              </div>
            } />
            <Route path="/" element={
              <div className="min-h-screen bg-blue-50 flex items-center justify-center">
                <div className="bg-white p-8 rounded-lg shadow-lg">
                  <h1 className="text-2xl font-bold text-gray-900">HIMS</h1>
                  <p className="text-gray-600 mt-2">Hospital Information Management System</p>
                  <a href="/auth" className="text-blue-600 hover:underline block mt-2">Go to Login</a>
                </div>
              </div>
            } />
            <Route path="*" element={
              <div className="min-h-screen bg-background text-foreground p-8">
                <h1 className="text-2xl font-bold">Page Not Found</h1>
                <p className="mt-4">The requested page was not found.</p>
              </div>
            } />
          </Routes>
        </BrowserRouter>
      </DirectionProvider>
    </QueryClientProvider>
  );
};

export default App;