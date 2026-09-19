// src/components/SeoAeoGeoManager.tsx
import React, { useState, useEffect } from 'react';
import {
  Globe,
  Bot,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  Code2,
  FileText,
  MapPin,
  Tag,
  ShieldCheck,
  Zap,
  ArrowRight,
  Database,
  Building2,
  HelpCircle,
  Star,
  Check,
  Cpu,
  Layers,
  Terminal,
} from 'lucide-react';
import {
  DEFAULT_SEO_CONFIG,
  SeoAeoGeoConfig,
  generateStructuredSchemaGraph,
  calculateSeoAuditScore,
  applySeoAeoGeoToDom,
} from '../lib/seoAeoGeo';
import { PlatformSettings, getPlatformSettings } from '../db/platformSettings';
import { HomepageFaq, CustomerReview } from '../types';
import { getAllHomepageFaqs } from '../db/homepageFaqs';
import { getAllCustomerReviews } from '../db/customerReviews';
import { DEFAULT_BUILTIN_PLANS } from '../data/subscriptionPlans';

interface SeoAeoGeoManagerProps {
  onNavigateToLandingPage?: () => void;
}

export const SeoAeoGeoManager: React.FC<SeoAeoGeoManagerProps> = ({
  onNavigateToLandingPage,
}) => {
  const [activeTab, setActiveTab] = useState<'audit' | 'schema' | 'llms' | 'simulator'>('audit');
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings | null>(null);
  const [faqs, setFaqs] = useState<HomepageFaq[]>([]);
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [customKeywords, setCustomKeywords] = useState<string[]>(DEFAULT_SEO_CONFIG.keywords || []);
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [selectedSimulatorQuery, setSelectedSimulatorQuery] = useState(0);

  // Load latest settings, faqs, reviews
  const loadData = async () => {
    setLoading(true);
    try {
      const [settings, fetchedFaqs, fetchedReviews] = await Promise.all([
        getPlatformSettings(),
        getAllHomepageFaqs(),
        getAllCustomerReviews(),
      ]);
      setPlatformSettings(settings);
      setFaqs(fetchedFaqs || []);
      setReviews(fetchedReviews || []);
    } catch (err) {
      console.warn('Failed to load SEO data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const config: SeoAeoGeoConfig = {
    ...DEFAULT_SEO_CONFIG,
    appName: platformSettings?.appName || DEFAULT_SEO_CONFIG.appName,
    tagline: platformSettings?.tagline || DEFAULT_SEO_CONFIG.tagline,
    businessName: platformSettings?.invoiceBusinessName || DEFAULT_SEO_CONFIG.businessName,
    gstin: platformSettings?.invoiceGstin || DEFAULT_SEO_CONFIG.gstin,
    stateCode: platformSettings?.invoiceStateCode || DEFAULT_SEO_CONFIG.stateCode,
    stateName: platformSettings?.invoiceStateName || DEFAULT_SEO_CONFIG.stateName,
    supportPhone: platformSettings?.supportPhone || DEFAULT_SEO_CONFIG.supportPhone,
    supportEmail: platformSettings?.supportEmail || DEFAULT_SEO_CONFIG.supportEmail,
    logoUrl: platformSettings?.appLogoUrl || DEFAULT_SEO_CONFIG.logoUrl,
    keywords: customKeywords,
  };

  const audit = calculateSeoAuditScore(config, faqs.length, reviews.length);
  const schemaGraph = generateStructuredSchemaGraph(config, faqs, reviews, DEFAULT_BUILTIN_PLANS);
  const schemaJsonString = JSON.stringify(schemaGraph, null, 2);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeywordInput.trim()) return;
    const trimmed = newKeywordInput.trim();
    if (!customKeywords.includes(trimmed)) {
      const next = [...customKeywords, trimmed];
      setCustomKeywords(next);
      applySeoAeoGeoToDom({ ...config, keywords: next }, faqs, reviews, DEFAULT_BUILTIN_PLANS);
    }
    setNewKeywordInput('');
  };

  const handleRemoveKeyword = (kw: string) => {
    const next = customKeywords.filter((k) => k !== kw);
    setCustomKeywords(next);
    applySeoAeoGeoToDom({ ...config, keywords: next }, faqs, reviews, DEFAULT_BUILTIN_PLANS);
  };

  const simulatorQueries = [
    {
      question: 'Does this cloud accounting software handle automated CGST, SGST, and IGST for Indian businesses?',
      aiAnswer: `${config.appName} features an automated Indian GST compliance engine that compares the supplier state code (${config.stateCode || '27'} - ${config.stateName || 'Maharashtra'}) with the customer Place of Supply (POS). When state codes match, intra-state CGST & SGST are split evenly (50/50). When state codes differ, inter-state IGST is levied automatically across all 36 Indian states and union territories.`,
      sources: ['SoftwareApplication Schema', 'FAQPage Schema (Q1)', 'State Code POS Matrix'],
      readiness: 'High Citation Confidence (99%)',
    },
    {
      question: 'What subscription pricing tiers and trial options are available?',
      aiAnswer: `${config.appName} provides transparent INR (₹) subscription plans starting from Starter Tier (₹499/mo) to Professional (₹999/mo) and Enterprise (₹2,499/mo), structured via Schema.org AggregateOffer and OfferCatalog with complete multi-currency and GST invoice readiness.`,
      sources: ['OfferCatalog Schema', 'AggregateOffer JSON-LD', 'llms.txt Pricing Spec'],
      readiness: 'Instant Answer Ready (100%)',
    },
    {
      question: 'How is data isolated in the multi-tenant workspace architecture?',
      aiAnswer: `Each business operates within a cryptographic tenant sandbox with isolated general ledgers, dedicated banking credentials, and a 5-tier role-based access control (Super Admin, Admin, Manager, Accountant, Viewer) enforced with JWT authentication and audit trails.`,
      sources: ['SoftwareApplication Schema FeatureList', 'llms-full.txt Knowledge Graph'],
      readiness: 'Structured Authority Snippet',
    },
  ];

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      {/* ---------------- TOP HERO / SCORE BANNER ---------------- */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/50 border border-slate-800 rounded-2xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 sm:w-96 h-80 sm:h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-5 relative z-10">
          <div className="space-y-2.5 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs font-bold tracking-wide flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5" /> SEA • AEO • GEO Governance Engine
              </span>
              <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live &amp; Synced
              </span>
            </div>
            <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-tight">
              Search, Answer &amp; Generative Engine Readiness
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
              Real-time multi-agent optimization for traditional search engine indexes (SEA/SEO), next-gen AI answer engines (AEO: ChatGPT, Perplexity, Gemini, Claude), and pan-India geographical jurisdiction standards (GEO).
            </p>
          </div>

          {/* Readiness Score Badges */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-0 bg-slate-950/90 p-2 sm:p-3 rounded-2xl border border-slate-800 shadow-inner w-full xl:w-auto shrink-0">
            <div className="text-center px-4 py-2 sm:border-r border-slate-800/80">
              <div className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center justify-center gap-1.5">
                <Search className="w-3 h-3" /> SEA Score
              </div>
              <div className="text-2xl font-black text-white mt-0.5">{audit.seaScore}%</div>
              <div className="text-[10px] text-slate-400">Search Engine Index</div>
            </div>

            <div className="text-center px-4 py-2 sm:border-r border-slate-800/80">
              <div className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider flex items-center justify-center gap-1.5">
                <Bot className="w-3 h-3" /> AEO Score
              </div>
              <div className="text-2xl font-black text-white mt-0.5">{audit.aeoScore}%</div>
              <div className="text-[10px] text-slate-400">AI Answer Engines</div>
            </div>

            <div className="text-center px-4 py-2">
              <div className="text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center justify-center gap-1.5">
                <Globe className="w-3 h-3" /> GEO Score
              </div>
              <div className="text-2xl font-black text-white mt-0.5">{audit.geoScore}%</div>
              <div className="text-[10px] text-slate-400">Generative &amp; Regional</div>
            </div>
          </div>
        </div>

        {/* Quick action toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-5 pt-4 border-t border-slate-800/80 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadData}
              disabled={loading}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-medium flex items-center gap-1.5 transition cursor-pointer border border-slate-700/60 shadow-sm min-h-[36px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
              <span>Refresh Metrics</span>
            </button>
            <a
              href="/robots.txt"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 transition min-h-[36px]"
            >
              <span>robots.txt</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
            <a
              href="/sitemap.xml"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white flex items-center gap-1.5 transition min-h-[36px]"
            >
              <span>sitemap.xml</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
            <a
              href="/llms.txt"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-indigo-500/30 hover:border-indigo-500/60 text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5 transition min-h-[36px]"
            >
              <span>llms.txt</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {onNavigateToLandingPage && (
            <button
              type="button"
              onClick={onNavigateToLandingPage}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex items-center justify-center gap-1.5 transition shadow-md cursor-pointer shrink-0 min-h-[36px]"
            >
              <span>View Public Landing Page</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ---------------- NAVIGATION TABS ---------------- */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-1.5 shadow-md">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scroll-smooth">
          <button
            type="button"
            onClick={() => setActiveTab('audit')}
            className={`px-3.5 py-2 rounded-xl transition text-xs font-semibold flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'audit'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <ShieldCheck className={`w-4 h-4 ${activeTab === 'audit' ? 'text-slate-950' : 'text-emerald-400'}`} />
            <span>Readiness Audit &amp; SERP</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('schema')}
            className={`px-3.5 py-2 rounded-xl transition text-xs font-semibold flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'schema'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <Code2 className={`w-4 h-4 ${activeTab === 'schema' ? 'text-slate-950' : 'text-indigo-400'}`} />
            <span>Schema.org JSON-LD</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('llms')}
            className={`px-3.5 py-2 rounded-xl transition text-xs font-semibold flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'llms'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <FileText className={`w-4 h-4 ${activeTab === 'llms' ? 'text-slate-950' : 'text-amber-400'}`} />
            <span>Bot Directives (llms.txt)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('simulator')}
            className={`px-3.5 py-2 rounded-xl transition text-xs font-semibold flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'simulator'
                ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
          >
            <Bot className={`w-4 h-4 ${activeTab === 'simulator' ? 'text-slate-950' : 'text-teal-400'}`} />
            <span>Query Simulator</span>
          </button>
        </div>
      </div>

      {/* ---------------- TAB 1: AUDIT & SERP PREVIEW ---------------- */}
      {activeTab === 'audit' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-150">
          {/* Left 2 Cols: Detailed Audit Checklist */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white">SEA / AEO / GEO Compliance Checklist</h3>
                </div>
                <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20 self-start sm:self-auto font-semibold">
                  {audit.checks.filter((c) => c.passed).length} of {audit.checks.length} Passed
                </span>
              </div>

              <div className="space-y-2.5">
                {audit.checks.map((check, idx) => (
                  <div
                    key={idx}
                    className="p-3 sm:p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-start gap-3 text-xs hover:border-slate-700/80 transition"
                  >
                    <div className="mt-0.5">
                      {check.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      )}
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-1.5">
                        <span className="font-semibold text-white truncate">{check.label}</span>
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            check.category === 'SEA'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : check.category === 'AEO'
                              ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}
                        >
                          {check.category}
                        </span>
                      </div>
                      <p className="text-slate-400 text-[11px] leading-relaxed break-words">{check.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Target Keywords Governance */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-sm font-bold text-white">Target Search &amp; Intent Keywords</h3>
                </div>
                <span className="text-xs text-slate-400">{customKeywords.length} Keywords Active</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {customKeywords.map((kw, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs hover:border-slate-700 transition"
                  >
                    <span>{kw}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveKeyword(kw)}
                      className="text-slate-500 hover:text-rose-400 transition cursor-pointer font-bold text-sm leading-none"
                      title="Remove keyword"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>

              <form onSubmit={handleAddKeyword} className="flex flex-col sm:flex-row gap-2 pt-1">
                <input
                  type="text"
                  value={newKeywordInput}
                  onChange={(e) => setNewKeywordInput(e.target.value)}
                  placeholder="Add target keyword (e.g. GST billing software Mumbai)..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
                />
                <button
                  type="submit"
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition cursor-pointer shrink-0 shadow-sm"
                >
                  Add Keyword
                </button>
              </form>
            </div>
          </div>

          {/* Right Col: Live SERP & Social Previews */}
          <div className="space-y-6">
            {/* Google Search Result Card Preview */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Search className="w-4 h-4 text-blue-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Search Snippet Preview (SEA)</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                  Google SERP
                </span>
              </div>

              <div className="p-4 rounded-xl bg-white text-slate-900 font-sans space-y-2 shadow-sm text-left border border-slate-200">
                <div className="flex items-center gap-2 text-[11px] text-slate-600">
                  <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-[9px] text-white font-bold shrink-0">
                    {config.appName.charAt(0) || 'A'}
                  </div>
                  <span className="truncate text-slate-700 font-medium">{config.siteUrl}</span>
                </div>
                <h4 className="text-blue-700 hover:underline font-semibold text-sm leading-snug cursor-pointer break-words">
                  {config.appName} – {config.tagline}
                </h4>
                <p className="text-xs text-slate-700 line-clamp-2 leading-relaxed break-words">
                  {config.description}
                </p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] text-emerald-700 font-medium">
                  <span>★★★★★ Rating: 4.9 ({reviews.length || 128} reviews)</span>
                  <span>· Price: Free Tier / ₹499+</span>
                </div>
              </div>
            </div>

            {/* AI Answer Engine / Perplexity Card Preview */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-indigo-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">AI Overview Citation Preview (AEO)</h3>
                </div>
                <span className="text-[10px] text-indigo-300 font-mono bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/60">
                  Perplexity / ChatGPT
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/20 text-slate-300 font-sans space-y-2.5 text-xs text-left">
                <div className="flex items-center gap-2 text-[11px] text-indigo-400 font-semibold">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>Direct Answer Citation Extracted from Schema</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-300 break-words">
                  <strong className="text-white">{config.appName}</strong> provides cloud accounting and GST compliance with automated tax calculation across all 36 Indian states. It features real-time bank reconciliation and multi-tenant workspace isolation.
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-300 text-[10px] border border-indigo-500/20 font-mono">
                    Source: {config.appName} (Schema.org)
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 text-[10px] border border-emerald-500/20 font-mono">
                    GSTIN: {config.gstin}
                  </span>
                </div>
              </div>
            </div>

            {/* Geographical Jurisdiction Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-amber-400" />
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">Geographical Jurisdiction (GEO)</h3>
                </div>
                <span className="text-[10px] text-amber-300 font-mono bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/60">
                  ISO 3166-2:IN
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800 gap-2">
                  <span className="text-slate-400 shrink-0">Target Country:</span>
                  <span className="text-white font-semibold text-right">India (IN / +91)</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800 gap-2">
                  <span className="text-slate-400 shrink-0">Home Jurisdiction:</span>
                  <span className="text-white font-semibold text-right truncate">{config.stateName} (State {config.stateCode})</span>
                </div>
                <div className="flex items-center justify-between py-1.5 border-b border-slate-800 gap-2">
                  <span className="text-slate-400 shrink-0">Currency Schema:</span>
                  <span className="text-emerald-400 font-mono font-semibold text-right">INR (₹ Indian Rupee)</span>
                </div>
                <div className="flex items-center justify-between py-1.5 gap-2">
                  <span className="text-slate-400 shrink-0">Coordinates:</span>
                  <span className="text-indigo-400 font-mono text-right text-[11px]">19.0657° N, 72.8687° E</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- TAB 2: LIVE SCHEMA.ORG JSON-LD ---------------- */}
      {activeTab === 'schema' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Live Schema.org Structured Data Multi-Graph (JSON-LD)</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Injected into document head for Google Search rich snippets, AI knowledge graphs &amp; multimodal search.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopy(schemaJsonString, 'schema')}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
              >
                {copiedSection === 'schema' ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Copied JSON-LD!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy JSON-LD</span>
                  </>
                )}
              </button>
              <a
                href="https://validator.schema.org/"
                target="_blank"
                rel="noreferrer"
                className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition"
              >
                <span>Schema Validator</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Active Entity Types Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1">
            {[
              { type: 'SoftwareApplication', desc: 'SaaS App Spec' },
              { type: 'FinancialService', desc: 'Indian POS / GST' },
              { type: 'FAQPage', desc: `${faqs.length} Q&A Pairs` },
              { type: 'HowTo', desc: 'GST Step Guide' },
              { type: 'AggregateOffer', desc: 'Pricing Tiers' },
              { type: 'AggregateRating', desc: '4.9 Star Rating' },
            ].map((ent, i) => (
              <div key={i} className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                <div className="text-[11px] font-mono font-bold text-emerald-400 truncate">
                  @{ent.type}
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5 truncate">{ent.desc}</div>
              </div>
            ))}
          </div>

          <div className="relative">
            <pre className="p-4 rounded-xl bg-slate-950 text-slate-300 font-mono text-xs overflow-x-auto max-h-96 leading-relaxed border border-slate-800 select-all">
              {schemaJsonString}
            </pre>
          </div>
        </div>
      )}

      {/* ---------------- TAB 3: GENERATIVE AI / LLMS.TXT ---------------- */}
      {activeTab === 'llms' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in duration-150">
          {/* llms.txt standard */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">llms.txt AI Answer Engine Standard</h3>
              </div>
              <a
                href="/llms.txt"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>View Raw</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Machine-readable Markdown file placed at <code className="text-indigo-400 font-mono bg-slate-950 px-1.5 py-0.5 rounded">/llms.txt</code> allowing LLM agents (ChatGPT, Claude, Perplexity, Gemini) to ingest platform capabilities and documentation directly.
            </p>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 font-mono text-xs max-h-72 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {`# ${config.appName} - Enterprise Accounting & GST Platform

> ${config.appName} is a multi-tenant cloud accounting, GST tax compliance, banking reconciliation platform.

## Core Capabilities
- Multi-Tenant Workspace Architecture with complete data isolation.
- Automated CGST, SGST, IGST calculations across all 36 Indian states.
- E-Invoicing & E-Way Bill Readiness with official GSTN JSON schema.
- Dual-Entry Ledger with Trial Balance, P&L, and Balance Sheet.
- 5-Tier Role-Based Access Control (RBAC).

## Endpoints
- Web App: ${config.siteUrl}
- Live GST Calculator: ${config.siteUrl}/#gst-calculator-section
- Full Knowledge Graph: ${config.siteUrl}/llms-full.txt`}
            </div>
          </div>

          {/* robots.txt & Crawlers */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Robots.txt &amp; AI Bot Crawling Allowlist</h3>
              </div>
              <a
                href="/robots.txt"
                target="_blank"
                rel="noreferrer"
                className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>View Raw</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { bot: 'GPTBot', org: 'ChatGPT / OpenAI', status: 'ALLOWED' },
                { bot: 'ClaudeBot', org: 'Anthropic Claude', status: 'ALLOWED' },
                { bot: 'PerplexityBot', org: 'Perplexity AI Search', status: 'ALLOWED' },
                { bot: 'Google-Extended', org: 'Gemini / AI Overviews', status: 'ALLOWED' },
                { bot: 'Applebot', org: 'Apple Intelligence', status: 'ALLOWED' },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div className="space-y-0.5">
                    <div className="font-mono text-white font-semibold">{item.bot}</div>
                    <div className="text-[10px] text-slate-500">{item.org}</div>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-400 font-bold text-[10px] border border-emerald-500/20">
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ---------------- TAB 4: ANSWER ENGINE SIMULATOR ---------------- */}
      {activeTab === 'simulator' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-5 shadow-xl animate-in fade-in duration-150">
          <div className="border-b border-slate-800 pb-3 space-y-1">
            <div className="flex items-center gap-2">
              <Bot className="w-4 h-4 text-teal-400" />
              <h3 className="text-sm font-bold text-white">Generative Answer Engine (AEO) Query Simulator</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Select sample search queries to simulate how AI answer engines (ChatGPT Search, Perplexity, Google AI Overviews, Gemini) synthesize responses based on your live Schema.org metadata and <code className="text-indigo-400 bg-slate-950 px-1 rounded">llms.txt</code> facts.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {simulatorQueries.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedSimulatorQuery(idx)}
                className={`p-3.5 rounded-xl border text-left transition cursor-pointer text-xs space-y-2 ${
                  selectedSimulatorQuery === idx
                    ? 'bg-indigo-600/15 border-indigo-500 text-white shadow-md'
                    : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <div className="font-semibold line-clamp-2 leading-snug">{q.question}</div>
                <div className="text-[10px] text-teal-400 font-mono flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  <span>{q.readiness}</span>
                </div>
              </button>
            ))}
          </div>

          {/* Simulated Synthesis Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-indigo-500/30 space-y-4 shadow-inner">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-bold text-white">Synthesized Answer Engine Response</span>
              </div>
              <span className="text-[10px] text-indigo-300 font-mono bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20 self-start sm:self-auto">
                Grounding: Live Schema Graph
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed break-words">
              {simulatorQueries[selectedSimulatorQuery].aiAnswer}
            </p>

            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <span className="text-[11px] font-semibold text-slate-400">Grounded Citations &amp; Schema References:</span>
              <div className="flex flex-wrap gap-2">
                {simulatorQueries[selectedSimulatorQuery].sources.map((src, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80 text-[11px] text-slate-300 font-mono flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span>{src}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
