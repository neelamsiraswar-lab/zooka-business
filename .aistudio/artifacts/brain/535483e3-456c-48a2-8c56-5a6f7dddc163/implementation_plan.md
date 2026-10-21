# Implementation Plan: Purchase & Sale Invoice Classification, GST Statutory Tables, and Multi-Ledger Accounting

Fix invoice classification between Sales and Purchase vouchers across accounting daybooks, general ledgers, and GST returns. Implement full multi-ledger tax breakout (Taxable, CGST, SGST, IGST), statutory inward GST classification (B2B ITC, RCM, Imports, Ineligible Sec 17(5)), and smart party filtering (Customers for Sales, Vendors for Purchases).

---

## 1. User Review & Confirmed Decisions

Based on user clarifications, the following three core requirements are incorporated:
1. **Multi-Ledger Accounting Split**: Sales and purchases will be broken down into separate Dr/Cr accounts in the Day Book, General Ledger, and Trial Balance (`Sales Account`, `Purchase Account`, `Output CGST`, `Output SGST`, `Output IGST`, `Input CGST`, `Input SGST`, `Input IGST`, and `Sundry Debtors`/`Sundry Creditors`).
2. **Statutory GST Inward Classifications**: Purchase bills will support granular classifications matching GST rules:
   - **B2B ITC** &rarr; Table 4(A)(5) All other ITC
   - **RCM Reverse Charge** &rarr; Table 3.1(d) Output liability + Table 4(A)(3) Inward RCM ITC
   - **Imports (Goods / Services)** &rarr; Table 4(A)(1) Import of Goods / Table 4(A)(2) Import of Services
   - **Ineligible ITC (Section 17(5))** &rarr; Table 4(B) ITC Reversed / Ineligible
   - **Exempt / Nil-Rated** &rarr; Table 5 Inward Exempt/Nil
3. **Smart Party Filtering**:
   - In Sales voucher mode, the party selector automatically defaults to **Customers**.
   - In Purchase voucher mode, the party selector automatically defaults to **Vendors**.
   - Quick-add party forms inside vouchers will pre-select the appropriate party type.

---

## 2. Root Cause Analysis

1. **Voucher Classification Bug (`AccountingView.tsx` line 191–192)**:
   ```typescript
   const isSale = inv.invoiceType === 'tax_invoice' || inv.invoiceType === 'bill_of_supply' || !inv.invoiceType;
   const isPurchase = inv.invoiceType === 'purchase_bill';
   ```
   The `Invoice` model stores voucher category in `voucherType: 'sales' | 'purchase'`. `inv.invoiceType` is undefined on vouchers created through standard flows, causing `!inv.invoiceType` to evaluate to `true` for **all** purchase bills. Consequently, purchase bills were credited to `Sales Account` and debited to vendors as if they were customers/debtors.
2. **Missing Tax Ledger Breakout**:
   Vouchers posted the lump-sum `grandTotal` to a single ledger (`Sales Account` or `Purchase Account`) instead of splitting the taxable amount to the revenue/expense account and routing tax components to dedicated GST balance sheet ledgers.
3. **Coarse Inward Supply Categorization in GST Engine (`gstTaxEngine.ts`)**:
   Inward supplies were only differentiated as registered vs unregistered without tracking RCM inward tax liabilities (Table 3.1d), Overseas Import bills (Table 4A1/4A2), or blocked credits under Section 17(5) (Table 4B).

---

## 3. Architecture & Data Flow

