import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== 'production'

/**
 * Content Security Policy.
 *
 * Framing is controlled through `frame-ancestors` rather than X-Frame-Options,
 * because the badge has to stay embeddable on customer sites and XFO has no
 * "allow any origin" value to override a site-wide rule with. Every browser
 * that matters honours frame-ancestors, and the badge routes are excluded from
 * this header entirely (see the `source` below) so they keep the permissive
 * policy they already set on their own responses.
 *
 * `unsafe-inline` on scripts is unavoidable without a nonce, and a nonce means
 * middleware on every request — expensive on this host. The policy still shuts
 * out injected *external* scripts, plugin content, base-tag hijacking and
 * cross-origin form posts, which is where the real risk sits.
 */
const csp = [
  "default-src 'self'",
  // Every host below belongs to a tag that only loads once its consent category
  // has been granted (see components/analytics.tsx). Allowing it is not loading it.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://www.googletagmanager.com https://www.googleadservices.com https://www.clarity.ms https://*.clarity.ms https://connect.facebook.net`,
  "style-src 'self' 'unsafe-inline'",
  // uploads are local, but OAuth avatars come from Google's CDN — and a pixel
  // that cannot run JavaScript falls back to an image request
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  // Clarity ships its recordings to *.clarity.ms and syncs an id with c.bing.com;
  // Ads conversions land on doubleclick, the Meta pixel on facebook.com
  "connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://*.googletagmanager.com https://*.clarity.ms https://c.bing.com https://googleads.g.doubleclick.net https://www.google.com https://connect.facebook.net https://www.facebook.com",
  "frame-src 'self' https://accounts.google.com",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  'upgrade-insecure-requests',
].join('; ')

const baseHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // nothing on the site asks for these, so no injected script can either
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=()' },
]

const nextConfig: NextConfig = {
  // `next build` empties its output directory before it starts, and the live
  // server keeps serving from that directory the whole time — so a deploy used
  // to take the stylesheet down for the length of the build. The deploy script
  // builds into a staging directory and swaps it in with a mv instead.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  // The production host caps threads and memory hard enough that tsc is killed
  // mid-build and seven page-data workers hit pthread_create. Types are checked
  // separately (`npx tsc --noEmit`), so the deploy build only compiles.
  typescript: { ignoreBuildErrors: true },
  experimental: {
    cpus: 1,
    workerThreads: false,
  },
  // free version disclosure, no upside
  poweredByHeader: false,

  async headers() {
    const hsts = isDev
      ? []
      : [
          // browsers only honour this over https, so shipping it in dev is inert
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ]

    return [
      { source: '/:path*', headers: [...baseHeaders, ...hsts] },
      {
        // everything except the two routes that exist to be embedded elsewhere
        source: '/:path((?!embed/|api/badge/).*)',
        headers: [{ key: 'Content-Security-Policy', value: csp }],
      },
    ]
  },
};

export default nextConfig;
