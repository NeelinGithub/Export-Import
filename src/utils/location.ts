import { useState, useEffect } from "react";

export const isIndianTimezone = () => {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz === 'Asia/Calcutta' || tz === 'Asia/Kolkata';
  } catch (e) {
    return false;
  }
};

export function useIsIndianLocation() {
  const [isIndian, setIsIndian] = useState<boolean>(isIndianTimezone());

  useEffect(() => {
    const checkLocation = async () => {
      try {
        const response = await fetch("https://get.geojs.io/v1/ip/country.json");
        const data = await response.json();
        if (data && data.country === "IN") {
          setIsIndian(true);
        } else if (data && data.country) {
          setIsIndian(false);
        }
      } catch (err) {
        console.warn("Failed to fetch location from IP", err);
      }
    };
    
    checkLocation();
  }, []);

  return isIndian;
}