```
                      [ Voucher Entry / InvoiceView ]
                                    |
         +--------------------------+--------------------------+
         |                                                     |
  [ Sales Mode ]                                        [ Purchase Mode ]
  - Filter: Customers                                   - Filter: Vendors
  - saleType: regular/export/rcm/sez                    - purchaseType: b2b_itc, rcm,
                                                          import_goods, import_services,
                                                          ineligible_17_5, exempt_nil
         |                                                     |
         +--------------------------+--------------------------+
                                    |
                            [ Ingestion Service ]
                       (Sets voucherType & GST types)
                                    |
         +--------------------------+--------------------------+
         |                                                     |
         v                                                     v
  [ Accounting Engine ]                                 [ GST Tax Engine ]
  Day Book & Ledger Postings                            GSTR-1, GSTR-2B, GSTR-3B
  ---------------------------------                     ---------------------------------
  Sales Voucher:                                        Sales:
  - Dr Customer (Sundry Debtors) [Gross]                - GSTR-1 (Table 4 B2B, 5 B2CL,
  - Cr Sales Account [Taxable]                            7 B2CS, 6 Exports, 9 Nil)
  - Cr Output CGST [CGST]                               - GSTR-3B (Table 3.1a, 3.1b, 3.1c)
  - Cr Output SGST [SGST]                               Purchases:
  - Cr Output IGST [IGST]                               - GSTR-2B Inward Supply Matching
  Purchase Voucher:                                     - GSTR-3B Table 4(A)(1) Import Goods
  - Dr Purchase Account [Taxable]                       - GSTR-3B Table 4(A)(2) Import Services
  - Dr Input CGST (ITC) [CGST]                          - GSTR-3B Table 4(A)(3) & 3.1(d) RCM
  - Dr Input SGST (ITC) [SGST]                          - GSTR-3B Table 4(A)(5) All Other ITC
  - Dr Input IGST (ITC) [IGST]                          - GSTR-3B Table 4(B) Ineligible 17(5)
  - Cr Vendor (Sundry Creditors) [Gross]                - GSTR-3B Table 5 Exempt/Nil Inward
```

---

## 4. Proposed Changes

### A. Data Types & Interfaces (`src/types.ts`)
- Add `PurchaseGstType` definition:
  ```typescript
  export type PurchaseGstType =
    | 'b2b_itc'
    | 'rcm'
    | 'import_goods'
    | 'import_services'
    | 'ineligible_17_5'
    | 'exempt_nil';
  ```
- Extend `Invoice` interface:
  ```typescript
  export interface Invoice {
    ...
    purchaseType?: PurchaseGstType;
    ...
  }
  ```

### B. Accounting Engine & Ledger Posting (`src/components/AccountingView.tsx`)
1. **Fix Classification Logic**:
   - Determine sales vs purchase accurately:
     ```typescript
     const isSale = inv.voucherType === 'sales' || (!inv.voucherType && inv.invoiceType !== 'purchase_bill');
     const isPurchase = inv.voucherType === 'purchase' || inv.invoiceType === 'purchase_bill';
     ```
2. **Multi-Ledger Double Entry Posting**:
   - For Sales:
     - Generate primary entry + tax sub-postings:
       - Debit: Customer / Sundry Debtors (`grandTotal`)
       - Credit: `Sales Account` (`taxableAmount` or `subtotal`)
       - Credit: `Output CGST` (`cgstTotal`)
       - Credit: `Output SGST` (`sgstTotal`)
       - Credit: `Output IGST` (`igstTotal`)
   - For Purchase:
     - Debit: `Purchase Account` (`subtotal` / `taxableAmount`)
     - Debit: `Input CGST (ITC)` (`cgstTotal`)
     - Debit: `Input SGST (ITC)` (`sgstTotal`)
     - Debit: `Input IGST (ITC)` (`igstTotal`)
     - (If marked `ineligible_17_5`: Route tax to `Ineligible ITC (Expense)` or `Purchase Account`)
     - Credit: Vendor / Sundry Creditors (`grandTotal`)
3. **Day Book UI Enhancement**:
   - Add expandable breakdown toggle in Day Book rows to inspect exact debit/credit ledger splits.
   - Distinct badges for **Sales Invoice** (emerald) vs **Purchase Bill** (indigo) with party role indicators (Debtor vs Creditor).
