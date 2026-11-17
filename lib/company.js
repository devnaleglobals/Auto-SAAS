// Business details shown on the website, legal pages and emails.
// The platform admin edits them in Admin → Settings → General; the NEXT_PUBLIC_* environment
// variables are the fallback. They must match the GST certificate used for Meta and Razorpay.
import { getSetting } from './settings';

export const ENV_COMPANY = {
  appName: 'ReplyRelay',
  name: process.env.NEXT_PUBLIC_COMPANY_NAME || 'Daily Space Company',
  legalName: process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME || '',
  address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || 'Bidar, Karnataka, India',
  phone: process.env.NEXT_PUBLIC_COMPANY_PHONE || '',
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'Devnaleglobals@gmail.com',
  gstin: process.env.NEXT_PUBLIC_COMPANY_GSTIN || '',
  jurisdiction: process.env.NEXT_PUBLIC_COMPANY_JURISDICTION || 'Bidar, Karnataka',
  grievanceName: process.env.NEXT_PUBLIC_GRIEVANCE_OFFICER || process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME || '',
  grievanceEmail: process.env.NEXT_PUBLIC_GRIEVANCE_EMAIL || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'Devnaleglobals@gmail.com',
  responseTime: 'one working day',
};
// Kept for code that can't wait for the database (uses environment values only).
export const COMPANY = ENV_COMPANY;

export async function getCompany() {
  const g = await getSetting('general', {});
  const pick = (k, gk) => (g[gk] && String(g[gk]).trim()) || ENV_COMPANY[k];
  const c = {
    appName: pick('appName', 'appName'),
    name: pick('name', 'companyName'),
    legalName: pick('legalName', 'legalName'),
    address: pick('address', 'companyAddress'),
    phone: pick('phone', 'phone'),
    email: pick('email', 'supportEmail'),
    gstin: pick('gstin', 'gstin'),
    jurisdiction: pick('jurisdiction', 'jurisdiction'),
    grievanceName: pick('grievanceName', 'grievanceName'),
    grievanceEmail: pick('grievanceEmail', 'grievanceEmail'),
    responseTime: pick('responseTime', 'responseTime'),
  };
  c.operatedBy = c.legalName ? `${c.name} (proprietor: ${c.legalName})` : c.name;
  return c;
}
export const operatedBy = () => (ENV_COMPANY.legalName ? `${ENV_COMPANY.name} (proprietor: ${ENV_COMPANY.legalName})` : ENV_COMPANY.name);
