const PRIVATE_IP_PATTERNS = [
  /^127\./, /^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[0-1])\./, /^::1$/, /^::ffff:127\./,
];

function isPrivateIp(ip) {
  if (!ip) return true;
  return PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(ip));
}

function extractClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress;
}

/**
 * Best-effort IP geolocation using the keyless ipapi.co service.
 * Returns null (instead of throwing) whenever a real location can't be
 * determined, so callers can fall back to a configured default.
 */
export async function geolocateRequest(req) {
  const ip = extractClientIp(req);
  if (isPrivateIp(ip)) return null;

  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') return null;
    return { lat: data.latitude, lon: data.longitude, city: data.city ?? null, source: 'ip' };
  } catch {
    return null;
  }
}
