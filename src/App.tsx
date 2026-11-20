import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CONFIG as C } from "./config";

const HEART = "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z";

/* ---------- date helpers ---------- */
const pad = (n: number) => String(n).padStart(2, "0");
const target = C.eventISO ? new Date(C.eventISO).getTime() : NaN;
const hasDate = !Number.isNaN(target);
const dp = (o: Intl.DateTimeFormatOptions) =>
  hasDate ? new Date(C.eventISO).toLocaleDateString("en-NG", { ...o, timeZone: "Africa/Lagos" }) : "";
const fmtTime = hasDate
  ? new Date(C.eventISO).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit", timeZone: "Africa/Lagos" })
  : "Time to be revealed";

function useCountdown() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const d = hasDate ? Math.max(0, target - now) : 0;
  return { days: Math.floor(d / 864e5), hours: Math.floor((d / 36e5) % 24), mins: Math.floor((d / 6e4) % 60), secs: Math.floor((d / 1e3) % 60) };
}

/* ---------- living night sky: twinkling stars + rising hearts ---------- */
function Sky() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!, ctx = cv.getContext("2d")!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const heart = new Path2D(HEART);
    const dpr = Math.min(devicePixelRatio || 1, 2);
    let w = 0, h = 0, id = 0, lastW = 0;
    const stars = Array.from({ length: 120 }, () => ({ x: Math.random(), y: Math.random(), r: Math.random() * 1.3 + 0.2, p: Math.random() * 6.28, s: Math.random() * 0.002 + 0.0006 }));
    const mk = (init: boolean) => ({ x: Math.random(), y: init ? Math.random() : 1.1, s: Math.random() * 0.0007 + 0.0003, z: Math.random() * 10 + 6, p: Math.random() * 6.28, h: Math.random() > 0.4, c: Math.random() > 0.5 ? "#f6d58e" : "#f4a9bd" });
    const rise = Array.from({ length: 18 }, () => mk(true));

    const size = () => {
      if (w && innerWidth === lastW) return; // ignore mobile address-bar resizes
      lastW = innerWidth;
      w = innerWidth;
      h = Math.max(innerHeight, screen.height);
      cv.width = w * dpr; cv.height = h * dpr;
      cv.style.width = w + "px"; cv.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const frame = (t: number) => {
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = "#fff";
      for (const s of stars) { ctx.globalAlpha = 0.25 + 0.75 * Math.abs(Math.sin(t * s.s + s.p)); ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.r, 0, 6.28); ctx.fill(); }
      rise.forEach((e, i) => {
        if (!reduce) e.y -= e.s;
        if (e.y < -0.1) rise[i] = mk(false);
        const x = e.x * w + Math.sin(t / 1600 + e.p) * 16, y = e.y * h;
        ctx.globalAlpha = Math.max(0, Math.min(0.75, e.y * 2, (1.05 - e.y) * 3));
        ctx.fillStyle = e.c;
        if (e.h) { ctx.save(); ctx.translate(x - e.z / 2, y); ctx.scale(e.z / 24, e.z / 24); ctx.fill(heart); ctx.restore(); }
        else { ctx.shadowColor = e.c; ctx.shadowBlur = 10; ctx.beginPath(); ctx.arc(x, y, 1.6, 0, 6.28); ctx.fill(); ctx.shadowBlur = 0; }
      });
      ctx.globalAlpha = 1;
      if (!reduce) id = requestAnimationFrame(frame);
    };

    size(); addEventListener("resize", size); id = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(id); removeEventListener("resize", size); };
  }, []);
  return <canvas ref={ref} className="sky" aria-hidden="true" />;
}

