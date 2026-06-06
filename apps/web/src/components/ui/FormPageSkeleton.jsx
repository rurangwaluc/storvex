function cx(...xs) {
  return xs.filter(Boolean).join(" ");
}

function block(className = "") {
  return (
    <div
      className={cx(
        "animate-pulse rounded-[20px] bg-[var(--color-surface-2)]",
        className
      )}
    />
  );
}

function softPanel(className = "") {
  return cx("rounded-[22px] bg-[var(--color-surface-2)]", className);
}

function pageCard(className = "") {
  return cx("rounded-[28px] bg-[var(--color-card)] shadow-[var(--shadow-card)]", className);
}

function FieldSkeleton({ wide = false, tall = false }) {
  return (
    <div className={cx("space-y-2.5", wide ? "md:col-span-2" : "")}>
      {block("h-4 w-28 rounded-full")}
      {block(tall ? "h-24 w-full rounded-2xl" : "h-12 w-full rounded-2xl")}
    </div>
  );
}

function SummaryCardSkeleton() {
  return (
    <div className={cx(softPanel(), "p-4 shadow-[var(--shadow-soft)]")}>
      {block("h-3.5 w-24 rounded-full")}
      {block("mt-3 h-8 w-32 rounded-full")}
    </div>
  );
}

function SideDisciplineItemSkeleton() {
  return <div className={cx(softPanel(), "h-[74px] w-full")} />;
}

export default function FormPageSkeleton({
  titleWidth = "w-40",
  fieldPairs = 5,
  showSideCard = false,
}) {
  return (
    <div className="space-y-6">
      <section className="space-y-5">
        <div>
          {block(`h-12 ${titleWidth} rounded-[18px]`)}
          {block("mt-3 h-4 w-[min(760px,100%)] rounded-full")}
          {block("mt-2 h-4 w-[min(620px,88%)] rounded-full")}
        </div>

        <section className="grid gap-4 lg:grid-cols-2">
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
        </section>
      </section>

      <div
        className={cx(
          "grid grid-cols-1 gap-6",
          showSideCard ? "xl:grid-cols-[minmax(0,1fr)_360px]" : ""
        )}
      >
        <div className="space-y-5">
          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            {block("h-3.5 w-20 rounded-full")}
            {block("mt-3 h-9 w-56 rounded-[16px]")}
            {block("mt-3 h-4 w-[min(560px,100%)] rounded-full")}
            {block("mt-2 h-4 w-[min(470px,88%)] rounded-full")}

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <FieldSkeleton wide />
              {Array.from({ length: Math.max(fieldPairs - 1, 2) }).map((_, i) => (
                <FieldSkeleton key={i} />
              ))}
            </div>
          </section>

          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            {block("h-3.5 w-20 rounded-full")}
            {block("mt-3 h-9 w-48 rounded-[16px]")}
            {block("mt-3 h-4 w-[min(560px,100%)] rounded-full")}
            {block("mt-2 h-4 w-[min(460px,84%)] rounded-full")}

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className={cx(softPanel(), "p-4")}>
                {block("h-5 w-36 rounded-full")}
                {block("mt-3 h-4 w-full rounded-full")}
                {block("mt-2 h-4 w-4/5 rounded-full")}
              </div>

              <div className={cx(softPanel(), "p-4")}>
                {block("h-5 w-40 rounded-full")}
                {block("mt-3 h-4 w-full rounded-full")}
                {block("mt-2 h-4 w-3/4 rounded-full")}
              </div>

              <FieldSkeleton wide />
            </div>
          </section>

          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            {block("h-3.5 w-20 rounded-full")}
            {block("mt-3 h-9 w-44 rounded-[16px]")}
            {block("mt-3 h-4 w-[min(540px,100%)] rounded-full")}
            {block("mt-2 h-4 w-[min(430px,80%)] rounded-full")}

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <FieldSkeleton />
              <FieldSkeleton />
            </div>
          </section>

          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            {block("h-3.5 w-20 rounded-full")}
            {block("mt-3 h-9 w-56 rounded-[16px]")}
            {block("mt-3 h-4 w-[min(560px,100%)] rounded-full")}
            {block("mt-2 h-4 w-[min(470px,84%)] rounded-full")}

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
              <FieldSkeleton />
              <FieldSkeleton />
            </div>
          </section>

          <section className={cx(pageCard(), "p-5 sm:p-6")}>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              {block("h-11 w-full rounded-2xl sm:w-28")}
              {block("h-11 w-full rounded-2xl sm:w-44")}
            </div>
          </section>
        </div>

        {showSideCard ? (
          <aside className="space-y-5">
            <section className={cx(pageCard(), "p-5 sm:p-6")}>
              {block("h-3.5 w-20 rounded-full")}
              {block("mt-3 h-9 w-48 rounded-[16px]")}
              {block("mt-3 h-4 w-full rounded-full")}
              {block("mt-2 h-4 w-5/6 rounded-full")}

              <div className="mt-6 space-y-4">
                <div className={cx(softPanel(), "p-5")}>
                  {block("h-6 w-40 rounded-full")}
                  {block("mt-2 h-4 w-32 rounded-full")}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {block("h-7 w-24 rounded-full")}
                    {block("h-7 w-28 rounded-full")}
                    {block("h-7 w-24 rounded-full")}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <SummaryCardSkeleton />
                  <SummaryCardSkeleton />
                  <SummaryCardSkeleton />
                  <SummaryCardSkeleton />
                </div>
              </div>
            </section>

            <section className={cx(pageCard(), "p-5 sm:p-6")}>
              {block("h-3.5 w-20 rounded-full")}
              {block("mt-3 h-9 w-44 rounded-[16px]")}
              {block("mt-3 h-4 w-full rounded-full")}
              {block("mt-2 h-4 w-5/6 rounded-full")}

              <div className="mt-5 space-y-3">
                <SideDisciplineItemSkeleton />
                <SideDisciplineItemSkeleton />
                <SideDisciplineItemSkeleton />
                <SideDisciplineItemSkeleton />
                <SideDisciplineItemSkeleton />
              </div>
            </section>
          </aside>
        ) : null}
      </div>
    </div>
  );
}