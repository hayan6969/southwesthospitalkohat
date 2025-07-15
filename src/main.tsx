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
      .single();

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

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('✅ Service Worker registered successfully:', registration);
        
        // Listen for updates
        registration.addEventListener('updatefound', () => {
          console.log('🔄 Service Worker update found');
        });
      })
      .catch((registrationError) => {
        console.error('❌ Service Worker registration failed:', registrationError);
      });
  });

  // Listen for offline/online events
  window.addEventListener('online', () => {
    console.log('🌐 App is back online');
  });
  
  window.addEventListener('offline', () => {
    console.log('📱 App is now offline');
  });
}

// Update favicon on app load
updateFavicon();

createRoot(document.getElementById("root")!).render(<App />);