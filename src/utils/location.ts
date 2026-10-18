import { Geolocation } from "@capacitor/geolocation";
import type { ValidationType, CheckInRequest } from "../types";

interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
}

async function getCurrentPosition(): Promise<GeoPosition> {
  const pos = await Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: 10000,
  });
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
  };
}

async function getWifiInfo(): Promise<{ ssid: string; bssid: string } | null> {
  // TODO: Capacitor 플러그인 연동 시 구현
  return null;
}

export async function collectCheckInData(
  validationType: ValidationType
): Promise<CheckInRequest> {
  const request: CheckInRequest = {};

  if (validationType === "GPS" || validationType === "GPS_AND_WIFI") {
    const pos = await getCurrentPosition();
    request.latitude = pos.latitude;
    request.longitude = pos.longitude;
    request.locationAccuracy = pos.accuracy;
  }

  if (validationType === "WIFI" || validationType === "GPS_AND_WIFI") {
    const wifi = await getWifiInfo();
    if (wifi) {
      request.wifiSsid = wifi.ssid;
      request.wifiBssid = wifi.bssid;
    }
  }

  return request;
}
