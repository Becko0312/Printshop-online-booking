import Link from "next/link";
import Nav from "@/components/Nav";
import { t } from "@/lib/i18n";
import { formatUsd } from "@/lib/pricing";

const bw = Number(process.env.PRICE_BW_CENTS_PER_PAGE ?? 10);
const color = Number(process.env.PRICE_COLOR_CENTS_PER_PAGE ?? 30);

export default function LandingPage() {
  return (
    <>
      <Nav />
      <main>
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-4 pt-16 pb-20 grid md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="chip bg-brand-50 text-brand-700">
              PrintNode × Polar × Улаанбаатар
            </span>
            <h1 className="mt-4 text-4xl md:text-5xl font-bold leading-tight text-slate-900">
              {t.landing.hero1} <br />
              <span className="text-brand-600">{t.landing.hero2}</span>
            </h1>
            <p className="mt-4 text-slate-600 text-lg leading-relaxed">
              {t.landing.heroSub}
            </p>
            <div className="mt-6 flex gap-3">
              <Link href="/auth/signup" className="btn-primary">
                {t.landing.ctaPrimary}
              </Link>
              <Link href="#how" className="btn-secondary">
                {t.landing.ctaSecondary}
              </Link>
            </div>
          </div>
          <div className="card p-6">
            <div className="text-sm text-slate-500">{t.landing.priceTitle}</div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-slate-50 p-4">
                <div className="text-xs text-slate-500">{t.landing.priceBw}</div>
                <div className="text-2xl font-semibold mt-1">
                  {formatUsd(bw)}
                </div>
                <div className="text-xs text-slate-500">/ {t.common.pages}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-4">
                <div className="text-xs text-slate-500">
                  {t.landing.priceColor}
                </div>
                <div className="text-2xl font-semibold mt-1">
                  {formatUsd(color)}
                </div>
                <div className="text-xs text-slate-500">/ {t.common.pages}</div>
              </div>
            </div>
            <p className="mt-4 text-sm text-slate-500">{t.landing.priceSub}</p>
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="bg-white border-y border-slate-200">
          <div className="max-w-6xl mx-auto px-4 py-16 grid md:grid-cols-3 gap-6">
            {[
              [t.landing.step1Title, t.landing.step1Body, "1"],
              [t.landing.step2Title, t.landing.step2Body, "2"],
              [t.landing.step3Title, t.landing.step3Body, "3"],
            ].map(([title, body, n]) => (
              <div key={n} className="card p-6">
                <div className="h-8 w-8 rounded-full bg-brand-500 text-white text-sm flex items-center justify-center">
                  {n}
                </div>
                <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
                <p className="mt-1 text-sm text-slate-600">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Partners */}
        <section className="max-w-6xl mx-auto px-4 py-16">
          <div className="card p-8 md:flex items-center justify-between gap-6">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">
                {t.landing.partnerTitle}
              </h3>
              <p className="mt-2 text-slate-600 max-w-xl">
                {t.landing.partnerBody}
              </p>
            </div>
            <Link href="/auth/signup" className="btn-primary mt-4 md:mt-0">
              {t.landing.ctaPrimary}
            </Link>
          </div>
        </section>

        <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} {t.brand}
        </footer>
      </main>
    </>
  );
}
