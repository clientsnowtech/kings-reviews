'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { usePathname } from 'next/navigation'
import Script from 'next/script'
import {
  DENIED_SIGNALS,
  getConsentSnapshot,
  getServerConsentSnapshot,
  googleConsentSignals,
  subscribeConsent,
} from '@/lib/consent'

const GA_ID = process.env.NEXT_PUBLIC_GA_ID
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID
const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID
const META_PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID

declare global {
  interface Window {
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    clarity?: (...args: unknown[]) => void
    fbq?: (...args: unknown[]) => void
    _fbq?: unknown
  }
}

/**
 * Every third-party tag on the site, behind the same consent record.
 *
 * One rule applied four times: a tag is not on the page until its category is
 * granted, and the moment the category is withdrawn the tag is unmounted *and*
 * told to stop through its own vendor API — unmounting a script tag does not
 * un-run it.
 *
 *   analytics → Google Analytics, Microsoft Clarity
 *   marketing → Google Ads, Meta Pixel
 *
 * Google's two share one gtag.js, so they share one mount and are separated by
 * Consent Mode signals instead: `analytics_storage` follows analytics,
 * `ad_storage` and its two siblings follow marketing. Signals are defaulted to
 * denied and updated in the same breath, which is the order Consent Mode v2
 * asks for — and changing your mind later fires an update rather than needing
 * a reload.
 *
 * Each tag renders only when its own id is set, so any one of them can ship
 * without the others and none of them run on a developer's machine.
 */
export function Analytics() {
  const record = useSyncExternalStore(subscribeConsent, getConsentSnapshot, getServerConsentSnapshot)
  const analytics = record?.analytics === true
  const marketing = record?.marketing === true
  const pathname = usePathname()

  const signals = googleConsentSignals(record ?? null)
  // gtag.js is one library serving both Google tags: it belongs on the page as
  // soon as either category is granted, and Consent Mode decides the rest.
  const wantsGoogle = Boolean((GA_ID && analytics) || (ADS_ID && marketing))

  // Every later change to the choice, pushed to whatever is already loaded. The
  // first grant is carried by the init scripts below, which run before this.
  useEffect(() => {
    window.gtag?.('consent', 'update', googleConsentSignals(record ?? null))
  }, [record])

  // Google also keeps a per-property kill switch, which is the only thing that
  // stops a gtag.js that is already running in the page.
  useEffect(() => {
    if (!GA_ID) return
    ;(window as unknown as Record<string, boolean>)[`ga-disable-${GA_ID}`] = !analytics
  }, [analytics])

  // Clarity's equivalent. `consent` toggles its cookies; `stop` ends the
  // recording outright, which is what a withdrawal actually asks for.
  useEffect(() => {
    if (!CLARITY_ID || !window.clarity) return
    if (analytics) {
      window.clarity('consent')
    } else {
      window.clarity('consent', false)
      window.clarity('stop')
    }
  }, [analytics])

  // Meta's pixel carries its own consent flag, independent of Google's.
  useEffect(() => {
    if (!META_PIXEL_ID || !window.fbq) return
    window.fbq('consent', marketing ? 'grant' : 'revoke')
  }, [marketing])

  // The App Router does not reload the document between pages, so every
  // navigation after the first has to be reported by hand. Clarity follows
  // history changes on its own, so only the two pixel-style tags need telling.
  useEffect(() => {
    if (analytics && GA_ID) window.gtag?.('event', 'page_view', { page_path: pathname })
    if (marketing && META_PIXEL_ID) window.fbq?.('track', 'PageView')
  }, [analytics, marketing, pathname])

  return (
    <>
      {wantsGoogle && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID ?? ADS_ID}`}
            strategy="afterInteractive"
          />
          <Script id="gtag-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('consent', 'default', ${JSON.stringify(DENIED_SIGNALS)});
              gtag('consent', 'update', ${JSON.stringify(signals)});
              ${GA_ID ? `gtag('config', '${GA_ID}', { anonymize_ip: true });` : ''}
              ${ADS_ID ? `gtag('config', '${ADS_ID}');` : ''}
            `}
          </Script>
        </>
      )}

      {CLARITY_ID && analytics && (
        // Microsoft's own snippet, with next/script handling the async loading
        // that the original does by hand.
        <Script id="clarity-init" strategy="afterInteractive">
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${CLARITY_ID}");
            window.clarity('consent');
          `}
        </Script>
      )}

      {META_PIXEL_ID && marketing && (
        // Meta's snippet, with consent revoked before init so nothing is sent in
        // the gap between the library loading and our grant landing.
        <Script id="meta-pixel-init" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];
            t=b.createElement(e);t.async=!0;t.src=v;
            s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('consent', 'revoke');
            fbq('init', '${META_PIXEL_ID}');
            fbq('consent', 'grant');
            fbq('track', 'PageView');
          `}
        </Script>
      )}
    </>
  )
}
