const { useState, useEffect, useRef } = React;

/* ---------- Data (mirrors the Lovable homepage) ---------- */

const programs = [
  { id: "bootcamp", title: "BOOTCAMP", description: "High-energy group sessions that build strength, burn fat, and keep you accountable. Bootcamp delivers structure and energy in a supportive environment.", image: "assets/lov/bootcamp-group.webp", href: "programs/bootcamp.html" },
  { id: "mens-club", title: "MEN'S CLUB", description: "For men who want more than a gym. Get a clear plan, expert coaching, and a crew of blokes who hold each other accountable.", image: "assets/lov/mens-club-group.webp", href: "programs/mens.html" },
  { id: "womens-club", title: "WOMEN'S CLUB", description: "Build real strength and confidence in a supportive, welcoming space. Expert guidance in smaller groups tailored to your goals.", image: "assets/lov/womens-club-card.webp", href: "programs/womens.html" },
  { id: "young-knights", title: "YOUNG KNIGHTS", description: "Building physical strength, resilience, and confidence in teens through structured coaching that sets them up for success in life.", image: "assets/lov/young-knights-group-sm.jpg", href: "https://www.youngknights.com.au", external: true },
];

const programNav = [
  { label: "Bootcamp", href: "programs/bootcamp.html" },
  { label: "Men's Club", href: "programs/mens.html" },
  { label: "Women's Club", href: "programs/womens.html" },
  { label: "Young Knights", href: "https://www.youngknights.com.au", external: true },
];

const transformationsRow1 = [
  "assets/lov/results/real-7kg-woman-v2.jpg",
  "assets/lov/results/real-11kg-man.jpg",
  "assets/lov/results/real-6kg-woman.jpg",
  "assets/lov/results/real-12kg-man.jpg",
  "assets/lov/results/result-14kg-woman-sm.jpg",
];
const transformationsRow2 = [
  "assets/lov/results/real-20kg-man.jpg",
  "assets/lov/results/result-7kg-woman-sm.jpg",
  "assets/lov/results/real-10kg-man.jpg",
  "assets/lov/results/result-22kg-man-sm.jpg",
  "assets/lov/results/real-11kg-6weeks.jpg",
  "assets/lov/results/real-7kg-6weeks.jpg",
];

const pillars = [
  { num: "01", title: "Real coaching", body: "So you're not guessing what to do every time you train." },
  { num: "02", title: "Clear structure", body: "So fitness fits your life instead of falling apart when life gets busy." },
  { num: "03", title: "Accountability", body: "Because motivation comes and goes, but systems keep you moving." },
  { num: "04", title: "The right environment", body: "A place where you feel supported — not judged or left behind." },
];

const steps = [
  { num: "01", title: "Get in touch", body: "Drop us a message and a coach will reach out to find a time that suits you." },
  { num: "02", title: "Meet your coach", body: "We learn about your goals, where you're at now, and what's held you back in the past." },
  { num: "03", title: "Train with the crew", body: "Jump into a coached session, feel the energy, experience the support for yourself." },
  { num: "04", title: "Start your transformation", body: "We map out the right plan so you build momentum and finally make it stick." },
];

const compareRows = [
  ["Coach-led every session", true, false, true, "Some"],
  ["Clear plan & structure", true, false, true, "Partial"],
  ["Built for beginners & 30+", true, false, "Depends", "Rarely"],
  ["Real accountability", true, false, "Some", false],
  ["Supportive environment", true, "Rarely", "Partial", "Some"],
  ["Affordable long-term", true, true, false, true],
  ["Built for consistency", true, false, "If sustainable", "Rarely"],
];

const schedule = [
  { time: "4:50 AM", mon: true, tue: true, wed: true, thu: true, fri: true },
  { time: "5:30 AM", sat: true },
  { time: "5:40 AM", mon: true, tue: true, wed: true, thu: true, fri: true },
  { time: "6:30 AM", mon: true, tue: true, wed: true, thu: true, fri: true, sat: true },
  { time: "7:00 AM", sun: true },
  { time: "7:30 AM", mon: true, wed: true, fri: true, sat: true },
  { time: "8:30 AM", sat: true },
  { time: "9:15 AM", sat: true },
  { time: "9:30 AM", mon: true, tue: true, wed: true, thu: true, fri: true },
  { time: "4:00 PM", mon: true, tue: true, wed: true, thu: true, fri: true },
  { time: "4:50 PM", mon: true, tue: true, wed: true, thu: true, fri: true },
  { time: "5:40 PM", mon: true, tue: true, wed: true, thu: true, fri: true },
  { time: "6:30 PM", mon: true, tue: true, wed: true, thu: true },
];

const dayLabels = [
  ["mon", "Monday"], ["tue", "Tuesday"], ["wed", "Wednesday"],
  ["thu", "Thursday"], ["fri", "Friday"], ["sat", "Saturday"], ["sun", "Sunday"],
];

