import { Redis } from "@upstash/redis";
import { notFound } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Review {
  rating: number;
  text?: { text: string };
  authorAttribution?: { displayName: string };
  relativePublishTimeDescription?: string;
}

interface SiteData {
  business: {
    displayName: { text: string };
    formattedAddress: string;
    nationalPhoneNumber?: string;
    websiteUri?: string;
    rating?: number;
    userRatingCount?: number;
    types?: string[];
    reviews?: Review[];
    regularOpeningHours?: { weekdayDescriptions?: string[] };
  };
  content: {
    headline: string;
    subheadline: string;
    about: string;
    services: string[];
    cta: string;
    tagline: string;
  };
  generatedAt?: string;
}

// ─── Theme System ─────────────────────────────────────────────────────────────

interface Theme {
  category: string;
  heroBg: string;
  heroText: string;
  heroSubText: string;
  heroBtnBg: string;
  heroBtnText: string;
  heroBtnHover: string;
  sectionBg: string;
  cardBg: string;
  cardBorder: string;
  headingFont: string;
  accentColor: string;
  servicesLabel: string;
  ctaSection: string;
  footerBg: string;
  footerText: string;
  heroBadgeBg: string;
  heroBadgeText: string;
  icon: string;
}

const THEMES: Record<string, Theme> = {
  cafe: {
    category: "cafe",
    heroBg: "bg-gradient-to-br from-stone-800 via-amber-900 to-stone-700",
    heroText: "text-white",
    heroSubText: "text-amber-100",
    heroBtnBg: "bg-amber-500",
    heroBtnText: "text-stone-900",
    heroBtnHover: "hover:bg-amber-400",
    sectionBg: "bg-stone-50",
    cardBg: "bg-white",
    cardBorder: "border-amber-100",
    headingFont: "font-serif",
    accentColor: "text-amber-700",
    servicesLabel: "What's Brewing",
    ctaSection: "Come In",
    footerBg: "bg-stone-900",
    footerText: "text-stone-400",
    heroBadgeBg: "bg-amber-400/20",
    heroBadgeText: "text-amber-300",
    icon: "☕",
  },
  restaurant: {
    category: "restaurant",
    heroBg: "bg-gradient-to-br from-orange-700 via-red-600 to-rose-700",
    heroText: "text-white",
    heroSubText: "text-orange-100",
    heroBtnBg: "bg-amber-400",
    heroBtnText: "text-orange-900",
    heroBtnHover: "hover:bg-amber-300",
    sectionBg: "bg-amber-50",
    cardBg: "bg-white",
    cardBorder: "border-orange-100",
    headingFont: "font-serif",
    accentColor: "text-orange-600",
    servicesLabel: "Our Menu Highlights",
    ctaSection: "Visit Us",
    footerBg: "bg-stone-900",
    footerText: "text-stone-400",
    heroBadgeBg: "bg-amber-400/20",
    heroBadgeText: "text-amber-300",
    icon: "🍽️",
  },
  health: {
    category: "health",
    heroBg: "bg-gradient-to-br from-teal-600 via-cyan-600 to-sky-700",
    heroText: "text-white",
    heroSubText: "text-teal-100",
    heroBtnBg: "bg-white",
    heroBtnText: "text-teal-700",
    heroBtnHover: "hover:bg-teal-50",
    sectionBg: "bg-teal-50",
    cardBg: "bg-white",
    cardBorder: "border-teal-100",
    headingFont: "font-sans",
    accentColor: "text-teal-600",
    servicesLabel: "Our Services",
    ctaSection: "Book an Appointment",
    footerBg: "bg-slate-900",
    footerText: "text-slate-400",
    heroBadgeBg: "bg-white/20",
    heroBadgeText: "text-white",
    icon: "🏥",
  },
  beauty: {
    category: "beauty",
    heroBg: "bg-gradient-to-br from-pink-500 via-rose-500 to-fuchsia-600",
    heroText: "text-white",
    heroSubText: "text-pink-100",
    heroBtnBg: "bg-white",
    heroBtnText: "text-rose-600",
    heroBtnHover: "hover:bg-pink-50",
    sectionBg: "bg-pink-50",
    cardBg: "bg-white",
    cardBorder: "border-pink-100",
    headingFont: "font-sans",
    accentColor: "text-rose-500",
    servicesLabel: "Our Treatments",
    ctaSection: "Book Your Session",
    footerBg: "bg-stone-900",
    footerText: "text-stone-400",
    heroBadgeBg: "bg-white/20",
    heroBadgeText: "text-pink-100",
    icon: "✂️",
  },
  fitness: {
    category: "fitness",
    heroBg: "bg-gradient-to-br from-gray-900 via-zinc-800 to-gray-900",
    heroText: "text-white",
    heroSubText: "text-zinc-300",
    heroBtnBg: "bg-yellow-400",
    heroBtnText: "text-gray-900",
    heroBtnHover: "hover:bg-yellow-300",
    sectionBg: "bg-zinc-50",
    cardBg: "bg-white",
    cardBorder: "border-zinc-200",
    headingFont: "font-sans",
    accentColor: "text-yellow-500",
    servicesLabel: "Programs & Classes",
    ctaSection: "Start Training",
    footerBg: "bg-gray-950",
    footerText: "text-gray-500",
    heroBadgeBg: "bg-yellow-400/20",
    heroBadgeText: "text-yellow-400",
    icon: "💪",
  },
  auto: {
    category: "auto",
    heroBg: "bg-gradient-to-br from-slate-800 via-gray-700 to-slate-900",
    heroText: "text-white",
    heroSubText: "text-slate-300",
    heroBtnBg: "bg-blue-500",
    heroBtnText: "text-white",
    heroBtnHover: "hover:bg-blue-400",
    sectionBg: "bg-slate-50",
    cardBg: "bg-white",
    cardBorder: "border-slate-200",
    headingFont: "font-sans",
    accentColor: "text-blue-600",
    servicesLabel: "Our Services",
    ctaSection: "Schedule Service",
    footerBg: "bg-slate-950",
    footerText: "text-slate-500",
    heroBadgeBg: "bg-blue-500/20",
    heroBadgeText: "text-blue-300",
    icon: "🔧",
  },
  home_services: {
    category: "home_services",
    heroBg: "bg-gradient-to-br from-green-700 via-emerald-600 to-teal-700",
    heroText: "text-white",
    heroSubText: "text-green-100",
    heroBtnBg: "bg-white",
    heroBtnText: "text-emerald-700",
    heroBtnHover: "hover:bg-green-50",
    sectionBg: "bg-emerald-50",
    cardBg: "bg-white",
    cardBorder: "border-emerald-100",
    headingFont: "font-sans",
    accentColor: "text-emerald-600",
    servicesLabel: "Services We Provide",
    ctaSection: "Get a Free Quote",
    footerBg: "bg-stone-900",
    footerText: "text-stone-400",
    heroBadgeBg: "bg-white/20",
    heroBadgeText: "text-green-100",
    icon: "🏠",
  },
  retail: {
    category: "retail",
    heroBg: "bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700",
    heroText: "text-white",
    heroSubText: "text-violet-100",
    heroBtnBg: "bg-white",
    heroBtnText: "text-violet-700",
    heroBtnHover: "hover:bg-violet-50",
    sectionBg: "bg-violet-50",
    cardBg: "bg-white",
    cardBorder: "border-violet-100",
    headingFont: "font-sans",
    accentColor: "text-violet-600",
    servicesLabel: "What We Carry",
    ctaSection: "Find Us",
    footerBg: "bg-gray-900",
    footerText: "text-gray-400",
    heroBadgeBg: "bg-white/20",
    heroBadgeText: "text-violet-200",
    icon: "🛍️",
  },
  professional: {
    category: "professional",
    heroBg: "bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900",
    heroText: "text-white",
    heroSubText: "text-blue-200",
    heroBtnBg: "bg-white",
    heroBtnText: "text-blue-900",
    heroBtnHover: "hover:bg-blue-50",
    sectionBg: "bg-slate-50",
    cardBg: "bg-white",
    cardBorder: "border-blue-100",
    headingFont: "font-serif",
    accentColor: "text-blue-700",
    servicesLabel: "Our Practice Areas",
    ctaSection: "Schedule a Consultation",
    footerBg: "bg-blue-950",
    footerText: "text-blue-400",
    heroBadgeBg: "bg-white/10",
    heroBadgeText: "text-blue-200",
    icon: "⚖️",
  },
  default: {
    category: "default",
    heroBg: "bg-gradient-to-br from-indigo-600 to-blue-700",
    heroText: "text-white",
    heroSubText: "text-indigo-100",
    heroBtnBg: "bg-white",
    heroBtnText: "text-indigo-600",
    heroBtnHover: "hover:bg-indigo-50",
    sectionBg: "bg-gray-50",
    cardBg: "bg-white",
    cardBorder: "border-gray-100",
    headingFont: "font-sans",
    accentColor: "text-indigo-600",
    servicesLabel: "What We Offer",
    ctaSection: "Get In Touch",
    footerBg: "bg-gray-900",
    footerText: "text-gray-400",
    heroBadgeBg: "bg-white/20",
    heroBadgeText: "text-indigo-200",
    icon: "✨",
  },
};

