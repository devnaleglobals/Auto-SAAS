// Business details shown on the website and legal pages. Must match the GST certificate used for
// Meta Business Verification and Razorpay. Set these in Vercel → Environment Variables.
export const COMPANY = {
  name: process.env.NEXT_PUBLIC_COMPANY_NAME || 'Daily Space Company',
  legalName: process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME || '',
  address: process.env.NEXT_PUBLIC_COMPANY_ADDRESS || 'Bidar, Karnataka, India',
  phone: process.env.NEXT_PUBLIC_COMPANY_PHONE || '',
  email: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'Devnaleglobals@gmail.com',
  gstin: process.env.NEXT_PUBLIC_COMPANY_GSTIN || '',
  // Courts named in the Terms: the city of the registered business address.
  jurisdiction: process.env.NEXT_PUBLIC_COMPANY_JURISDICTION || 'Bidar, Karnataka',
  // Grievance Officer (IT Act 2000 and DPDP Act 2023). Defaults to the proprietor and the support email.
  grievanceName: process.env.NEXT_PUBLIC_GRIEVANCE_OFFICER || process.env.NEXT_PUBLIC_COMPANY_LEGAL_NAME || '',
  grievanceEmail: process.env.NEXT_PUBLIC_GRIEVANCE_EMAIL || process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'Devnaleglobals@gmail.com',
};
export const operatedBy = () => (COMPANY.legalName ? `${COMPANY.name} (proprietor: ${COMPANY.legalName})` : COMPANY.name);
