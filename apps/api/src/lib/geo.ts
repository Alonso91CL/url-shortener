// =============================================================================
// GeoIP Utilities
// =============================================================================

import geoip from 'geoip-lite';
import { logger } from '../utils/logger.js';

// Extend geoip-lite types
interface GeoIPRecord {
  ll: [number, number] | null;
  city: string | null;
  country: string | null;
  region: string | null;
}

export interface GeoData {
  country: string | null;
  city: string | null;
}

/**
 * Lookup geographic data from an IP address
 * Uses MaxMind GeoLite2 database via geoip-lite
 * 
 * @param ip - The IP address to lookup
 * @returns Geographic data (country code, city) or null if not found
 */
export function lookupGeoIP(ip: string): GeoData {
  try {
    // Handle localhost/private IPs
    if (isPrivateIP(ip)) {
      return { country: null, city: null };
    }

    const record = geoip.lookup(ip) as GeoIPRecord | null;
    
    if (!record) {
      return { country: null, city: null };
    }

    return {
      country: record.country || null,
      city: record.city || null,
    };
  } catch (error) {
    logger.error('GeoIP lookup error', { ip, error });
    return { country: null, city: null };
  }
}

/**
 * Check if an IP address is private/local
 * 
 * @param ip - The IP address to check
 * @returns True if the IP is private or local
 */
export function isPrivateIP(ip: string): boolean {
  // IPv4 private ranges
  const privateIPv4 = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^127\./,
    /^localhost$/i,
    /^::1$/,
    /^fc00:/,
    /^fe80:/,
  ];

  // Check if matches any private pattern
  for (const pattern of privateIPv4) {
    if (pattern.test(ip)) {
      return true;
    }
  }

  return false;
}

/**
 * Get country name from ISO country code
 * 
 * @param countryCode - ISO 3166-1 alpha-2 country code
 * @returns Country name or the code itself if not found
 */
export function getCountryName(countryCode: string): string {
  const countries: Record<string, string> = {
    US: 'United States',
    GB: 'United Kingdom',
    DE: 'Germany',
    FR: 'France',
    ES: 'Spain',
    IT: 'Italy',
    BR: 'Brazil',
    MX: 'Mexico',
    AR: 'Argentina',
    CO: 'Colombia',
    PE: 'Peru',
    CL: 'Chile',
    CA: 'Canada',
    AU: 'Australia',
    JP: 'Japan',
    KR: 'South Korea',
    IN: 'India',
    CN: 'China',
    RU: 'Russia',
    NL: 'Netherlands',
    // Add more countries as needed
  };

  return countries[countryCode.toUpperCase()] || countryCode;
}