/* ---------- scroll reveal ---------- */
function Reveal({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setOn(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(ref.current!);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={`reveal ${on ? "in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</div>;
}

/* ---------- gate: hold the wax seal ---------- */
function Gate({ onUnlock, bursting }: { onUnlock: () => void; bursting: boolean }) {
  const [p, setP] = useState(0);
  const raf = useRef(0), t0 = useRef(0), done = useRef(false);
  const HOLD = 1500;
  const tick = (t: number) => {
    const v = Math.min(1, (t - t0.current) / HOLD);
    setP(v);
    if (v >= 1) { if (!done.current) { done.current = true; navigator.vibrate?.(40); onUnlock(); } }
    else raf.current = requestAnimationFrame(tick);
  };
  const down = () => { if (done.current) return; t0.current = performance.now(); raf.current = requestAnimationFrame(tick); };
  const up = () => { if (done.current) return; cancelAnimationFrame(raf.current); setP(0); };
  const move = (e: React.PointerEvent<HTMLElement>) => {
    e.currentTarget.style.setProperty("--mx", e.clientX + "px");
    e.currentTarget.style.setProperty("--my", e.clientY + "px");
  };
  const R = 74, L = 2 * Math.PI * R;
  return (
    <section className={`gate ${bursting ? "burst" : ""}`} onPointerMove={move}>
      <div className="spot" aria-hidden="true" />
      <p className="eyebrow">Strictly confidential</p>
      <h1 className="gate-title foil">Operation<br />Surprise</h1>
      <p className="script gate-script">a sealed invitation</p>
      <button className="seal" aria-label="Press and hold to open the invitation"
        onPointerDown={down} onPointerUp={up} onPointerLeave={up} onPointerCancel={up}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => (e.key === " " || e.key === "Enter") && !e.repeat && down()} onKeyUp={up}>
        <svg viewBox="0 0 160 160" className="ring" aria-hidden="true">
          <circle cx="80" cy="80" r={R} className="ring-bg" />
          <circle cx="80" cy="80" r={R} className="ring-fg" strokeDasharray={L} strokeDashoffset={L * (1 - p)} />
        </svg>
        <span className="wax" style={{ transform: `scale(${1 - p * 0.06})` }}>
          <svg viewBox="0 0 24 24" className="emboss"><path d={HEART} /></svg>
        </span>
      </button>
      <p className="hint">Press &amp; hold the seal</p>
    </section>
  );
}

/* ---------- pieces ---------- */
function Redacted({ children }: { children: string }) {
  const [open, setOpen] = useState(false);
  return <button className={`redact ${open ? "open" : ""}`} onClick={() => setOpen(true)} aria-label={open ? undefined : "Redacted. Tap to reveal"}>{children}</button>;
}

function Countdown() {
  const c = useCountdown();
  const cells: [number, string][] = [[c.days, "Days"], [c.hours, "Hours"], [c.mins, "Minutes"], [c.secs, "Seconds"]];
  return (
    <div className="count" role="timer" aria-label="Time until the proposal">
      {cells.map(([n, l]) => <div key={l}><b>{pad(n)}</b><span>{l}</span></div>)}
    </div>
  );
}

function addToCalendar() {
  const f = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT", "SUMMARY:Operation Surprise (Confidential)",
    `LOCATION:${C.venueName}, ${C.venueAddress}`, "DESCRIPTION:Keep it secret. Arrive early.",
    `DTSTART:${f(C.eventISO)}`, `DTEND:${f(C.eventEndISO || C.eventISO)}`, "END:VEVENT", "END:VCALENDAR"].join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  a.download = "operation-surprise.ics";
  a.click();
  URL.revokeObjectURL(a.href);
}

const RULES = [
  "Not a word to her. Not even as a joke.",
  "If she asks, you know nothing, and you've never heard of this place.",
  "Phone on silent, camera ready.",
];

/* map that doesn't hijack page scrolling on phones */
function MapFrame({ title, src }: { title: string; src: string }) {
  const [active, setActive] = useState(false);
  return (
    <div className={`frame ${active ? "active" : ""}`}>
      <iframe title={`Map to ${title}`} src={src} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      <button className="map-shield" onClick={() => setActive(true)} aria-label="Tap to use the map">
        <span>Tap to explore the map</span>
      </button>
    </div>
  );
}

function Dossier() {
  const q = encodeURIComponent(`${C.venueName}, ${C.venueAddress}`);
  const mapSrc = useMemo(() => `https://maps.google.com/maps?q=${q}&z=16&output=embed`, [q]);
  return (
    <main className="story">
      <header className="hero">
        <p className="script hero-script">Psst…</p>
        <h1 className="foil hero-title">It's a secret</h1>
        <p className="lede">Something beautiful is about to happen, and you are one of the few who know.</p>
        <span className="cue" aria-hidden="true">⌄</span>
      </header>

      <Reveal>
        <section className="letter" aria-label="Message">
          <span className="stamp" aria-hidden="true">Top secret</span>
          <p>I've tried every possible trick to make sure <b>Nuroh</b> doesn't find out, but you know how snoopy she can be! 😂 She still has no idea what's going on, although she strongly believes she's one step ahead of us.</p>
          <p>Let's keep it that way. Please keep this strictly between us. No hints, no slip-ups, and definitely no suspicious behaviour.</p>
          <p className="red">Operation Surprise is strictly confidential. 🤐</p>
          {C.note.map((l, i) => <p key={i} className="note">{l}</p>)}
          <p className="sig">— {C.proposer}</p>
        </section>
      </Reveal>

      {hasDate && (
        <Reveal className="sec">
          <h2 className="script h2">Counting down</h2>
          <Countdown />
        </Reveal>
      )}

      <Reveal className="sec">
        <h2 className="script h2">Save the moment</h2>
        <article className="ticket">
          <div className="t-main">
            <p className="eyebrow">By secret invitation</p>
            {hasDate ? (
              <div className="t-date"><b>{dp({ day: "numeric" })}</b><span>{dp({ month: "long", year: "numeric" })}<em>{dp({ weekday: "long" })}</em></span></div>
            ) : (
              <p className="tbc script">Date to be revealed</p>
            )}
            <p className="t-line">{fmtTime}{C.arriveBy && ` · be there by ${C.arriveBy}`}</p>
            <p className="t-venue">{C.venueName}<small>{C.venueAddress}</small></p>
            {C.dressCode && <p className="t-line">Dress: {C.dressCode}</p>}
          </div>
          <div className="t-stub"><span>Admit one</span><span aria-hidden="true">🤫</span></div>
        </article>
        {hasDate && <button className="btn" onClick={addToCalendar}>Add to calendar</button>}
      </Reveal>

      <Reveal className="sec">
        <h2 className="script h2">Find the spot</h2>
        <MapFrame title={C.venueName} src={mapSrc} />
        <a className="btn" href={`https://www.google.com/maps/dir/?api=1&destination=${q}`} target="_blank" rel="noopener noreferrer">Get directions</a>
      </Reveal>

      <Reveal className="sec">
        <h2 className="script h2">Rules of engagement</h2>
        <ol className="rules">
          {RULES.map((r, i) => <li key={r}><span>{i + 1}</span>{r}</li>)}
        </ol>
      </Reveal>

      <Reveal className="finale">
        <svg viewBox="0 0 24 24" className="big-heart" aria-hidden="true"><path d={HEART} /></svg>
        <p className="script fin-script">See you there</p>
        <p className="foot">Delete this link after the day. She snoops.</p>
      </Reveal>
    </main>
  );
}

/* ---------- music ---------- */
function Music({ audio }: { audio: HTMLAudioElement }) {
  const [on, setOn] = useState(!audio.paused);

  // keep the button in sync with the real playback state
  useEffect(() => {
    const sync = () => setOn(!audio.paused);
    audio.addEventListener("play", sync);
    audio.addEventListener("pause", sync);
    sync();
    return () => {
      audio.removeEventListener("play", sync);
      audio.removeEventListener("pause", sync);
    };
  }, [audio]);

  const toggle = () => {
    if (audio.paused) audio.play().catch(() => {});
    else audio.pause();
  };

  return (
    <button
      className={`music ${on ? "on" : ""}`}
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "Pause music" : "Play music"}
      title={C.songTitle}
    >
      <i /><i /><i /><i />
    </button>
  );
}

/* ---------- app ---------- */
export default function App() {
  const [phase, setPhase] = useState<"gate" | "burst" | "story">("gate");

  const audio = useMemo(() => {
    const a = new Audio(C.song);
    a.loop = true;
    a.volume = 0.55;
    a.preload = "auto";
    return a;
  }, []);

  // Try to play as soon as the app mounts. If the browser blocks it,
  // start on the very first tap, click or key press anywhere on the page.
  useEffect(() => {
    const events = ["pointerup", "touchend", "click", "keydown"] as const;
    const stop = () => events.forEach((e) => window.removeEventListener(e, start));
    function start() {
      audio.play().then(stop).catch(() => {});
    }
    audio.play().catch(() => {
      events.forEach((e) => window.addEventListener(e, start, { passive: true }));
    });
    return () => {
      stop();
      audio.pause();
    };
  }, [audio]);

  const unlock = () => {
    audio.play().catch(() => {}); // safety net if it hasn't started yet
    setPhase("burst");
    setTimeout(() => {
      setPhase("story");
      window.scrollTo(0, 0);
    }, 1100);
  };

  return (
    <>
      <Sky />
      {phase !== "story" && <Gate onUnlock={unlock} bursting={phase === "burst"} />}
      {phase === "story" && (
        <>
          <Dossier />
          <Music audio={audio} />
        </>
      )}
    </>
  );
}