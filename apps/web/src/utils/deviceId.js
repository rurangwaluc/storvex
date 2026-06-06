// src/utils/deviceId.js

export function getOrCreateDeviceId() {
  let deviceId = localStorage.getItem("storvex_deviceId");

  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem("storvex_deviceId", deviceId);
  }

  return deviceId;
}