// src/db/platformSettings.ts
import { db, COLLECTIONS } from './index';

export interface PlatformSettings {
  appName: string;
  appShortName: string;
  tagline: string;
  appLogoUrl?: string;
  supportEmail: string;
  supportPhone: string;
  copyrightText: string;
  primaryColor: string;
  defaultWorkspaceName?: string;
  defaultBusinessName?: string;
  defaultStateCode: string;
  defaultStateName: string;
  gstPortalUrl: string;
  eWayPortalUrl: string;
  // Master Invoice Profile for Subscriptions
  invoiceBusinessName?: string;
  invoiceGstin?: string;
  invoiceStateCode?: string;
  invoiceStateName?: string;
  invoicePan?: string;
  invoiceSac?: string;
  invoiceAddress?: string;
  invoiceBank?: string;
  subInvoicePrefix?: string;
  subInvoiceSuffix?: string;
  subInvoiceNextNum?: string;
  subInvoicePadding?: string;
  // Footer & Compliance
  footerCopyright?: string;
  footerCompliance?: string;
  footerSupport?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const FALLBACK_PLATFORM_SETTINGS: PlatformSettings = {
  appName: 'Zooka Business',
  appShortName: 'Zooka',
  tagline: 'Enterprise GST Billing, Banking Reconciliation & Cloud Accounting Platform',
  appLogoUrl: '',
  supportEmail: 'nawarkuldeep@gmail.com',
  supportPhone: '+91 98201 23456',
  copyrightText: '© 2026 Zooka Business Technologies. All rights reserved. Made in India.',
  primaryColor: '#10b981',
  defaultStateCode: '27',
  defaultStateName: 'Maharashtra',
  gstPortalUrl: 'https://services.gst.gov.in',
  eWayPortalUrl: 'https://ewaybillgst.gov.in',
  invoiceBusinessName: 'Zooka Business Technologies',
  invoiceGstin: '27AAECB9382M1ZR',
  invoiceStateCode: '27',
  invoiceStateName: 'Maharashtra',
  invoicePan: 'AAECB9382M',
  invoiceSac: '998315',
  invoiceAddress: 'BKC, Bandra East, Mumbai, MH - 400051',
  invoiceBank: 'HDFC Bank Ltd, A/C 50200012345678, IFSC HDFC0000001',
  subInvoicePrefix: 'SUB',
  subInvoiceSuffix: '2026-27',
  subInvoiceNextNum: '42',
  subInvoicePadding: '4',
  footerCopyright: '© 2026 Zooka Business Accounting Platform. All rights reserved.',
  footerCompliance: 'GST Act 2017 & ITC Section 16 Compliant',
  footerSupport: 'Support: nawarkuldeep@gmail.com | +91 98201 23456',
};

const DOC_ID = 'global_config';

/**
 * Fetch platform settings from Google Cloud Firestore.
 * If not present, initializes it with standard enterprise defaults and returns it.
 */
export async function getPlatformSettings(): Promise<PlatformSettings> {
  try {
    const docRef = db.collection(COLLECTIONS.PLATFORM_SETTINGS).doc(DOC_ID);
    const snap = await docRef.get();
    if (snap.exists) {
      const data = snap.data();
      return {
        ...FALLBACK_PLATFORM_SETTINGS,
        ...data,
      };
    }

    // Seed default document in Firestore for persistent cloud backing
    const initialSettings: PlatformSettings = {
      ...FALLBACK_PLATFORM_SETTINGS,
      updatedAt: new Date().toISOString(),
    };
    await docRef.set(initialSettings);
    return initialSettings;
  } catch (err) {
    console.warn('Could not read platform_settings from Firestore:', err);
    return FALLBACK_PLATFORM_SETTINGS;
  }
}

/**
 * Update platform settings in Google Cloud Firestore.
 */
export async function updatePlatformSettings(
  settings: Partial<PlatformSettings>,
  updatedBy?: string
): Promise<PlatformSettings> {
  const docRef = db.collection(COLLECTIONS.PLATFORM_SETTINGS).doc(DOC_ID);
  const now = new Date().toISOString();
  const payload = {
    ...settings,
    updatedAt: now,
    ...(updatedBy ? { updatedBy } : {}),
  };

  await docRef.set(payload, { merge: true });
  const updatedSnap = await docRef.get();
  return {
    ...FALLBACK_PLATFORM_SETTINGS,
    ...(updatedSnap.data() || {}),
  };
}
