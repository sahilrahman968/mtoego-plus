"use client";

import { useEffect, useRef } from "react";

// The viewBox is padded well beyond the bike so the headlight flare has room.
const BIKE_W = 88;
const BIKE_H = 65;
const EDGE_PAD = 50;
const IDLE_HIDE_MS = 900;
// Pushes the bike within the rail so the tyres ride along the window edge.
const WHEEL_EDGE_OFFSET = 3;

export default function ScrollbarOverlay() {
  const railRef = useRef<HTMLDivElement>(null);
  const puffLayerRef = useRef<HTMLDivElement>(null);
  const bikeRef = useRef<HTMLDivElement>(null);
  const facingRef = useRef<HTMLDivElement>(null);
  const chassisRef = useRef<HTMLDivElement>(null);
  const rearWheelRef = useRef<SVGGElement>(null);
  const frontWheelRef = useRef<SVGGElement>(null);

  useEffect(() => {
    const rail = railRef.current;
    const puffLayer = puffLayerRef.current;
    const bike = bikeRef.current;
    const facing = facingRef.current;
    const chassis = chassisRef.current;
    const rearWheel = rearWheelRef.current;
    const frontWheel = frontWheelRef.current;
    if (!rail || !puffLayer || !bike || !facing || !chassis || !rearWheel || !frontWheel) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let lastScroll = window.scrollY;
    let lastTime = performance.now();
    let posY = EDGE_PAD;
    let velocity = 0; // px per second, exponentially smoothed
    let wheelAngle = 0;
    let lean = 0;
    let bouncePhase = 0;
    let direction = 1;
    let lastPuffAt = 0;
    let hideAt = 0;
    let visible = false;

    // Frame-rate independent easing: fraction to move this frame for a given
    // time constant, so motion is identical at 60Hz and 120Hz.
    const ease = (dt: number, tau: number) => 1 - Math.exp(-dt / tau);

    const rand = (min: number, max: number) => min + Math.random() * (max - min);

    const spawnPuff = (centerY: number, dir: number, intensity: number) => {
      if (puffLayer.childElementCount > 64) return;
      const puff = document.createElement("span");
      const size = rand(8, 16) + intensity * 0.22;
      puff.className = "cr-puff";
      puff.style.width = `${size}px`;
      puff.style.height = `${size}px`;
      puff.style.left = `${54 - size / 2 + rand(-5, 5)}px`;
      puff.style.top = `${centerY - dir * 27 - size / 2 + rand(-6, 6)}px`;
      // Lumpy blob instead of a circle so overlapping puffs read as cloud.
      puff.style.borderRadius = `${rand(45, 62)}% ${rand(40, 58)}% ${rand(45, 60)}% ${rand(
        40,
        58
      )}% / ${rand(45, 60)}% ${rand(48, 65)}% ${rand(38, 55)}% ${rand(45, 60)}%`;
      puff.style.setProperty("--dx", `${rand(-16, -58)}px`);
      puff.style.setProperty("--dy", `${-dir * rand(10, 40)}px`);
      puff.style.setProperty("--s", `${rand(2, 3.2)}`);
      puff.style.setProperty("--r", `${rand(-70, 70)}deg`);
      puff.style.setProperty("--o", `${rand(0.28, 0.46)}`);
      puff.style.animationDuration = `${rand(1000, 1800)}ms`;
      puff.addEventListener("animationend", () => puff.remove());
      puffLayer.appendChild(puff);
    };

    const spawnCloud = (centerY: number, dir: number, intensity: number) => {
      const count = 3 + Math.round(Math.min(intensity, 42) / 14);
      for (let i = 0; i < count; i += 1) spawnPuff(centerY, dir, intensity);
    };

    const loop = (time: number) => {
      raf = requestAnimationFrame(loop);

      const dt = Math.min(0.08, Math.max(0.001, (time - lastTime) / 1000));
      lastTime = time;

      const scrollY = window.scrollY;
      const delta = scrollY - lastScroll;
      lastScroll = scrollY;

      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll < 40) {
        if (visible) {
          visible = false;
          rail.style.opacity = "0";
        }
        return;
      }

      velocity += (delta / dt - velocity) * ease(dt, 0.07);
      const absVelocity = Math.abs(velocity);
      // Per-frame equivalent at 60Hz, which the smoke sizing is tuned against.
      const intensity = Math.min(absVelocity / 60, 45);

      if (Math.abs(delta) > 0.4) {
        hideAt = time + IDLE_HIDE_MS;
        if (!visible) {
          visible = true;
          rail.style.opacity = "1";
        }
      } else if (visible && time > hideAt) {
        visible = false;
        rail.style.opacity = "0";
      }

      // Hysteresis on the smoothed velocity, so jitter around zero (trackpad
      // rubber-banding) doesn't make the bike flip back and forth.
      if (velocity > 150) direction = 1;
      else if (velocity < -150) direction = -1;

      const travel = window.innerHeight - EDGE_PAD * 2;
      const targetY = EDGE_PAD + (scrollY / maxScroll) * travel;
      posY += (targetY - posY) * ease(dt, 0.055);
      bike.style.transform = `translate3d(0, ${posY.toFixed(2)}px, 0)`;
      // Both orientations keep the wheels pointed at the window edge.
      facing.style.transform =
        direction === 1 ? "rotate(90deg) scaleY(-1)" : "rotate(-90deg) scaleY(1)";

      if (reduceMotion) return;

      // 4.5deg per px keeps the tyre's contact patch roughly matched to travel.
      wheelAngle += velocity * dt * 4.5;
      const wheelTransform = `rotate(${wheelAngle.toFixed(1)}deg)`;
      rearWheel.style.transform = wheelTransform;
      frontWheel.style.transform = wheelTransform;

      const leanTarget = Math.max(-8, Math.min(8, -velocity * 0.006));
      lean += (leanTarget - lean) * ease(dt, 0.1);
      bouncePhase += dt * (7 + absVelocity * 0.006);
      const bounce = Math.sin(bouncePhase) * Math.min(1.2, absVelocity * 0.0009);
      chassis.style.transform = `translateY(${bounce.toFixed(2)}px) rotate(${lean.toFixed(2)}deg)`;

      if (absVelocity > 70 && time - lastPuffAt > Math.max(26, 90 - intensity * 2)) {
        lastPuffAt = time;
        spawnCloud(posY, direction, intensity);
      }
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={railRef} className="cr-rail" aria-hidden="true">
      <div ref={puffLayerRef} className="cr-puff-layer" />
      <div
        ref={bikeRef}
        style={{
          position: "absolute",
          left: `calc(50% + ${WHEEL_EDGE_OFFSET}px)`,
          top: 0,
          width: BIKE_W,
          height: BIKE_H,
          marginLeft: -BIKE_W / 2,
          marginTop: -BIKE_H / 2,
        }}
      >
        <div
          ref={facingRef}
          style={{
            width: "100%",
            height: "100%",
            transition: "transform 300ms cubic-bezier(.4,0,.2,1)",
          }}
        >
          <div ref={chassisRef} style={{ width: "100%", height: "100%" }}>
            <svg viewBox="-6 -12 76 56" width={BIKE_W} height={BIKE_H}>
              <defs>
                <linearGradient id="cr-tank" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#33363d" />
                  <stop offset="52%" stopColor="#16171c" />
                  <stop offset="100%" stopColor="#0b0c0f" />
                </linearGradient>
                <linearGradient id="cr-beam" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#fff6d8" stopOpacity="0.2" />
                  <stop offset="55%" stopColor="#fff6d8" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#fff6d8" stopOpacity="0" />
                </linearGradient>
                <radialGradient id="cr-lens" cx="46%" cy="46%" r="54%">
                  <stop offset="0%" stopColor="#fffef7" />
                  <stop offset="52%" stopColor="#ffeeb4" />
                  <stop offset="100%" stopColor="#b8892c" />
                </radialGradient>
                <radialGradient id="cr-halo" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fff4d2" stopOpacity="0.34" />
                  <stop offset="45%" stopColor="#fff4d2" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#fff4d2" stopOpacity="0" />
                </radialGradient>
                <radialGradient id="cr-flare" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#fff6dc" stopOpacity="0.16" />
                  <stop offset="38%" stopColor="#fff1c9" stopOpacity="0.05" />
                  <stop offset="100%" stopColor="#ffeec0" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="cr-streak-h" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#fff6dc" stopOpacity="0" />
                  <stop offset="50%" stopColor="#fffaf0" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#fff6dc" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="cr-streak-v" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fff6dc" stopOpacity="0" />
                  <stop offset="50%" stopColor="#fffaf0" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="#fff6dc" stopOpacity="0" />
                </linearGradient>
                <radialGradient id="cr-tail" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#ff7a68" stopOpacity="0.75" />
                  <stop offset="40%" stopColor="#ff2f1c" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#ff2f1c" stopOpacity="0" />
                </radialGradient>
              </defs>

              <path d="M50 7.4 L 70 -7 L 70 37 L 50 23 Z" fill="url(#cr-beam)" />
              <path d="M50 12 L 70 5 L 70 26 L 50 18.8 Z" fill="url(#cr-beam)" opacity="0.5" />

              <path d="M13.5 26.4 L 28 27.2" stroke="#2a2d33" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M14.6 25.4 L 19.6 17.8" stroke="#4a4f58" strokeWidth="0.7" strokeLinecap="round" />
              <path
                d="M15 24.8 L 19.2 18.4"
                stroke="#b9c0cb"
                strokeWidth="1.6"
                strokeDasharray="0.6 0.8"
              />

              <g
                ref={rearWheelRef}
                style={{ transformBox: "fill-box", transformOrigin: "center" }}
              >
                <circle cx="13.5" cy="26.4" r="10.9" fill="none" stroke="#4a505a" strokeWidth="0.6" />
                <circle cx="13.5" cy="26.4" r="8.6" fill="none" stroke="#0f1116" strokeWidth="4.6" />
                <circle cx="13.5" cy="26.4" r="6.2" fill="none" stroke="#cfd4dc" strokeWidth="1.1" />
                <g stroke="#b7bec9" strokeWidth="0.5">
                  <path d="M7.3 26.4 L 19.7 26.4" />
                  <path d="M13.5 20.2 L 13.5 32.6" />
                  <path d="M9.1 22 L 17.9 30.8" />
                  <path d="M9.1 30.8 L 17.9 22" />
                </g>
                <circle cx="13.5" cy="26.4" r="1.9" fill="#cfd4dc" />
              </g>

              <g
                ref={frontWheelRef}
                style={{ transformBox: "fill-box", transformOrigin: "center" }}
              >
                <circle cx="50" cy="26.4" r="10.9" fill="none" stroke="#4a505a" strokeWidth="0.6" />
                <circle cx="50" cy="26.4" r="8.6" fill="none" stroke="#0f1116" strokeWidth="4.6" />
                <circle cx="50" cy="26.4" r="6.2" fill="none" stroke="#cfd4dc" strokeWidth="1.1" />
                <circle cx="50" cy="26.4" r="3.6" fill="none" stroke="#828993" strokeWidth="1.1" />
                <g stroke="#b7bec9" strokeWidth="0.5">
                  <path d="M43.8 26.4 L 56.2 26.4" />
                  <path d="M50 20.2 L 50 32.6" />
                  <path d="M45.6 22 L 54.4 30.8" />
                  <path d="M45.6 30.8 L 54.4 22" />
                </g>
                <circle cx="50" cy="26.4" r="1.9" fill="#cfd4dc" />
              </g>

              <path
                d="M2.08 24.38 A 11.6 11.6 0 0 1 24.4 22.43"
                fill="none"
                stroke="#22252b"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
              <path
                d="M1.09 24.21 A 12.6 12.6 0 0 1 25.34 22.09"
                fill="none"
                stroke="#787f8a"
                strokeOpacity="0.8"
                strokeWidth="0.55"
                strokeLinecap="round"
              />
              <circle className="cr-taillight" cx="2.2" cy="24.9" r="3.6" fill="url(#cr-tail)" />
              <circle cx="2.2" cy="24.9" r="1.3" fill="#1a1216" stroke="#8a8f99" strokeWidth="0.35" />
              <circle cx="2.2" cy="24.9" r="0.9" fill="#ff3323" />
              <circle cx="2.1" cy="24.75" r="0.35" fill="#ffd9d2" />

              <path
                d="M39.1 22.43 A 11.6 11.6 0 0 1 61.2 23.4"
                fill="none"
                stroke="#22252b"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
              <path
                d="M38.16 22.09 A 12.6 12.6 0 0 1 62.17 23.14"
                fill="none"
                stroke="#787f8a"
                strokeOpacity="0.8"
                strokeWidth="0.55"
                strokeLinecap="round"
              />

              <path
                d="M33.4 29.2 C 27 31, 16.4 31.8, 9 31.6"
                fill="none"
                stroke="#1b1d22"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              <path
                d="M33 28.4 C 27 30, 16.6 30.8, 9.6 30.6"
                fill="none"
                stroke="#7d838e"
                strokeOpacity="0.75"
                strokeWidth="0.55"
                strokeLinecap="round"
              />
              <circle cx="8.2" cy="31.6" r="1.7" fill="#2b2e35" stroke="#7d838e" strokeWidth="0.45" />

              <path
                d="M44.8 15.6 C 41.4 18.8, 38 24.4, 35 30"
                fill="none"
                stroke="#22252b"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <path d="M44.4 15.2 L 22.4 17" stroke="#22252b" strokeWidth="1.8" strokeLinecap="round" />
              <path d="M20.2 17.4 L 14 26.2" stroke="#22252b" strokeWidth="1.5" strokeLinecap="round" />

              <path
                d="M28.6 19.6 L 38.8 19.6 L 37.6 30.2 L 29.4 30.4 Z"
                fill="#191c21"
                stroke="#6a707b"
                strokeWidth="0.5"
              />
              <g stroke="#868d98" strokeWidth="0.6" strokeOpacity="0.85">
                <path d="M29.6 21.6 L 38 21.6" />
                <path d="M29.7 23.2 L 37.9 23.2" />
                <path d="M29.8 24.8 L 37.8 24.8" />
              </g>
              <circle cx="33.4" cy="27.8" r="2.6" fill="#202329" stroke="#767d88" strokeWidth="0.55" />

              <path
                d="M26.6 17.2 C 29.4 13, 36.8 12.2, 42.8 14.4 C 44 16.4, 43.4 20, 40.6 21.2 C 34.6 22.4, 28.8 21.4, 27 19.8 Z"
                fill="url(#cr-tank)"
                stroke="#7e858f"
                strokeOpacity="0.9"
                strokeWidth="0.5"
              />
              <path
                d="M28.6 15.6 C 32.6 13.4, 38.2 13, 42.4 14.9"
                fill="none"
                stroke="#ffffff"
                strokeOpacity="0.28"
                strokeWidth="0.8"
                strokeLinecap="round"
              />
              <ellipse
                cx="34.8"
                cy="17.9"
                rx="3.5"
                ry="1.75"
                fill="#0c0d10"
                stroke="var(--primary)"
                strokeOpacity="0.8"
                strokeWidth="0.5"
              />
              <path
                d="M32.6 17.9 L 37 17.9"
                stroke="#dfe3e9"
                strokeOpacity="0.75"
                strokeWidth="0.7"
                strokeLinecap="round"
              />

              <path
                d="M17 18 C 16 14.4, 19.8 12.9, 23.6 13.3 L 28.4 15.4 C 28.4 17, 26.4 18.4, 24 18.6 Z"
                fill="#101216"
                stroke="#6a707b"
                strokeWidth="0.45"
              />
              <path d="M46.6 14.4 L 49.4 26.4" stroke="#cfd4dc" strokeWidth="2" strokeLinecap="round" />
              <path d="M48.8 14 L 51.2 26.4" stroke="#949aa5" strokeWidth="1.4" strokeLinecap="round" />

              <path
                d="M45 12.2 C 46 10, 48 9.2, 50 9.4"
                fill="none"
                stroke="#cfd4dc"
                strokeWidth="1.3"
                strokeLinecap="round"
              />
              <path d="M49 9.3 L 50.6 9.6" stroke="#26292f" strokeWidth="1.7" strokeLinecap="round" />
              <path d="M44.6 11.8 L 43 8.6" stroke="#a9afba" strokeWidth="0.9" strokeLinecap="round" />
              <circle cx="42.4" cy="7.8" r="1.8" fill="#14161a" stroke="#cfd4dc" strokeWidth="0.75" />

              <circle cx="46.2" cy="15.4" r="4.1" fill="#101115" stroke="#cfd4dc" strokeWidth="1" />
              <circle cx="47" cy="15.4" r="2.7" fill="url(#cr-lens)" />

              <g className="cr-lamp">
                <circle cx="47.2" cy="15.4" r="18" fill="url(#cr-flare)" />
                <circle cx="47.2" cy="15.4" r="9" fill="url(#cr-halo)" />
                <ellipse cx="47.2" cy="15.4" rx="20" ry="1.2" fill="url(#cr-streak-h)" />
                <ellipse cx="47.2" cy="15.4" rx="1.1" ry="13" fill="url(#cr-streak-v)" />
                <ellipse
                  cx="47.2"
                  cy="15.4"
                  rx="11"
                  ry="0.8"
                  fill="url(#cr-streak-h)"
                  opacity="0.45"
                  transform="rotate(42 47.2 15.4)"
                />
                <ellipse
                  cx="47.2"
                  cy="15.4"
                  rx="11"
                  ry="0.8"
                  fill="url(#cr-streak-h)"
                  opacity="0.45"
                  transform="rotate(-42 47.2 15.4)"
                />
              </g>
              <circle cx="47.4" cy="15.4" r="1.4" fill="#fffdf4" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
