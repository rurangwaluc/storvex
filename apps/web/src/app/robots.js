export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/pricing",
          "/marketplace",
          "/marketplace/",
          "/solutions/",
        ],
        disallow: [
          "/app/",
          "/login",
          "/signup",
          "/verify-otp",
          "/confirm-signup",
          "/owner-payment",
          "/forgot-password",
          "/reset-password",
          "/renew",
          "/marketplace/account/",
          "/marketplace/orders/",
        ],
      },
    ],
    sitemap: "https://www.storvex.rw/sitemap.xml",
    host: "https://www.storvex.rw",
  };
}