const googleReviewsRow1 = [
  { name: "Anna Wilson", date: "2 weeks ago", text: "This place is so much more than a gym — it's a proper community. The coaches actually know your name, your goals, and what you did last session. I've made real friends here and I genuinely look forward to training. Highly recommend it to anyone in Lawnton who's tired of feeling invisible at a regular gym." },
  { name: "Teresa Santos", date: "1 month ago", text: "The coaches made me feel comfortable from day one — no judgement, no ego, just genuine support. I'd been putting off joining a gym for years because I felt out of place. Three months in I'm stronger, fitter and honestly happier. I've never felt so supported in my fitness journey." },
  { name: "Natalie Bridge", date: "3 weeks ago", text: "Couldn't recommend more highly. The structure of the programs is exactly what I was missing from the big 24hr gyms — every session has a plan, a coach, and progression. I'm finally seeing real results instead of guessing my way through workouts and going nowhere." },
  { name: "Emily Mathews", date: "2 months ago", text: "One of the best decisions I've ever made. If you're over 30 and need proper coaching that respects your body and your busy life, this is the place. The programming is intelligent, the coaches are genuinely qualified, and the vibe is welcoming. Worth every cent." },
  { name: "Abigail Dela Cruz", date: "4 months ago", text: "I gained strength, confidence and friends. I used to be terrified of walking into a gym alone — the team here completely changed that for me. Six months in I'm lifting weights I never thought possible and I actually feel like I belong somewhere." },
  { name: "Paul Welding", date: "5 months ago", text: "Everyone here genuinely supports each other — coaches and members. It's rare to find a place that actually cares about your progress and notices when you don't show up. Knight Fitness has the best community I've been part of in 20 years of training." },
];

const googleReviewsRow2 = [
  { name: "Sarah McKenzie", date: "1 week ago", text: "I lost 12kg in 4 months and gained so much confidence I barely recognise myself. The coaches push you when you need it but always have your back. Weekly check-ins were the missing piece for me — finally a gym that actually keeps you accountable, not just a workout and goodbye." },
  { name: "Mark Thompson", date: "3 weeks ago", text: "Tried four other gyms before this one and none came close. Knight Fitness actually coaches you through every single session — technique, scaling, progression, the lot. After three months I'm lifting heavier than I have in a decade and zero injuries. The difference is real." },
  { name: "Lisa Kowalski", date: "2 months ago", text: "After 10 years of starting and stopping every January, I'm finally consistent. The accountability is what makes the difference — coaches notice when you miss a session and the crew genuinely wants you there. I haven't missed a week in five months. Life-changing." },
  { name: "James Hartley", date: "6 days ago", text: "Joined Men's Club six months ago at 42. Down 15kg, stronger than I've been in 20 years, and my back pain is completely gone. The structure, the small groups, the no-nonsense coaching — it's everything I wish I'd found a decade ago. Best money I've ever spent." },
  { name: "Rachel Moore", date: "1 month ago", text: "The Women's Club is genuinely incredible. Best results of my life at 42 and the other women here have become some of my closest friends. Small groups means the coach actually watches your form and the programming is built around real bodies and real lives. Couldn't recommend more." },
  { name: "Daniel Curtis", date: "2 weeks ago", text: "No ego, no posers, no one hogging the squat rack — just everyday people getting better together. The coaches are sharp, the programming is smart, and the community is the real deal. Best gym in north Brisbane, hands down. Wish I'd joined years ago." },
];

const faqs = [
  { q: "Do I need to be fit to start?", a: "Absolutely not. Our programs are designed for all fitness levels. Most members start with zero gym experience. Our coaches will meet you where you're at and scale everything to your level." },
  { q: "What happens when I get in touch?", a: "A coach will reach out to learn about your goals and help you figure out which program is the right fit. No pressure, no hard sell." },
  { q: "How long are the sessions?", a: "Every session runs 45 minutes — warm-up, the main workout, cool-down. Efficient and easy to fit into your day." },
  { q: "What's the difference between Bootcamp and Semi-Private?", a: "Bootcamp is high-energy team training (up to 15), perfect if you love group energy. Semi-Private (Men's/Women's Club) is smaller groups (6–8) with more personalised programming and accountability." },
  { q: "Can I cancel anytime?", a: "Yes. We don't lock you into long contracts. Most members stay because they love it, not because they're trapped. We ask for 28 days' notice if you need to cancel." },
  { q: "What if I've tried gyms before and quit?", a: "That's exactly why we're different. Most people quit because they lack accountability, coaching, or community. We provide all three — that's why our retention rate is so high." },
  { q: "How much does it cost?", a: "Pricing varies by program — get in touch and we'll talk through what fits your budget and schedule." },
];

/* ---------- Small helpers ---------- */

