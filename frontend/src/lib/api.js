const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

const getDefaultBackendUrl = () => {
  if (typeof window === "undefined") {
    return "http://127.0.0.1:8000";
  }

  const { hostname, origin } = window.location;
  if (LOCAL_HOSTS.has(hostname)) {
    return "http://127.0.0.1:8000";
  }

  return origin;
};

export const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL || getDefaultBackendUrl();

export const API_BASE_URL = `${BACKEND_URL.replace(/\/$/, "")}/api`;
