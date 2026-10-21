import { Party, PartyAddress, TallyAddressType } from '../types';
import { INDIAN_STATES } from '../data/indianStates';

export const TALLY_ADDRESS_TYPES: TallyAddressType[] = [
  'Primary / Billing',
  'Delivery / Ship-To',
  'Branch Office',
  'Factory / Works',
  'Godown / Warehouse',
  'Registered Office',
  'Site / Project Location',
];

export function getStateNameByCode(code?: string): string {
  if (!code) return 'Maharashtra';
  const padded = code.trim().padStart(2, '0');
  const found = INDIAN_STATES.find((s) => s.code === padded);
  return found ? found.name : 'Maharashtra';
}

export function extractStateFromGstin(gstin?: string): { stateCode: string; stateName: string } | null {
  if (!gstin) return null;
  const clean = gstin.trim().toUpperCase();
  if (clean.length >= 2) {
    const code = clean.slice(0, 2);
    const found = INDIAN_STATES.find((s) => s.code === code);
    if (found) {
      return { stateCode: found.code, stateName: found.name };
    }
  }
  return null;
}

export function createEmptyPartyAddress(
  addressType: TallyAddressType = 'Delivery / Ship-To',
  defaults?: Partial<PartyAddress>
): PartyAddress {
  const defaultStateCode = defaults?.stateCode || '27';
  const defaultStateName = defaults?.stateName || getStateNameByCode(defaultStateCode);
  return {
    id: `addr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    addressType,
    mailingName: defaults?.mailingName || '',
    address: defaults?.address || '',
    city: defaults?.city || '',
    pincode: defaults?.pincode || '',
    stateCode: defaultStateCode,
    stateName: defaultStateName,
    country: defaults?.country || 'India',
    gstRegistrationType: defaults?.gstRegistrationType || (defaults?.gstin ? 'Regular' : 'Unregistered'),
    gstin: defaults?.gstin || '',
    contactPerson: defaults?.contactPerson || '',
    phone: defaults?.phone || '',
    email: defaults?.email || '',
    isDefaultBilling: Boolean(defaults?.isDefaultBilling),
    isDefaultShipping: Boolean(defaults?.isDefaultShipping),
  };
}

/**
 * Normalizes a Party's addresses list.
 * If the party already has saved `addresses`, ensures default billing/shipping flags are valid.
 * If the party only has flat legacy fields (`address`, `gstin`, `stateCode`, `phone`, `email`),
 * synthesizes a 'Primary / Billing' PartyAddress entry so every party supports Tally Multiple Mailing Details.
 */
export function normalizePartyAddresses(party?: Partial<Party> | null): PartyAddress[] {
  if (!party) return [];

  if (Array.isArray(party.addresses) && party.addresses.length > 0) {
    const cloned = party.addresses.map((a, idx) => {
      const stCode = a.stateCode || party.stateCode || '27';
      return {
        ...a,
        id: a.id || `addr-${party.id || 'p'}-${idx + 1}`,
        addressType: a.addressType || (idx === 0 ? 'Primary / Billing' : `Branch / Site #${idx + 1}`),
        mailingName: a.mailingName || party.mailingName || party.name || '',
        address: a.address || '',
        city: a.city || '',
        pincode: a.pincode || '',
        stateCode: stCode,
        stateName: a.stateName || getStateNameByCode(stCode),
        country: a.country || 'India',
        gstRegistrationType: a.gstRegistrationType || (a.gstin ? 'Regular' : 'Unregistered'),
        gstin: a.gstin || '',
        contactPerson: a.contactPerson || '',
        phone: a.phone || '',
        email: a.email || '',
        isDefaultBilling: Boolean(a.isDefaultBilling),
        isDefaultShipping: Boolean(a.isDefaultShipping),
      };
    });

    if (!cloned.some((a) => a.isDefaultBilling)) {
      cloned[0].isDefaultBilling = true;
    }
    if (!cloned.some((a) => a.isDefaultShipping)) {
      const shipCandidate =
        cloned.find((a) => a.addressType.toLowerCase().includes('ship') || a.addressType.toLowerCase().includes('delivery')) ||
        cloned[0];
      shipCandidate.isDefaultShipping = true;
    }
    return cloned;
  }

  // Synthesize from legacy flat party fields
  const gstInfo = extractStateFromGstin(party.gstin);
  const stCode = gstInfo?.stateCode || party.stateCode || '27';
  const stName = gstInfo?.stateName || party.stateName || getStateNameByCode(stCode);

  return [
    {
      id: `addr-primary-${party.id || 'default'}`,
      addressType: 'Primary / Billing',
      mailingName: party.mailingName || party.name || '',
      address: party.address || '',
      city: party.city || '',
      pincode: party.pincode || '',
      stateCode: stCode,
      stateName: stName,
      country: 'India',
      gstRegistrationType: party.gstRegistrationType || (party.gstin ? 'Regular' : 'Unregistered'),
      gstin: party.gstin || '',
      contactPerson: '',
      phone: party.phone || '',
      email: party.email || '',
      isDefaultBilling: true,
      isDefaultShipping: true,
    },
  ];
}

export function getDefaultBillingAddress(party?: Partial<Party> | null): PartyAddress | null {
  const list = normalizePartyAddresses(party);
  if (list.length === 0) return null;
  return list.find((a) => a.isDefaultBilling) || list[0];
}

export function getDefaultShippingAddress(party?: Partial<Party> | null): PartyAddress | null {
  const list = normalizePartyAddresses(party);
  if (list.length === 0) return null;
  return list.find((a) => a.isDefaultShipping) || list.find((a) => a.isDefaultBilling) || list[0];
}

export function formatPartyAddressBlock(addr?: Partial<PartyAddress> | null): string {
  if (!addr) return '';
  const parts: string[] = [];
  if (addr.address && addr.address.trim()) parts.push(addr.address.trim());
  const cityPin: string[] = [];
  if (addr.city && addr.city.trim()) cityPin.push(addr.city.trim());
  if (addr.pincode && addr.pincode.trim()) cityPin.push(`PIN: ${addr.pincode.trim()}`);
  if (cityPin.length > 0) parts.push(cityPin.join(' - '));
  return parts.join(', ');
}