function getTheme(types: string[] = []): Theme {
  const typeSet = new Set(types.map((t) => t.toLowerCase()));

  if (typeSet.has("cafe") || typeSet.has("coffee_shop") || typeSet.has("coffee")) return THEMES.cafe;
  if (typeSet.has("restaurant") || typeSet.has("food") || typeSet.has("meal_takeaway") || typeSet.has("meal_delivery") || typeSet.has("bar") || typeSet.has("bakery")) return THEMES.restaurant;
  if (typeSet.has("doctor") || typeSet.has("hospital") || typeSet.has("dentist") || typeSet.has("health") || typeSet.has("pharmacy") || typeSet.has("physiotherapist") || typeSet.has("veterinary_care")) return THEMES.health;
  if (typeSet.has("beauty_salon") || typeSet.has("hair_care") || typeSet.has("spa") || typeSet.has("nail_salon") || typeSet.has("hair_salon")) return THEMES.beauty;
  if (typeSet.has("gym") || typeSet.has("fitness_center") || typeSet.has("sports_club")) return THEMES.fitness;
  if (typeSet.has("car_repair") || typeSet.has("car_dealer") || typeSet.has("car_wash") || typeSet.has("gas_station")) return THEMES.auto;
  if (typeSet.has("plumber") || typeSet.has("electrician") || typeSet.has("roofing_contractor") || typeSet.has("painter") || typeSet.has("moving_company") || typeSet.has("locksmith") || typeSet.has("pest_control") || typeSet.has("hvac_contractor")) return THEMES.home_services;
  if (typeSet.has("clothing_store") || typeSet.has("shoe_store") || typeSet.has("jewelry_store") || typeSet.has("department_store") || typeSet.has("store")) return THEMES.retail;
  if (typeSet.has("lawyer") || typeSet.has("accounting") || typeSet.has("finance") || typeSet.has("insurance_agency") || typeSet.has("real_estate_agency")) return THEMES.professional;

  return THEMES.default;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
});

