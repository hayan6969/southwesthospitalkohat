import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { supabase } from "@/integrations/supabase/client";

// Function to update favicon dynamically
const updateFavicon = async () => {
  try {
    const { data: hospitalSettings } = await supabase
      .from('hospital_settings')
      .select('logo_url')
      .maybeSingle();

    const favicon = document.getElementById('favicon') as HTMLLinkElement;
    
    if (hospitalSettings?.logo_url && favicon) {
      // Use hospital logo as favicon
      favicon.href = hospitalSettings.logo_url;
    } else if (favicon) {
      // Remove favicon if no logo is uploaded
      favicon.remove();
    }
  } catch (error) {
    console.error('Error fetching hospital settings for favicon:', error);
    // Remove favicon on error
    const favicon = document.getElementById('favicon');
    if (favicon) {
      favicon.remove();
    }
  }
};

// Unregister any existing service worker to prevent it from interfering with fetch requests
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(registrations => {
    for (const registration of registrations) {
      registration.unregister();
      console.log('🗑️ Service Worker unregistered');
    }
  });
}

// Update favicon on app load
updateFavicon();

createRoot(document.getElementById("root")!).render(<App />);