4. **General Ledger & Trial Balance Synchronization**:
   - Ensure `Output CGST`, `Output SGST`, `Output IGST`, `Input CGST`, `Input SGST`, `Input IGST` ledgers appear cleanly in the Ledger Selector and Trial Balance columns with correct net balances.

### C. GST Tax Engine (`src/utils/gstTaxEngine.ts`)
1. **Update GSTR-3B Generation**:
   - Categorize inward supplies based on `inv.purchaseType`:
     - `'import_goods'` &rarr; Table 4(A)(1)
     - `'import_services'` &rarr; Table 4(A)(2)
     - `'rcm'` &rarr; Table 4(A)(3) ITC **and** Table 3.1(d) Inward Reverse Charge Liability
     - `'b2b_itc'` &rarr; Table 4(A)(5) All other ITC
     - `'ineligible_17_5'` &rarr; Table 4(B) Ineligible ITC under Section 17(5)
     - `'exempt_nil'` &rarr; Table 5 Exempt/Nil inward supplies
2. **GSTR-2B Report (`src/components/Gstr2bReportView.tsx`)**:
   - Display statutory classification tags (`B2B`, `RCM`, `IMPORT`, `INELIGIBLE-17(5)`).
3. **GSTR-3B Report View (`src/components/Gstr3bReportView.tsx`)**:
   - Reflect updated figures in Table 3.1(d), Table 4(A)(1), 4(A)(2), 4(A)(3), 4(A)(5), and 4(B) with automated tax set-off under Rule 88A.

### D. Voucher UI & Form Experience (`src/components/InvoiceView.tsx`)
1. **Smart Party Filtering**:
   - When entering or editing a Sales Invoice, party selection defaults to `partyType === 'customer'`.
   - When entering or editing a Purchase Bill, party selection defaults to `partyType === 'vendor'`.
   - Add a quick filter badge ("Customers Only" / "Vendors Only" / "Show All") in the party dropdown search modal.
   - Quick "Add New Party" button pre-selects the corresponding party type.
2. **Purchase Classification Selector**:
   - For purchase vouchers, provide a dedicated GST Inward Type dropdown with descriptive helper text:
     - `B2B ITC Eligible` (Standard registered vendor supply)
     - `Reverse Charge (RCM u/s 9(3)/9(4))` (Liability on recipient + ITC)
     - `Import of Goods` (Overseas supplier / customs bill of entry)
     - `Import of Services` (Cross-border professional/cloud services)
     - `Ineligible ITC (Sec 17(5))` (Motor vehicles, food/catering, club memberships, etc.)
     - `Exempt / Nil-Rated / Non-GST`

---

## 5. Verification Plan

1. **Classification Test**:
   - Create 1 Sales Invoice and 1 Purchase Bill.
   - Verify that in Day Book and Accounting View:
     - Sales Invoice debits Customer and credits Sales Account + Output GST.
     - Purchase Bill debits Purchase Account + Input GST and credits Vendor.
2. **Multi-Ledger Breakdown Test**:
   - Check Trial Balance to verify `Output CGST/SGST/IGST` (Liabilities) and `Input CGST/SGST/IGST` (Assets) display accurate segregated balances.
   - Check General Ledger for `Sales Account` and `Purchase Account`.
3. **GST Return Matching Test**:
   - Verify GSTR-1 contains only Sales outward invoices.
   - Verify GSTR-3B correctly displays:
     - Table 3.1(a) for Sales
     - Table 3.1(d) for RCM purchases
     - Table 4(A)(5) for B2B ITC
     - Table 4(B) for Ineligible ITC
4. **Smart Party Filter Test**:
   - Switch between Sales tab and Purchase tab; verify party list automatically prioritizes Customers and Vendors respectively.
5. **Compilation & Linting**:
   - Execute `compile_applet` and ensure 0 TypeScript or build errors.
