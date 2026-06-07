export default function StorvexAppLoader() {
  return (
    <main className="storvex-app-loader" aria-label="Opening Storvex">
      <div className="storvex-app-loader-grid" />

      <section className="storvex-app-loader-card">
        <div className="storvex-app-loader-logo">
          <img src="/storvex_icon.webp" alt="" />
        </div>

        <div className="storvex-app-loader-copy">
          <p>Opening Storvex</p>
          <span>Getting your store workspace ready...</span>
        </div>

        <div className="storvex-loader-orbit" aria-hidden="true">
          <i />
          <i />
          <i />
        </div>

        <div className="storvex-loader-progress" aria-hidden="true">
          <span />
        </div>
      </section>
    </main>
  );
}