function GoogleLogo() {
  return (
    <svg className="google-logo" viewBox="0 0 24 24" width="20" height="20">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function getInitials(name) {
  return name.split(" ").filter(Boolean).map((n) => n[0]).slice(0, 2).join("").toUpperCase();
}

/* Live GoHighLevel contact form embed */
function GhlContactForm({ light = false }) {
  const [loaded, setLoaded] = useState(false);
  const [height, setHeight] = useState(640);

  useEffect(() => {
    if (!document.querySelector('script[src="https://link.msgsndr.com/js/form_embed.js"]')) {
      const s = document.createElement("script");
      s.src = "https://link.msgsndr.com/js/form_embed.js";
      s.async = true;
      document.body.appendChild(s);
    }
    const onMessage = (e) => {
      const data = e.data;
      if (!data) return;
      const h = typeof data === "object" && (data.height || (data.payload && data.payload.height))
        ? Number(data.height || data.payload.height) : null;
      if (h && h > 200 && h < 4000) setHeight(h);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  return (
    <div className={`ghl-form-card ${light ? "ghl-light" : ""}`}>
      <div className="ghl-form-frame-wrap" style={{ minHeight: loaded ? 0 : height }}>
        {!loaded && (
          <div className="ghl-form-skeleton" aria-hidden="true">
            <div className="ghl-skel-row" style={{ width: "40%" }} />
            <div className="ghl-skel-input" />
            <div className="ghl-skel-row" style={{ width: "30%" }} />
            <div className="ghl-skel-input" />
            <div className="ghl-skel-row" style={{ width: "35%" }} />
            <div className="ghl-skel-input" style={{ height: 120 }} />
            <div className="ghl-skel-button" />
          </div>
        )}
        <iframe
          src="https://api.leadconnectorhq.com/widget/form/cRJglov44iSE5XqhpcpI"
          style={{ width: "100%", height: height, minHeight: 540, border: "none", borderRadius: 12, display: "block", opacity: loaded ? 1 : 0, transition: "opacity 280ms ease, height 220ms ease" }}
          id="inline-cRJglov44iSE5XqhpcpI"
          data-layout="{'id':'INLINE'}"
          data-trigger-type="alwaysShow"
          data-trigger-value=""
          data-activation-type="alwaysActivated"
          data-activation-value=""
          data-deactivation-type="neverDeactivate"
          data-deactivation-value=""
          data-form-name="Contact Us Form Lawnton"
          data-height={String(height)}
          data-layout-iframe-id="inline-cRJglov44iSE5XqhpcpI"
          data-form-id="cRJglov44iSE5XqhpcpI"
          title="Contact Us Form Lawnton"
          scrolling="no"
          onLoad={() => setLoaded(true)}
        />
      </div>
      <div className="ghl-form-foot">
        <span className="ghl-dot" /> Secure form · We reply within 1 business day
      </div>
    </div>
  );
}

/* ---------- Main page ---------- */

function AppContent() {
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileNavOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileNavOpen]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 100);
    window.addEventListener("scroll", onScroll);
    onScroll();

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) e.target.classList.add("visible"); });
    }, { threshold: 0.15 });
    document.querySelectorAll(".stat-item, .program-card, .google-review, .section-header").forEach((el) => observer.observe(el));

    return () => { window.removeEventListener("scroll", onScroll); observer.disconnect(); };
  }, []);

  const cellValue = (v) => (v === true ? "✓" : v === false ? "—" : v);
  const cellClass = (v) => (v === true ? "yes" : v === false ? "no" : "");
  const cellRender = (v) => <td className={cellClass(v)}>{cellValue(v)}</td>;

  const closeNav = () => setMobileNavOpen(false);

  return (
    <div>
      {/* NAV */}
      <nav className={`nav-wrapper ${scrolled ? "scrolled" : ""}`} id="main-nav">
        <div className="nav-container">
          <a href="#top" aria-label="Knight Fitness Lawnton home" className="nav-logo">
            <img loading="eager" decoding="async" src={scrolled ? "assets/lov/logo-dark.webp" : "assets/lov/logo-light.webp"} alt="Knight Fitness Lawnton" className="logo" />
          </a>
          <div className="nav-links">
            <div className="nav-dropdown">
              <a href="programs/index.html" className="nav-dropdown-trigger" aria-haspopup="true">
                Programs
                <svg className="nav-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
              </a>
              <div className="nav-dropdown-menu" role="menu">
                {programNav.map((p) => (
                  <a key={p.href} href={p.href} role="menuitem" target={p.external ? "_blank" : undefined} rel={p.external ? "noopener noreferrer" : undefined}>{p.label}</a>
                ))}
                <a href="programs/index.html" role="menuitem" className="nav-dropdown-all">All programs →</a>
              </div>
            </div>
            <a href="#schedule">Schedule</a>
            <a href="#results">Results</a>
            <a href="about.html">About &amp; Coaches</a>
            <a className="nav-cta" href="contact.html">Contact us</a>
          </div>
          <button type="button" className="nav-toggle" aria-label={mobileNavOpen ? "Close menu" : "Open menu"} aria-expanded={mobileNavOpen} onClick={() => setMobileNavOpen((v) => !v)}>
            <span /><span /><span />
          </button>
        </div>
      </nav>

      <div className={`mobile-nav ${mobileNavOpen ? "open" : ""}`} onClick={closeNav}>
        <div className="mobile-nav-panel" onClick={(e) => e.stopPropagation()}>
          <a href="programs/index.html" onClick={closeNav}>Programs</a>
          <div className="mobile-subnav">
            {programNav.map((p) => (
              <a key={p.href} href={p.href} onClick={closeNav} target={p.external ? "_blank" : undefined} rel={p.external ? "noopener noreferrer" : undefined}>{p.label}</a>
            ))}
          </div>
          <a href="#schedule" onClick={closeNav}>Schedule</a>
          <a href="#results" onClick={closeNav}>Results</a>
          <a href="about.html" onClick={closeNav}>About &amp; Coaches</a>
          <a className="nav-cta" href="contact.html" onClick={closeNav}>Contact us</a>
        </div>
      </div>

      {/* HERO */}
      <section className="hero-fullbleed" id="top">
        <div className="hero-bg">
          <img loading="eager" fetchpriority="high" decoding="async" src="assets/lov/hero.webp" alt="Knight Fitness Lawnton community" />
        </div>
        <div className="hero-overlay" />
        <div className="hero-content-wrapper hero-grid">
          <div className="hero-text">
            <div className="hero-rating">
              <span className="hero-stars" aria-hidden="true">★★★★★</span>
              <span className="hero-rating-text">5.0 · 350+ Google reviews from real Lawnton locals</span>
            </div>
            <div className="hero-eyebrow">664 Gympie Road, Lawnton QLD</div>
            <h1 className="hero-headline">STRONGER<br />EVERY SESSION.<br />TOGETHER.</h1>
            <p className="hero-subheadline">
              Coach-led sessions, real accountability, and a community of 350+ Lawnton locals who'll
              actually look forward to seeing you. No judgement, no guesswork — just a place you'll
              keep showing up to.
            </p>
            <div className="trust-strip">
              <div className="trust-item">No Lock-In Contracts</div>
              <div className="trust-item">Coach-Led Sessions</div>
              <div className="trust-item">Real Community</div>
              <div className="trust-item">Proven Results</div>
            </div>
            <div className="hero-cta-row">
              <a href="#contact" className="hero-cta-primary">Contact us<ArrowIcon /></a>
              <a href="tel:+61452519877" className="hero-cta-secondary">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.37 1.9.72 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.35 1.85.59 2.81.72A2 2 0 0 1 22 16.92z" />
                </svg>
                Call 0452 519 877
              </a>
            </div>
            <div className="hero-cta-microcopy">60-second booking · No card required · Reply by SMS within an hour</div>
          </div>

          <div className="hero-form-card" id="get-in-touch">
            <div className="hero-form-eyebrow">No Pressure · No Contracts</div>
            <h2 className="hero-form-title">GET IN TOUCH</h2>
            <p className="hero-form-sub">Drop us a message and a coach will reach out to learn about your goals and find the right fit.</p>
            <GhlContactForm light />
          </div>
        </div>
      </section>

      {/* STATS */}
      <div className="stats-diagonal">
        <div className="stats-diagonal-inner">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-value">2000+</div>
              <div className="stat-label">Lives Changed</div>
              <div className="stat-description">Since 2017</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">9+</div>
              <div className="stat-label">Years Coaching</div>
              <div className="stat-description">Lawnton locals since 2017</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">350+</div>
              <div className="stat-label">5-Star Google Reviews</div>
              <div className="stat-description">From real North Brisbane locals</div>
            </div>
          </div>
        </div>
      </div>

      {/* WHY / 30+ */}
      <section id="why" className="section" style={{ background: "white" }}>
        <div className="container">
          <div className="section-header">
            <div className="section-eyebrow">BUILT FOR MEN &amp; WOMEN 30+</div>
            <h2 className="section-title">YOU DON'T NEED MORE MOTIVATION.<br />YOU NEED A BETTER SYSTEM.</h2>
            <p className="section-subtitle">Most people don't struggle because they don't care. They struggle because they join places that give them no structure, no guidance, and no support once life gets busy.</p>
          </div>
          <div className="pillars-grid">
            {pillars.map((p) => (
              <div key={p.num} className="pillar">
                <div className="num">{p.num}</div>
                <h4>{p.title}</h4>
                <p>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROGRAMS */}
      <section id="programs" className="section" style={{ background: "var(--kf-gray)" }}>
        <div className="container">
          <div className="section-header">
            <div className="section-eyebrow">WHAT WE OFFER</div>
            <h2 className="section-title">FIND YOUR PROGRAM</h2>
            <p className="section-subtitle">Every program is coach-led, beginner-friendly, and designed for real people with real lives.</p>
          </div>
          <div className="programs-grid">
            {programs.map((program, i) => (
              <div key={program.id} className="program-card" style={{ animationDelay: `${i * 0.15}s` }}>
                <div className="program-image">
                  <img loading="lazy" decoding="async" src={program.image} alt={program.title} />
                </div>
                <div className="program-content">
                  <h3 className="program-title">{program.title}</h3>
                  <p className="program-description">{program.description}</p>
                  <a href={program.href} className="program-cta program-cta--ghost" style={{ fontFamily: "Lato, sans-serif" }} target={program.external ? "_blank" : undefined} rel={program.external ? "noopener noreferrer" : undefined}>
                    Learn more <span>→</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="section" style={{ background: "white" }}>
        <div className="container">
          <div className="section-header">
            <div className="section-eyebrow">WHY KNIGHT FITNESS WORKS BETTER</div>
            <h2 className="section-title">MOST OPTIONS GIVE YOU PIECES.<br />WE BUILT THE FULL SYSTEM.</h2>
            <p className="section-subtitle">The reason people stay stuck is simple — most options are missing something. Here's how Knight Fitness compares.</p>
          </div>
          <div className="compare-wrap compare-desktop">
            <table className="compare-table">
              <thead>
                <tr>
                  <th>What matters</th>
                  <th className="highlight">Knight Fitness</th>
                  <th>24hr Gym</th>
                  <th>Personal Trainer</th>
                  <th>Group Classes</th>
                </tr>
              </thead>
              <tbody>
                {compareRows.map((row, i) => (
                  <tr key={i}>
                    <td>{row[0]}</td>
                    <td className="col-kf">{cellValue(row[1])}</td>
                    {cellRender(row[2])}
                    {cellRender(row[3])}
                    {cellRender(row[4])}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="compare-mobile">
            {compareRows.map((row, i) => (
              <div key={i} className="compare-mobile-card">
                <div className="compare-mobile-title">{row[0]}</div>
                <div className="compare-mobile-grid">
                  <div className="compare-mobile-item kf">
                    <span className="compare-mobile-label">Knight Fitness</span>
                    <span className={`compare-mobile-value ${cellClass(row[1])}`}>{cellValue(row[1])}</span>
                  </div>
                  <div className="compare-mobile-item">
                    <span className="compare-mobile-label">24hr Gym</span>
                    <span className={`compare-mobile-value ${cellClass(row[2])}`}>{cellValue(row[2])}</span>
                  </div>
                  <div className="compare-mobile-item">
                    <span className="compare-mobile-label">Personal Trainer</span>
                    <span className={`compare-mobile-value ${cellClass(row[3])}`}>{cellValue(row[3])}</span>
                  </div>
                  <div className="compare-mobile-item">
                    <span className="compare-mobile-label">Group Classes</span>
                    <span className={`compare-mobile-value ${cellClass(row[4])}`}>{cellValue(row[4])}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* RESULTS BAR */}
      <section className="results-bar">
        <div className="results-bar-inner">
          <h3>WHAT THE AVERAGE 12-MONTH MEMBER LOOKS LIKE</h3>
          <p className="results-bar-sub">Numbers from members who showed up consistently over a year. No cherry-picking.</p>
          <div className="results-grid">
            <div className="result-stat"><div className="result-stat-num">8.4kg</div><div className="result-stat-label">Average fat lost</div><div className="result-stat-sub">12 months in</div></div>
            <div className="result-stat"><div className="result-stat-num">3.2×</div><div className="result-stat-label">Strength gained</div><div className="result-stat-sub">Avg deadlift increase</div></div>
            <div className="result-stat"><div className="result-stat-num">3.6</div><div className="result-stat-label">Sessions per week</div><div className="result-stat-sub">Average attendance</div></div>
            <div className="result-stat"><div className="result-stat-num">87%</div><div className="result-stat-label">Still training</div><div className="result-stat-sub">After 12 months</div></div>
          </div>
        </div>
      </section>

      {/* TRANSFORMATIONS */}
      <section id="results" className="section" style={{ background: "var(--kf-gray)" }}>
        <div className="container">
          <div className="section-header">
            <div className="section-eyebrow">MEMBER RESULTS</div>
            <h2 className="section-title">REAL LOCALS. REAL RESULTS.</h2>
            <p className="section-subtitle">Members who showed up consistently and trusted the process.</p>
          </div>
          <div className="transformations-marquee">
            <div className="transformations-track">
              {[...transformationsRow1, ...transformationsRow1].map((src, i) => (
                <div key={`row1-${i}`} className="transform-card">
                  <img loading="lazy" decoding="async" src={src} alt={`Knight Fitness member result ${(i % transformationsRow1.length) + 1}`} />
                </div>
              ))}
            </div>
          </div>
          <div className="transformations-marquee transformations-marquee--reverse">
            <div className="transformations-track">
              {[...transformationsRow2, ...transformationsRow2].map((src, i) => (
                <div key={`row2-${i}`} className="transform-card">
                  <img loading="lazy" decoding="async" src={src} alt={`Knight Fitness member result ${(i % transformationsRow2.length) + 1}`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="section" style={{ background: "white" }}>
        <div className="container">
          <div className="section-header">
            <div className="section-eyebrow">SIMPLE PROCESS</div>
            <h2 className="section-title">HOW IT WORKS</h2>
            <p className="section-subtitle">Four simple steps between you and a stronger, fitter, more confident version of yourself.</p>
          </div>
          <div className="steps-grid">
            {steps.map((s) => (
              <div key={s.num} className="step-card">
                <div className="step-num">{s.num}</div>
                <h4>{s.title}</h4>
                <p>{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SCHEDULE */}
      <section id="schedule" className="section" style={{ background: "var(--kf-gray)" }}>
        <div className="container">
          <div className="section-header">
            <div className="section-eyebrow">WEEKLY TIMETABLE</div>
            <h2 className="section-title">CLASS SCHEDULE</h2>
            <p className="section-subtitle">Weekday times stay the same Monday to Friday, so it's easy to lock training into your routine.</p>
          </div>
          {(() => {
            const WD = [["mon", "Mon"], ["tue", "Tue"], ["wed", "Wed"], ["thu", "Thu"], ["fri", "Fri"]];
            const isPM = (t) => t.includes("PM");
            const weekdayTag = (row) => {
              const idxs = WD.map(([k], i) => (row[k] ? i : -1)).filter((i) => i >= 0);
              if (idxs.length === 5) return null;
              const contiguous = idxs.every((v, i) => i === 0 || v === idxs[i - 1] + 1);
              if (contiguous && idxs.length > 1) return `${WD[idxs[0]][1]}–${WD[idxs[idxs.length - 1]][1]} only`;
              return idxs.map((i) => WD[i][1]).join(", ") + " only";
            };
            const weekdayRows = schedule.filter((r) => WD.some(([k]) => r[k]));
            const wdMorning = weekdayRows.filter((r) => !isPM(r.time));
            const wdAfternoon = weekdayRows.filter((r) => isPM(r.time));
            const satTimes = schedule.filter((r) => r.sat).map((r) => r.time);
            const sunTimes = schedule.filter((r) => r.sun).map((r) => r.time);

            const Chip = ({ time, tag }) => (
              <div className={`sched2-chip ${tag ? "" : "no-tag"}`}>
                <span className="sched2-chip-time">{time}</span>
                {tag && <span className="sched2-chip-tag">{tag}</span>}
              </div>
            );

            return (
              <div className="sched2">
                <div className="sched2-card sched2-card--wide">
                  <div className="sched2-head">
                    <div className="sched2-day">Monday – Friday</div>
                    <div className="sched2-sub">Same times every weekday</div>
                  </div>
                  <div className="sched2-group">
                    <div className="sched2-group-label">Mornings</div>
                    <div className="sched2-chips">
                      {wdMorning.map((r) => <Chip key={`m-${r.time}`} time={r.time} tag={weekdayTag(r)} />)}
                    </div>
                  </div>
                  <div className="sched2-group">
                    <div className="sched2-group-label">Afternoons &amp; Evenings</div>
                    <div className="sched2-chips">
                      {wdAfternoon.map((r) => <Chip key={`a-${r.time}`} time={r.time} tag={weekdayTag(r)} />)}
                    </div>
                  </div>
                </div>

                <div className="sched2-card">
                  <div className="sched2-head">
                    <div className="sched2-day">Weekend</div>
                    <div className="sched2-sub">Mornings only</div>
                  </div>
                  <div className="sched2-group">
                    <div className="sched2-group-label">Saturday</div>
                    <div className="sched2-chips">
                      {satTimes.map((t) => <Chip key={`sat-${t}`} time={t} />)}
                    </div>
                  </div>
                  <div className="sched2-group">
                    <div className="sched2-group-label">Sunday</div>
                    <div className="sched2-chips">
                      {sunTimes.map((t) => <Chip key={`sun-${t}`} time={t} />)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
          <div style={{ textAlign: "center", marginTop: "2rem", fontSize: "0.875rem", color: "var(--kf-gray-dark)" }}>
            All sessions are coach-led from start to finish · Scaled to your level
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section className="section" style={{ background: "white" }}>
        <div className="container">
          <div className="section-header">
            <div className="section-eyebrow">350+ 5★ REVIEWS</div>
            <h2 className="section-title">WHAT LAWNTON LOCALS SAY</h2>
            <p className="section-subtitle">Real reviews from real members on Google.</p>
            <div className="reviews-summary">
              <GoogleLogo />
              <div>
                <div className="reviews-summary-score">5.0 <span className="reviews-summary-stars">★★★★★</span></div>
                <div className="reviews-summary-meta">Based on 350+ verified Google reviews</div>
              </div>
            </div>
          </div>
        </div>
        <div className="reviews-marquee">
          {[googleReviewsRow1, googleReviewsRow2].map((row, rowIdx) => (
            <div key={rowIdx} className={`marquee-track ${rowIdx === 1 ? "reverse" : ""}`}>
              {[...row, ...row].map((review, i) => (
                <div key={i} className="google-review">
                  <div className="review-header">
                    <div className="review-avatar" aria-label={review.name} role="img">{getInitials(review.name)}</div>
                    <div style={{ flex: 1 }}>
                      <div className="review-info">
                        <div className="review-name">{review.name}</div>
                        <div className="review-stars" aria-label="5 out of 5 stars">★★★★★</div>
                        <div className="review-date">{review.date}</div>
                      </div>
                    </div>
                    <GoogleLogo />
                  </div>
                  <p className="review-text">{review.text}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="section" style={{ background: "var(--kf-gray)" }}>
        <div className="container">
          <div className="section-header">
            <div className="section-eyebrow">GOT QUESTIONS?</div>
            <h2 className="section-title">FREQUENTLY ASKED</h2>
            <p className="section-subtitle">Everything you need to know before getting started.</p>
          </div>
          <div className="faq-container">
            {faqs.map((faq, i) => (
              <div key={i} className={`faq-item ${openFaq === i ? "open" : ""}`}>
                <div className="faq-question" onClick={() => setOpenFaq(openFaq === i ? null : i)}>
                  {faq.q}
                  <span className="faq-toggle">+</span>
                </div>
                <div className="faq-answer"><div className="faq-answer-content">{faq.a}</div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section id="contact" className="section" style={{ background: "var(--kf-gray)" }}>
        <div className="container">
          <div className="section-header">
            <div className="section-eyebrow">GET IN TOUCH</div>
            <h2 className="section-title">DROP US A LINE</h2>
            <p className="section-subtitle">Our team of knowledgeable, experienced coaches are standing by to assist you. To learn more about how we can help you get in shape, contact us now.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "3rem", maxWidth: 1100, margin: "0 auto" }} className="contact-grid">
            <div className="contact-form-wrap">
              <div style={{ marginBottom: "1.25rem" }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: "1.6rem", letterSpacing: "0.04em", marginBottom: "0.4rem" }}>SEND US A MESSAGE</div>
                <p style={{ color: "var(--kf-gray-dark)", fontSize: "0.95rem", lineHeight: 1.55 }}>Whether you have a question, need support, or just want to chat about where you're at — we're here to listen.</p>
              </div>
              <GhlContactForm light />
            </div>
            <div className="contact-info">
              <div className="contact-info-item"><div className="contact-info-label">Address</div><div className="contact-info-value">664 Gympie Road<br />Lawnton QLD 4501</div></div>
              <div className="contact-info-item"><div className="contact-info-label">Phone</div><div className="contact-info-value"><a href="tel:+61452519877">0452 519 877</a></div></div>
              <div className="contact-info-item"><div className="contact-info-label">Email</div><div className="contact-info-value"><a href="mailto:info@knightfitness.com.au">info@knightfitness.com.au</a></div></div>
              <div className="contact-info-item"><div className="contact-info-label">Hours</div><div className="contact-info-value">Mon–Fri: 4:50am–7:30pm<br />Sat: 5:30am–10:15am<br />Sun: 7:00am–8:00am</div></div>
            </div>
          </div>
          <div style={{ borderRadius: "1rem", overflow: "hidden", height: 380, maxWidth: 1100, margin: "3rem auto 0" }}>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3546.0465593740924!2d152.97728867623912!3d-27.280436876426462!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x6b93e4334336c93f%3A0xc0d5929d28761a2!2s664%20Gympie%20Rd%2C%20Lawnton%20QLD%204501!5e0!3m2!1sen!2sau!4v1713680000000!5m2!1sen!2sau"
              width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" title="Knight Fitness Lawnton location" />
          </div>
        </div>
      </section>

      {/* CLOSER */}
      <section className="closer">
        <div className="closer-inner">
          <div className="section-eyebrow" style={{ color: "var(--kf-red)" }}>START TODAY</div>
          <h2>THIS TIME,<br />DO IT PROPERLY.</h2>
          <p>You don't need another program you'll quit in 3 weeks. You need coaching, structure, and people who actually give a damn. Come in, try a session, see why so many people in Lawnton are finally sticking to it.</p>
          <a className="cta-primary" href="#contact">Contact us<ArrowIcon /></a>
          <p className="micro">No pressure. No contracts. Just a starting point.</p>
        </div>
      </section>

      {/* FOOTER (with accreditations band folded into the top) */}
      <footer>
        <div className="container">
          <div className="footer-trust" aria-label="Accreditations and reviews">
            <a className="trust-reviews" href="https://www.google.com/search?q=Knight+Fitness+Lawnton+reviews" target="_blank" rel="noopener noreferrer" aria-label="Read our Google reviews">
              <div className="trust-reviews-google" aria-hidden="true">
                <span style={{ color: "#4285F4" }}>G</span><span style={{ color: "#EA4335" }}>o</span><span style={{ color: "#FBBC05" }}>o</span><span style={{ color: "#4285F4" }}>g</span><span style={{ color: "#34A853" }}>l</span><span style={{ color: "#EA4335" }}>e</span>
                <span style={{ color: "rgba(255,255,255,0.55)", marginLeft: "0.4rem", fontWeight: 500 }}>Reviews</span>
              </div>
              <div className="trust-reviews-rating">
                <div className="trust-stars" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <svg key={i} viewBox="0 0 24 24" width="20" height="20" fill="#FBBC05"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  ))}
                </div>
                <strong>5.0</strong>
                <span className="trust-reviews-count">350+ reviews</span>
              </div>
              <span className="trust-reviews-cta">Read reviews →</span>
            </a>
            <ul className="trust-creds">
              <li className="trust-cred">
                <svg className="trust-cred-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L4 6v6c0 5 3.5 9.5 8 10 4.5-.5 8-5 8-10V6l-8-4z" /><path d="M9 12l2 2 4-4" /></svg>
                <div><strong>AUSactive</strong><span>Registered Business</span></div>
              </li>
              <li className="trust-cred">
                <svg className="trust-cred-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14" /><circle cx="12" cy="12" r="10" /></svg>
                <div><strong>First Aid &amp; CPR</strong><span>All coaches certified</span></div>
              </li>
              <li className="trust-cred">
                <svg className="trust-cred-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-12V5l-8-3-8 3v5c0 8 8 12 8 12z" /></svg>
                <div><strong>Fully Insured</strong><span>Public liability cover</span></div>
              </li>
              <li className="trust-cred">
                <svg className="trust-cred-icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10L12 3 2 10l10 7 10-7z" /><path d="M6 12v5c0 1 3 3 6 3s6-2 6-3v-5" /></svg>
                <div><strong>Cert III &amp; IV</strong><span>Qualified coaching staff</span></div>
              </li>
            </ul>
          </div>
          <div className="footer-grid">
            <div className="footer-col">
              <img loading="lazy" decoding="async" src="assets/lov/logo-light.webp" alt="Knight Fitness" style={{ height: 40, marginBottom: "1rem" }} />
              <p style={{ marginBottom: "1rem" }}>Real coaching, real accountability, real community for Lawnton locals.</p>
              <div className="footer-socials" style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
                <a href="https://www.instagram.com/knightfitnesslawnton/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">Instagram</a>
                <a href="https://www.facebook.com/knightfitnesslawnton" target="_blank" rel="noopener noreferrer" aria-label="Facebook">Facebook</a>
              </div>
            </div>
            <div className="footer-col">
              <h4>Quick Links</h4>
              <a href="#programs">Programs</a>
              <a href="#schedule">Schedule</a>
              <a href="#results">Results</a>
              <a href="about.html">About &amp; Coaches</a>
              <a href="contact.html">Contact</a>
              <a href="reviews.html">Reviews</a>
              <a href="#faq">FAQ</a>
            </div>
            <div className="footer-col">
              <h4>Programs</h4>
              <a href="programs/bootcamp.html">Bootcamp</a>
              <a href="programs/mens.html">Men's Club</a>
              <a href="programs/womens.html">Women's Club</a>
              <a href="https://www.youngknights.com.au" target="_blank" rel="noopener noreferrer">Young Knights</a>
            </div>
            <div className="footer-col">
              <h4>Visit Us</h4>
              <p><a href="https://www.google.com/maps/search/?api=1&query=Knight+Fitness+Lawnton+664+Gympie+Road" target="_blank" rel="noopener noreferrer">664 Gympie Road<br />Lawnton QLD 4501</a></p>
              <p><a href="tel:+61452519877">0452 519 877</a></p>
              <p><a href="mailto:info@knightfitness.com.au">info@knightfitness.com.au</a></p>
            </div>
            <div className="footer-col">
              <h4>Opening Hours</h4>
              <p style={{ margin: 0 }}>Mon – Thu</p>
              <p style={{ marginTop: 0 }}>4:50am – 7:15pm</p>
              <p style={{ margin: 0 }}>Friday</p>
              <p style={{ marginTop: 0 }}>4:50am – 6:25pm</p>
              <p style={{ margin: 0 }}>Saturday</p>
              <p style={{ marginTop: 0 }}>5:30am – 10:00am</p>
              <p style={{ margin: 0 }}>Sunday</p>
              <p style={{ marginTop: 0 }}>7:00am – 7:45am</p>
            </div>
          </div>
          <div className="footer-bottom" style={{ display: "flex", flexWrap: "wrap", gap: "1rem", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ margin: 0 }}>© 2026 Knight Fitness Lawnton. All Rights Reserved.</p>
            <p style={{ margin: 0, opacity: 0.7 }}>Sister gym: <a href="https://knightfitness-morayfield.com.au/home" target="_blank" rel="noopener noreferrer">Knight Fitness Morayfield</a></p>
          </div>
        </div>
      </footer>

      {/* STICKY MOBILE CTA */}
      <div className="sticky-cta">
        <div className="sticky-cta-info">
          <div className="sticky-cta-eyebrow">GET IN TOUCH</div>
          <div className="sticky-cta-text">No pressure. No contracts.</div>
        </div>
        <a href="tel:+61452519877" className="sticky-cta-call" aria-label="Call us">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
        </a>
        <a href="#contact" className="sticky-cta-btn">Contact us</a>
      </div>
    </div>
  );
}

window.AppContent = AppContent;
