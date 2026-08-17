"use client";

import { useId, useRef, type PointerEvent as ReactPointerEvent } from "react";
import type { StoryChapter } from "./game/config";

type StorySceneProps = {
  chapter: StoryChapter;
  selectedPath?: "will" | "insight" | "empathy";
};

function Characters({ close = false }: { close?: boolean }) {
  return (
    <g className={close ? "scene-characters are-close" : "scene-characters"}>
      <g className="scene-person scene-player">
        <circle cx="345" cy="250" r="22" />
        <path d="M308 360 Q315 286 345 279 Q376 286 382 360Z" />
        <path d="M326 238 Q345 214 364 238 L359 252 Q345 244 331 252Z" />
      </g>
      <g className="scene-person scene-mira">
        <circle cx="465" cy="245" r="22" />
        <path d="M425 360 Q433 280 465 274 Q498 281 505 360Z" />
        <path d="M440 239 Q449 203 475 215 Q492 228 485 254 Q469 239 447 256Z" />
        <path className="mira-hair" d="M444 230 Q420 270 437 319 Q450 279 457 253Z" />
      </g>
      {close && <path className="scene-thread" d="M364 254 Q404 224 445 251" />}
    </g>
  );
}

function SceneSpecific({ visual }: Pick<StoryChapter, "visual">) {
  switch (visual) {
    case "orbit":
      return (
        <>
          <ellipse className="scene-planet" cx="410" cy="500" rx="360" ry="225" />
          <ellipse className="scene-planet-glow" cx="410" cy="478" rx="292" ry="165" />
          <g className="scene-station scene-drift">
            <ellipse cx="410" cy="208" rx="118" ry="35" />
            <ellipse cx="410" cy="208" rx="75" ry="21" />
            <path d="M292 208 L214 185 M528 208 L607 185 M410 172 L410 112" />
            <circle cx="410" cy="208" r="19" />
          </g>
          <path className="scene-signal-beam" d="M410 224 L374 403 L447 403Z" />
        </>
      );
    case "window":
      return (
        <>
          <path className="scene-window" d="M118 78 H682 V390 H118Z" />
          <ellipse className="scene-planet scene-planet-small" cx="510" cy="385" rx="250" ry="145" />
          <path className="scene-written-name" d="M264 157 Q302 131 335 159 Q293 181 274 216 Q322 194 356 219" />
          <Characters />
        </>
      );
    case "zero-gravity":
      return (
        <>
          <g className="scene-vines scene-sway">
            <path d="M104 440 Q190 300 163 95 M690 440 Q591 310 636 74" />
            <circle cx="171" cy="142" r="11" /><circle cx="150" cy="223" r="8" /><circle cx="624" cy="159" r="10" /><circle cx="649" cy="260" r="7" />
          </g>
          <g className="scene-floating scene-drift"><Characters close /><path d="M250 395 L563 96" /></g>
          <g className="scene-petals"><circle cx="252" cy="126" r="4" /><circle cx="558" cy="164" r="5" /><circle cx="601" cy="332" r="3" /><circle cx="204" cy="353" r="6" /></g>
        </>
      );
    case "ghost-train":
      return (
        <>
          <path className="scene-tunnel" d="M62 438 L264 82 H536 L738 438" />
          <g className="scene-train scene-rush">
            <path d="M156 198 H640 L692 360 H104Z" />
            {[0, 1, 2, 3].map((item) => <rect key={item} x={180 + item * 110} y="226" width="76" height="71" rx="4" />)}
            <circle cx="225" cy="352" r="17" /><circle cx="573" cy="352" r="17" />
          </g>
          <g className="scene-window-life"><Characters close /></g>
          <path className="scene-rails" d="M282 438 L365 365 M518 438 L438 365 M400 438 V365" />
        </>
      );
    case "masquerade":
      return (
        <>
          <g className="scene-chandelier scene-sway"><path d="M400 0 V92 M300 128 Q400 63 500 128" /><circle cx="300" cy="130" r="10" /><circle cx="400" cy="96" r="12" /><circle cx="500" cy="130" r="10" /></g>
          <g className="scene-crowd">{[130, 220, 580, 660].map((x) => <path key={x} d={`M${x - 36} 440 Q${x - 28} 327 ${x} 317 Q${x + 31} 328 ${x + 39} 440Z`} />)}</g>
          <Characters close />
          <g className="scene-masks"><path d="M329 245 Q345 232 362 245 Q358 266 345 270 Q332 265 329 245Z" /><path d="M447 240 Q465 226 485 241 Q480 263 465 268 Q451 262 447 240Z" /></g>
          <path className="scene-floor" d="M50 438 L322 345 H478 L750 438" />
        </>
      );
    case "horizon":
      return (
        <>
          <path className="scene-hangar" d="M55 438 V101 Q400 7 745 101 V438" />
          <ellipse className="scene-horizon" cx="400" cy="219" rx="207" ry="98" />
          <g className="scene-ship scene-drift"><path d="M213 338 Q398 163 603 334 L535 363 H284Z" /><path d="M345 276 L394 183 L454 279" /><path d="M260 355 L197 398 H321 M548 355 L615 398 H487" /></g>
          <path className="scene-runway" d="M358 438 L390 345 H430 L474 438" />
          <Characters close />
        </>
      );
    case "betrayal":
      return (
        <>
          <g className="scene-fleet scene-drift">{[125, 250, 550, 674].map((x, i) => <path key={x} d={`M${x - 52} ${132 + i * 21} L${x} ${103 + i * 17} L${x + 53} ${132 + i * 21} L${x} ${142 + i * 21}Z`} />)}</g>
          <circle className="scene-call" cx="400" cy="224" r="103" />
          <g className="scene-ash"><circle cx="400" cy="190" r="34" /><path d="M322 359 Q330 250 400 239 Q471 251 478 359Z" /><path d="M368 180 L432 180 L418 202 H382Z" /></g>
          <path className="scene-static" d="M117 269 H272 M530 166 H708 M91 349 H241 M560 333 H746" />
        </>
      );
    case "ark":
      return (
        <>
          <g className="scene-pods">{[125, 260, 540, 675].map((x, i) => <g key={x}><rect x={x - 44} y={92 + (i % 2) * 35} width="88" height="276" rx="44" /><circle cx={x} cy={171 + (i % 2) * 35} r="22" /><path d={`M${x - 23} ${315 + (i % 2) * 35} Q${x} ${227 + (i % 2) * 35} ${x + 23} ${315 + (i % 2) * 35}`} /></g>)}</g>
          <g className="scene-mira-pod scene-pulse"><rect x="336" y="62" width="128" height="338" rx="64" /><circle cx="400" cy="150" r="30" /><path d="M358 349 Q363 208 400 197 Q438 210 442 349Z" /></g>
          <path className="scene-cathedral" d="M31 438 L102 58 L181 438 M769 438 L697 58 L618 438" />
        </>
      );
    case "two-miras":
      return (
        <>
          <path className="scene-mirror" d="M400 43 L471 240 L400 431 L329 240Z" />
          <g transform="translate(-132 0)"><Characters close /></g>
          <g className="scene-hologram" transform="translate(132 0)"><Characters close /></g>
          <path className="scene-thread" d="M376 236 Q400 182 424 236" />
        </>
      );
    case "aurora":
      return (
        <>
          <path className="scene-aurora scene-wave-one" d="M-40 202 Q133 43 294 183 T653 146 T850 87 V0 H-40Z" />
          <path className="scene-aurora scene-wave-two" d="M-42 286 Q167 109 351 254 T711 184 T846 136 V0 H-42Z" />
          <path className="scene-ground" d="M0 391 Q183 322 324 377 Q533 315 800 389 V480 H0Z" />
          <Characters close />
          <g className="scene-meteors"><path d="M118 78 L198 157 M644 54 L587 112 M721 173 L680 213" /></g>
        </>
      );
    case "choice":
      return (
        <>
          <g className="scene-three-roads"><path d="M400 438 Q389 301 188 73" /><path d="M400 438 V55" /><path d="M400 438 Q412 301 618 73" /></g>
          <circle className="scene-choice-orb scene-choice-left" cx="188" cy="79" r="56" />
          <circle className="scene-choice-orb scene-choice-center" cx="400" cy="64" r="56" />
          <circle className="scene-choice-orb scene-choice-right" cx="618" cy="79" r="56" />
          <Characters close />
        </>
      );
    case "dawn":
      return (
        <>
          <circle className="scene-sun" cx="400" cy="281" r="91" />
          <path className="scene-city" d="M0 438 V347 H63 V287 H111 V359 H164 V255 H220 V328 H271 V213 H334 V351 H389 V276 H455 V341 H515 V194 H578 V324 H632 V262 H701 V339 H800 V438Z" />
          <path className="scene-water" d="M0 408 Q155 380 298 412 T590 405 T800 397 V480 H0Z" />
          <Characters close />
        </>
      );
  }
}

