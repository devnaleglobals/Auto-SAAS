// Business details shown on the website and legal pages. Must match the GST certificate used for
// Meta Business Verification. Set these in Vercel → Environment Variables.
export const COMPANY = {
  name: process.env.NEXT_PUBLIC_COMPANY_NAME || 'Daily Space Company',
  legalName: process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME || '',
  address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || 'Pune, Maharashtra, India',
  phone: process.env.NEXT_PUBLIC_COMPANY_PHONE || '',
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'chocomealbusiness@gmail.com',
  gstin: process.env.NEXT_PUBLIC_COMPANY_GSTIN || '',
};
export const operatedBy = () => (COMPANY.legalName ? `${COMPANY.name} (proprietor: ${COMPANY.legalName})` : COMPANY.name);
