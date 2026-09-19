// src/db/platformSettings.ts
import { onSnapshot, doc } from 'firebase/firestore';
import { db, COLLECTIONS, rawFirestore } from './index';

export interface PlatformSettings {
  appName: string;
  appShortName: string;
  tagline: string;
  appLogoUrl?: string;
  supportEmail: string;
  supportPhone: string;
  supportHours?: string;
  copyrightText: string;
  primaryColor: string;
  defaultWorkspaceName?: string;
  defaultBusinessName?: string;
  defaultStateCode: string;
  defaultStateName: string;
  gstPortalUrl: string;
  eWayPortalUrl: string;
  // Master Invoice & Legal Business Profile
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
  // Header Customization
  headerShowContact?: boolean;
  headerShowGstin?: boolean;
  headerBadgeText?: string;
  // Footer & Compliance
  footerCopyright?: string;
  footerCompliance?: string;
  footerSupport?: string;
  updatedAt?: string;
  updatedBy?: string;
}

export const FALLBACK_PLATFORM_SETTINGS: PlatformSettings = {
  appName: 'Apex TallyGST Cloud',
  appShortName: 'TallyGST',
  tagline: 'Enterprise GST Billing, Banking Reconciliation & Cloud Accounting Platform',
  appLogoUrl: '',
  supportEmail: 'nawarkuldeep@gmail.com',
  supportPhone: '+91 98201 23456',
  supportHours: 'Mon - Sat: 9:00 AM - 7:00 PM IST',
  copyrightText: '© 2026 Apex TallyGST Cloud Technologies. All rights reserved. Made in India.',
  primaryColor: '#10b981',
  defaultStateCode: '27',
  defaultStateName: 'Maharashtra',
  gstPortalUrl: 'https://services.gst.gov.in',
  eWayPortalUrl: 'https://ewaybillgst.gov.in',
  invoiceBusinessName: 'Apex Cloud Technologies',
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
  headerShowContact: true,
  headerShowGstin: true,
  headerBadgeText: 'Enterprise Cloud',
  footerCopyright: '© 2026 Apex TallyGST Accounting Platform. All rights reserved.',
  footerCompliance: 'GST Act 2017 & ITC Section 16 Compliant',
  footerSupport: 'Support: nawarkuldeep@gmail.com | +91 98201 23456',
};

const DOC_ID = 'global_config';

function syncLocalStorageCache(settings: PlatformSettings) {
  if (typeof window === 'undefined') return;
  try {
    if (settings.appName) localStorage.setItem('platform_app_name', settings.appName);
    if (settings.tagline) localStorage.setItem('platform_app_tagline', settings.tagline);
    if (settings.appLogoUrl !== undefined) localStorage.setItem('platform_app_logo', settings.appLogoUrl || '');
    if (settings.invoiceBusinessName) localStorage.setItem('platform_invoice_name', settings.invoiceBusinessName);
    if (settings.invoiceGstin) localStorage.setItem('platform_invoice_gstin', settings.invoiceGstin);
    if (settings.invoiceStateCode) localStorage.setItem('platform_invoice_state_code', settings.invoiceStateCode);
    if (settings.invoiceStateName) localStorage.setItem('platform_invoice_state_name', settings.invoiceStateName);
    if (settings.invoicePan) localStorage.setItem('platform_invoice_pan', settings.invoicePan);
    if (settings.invoiceSac) localStorage.setItem('platform_invoice_sac', settings.invoiceSac);
    if (settings.invoiceAddress) localStorage.setItem('platform_invoice_address', settings.invoiceAddress);
    if (settings.invoiceBank) localStorage.setItem('platform_invoice_bank', settings.invoiceBank);
    if (settings.subInvoicePrefix) localStorage.setItem('platform_sub_invoice_prefix', settings.subInvoicePrefix);
    if (settings.subInvoiceSuffix) localStorage.setItem('platform_sub_invoice_suffix', settings.subInvoiceSuffix);
    if (settings.subInvoiceNextNum) localStorage.setItem('platform_sub_invoice_next_num', settings.subInvoiceNextNum);
    if (settings.subInvoicePadding) localStorage.setItem('platform_sub_invoice_padding', settings.subInvoicePadding);
    if (settings.supportPhone) localStorage.setItem('platform_support_phone', settings.supportPhone);
    if (settings.supportEmail) localStorage.setItem('platform_support_email', settings.supportEmail);
    if (settings.supportHours) localStorage.setItem('platform_support_hours', settings.supportHours);
    if (settings.footerCopyright) localStorage.setItem('platform_footer_copyright', settings.footerCopyright);
    if (settings.footerCompliance) localStorage.setItem('platform_footer_compliance', settings.footerCompliance);
    if (settings.footerSupport) localStorage.setItem('platform_footer_support', settings.footerSupport);
    if (settings.headerBadgeText) localStorage.setItem('platform_header_badge', settings.headerBadgeText);
    localStorage.setItem('platform_header_show_contact', String(settings.headerShowContact !== false));
    localStorage.setItem('platform_header_show_gstin', String(settings.headerShowGstin !== false));
  } catch (err) {
    console.warn('Failed to update local storage platform cache:', err);
  }
}

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
      const merged: PlatformSettings = {
        ...FALLBACK_PLATFORM_SETTINGS,
        ...data,
      };
      syncLocalStorageCache(merged);
      return merged;
    }

    // Seed default document in Firestore for persistent cloud backing
    const initialSettings: PlatformSettings = {
      ...FALLBACK_PLATFORM_SETTINGS,
      updatedAt: new Date().toISOString(),
    };
    await docRef.set(initialSettings);
    syncLocalStorageCache(initialSettings);
    return initialSettings;
  } catch (err) {
    console.warn('Could not read platform_settings from Firestore:', err);
    return FALLBACK_PLATFORM_SETTINGS;
  }
}

/**
 * Real-time listener for Firestore platform settings document.
 */
export function subscribeToPlatformSettings(
  callback: (settings: PlatformSettings) => void
): () => void {
  try {
    const docRef = doc(rawFirestore, COLLECTIONS.PLATFORM_SETTINGS, DOC_ID);
    const unsubscribe = onSnapshot(
      docRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const merged: PlatformSettings = {
            ...FALLBACK_PLATFORM_SETTINGS,
            ...data,
          };
          syncLocalStorageCache(merged);
          callback(merged);
        } else {
          callback(FALLBACK_PLATFORM_SETTINGS);
        }
      },
      (error) => {
        console.warn('Firestore onSnapshot error on platform_settings, using fallback:', error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Could not attach snapshot listener on platform_settings:', err);
    return () => {};
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
  const finalSettings: PlatformSettings = {
    ...FALLBACK_PLATFORM_SETTINGS,
    ...(updatedSnap.data() || {}),
  };

  syncLocalStorageCache(finalSettings);

  // Broadcast events for instant UI synchronization across views
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('platform_branding_updated'));
    window.dispatchEvent(new CustomEvent('platform_settings_updated', { detail: finalSettings }));
  }

  return finalSettings;
}