export default async function SitePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let raw;
  try {
    raw = await redis.get(`site:${slug}`);
  } catch (err) {
    console.error("Redis error:", err);
    return <div className="p-8 text-red-500">Error connecting to database. Please try again.</div>;
  }

  if (!raw) {
    console.error("No data found for slug:", slug);
    return <div className="p-8 text-gray-500">Site not found for slug: {slug}</div>;
  }

  const siteData: SiteData = typeof raw === "string" ? JSON.parse(raw) : raw as SiteData;
  const { business, content } = siteData;
  const theme = getTheme(business.types);

  return (
    <div className="min-h-screen bg-white font-sans">

      {/* ── Hero ── */}
      <section className={`${theme.heroBg} ${theme.heroText} relative overflow-hidden`}>
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/5 pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 rounded-full bg-white/5 pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-6 py-28 text-center">
          <span className={`inline-block ${theme.heroBadgeBg} ${theme.heroBadgeText} text-xs font-semibold uppercase tracking-widest px-4 py-1.5 rounded-full mb-6`}>
            {theme.icon}&nbsp;&nbsp;{content.tagline}
          </span>
          <h1 className={`text-5xl md:text-6xl font-bold mb-5 leading-tight ${theme.headingFont}`}>
            {content.headline}
          </h1>
          <p className={`text-xl ${theme.heroSubText} mb-10 max-w-2xl mx-auto leading-relaxed`}>
            {content.subheadline}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <a
              href={`tel:${business.nationalPhoneNumber}`}
              className={`${theme.heroBtnBg} ${theme.heroBtnText} ${theme.heroBtnHover} px-10 py-4 rounded-full font-semibold text-lg transition shadow-lg`}
            >
              {content.cta}
            </a>
            {business.nationalPhoneNumber && (
              <a href={`tel:${business.nationalPhoneNumber}`} className="text-white/80 hover:text-white text-base underline underline-offset-4 transition">
                {business.nationalPhoneNumber}
              </a>
            )}
          </div>
          {business.rating && (
            <div className="mt-10 inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm px-5 py-2 rounded-full">
              <span className="text-yellow-300 font-bold">{business.rating} ★</span>
              <span className={`${theme.heroSubText} text-sm`}>{business.userRatingCount?.toLocaleString()} reviews</span>
            </div>
          )}
        </div>
      </section>

      {/* ── About ── */}
      <section className="py-24 px-6 max-w-3xl mx-auto text-center">
        <p className={`text-xs uppercase tracking-widest font-semibold ${theme.accentColor} mb-3`}>Who We Are</p>
        <h2 className={`text-4xl font-bold text-gray-900 mb-6 ${theme.headingFont}`}>{business.displayName?.text}</h2>
        <p className="text-gray-600 text-lg leading-relaxed">{content.about}</p>
      </section>

      {/* ── Services ── */}
      <section className={`${theme.sectionBg} py-24 px-6`}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <p className={`text-xs uppercase tracking-widest font-semibold ${theme.accentColor} mb-3`}>{theme.servicesLabel}</p>
            <h2 className={`text-4xl font-bold text-gray-900 ${theme.headingFont}`}>Built for You</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {content.services.map((service, i) => (
              <div key={i} className={`${theme.cardBg} border ${theme.cardBorder} rounded-2xl p-7 text-center shadow-sm hover:shadow-md transition`}>
                <div className="text-3xl mb-3">{theme.icon}</div>
                <p className="font-semibold text-gray-800 text-base leading-snug">{service}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Hours ── */}
      {business.regularOpeningHours?.weekdayDescriptions && (
        <section className="py-24 px-6 max-w-3xl mx-auto text-center">
          <p className={`text-xs uppercase tracking-widest font-semibold ${theme.accentColor} mb-3`}>Hours</p>
          <h2 className={`text-4xl font-bold text-gray-900 mb-10 ${theme.headingFont}`}>When We're Open</h2>
          <div className="inline-block text-left space-y-2">
            {business.regularOpeningHours.weekdayDescriptions.map((day, i) => {
              const [name, hours] = day.split(": ");
              return (
                <div key={i} className="flex gap-6 text-gray-600">
                  <span className="w-28 font-medium text-gray-900">{name}</span>
                  <span>{hours}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Reviews ── */}
      {business.reviews && business.reviews.length > 0 && (
        <section className={`${theme.sectionBg} py-24 px-6`}>
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-14">
              <p className={`text-xs uppercase tracking-widest font-semibold ${theme.accentColor} mb-3`}>What People Say</p>
              <h2 className={`text-4xl font-bold text-gray-900 ${theme.headingFont}`}>Customer Reviews</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {business.reviews.slice(0, 3).map((review, i) => (
                <div key={i} className={`${theme.cardBg} border ${theme.cardBorder} rounded-2xl p-6 shadow-sm`}>
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <span key={s} className={s < review.rating ? "text-yellow-400" : "text-gray-200"}>★</span>
                    ))}
                  </div>
                  {review.text?.text && (
                    <p className="text-gray-600 text-sm leading-relaxed mb-4">
                      "{review.text.text.slice(0, 220)}{review.text.text.length > 220 ? "…" : ""}"
                    </p>
                  )}
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${theme.heroBg}`}>
                      {review.authorAttribution?.displayName?.[0] ?? "?"}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{review.authorAttribution?.displayName ?? "Anonymous"}</p>
                      {review.relativePublishTimeDescription && (
                        <p className="text-xs text-gray-400">{review.relativePublishTimeDescription}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Contact ── */}
      <section className="py-24 px-6 max-w-3xl mx-auto text-center">
        <p className={`text-xs uppercase tracking-widest font-semibold ${theme.accentColor} mb-3`}>Contact</p>
        <h2 className={`text-4xl font-bold text-gray-900 mb-10 ${theme.headingFont}`}>{theme.ctaSection}</h2>
        <div className="space-y-4 text-gray-600 text-lg">
          <p className="flex items-center justify-center gap-2"><span>📍</span> {business.formattedAddress}</p>
          {business.nationalPhoneNumber && (
            <p className="flex items-center justify-center gap-2">
              <span>📞</span>
              <a href={`tel:${business.nationalPhoneNumber}`} className={`${theme.accentColor} hover:underline font-medium`}>{business.nationalPhoneNumber}</a>
            </p>
          )}
          {business.websiteUri && (
            <p className="flex items-center justify-center gap-2">
              <span>🌐</span>
              <a href={business.websiteUri} className={`${theme.accentColor} hover:underline font-medium`} target="_blank" rel="noopener noreferrer">{business.websiteUri}</a>
            </p>
          )}
        </div>
        <div className="mt-12">
          <a href={`tel:${business.nationalPhoneNumber}`} className={`${theme.heroBg} ${theme.heroText} px-10 py-4 rounded-full font-semibold text-lg shadow-lg hover:opacity-90 transition inline-block`}>
            {content.cta}
          </a>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className={`${theme.footerBg} ${theme.footerText} py-10 text-center text-sm`}>
        <p className="font-semibold text-base text-white/80 mb-1">{business.displayName?.text}</p>
        <p>{business.formattedAddress}</p>
        <p className="mt-4 text-xs opacity-40">Generated by GMB to Website</p>
      </footer>

    </div>
  );
}
