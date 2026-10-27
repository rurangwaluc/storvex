"use client";

import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import "./StorvexFinalCTA.css";

const chartBars = [27, 40, 54, 45, 68, 84, 98];

export default function StorvexFinalCTA() {
  return (
    <section className="svx-grow" aria-labelledby="svx-grow-title">
      <div className="svx-grow-shell">
        <div className="svx-grow-panel">
          <div className="svx-grow-copy">
            <h2 id="svx-grow-title">Ready to Grow<br />Your Business with Storvex?</h2>
            <p>Join thousands of retailers running smarter with Storvex.</p>
            <div className="svx-grow-actions">
              <Link href="/signup" className="svx-grow-primary">
                Get Started Free <ArrowRight size={18} strokeWidth={2.2} aria-hidden="true" />
              </Link>
              <a href="#how-it-works" className="svx-grow-secondary">
                See How It Works <Play size={17} strokeWidth={2} aria-hidden="true" />
              </a>
            </div>
          </div>

          <svg className="svx-grow-swoosh" viewBox="0 0 300 145" fill="none" aria-hidden="true" preserveAspectRatio="xMidYMid meet">
            <path d="M285 47C247 38 228 56 211 84C197 108 164 105 151 84C140 67 134 57 123 64C105 75 123 103 92 102C63 101 52 70 30 80" stroke="#FF5961" strokeWidth="2.3" strokeLinecap="round" />
            <path d="M42 70L29 80L41 88" stroke="#FF5961" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>

          <div className="svx-grow-visual" aria-hidden="true">
            <svg className="svx-grow-art" viewBox="0 0 560 300" xmlns="http://www.w3.org/2000/svg" role="img" aria-hidden="true">
              <path d="M355 10L487 2L550 81L554 209L467 290L332 272L261 171L295 68Z" fill="#E4F449" />
              <g className="svx-grow-sales-art" transform="translate(25 55) rotate(-10 174 104)">
                <rect x="0" y="0" width="350" height="210" rx="17" fill="#FFFFFF" />
                <rect x="1" y="1" width="348" height="208" rx="16" fill="none" stroke="#EBEDF0" strokeWidth="2" />
                <text x="25" y="40" fontSize="18" fill="#647187" fontWeight="600" fontFamily="Arial,sans-serif">Total Sales</text>
                <text x="25" y="75" fontSize="27" fill="#111827" fontWeight="800" fontFamily="Arial,sans-serif">RWF 4,820,300</text>
                <path d="M27 101L36 91L44 97L57 79" fill="none" stroke="#12B768" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                <text x="67" y="98" fontSize="17" fill="#13AC63" fontWeight="800" fontFamily="Arial,sans-serif">+12%</text>
                <line x1="25" y1="183" x2="320" y2="183" stroke="#E7EDF5" strokeWidth="2" />
                {chartBars.map((height, index) => (
                  <rect key={index} x={37 + index * 40} y={181 - height} width="23" height={height} rx="2.5" fill={index % 3 === 0 ? "#168DF7" : "#269FF8"} />
                ))}
              </g>
              <g className="svx-grow-products-art" transform="translate(382 27) rotate(9 81 115)">
                <rect x="0" y="0" width="155" height="224" rx="17" fill="#FFFFFF" />
                <rect x="1" y="1" width="153" height="222" rx="16" fill="none" stroke="#E9EDF2" strokeWidth="2" />
                <rect x="55" y="20" width="46" height="47" rx="11" fill="#FFF0EF" />
                <path d="M68 36H87L84 53H71L68 36Z" fill="#F04E55" />
                <path d="M73 35C73 27 82 27 82 35" stroke="#F04E55" strokeWidth="3" fill="none" strokeLinecap="round" />
                <text x="20" y="100" fontSize="17" fill="#707B8D" fontWeight="600" fontFamily="Arial,sans-serif">Products</text>
                <text x="20" y="135" fontSize="32" fill="#141824" fontWeight="800" fontFamily="Arial,sans-serif">2,430</text>
                <path d="M22 161L31 151L37 156L49 145" fill="none" stroke="#12B768" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                <text x="58" y="158" fontSize="18" fill="#12A85E" fontWeight="800" fontFamily="Arial,sans-serif">+8%</text>
              </g>
            </svg>
          </div>
        </div>
      </div>
    </section>
  );
}
