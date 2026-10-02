/**
 * companyBranding.js
 * Company Logo & Branding definitions for Web and Print Outputs
 */

export const DEFAULT_COMPANY_LOGO = '';

/**
 * Returns the effective company logo URL or empty string.
 * If user uploaded a custom logo, that is returned.
 * If no logo is configured, returns empty string (no hardcoded fallback).
 */
export function getCompanyLogo(companySettings) {
  if (companySettings && typeof companySettings.logo_url === 'string' && companySettings.logo_url.trim().length > 0) {
    return companySettings.logo_url.trim();
  }
  try {
    const cached = localStorage.getItem('salesforce_company_settings');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (parsed && typeof parsed.logo_url === 'string' && parsed.logo_url.trim().length > 0) {
        return parsed.logo_url.trim();
      }
    }
  } catch (e) {}
  return '';
}
