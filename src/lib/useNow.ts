import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

/**
 * Ekranlarda kullanılan "şu an". Uygulama arka plandan dönünce yenilenir;
 * böylece gece açık kalan uygulamada "Bugün" / "bu ay" bilgisi eskimez.
 */
export function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setNow(Date.now());
    });
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, []);
  return now;
}
