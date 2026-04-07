// =============================================================================
// IP Hashing Utilities (Privacy Compliance)
// =============================================================================

import * as crypto from 'crypto';

const IP_HASH_ALGORITHM = 'sha256';

/**
 * Hash an IP address with SHA-256 + salt for privacy compliance
 * This ensures we can track unique visitors without storing actual IPs
 * 
 * @param ip - The IP address to hash
 * @param salt - The salt for hashing (should come from config)
 * @returns The hashed IP (64 character hex string)
 */
export function hashIP(ip: string, salt: string): string {
  const normalizedIP = normalizeIP(ip);
  
  const hash = crypto
    .createHmac(IP_HASH_ALGORITHM, salt)
    .update(normalizedIP)
    .digest('hex');
  
  return hash;
}

/**
 * Normalize IP address for consistent hashing
 * Handles IPv4-mapped IPv6 addresses and other variations
 * 
 * @param ip - The IP address to normalize
 * @returns Normalized IP address
 */
export function normalizeIP(ip: string): string {
  // Handle IPv4-mapped IPv6 addresses (::ffff:192.168.1.1)
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  
  // Handle localhost variations
  if (ip === '::1') {
    return '127.0.0.1';
  }
  
  return ip;
}

/**
 * Extract client IP from request headers or socket
 * Handles proxy headers (X-Forwarded-For, X-Real-IP)
 * 
 * @param forwardedFor - X-Forwarded-For header value
 * @param realIP - X-Real-IP header value
 * @param socketRemoteAddress - Socket remote address
 * @returns The best available IP address
 */
export function extractClientIP(
  forwardedFor?: string | string[],
  realIP?: string,
  socketRemoteAddress?: string
): string {
  // Check X-Forwarded-For header first (may contain multiple IPs)
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) 
      ? forwardedFor[0] 
      : forwardedFor.split(',')[0];
    const ip = ips.trim();
    if (ip && isValidIP(ip)) {
      return ip;
    }
  }

  // Check X-Real-IP header
  if (realIP && isValidIP(realIP)) {
    return realIP;
  }

  // Fall back to socket address
  if (socketRemoteAddress && isValidIP(socketRemoteAddress)) {
    return socketRemoteAddress;
  }

  // Default fallback
  return '0.0.0.0';
}

/**
 * Validate if a string is a valid IP address
 * 
 * @param ip - The string to validate
 * @returns True if valid IP address
 */
export function isValidIP(ip: string): boolean {
  // IPv4 pattern
  const ipv4Pattern = /^(\d{1,3}\.){3}\d{1,3}$/;
  
  // IPv6 pattern (simplified)
  const ipv6Pattern = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  
  // IPv4-mapped IPv6
  const ipv4MappedPattern = /^::ffff:\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/i;

  return ipv4Pattern.test(ip) || ipv6Pattern.test(ip) || ipv4MappedPattern.test(ip);
}