export function StoryScene({ chapter, selectedPath }: StorySceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rawId = useId();
  const id = rawId.replaceAll(":", "");

  const moveScene = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    event.currentTarget.style.setProperty("--scene-x", x.toFixed(3));
    event.currentTarget.style.setProperty("--scene-y", y.toFixed(3));
  };

  const resetScene = () => {
    containerRef.current?.style.setProperty("--scene-x", "0");
    containerRef.current?.style.setProperty("--scene-y", "0");
  };

  return (
    <div
      ref={containerRef}
      className={`story-scene visual-${chapter.visual}${selectedPath ? ` path-${selectedPath}` : ""}`}
      onPointerMove={moveScene}
      onPointerLeave={resetScene}
      role="img"
      aria-label={`Сцена «${chapter.title}». ${chapter.summary}`}
    >
      <svg viewBox="0 0 800 480" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#0b0d1a" />
            <stop offset="0.55" stopColor="#171127" />
            <stop offset="1" stopColor="#07171c" />
          </linearGradient>
          <radialGradient id={`${id}-halo`} cx="50%" cy="45%" r="55%">
            <stop stopColor="#8b6cff" stopOpacity=".38" />
            <stop offset="1" stopColor="#8b6cff" stopOpacity="0" />
          </radialGradient>
          <filter id={`${id}-glow`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <rect width="800" height="480" fill={`url(#${id}-sky)`} />
        <ellipse className="scene-halo" cx="400" cy="220" rx="310" ry="220" fill={`url(#${id}-halo)`} />
        <g className="scene-stars scene-parallax-far">
          {[[78, 66, 2], [151, 154, 1], [244, 74, 2], [318, 131, 1], [489, 86, 1], [584, 137, 2], [704, 71, 1], [744, 241, 2], [63, 282, 1], [219, 332, 1], [629, 302, 1], [533, 381, 2]].map(([cx, cy, r]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={r} />)}
        </g>
        <g className="scene-parallax-near" filter={`url(#${id}-glow)`}>
          <SceneSpecific visual={chapter.visual} />
        </g>
      </svg>
      <div className="scene-vignette" aria-hidden="true" />
      <div className="scene-grain" aria-hidden="true" />
      <div className="scene-caption"><span>{chapter.location}</span><i>СЦЕНА {String(chapter.id + 1).padStart(2, "0")}</i></div>
    </div>
  );
}
