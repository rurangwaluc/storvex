const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders(),
      },
      {
        source: "/app/:path*",
        headers: privateRouteHeaders(),
      },
      ...[
        "/login",
        "/signup",
        "/verify-otp",
        "/confirm-signup",
        "/owner-payment",
        "/forgot-password",
        "/reset-password",
        "/renew",
        "/offline",
      ].map((source) => ({
        source,
        headers: privateRouteHeaders(),
      })),
      {
        source: "/marketplace/account/:path*",
        headers: privateRouteHeaders(),
      },
      {
        source: "/marketplace/orders/:path*",
        headers: trackingRouteHeaders(),
      },
      {
        source: "/manifest.webmanifest",
        headers: [
          {
            key: "Content-Type",
            value: "application/manifest+json; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      {
        source: "/pwa-icon-:size.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/pwa-maskable-icon-512.png",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  async redirects() {
    return [
      {
        source: "/manifest.json",
        destination: "/manifest.webmanifest",
        permanent: true,
      },
    ];
  },
};

function securityHeaders() {
  const isDevelopment =
    process.env.NODE_ENV === "development";

  const scriptSources = [
    "'self'",
    "'unsafe-inline'",
    ...(isDevelopment ? ["'unsafe-eval'"] : []),
  ].join(" ");

  const contentSecurityPolicy = [
    "default-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src ${scriptSources}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https: wss:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "media-src 'self' blob: https:",
    "frame-src 'self'",
    "upgrade-insecure-requests",
  ].join("; ");

  return [
    {
      key: "Content-Security-Policy",
      value: contentSecurityPolicy,
    },
    {
      key: "X-Frame-Options",
      value: "DENY",
    },
    {
      key: "X-Content-Type-Options",
      value: "nosniff",
    },
    {
      key: "Referrer-Policy",
      value: "strict-origin-when-cross-origin",
    },
    {
      key: "Permissions-Policy",
      value: [
        "camera=()",
        "microphone=()",
        "geolocation=()",
        "payment=()",
        "usb=()",
        "browsing-topics=()",
      ].join(", "),
    },
  ];
}

function privateRouteHeaders() {
  return [
    {
      key: "X-Robots-Tag",
      value: "noindex, nofollow, noarchive",
    },
  ];
}

function trackingRouteHeaders() {
  return [
    ...privateRouteHeaders(),
    {
      key: "Referrer-Policy",
      value: "no-referrer",
    },
    {
      key: "Cache-Control",
      value: "private, no-store",
    },
  ];
}

export default nextConfig;
