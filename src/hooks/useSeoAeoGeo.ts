// src/hooks/useSeoAeoGeo.ts
import { useEffect } from 'react';
import { PlatformSettings } from '../db/platformSettings';
import { CustomerReview, HomepageFaq } from '../types';
import { PlanTierConfig } from '../data/subscriptionPlans';
import { applySeoAeoGeoToDom, SeoAeoGeoConfig } from '../lib/seoAeoGeo';

interface UseSeoAeoGeoOptions {
  platformSettings?: Partial<PlatformSettings> | null;
  faqs?: HomepageFaq[];
  reviews?: CustomerReview[];
  plans?: PlanTierConfig[];
  customConfig?: Partial<SeoAeoGeoConfig>;
}

export function useSeoAeoGeo({
  platformSettings,
  faqs = [],
  reviews = [],
  plans = [],
  customConfig = {},
}: UseSeoAeoGeoOptions) {
  useEffect(() => {
    const config: Partial<SeoAeoGeoConfig> = {
      appName: platformSettings?.appName || customConfig.appName,
      tagline: platformSettings?.tagline || customConfig.tagline,
      businessName: platformSettings?.invoiceBusinessName || customConfig.businessName,
      gstin: platformSettings?.invoiceGstin || customConfig.gstin,
      stateCode: platformSettings?.invoiceStateCode || customConfig.stateCode,
      stateName: platformSettings?.invoiceStateName || customConfig.stateName,
      supportPhone: platformSettings?.supportPhone || customConfig.supportPhone,
      supportEmail: platformSettings?.supportEmail || customConfig.supportEmail,
      logoUrl: platformSettings?.appLogoUrl || customConfig.logoUrl,
      ...customConfig,
    };

    applySeoAeoGeoToDom(config, faqs, reviews, plans);
  }, [platformSettings, faqs, reviews, plans, customConfig]);
}
