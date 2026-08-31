import type { MushroomGameEntry } from "@/src/lib/mushroom-game";

export function ForestBackdrop() {
  return (
    <svg
      className="mushroom-game-forest"
      viewBox="0 0 1200 680"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="forest-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#74847c" />
          <stop offset="0.48" stopColor="#425b4c" />
          <stop offset="1" stopColor="#1b3328" />
        </linearGradient>
        <radialGradient id="forest-light">
          <stop offset="0" stopColor="#ffe3a0" stopOpacity="0.92" />
          <stop offset="0.26" stopColor="#eec87c" stopOpacity="0.42" />
          <stop offset="1" stopColor="#eec87c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="forest-ground" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#42583a" />
          <stop offset="0.5" stopColor="#263c2c" />
          <stop offset="1" stopColor="#10251d" />
        </linearGradient>
        <linearGradient id="forest-bark" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#12251e" />
          <stop offset="0.45" stopColor="#374738" />
          <stop offset="0.7" stopColor="#22342a" />
          <stop offset="1" stopColor="#0d1d18" />
        </linearGradient>
        <filter id="forest-blur"><feGaussianBlur stdDeviation="18" /></filter>
      </defs>

      <rect width="1200" height="680" fill="url(#forest-sky)" />
      <circle className="forest-sun-glow" cx="820" cy="145" r="190" fill="url(#forest-light)" />
      <circle className="forest-sun" cx="820" cy="145" r="48" fill="#eac47d" opacity="0.82" />

      <path d="M0 315 115 244 218 281 338 189 448 268 572 205 692 286 812 201 930 265 1065 190 1200 256V470H0Z" fill="#3c5447" />
      <path d="M0 378 142 286 272 350 421 251 560 341 719 277 874 359 1035 264 1200 326V495H0Z" fill="#263f33" />

      <g className="forest-distant-pines" fill="#20372d" opacity="0.82">
        <path d="M86 376 132 191l46 185h-24l36 81H72l36-81Z" />
        <path d="m215 401 35-148 35 148h-19l29 64h-90l29-64Z" />
        <path d="m449 391 39-166 39 166h-22l31 71h-98l32-71Z" />
        <path d="m626 402 34-145 34 145h-18l27 62h-86l27-62Z" />
        <path d="m931 391 43-181 43 181h-23l34 76H920l34-76Z" />
        <path d="m1092 405 35-150 35 150h-19l28 63h-88l28-63Z" />
      </g>

      <g className="forest-mist" fill="none" stroke="#d9e0ce" strokeLinecap="round" opacity="0.16" filter="url(#forest-blur)">
        <path d="M-90 359c243-61 383 31 586-12 183-39 325-20 489 9 99 17 191 9 308-27" strokeWidth="38" />
        <path d="M-70 429c187-33 333 27 491-4 223-43 384 28 575-3 100-16 195-12 276 5" strokeWidth="26" />
      </g>

      <path d="M0 420c158-45 256-10 366 8 159 25 243-31 399-15 167 17 252 5 435-25v292H0Z" fill="url(#forest-ground)" />
      <path d="M0 515c163-49 300 7 423 3 183-6 282-56 465-34 120 15 216 7 312-16v212H0Z" fill="#182e23" opacity="0.8" />

      <g className="forest-trunk forest-trunk-left">
        <path d="M0 0h151c-11 133-3 242 17 358 15 89 1 204-33 322H0Z" fill="url(#forest-bark)" />
        <path d="M58 0c-4 132 20 222 10 345-6 76 8 164 1 277" fill="none" stroke="#879069" strokeWidth="7" opacity="0.18" />
        <path d="M113 66c-25 54 8 120-15 177M38 318c44 31 64 70 47 121" fill="none" stroke="#0b1a15" strokeWidth="9" opacity="0.5" />
        <path d="M18 105c70-29 116-79 150-105h102c-57 70-130 117-221 145Z" fill="#172d23" />
      </g>

      <g className="forest-trunk forest-trunk-right">
        <path d="M1060 0h140v680h-118c-31-123-36-244-16-363 18-106 8-211-6-317Z" fill="url(#forest-bark)" />
        <path d="M1132 0c-5 118-26 202-14 318 7 73-11 172-2 292" fill="none" stroke="#8b936d" strokeWidth="7" opacity="0.17" />
        <path d="M1090 93c17 58-14 111 9 169m61 98c-46 30-60 72-39 116" fill="none" stroke="#0b1a15" strokeWidth="9" opacity="0.52" />
        <path d="M1037 0h163v118c-75-9-136-44-205-118Z" fill="#172d23" />
      </g>

      <g className="forest-ferns" fill="none" stroke="#769052" strokeLinecap="round">
        <path d="M69 680c30-76 48-137 51-198m0 63-37-30m35 55 45-38m-48 76-52-32m49 62 58-38" strokeWidth="6" />
        <path d="M1030 680c-6-92-33-160-75-218m45 79-57-8m72 39-19-59m32 92 55-43m-44 78 72-19" strokeWidth="7" />
        <path d="M1136 680c3-77-7-133-28-182m26 65 37-29m-40 64-47-17m49 52 47-7" strokeWidth="5" />
      </g>

      <g fill="#8a9b5c" opacity="0.62">
        <ellipse cx="223" cy="584" rx="44" ry="11" transform="rotate(-18 223 584)" />
        <ellipse cx="358" cy="625" rx="35" ry="9" transform="rotate(13 358 625)" />
        <ellipse cx="849" cy="581" rx="48" ry="12" transform="rotate(-8 849 581)" />
        <ellipse cx="970" cy="640" rx="35" ry="9" transform="rotate(18 970 640)" />
      </g>
    </svg>
  );
}

type MushroomSpecimenProps = {
  kind: MushroomGameEntry["specimen"];
};

export function MushroomSpecimen({ kind }: MushroomSpecimenProps) {
  return (
    <svg className={`mushroom-game-specimen specimen-${kind}`} viewBox="0 0 84 78" aria-hidden="true" focusable="false">
      {kind === "cep" ? <Cep /> : null}
      {kind === "milkcap" ? <Milkcap /> : null}
      {kind === "fly-agaric" ? <FlyAgaric /> : null}
      {kind === "chanterelle" ? <Chanterelle /> : null}
      {kind === "death-cap" ? <DeathCap /> : null}
      {kind === "cluster" ? <Cluster /> : null}
      {kind === "royal-amanita" ? <RoyalAmanita /> : null}
      {kind === "parasol" ? <Parasol /> : null}
      {kind === "inkcap" ? <Inkcap /> : null}
      {kind === "morel" ? <Morel /> : null}
      {kind === "oyster" ? <Oyster /> : null}
      {kind === "russula" ? <Russula /> : null}
      {kind === "yellowfoot" ? <Yellowfoot /> : null}
      {kind === "fairy-ring" ? <FairyRing /> : null}
      {kind === "devil-bolete" ? <DevilBolete /> : null}
    </svg>
  );
}

function Cep() {
  return <>
    <defs>
      <linearGradient id="cep-cap" x1="0" y1="0" x2="0.8" y2="1"><stop stopColor="#b9804c" /><stop offset="0.55" stopColor="#714324" /><stop offset="1" stopColor="#3c2618" /></linearGradient>
      <linearGradient id="cep-stem" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#b99f70" /><stop offset="0.5" stopColor="#ead9ae" /><stop offset="1" stopColor="#9c8158" /></linearGradient>
    </defs>
    <ellipse cx="43" cy="71" rx="29" ry="5" fill="#071711" opacity="0.42" />
    <path d="M31 31c1 9-3 20-6 34-1 6 7 9 18 9s20-3 18-9c-4-13-8-25-7-34Z" fill="url(#cep-stem)" />
    <path d="M32 43c8 4 16 4 23 0" fill="none" stroke="#866f4e" strokeWidth="2" opacity="0.6" />
    <path d="M12 32C15 13 29 5 45 5c18 0 31 11 33 28-18 7-48 7-66-1Z" fill="url(#cep-cap)" />
    <path d="M14 31c18 5 44 5 62 0-2 8-16 11-31 11S16 39 14 31Z" fill="#c5b277" />
    <path d="M24 17c12-9 28-9 40 0" fill="none" stroke="#e1ad71" strokeWidth="4" strokeLinecap="round" opacity="0.28" />
    <g fill="#7e704a" opacity="0.65"><circle cx="28" cy="34" r="1" /><circle cx="38" cy="37" r="1" /><circle cx="50" cy="35" r="1" /><circle cx="61" cy="36" r="1" /></g>
  </>;
}

function DevilBolete() {
  return <>
    <defs>
      <linearGradient id="devil-cap" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#eee7d1" /><stop offset="0.58" stopColor="#c8bea4" /><stop offset="1" stopColor="#817b6d" /></linearGradient>
      <linearGradient id="devil-stem" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#cda43b" /><stop offset="0.45" stopColor="#e26835" /><stop offset="0.78" stopColor="#a52f2d" /><stop offset="1" stopColor="#713025" /></linearGradient>
    </defs>
    <ellipse cx="43" cy="72" rx="30" ry="5" fill="#071711" opacity="0.43" />
    <path d="M31 31c2 8-3 17-7 33-2 8 7 11 19 11 13 0 22-3 19-11-5-15-10-25-8-34Z" fill="url(#devil-stem)" />
    <path d="M29 49c9 5 20 6 29 1m-31 8c10 6 23 7 34 1M34 37l20 27M29 45l27 25m1-31L31 65m31-18L39 72" fill="none" stroke="#782c29" strokeWidth="1.2" opacity="0.72" />
    <path d="M10 31C14 14 29 6 45 6c18 0 31 10 34 26-18 7-50 7-69-1Z" fill="url(#devil-cap)" />
    <path d="M12 31c19 6 46 6 65 0-5 8-18 12-33 12S18 39 12 31Z" fill="#b52f2a" />
    <g fill="#df6850" opacity="0.82"><circle cx="22" cy="34" r="1.4" /><circle cx="32" cy="38" r="1.2" /><circle cx="44" cy="36" r="1.3" /><circle cx="56" cy="38" r="1.2" /><circle cx="67" cy="34" r="1.4" /></g>
    <path d="M25 18c12-7 27-7 39 0" fill="none" stroke="#fff8e1" strokeWidth="4" strokeLinecap="round" opacity="0.32" />
  </>;
}

function Milkcap() {
  return <>
    <defs><linearGradient id="milkcap-cap" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#e6984d" /><stop offset="0.55" stopColor="#b65c2b" /><stop offset="1" stopColor="#71351f" /></linearGradient></defs>
    <ellipse cx="42" cy="72" rx="27" ry="5" fill="#071711" opacity="0.4" />
    <path d="M34 35c2 12-2 21-4 33 6 6 19 6 25 0-3-12-6-22-4-33Z" fill="#d9b879" />
    <path d="M8 31c9-18 24-24 36-20 11-4 27 4 33 21-18 8-50 8-69-1Z" fill="url(#milkcap-cap)" />
    <path d="M10 31c19 6 45 6 65 0-8 8-18 13-32 13S18 40 10 31Z" fill="#d98a49" />
    <path d="M20 33 36 43m0-9 5 10m10-10-5 10m20-11L52 43" stroke="#7c3d25" strokeWidth="1.4" opacity="0.7" />
    <ellipse cx="43" cy="20" rx="20" ry="8" fill="none" stroke="#efad61" strokeWidth="3" opacity="0.55" />
    <ellipse cx="43" cy="21" rx="9" ry="3" fill="#864126" opacity="0.72" />
  </>;
}

function FlyAgaric() {
  return <>
    <defs><linearGradient id="fly-cap" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ef6546" /><stop offset="0.55" stopColor="#b92f25" /><stop offset="1" stopColor="#701d1c" /></linearGradient></defs>
    <ellipse cx="43" cy="73" rx="28" ry="4" fill="#071711" opacity="0.42" />
    <path d="M36 31c2 9 0 25-4 37 5 7 19 7 25 0-4-12-6-28-3-37Z" fill="#eee4c8" />
    <path d="M32 49c9 4 18 4 27 0-3 6-8 8-14 8s-11-2-13-8Z" fill="#d4c8a8" />
    <path d="M8 33C12 13 27 5 44 5c19 0 33 11 36 29-19 7-52 7-72-1Z" fill="url(#fly-cap)" />
    <path d="M10 33c20 6 48 6 68 0-7 7-20 10-34 10S17 40 10 33Z" fill="#84251f" />
    <g fill="#f5e8c5"><circle cx="23" cy="24" r="3.2" /><circle cx="35" cy="12" r="3" /><circle cx="47" cy="22" r="2.8" /><circle cx="60" cy="13" r="2.7" /><circle cx="69" cy="27" r="2.5" /><circle cx="34" cy="30" r="2.2" /></g>
  </>;
}

function Chanterelle() {
  return <>
    <defs><linearGradient id="chant-gold" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ffd36b" /><stop offset="0.55" stopColor="#e59c32" /><stop offset="1" stopColor="#a86222" /></linearGradient></defs>
    <ellipse cx="43" cy="72" rx="28" ry="5" fill="#071711" opacity="0.4" />
    <path d="M33 31c5 10 2 24-4 37 8 6 21 6 29 0-7-14-10-27-5-39Z" fill="url(#chant-gold)" />
    <path d="M13 28c5-12 13-18 23-15 6-9 15-8 21 0 10-3 18 4 18 16-12 1-18 8-30 7-12 2-20-6-32-8Z" fill="#efa63c" />
    <path d="M15 29c10 0 18 9 29 7 12 2 20-7 29-7-5 11-17 16-29 16S20 40 15 29Z" fill="#c97a25" />
    <path d="M23 31c7 6 10 11 13 24m2-19 3 23m9-23-3 23m16-28c-7 7-10 13-12 24" fill="none" stroke="#7f481d" strokeWidth="1.8" opacity="0.72" />
  </>;
}

function DeathCap() {
  return <>
    <defs><linearGradient id="death-cap" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#d6d59c" /><stop offset="0.5" stopColor="#969451" /><stop offset="1" stopColor="#54552e" /></linearGradient></defs>
    <ellipse cx="43" cy="73" rx="29" ry="4" fill="#071711" opacity="0.42" />
    <path d="M37 30c2 12 0 27-4 38 4 4 17 4 22 0-4-12-6-27-3-38Z" fill="#eee8cd" />
    <path d="M29 68c-3 3-5 7-3 9h36c2-3-2-7-7-10-8 4-17 4-26 1Z" fill="#d8d2b7" />
    <path d="M30 47c9 5 19 5 29 0-3 7-8 9-14 9s-12-2-15-9Z" fill="#c9c2a8" />
    <path d="M10 32C15 14 29 6 45 6c18 0 31 10 34 27-18 7-50 7-69-1Z" fill="url(#death-cap)" />
    <path d="M12 32c18 6 46 6 65 0-8 8-19 11-33 11S20 40 12 32Z" fill="#eee7c9" />
    <path d="M25 20c12-7 25-7 39 0" fill="none" stroke="#edf0c2" strokeWidth="4" strokeLinecap="round" opacity="0.32" />
  </>;
}

function Cluster() {
  return <>
    <defs><linearGradient id="cluster-cap" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#f0aa46" /><stop offset="0.55" stopColor="#c46a27" /><stop offset="1" stopColor="#74351d" /></linearGradient></defs>
    <ellipse cx="43" cy="72" rx="34" ry="5" fill="#071711" opacity="0.44" />
    <g transform="translate(1 8) rotate(-12 23 40)"><path d="M19 26c2 11 0 25-2 36h13c-3-13-4-26-1-37Z" fill="#d79a55" /><path d="M7 26C9 13 17 7 25 7s16 7 18 20c-10 5-26 5-36-1Z" fill="url(#cluster-cap)" /><path d="M9 26c10 4 22 4 32 0-4 5-10 8-16 8s-12-3-16-8Z" fill="#8f421f" /></g>
    <g transform="translate(30 0) rotate(9 24 40)"><path d="M20 28c2 11-1 25-3 39h14c-3-14-4-28-1-40Z" fill="#e0a45b" /><path d="M7 28C9 13 17 5 25 5s17 8 19 24c-10 5-27 5-37-1Z" fill="url(#cluster-cap)" /><path d="M9 28c10 4 23 4 33 0-4 6-10 8-17 8s-12-2-16-8Z" fill="#91421f" /></g>
    <g transform="translate(20 21) scale(.72)"><path d="M20 28c2 11-1 25-3 39h14c-3-14-4-28-1-40Z" fill="#e0a45b" /><path d="M7 28C9 13 17 5 25 5s17 8 19 24c-10 5-27 5-37-1Z" fill="#dc7b2b" /></g>
  </>;
}

function RoyalAmanita() {
  return <>
    <defs><linearGradient id="royal-cap" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ffca4d" /><stop offset="0.5" stopColor="#e67922" /><stop offset="1" stopColor="#9f3e1f" /></linearGradient></defs>
    <ellipse cx="43" cy="73" rx="29" ry="4" fill="#071711" opacity="0.42" />
    <path d="M36 31c2 11 0 25-4 37 5 5 19 5 25 0-4-12-6-26-3-37Z" fill="#edbd3f" />
    <path d="M29 68c-4 4-5 7-3 9h37c1-3-3-7-8-10-7 4-17 4-26 1Z" fill="#f2ead0" />
    <path d="M31 47c9 5 19 5 28 0-3 7-8 9-14 9s-11-2-14-9Z" fill="#df9d2f" />
    <path d="M9 33C13 14 29 5 45 5c18 0 31 11 34 29-19 7-51 7-70-1Z" fill="url(#royal-cap)" />
    <path d="M11 33c19 6 47 6 66 0-7 7-19 10-33 10S18 40 11 33Z" fill="#f0bc3c" />
    <path d="M24 18c12-8 28-8 41 0" fill="none" stroke="#ffd875" strokeWidth="4" strokeLinecap="round" opacity="0.36" />
  </>;
}

function Parasol() {
  return <>
    <defs><linearGradient id="parasol-cap" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ead8ae" /><stop offset="0.58" stopColor="#b99a69" /><stop offset="1" stopColor="#755034" /></linearGradient></defs>
    <ellipse cx="43" cy="74" rx="27" ry="3.5" fill="#071711" opacity="0.42" />
    <path d="M39 26c2 14 0 28-2 45 4 3 10 3 14 0-3-16-5-31-2-45Z" fill="#e5d7b5" />
    <path d="M38 43c5 3 10 3 15 0-1 5-4 7-8 7s-6-2-7-7Z" fill="#b39769" />
    <path d="M7 31C15 14 29 8 43 8c16 0 29 8 35 24-19 7-51 7-71-1Z" fill="url(#parasol-cap)" />
    <path d="M10 31c18 5 46 5 65 0-8 7-19 10-32 10S18 38 10 31Z" fill="#d6c399" />
    <g fill="#785239"><ellipse cx="43" cy="12" rx="6" ry="4" /><path d="m22 22 8-4 5 5-9 4Zm25-2 8-4 5 5-9 4Zm13 8 7-3 4 4-8 3Z" /></g>
    <path d="M42 50v17m-4-10 10 6m-9-2 10 6" stroke="#9f825c" strokeWidth="1.2" opacity="0.75" />
  </>;
}

function Inkcap() {
  return <>
    <defs><linearGradient id="inkcap-white" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fffbea" /><stop offset="0.65" stopColor="#d8d0bc" /><stop offset="1" stopColor="#8d8980" /></linearGradient></defs>
    <ellipse cx="43" cy="73" rx="22" ry="4" fill="#071711" opacity="0.42" />
    <path d="M38 37c2 10 0 22-2 34 4 3 10 3 14 0-3-12-4-24-2-34Z" fill="#eee8d6" />
    <path d="M24 40C20 27 24 7 42 4c20 2 25 23 20 37-10 5-28 5-38-1Z" fill="url(#inkcap-white)" />
    <path d="M24 39c11 5 27 5 38 0-2 7-8 12-19 12S26 47 24 39Z" fill="#393a38" />
    <path d="m29 17 9-6m-7 16 13-12m-10 21 17-15m-7 17 13-11" stroke="#a9a28f" strokeWidth="3" strokeLinecap="round" opacity="0.76" />
    <path d="M30 42c7 5 19 5 26 0" fill="none" stroke="#171b19" strokeWidth="2" />
  </>;
}

function Morel() {
  return <>
    <defs><linearGradient id="morel-cap" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#d7a856" /><stop offset="0.55" stopColor="#95703b" /><stop offset="1" stopColor="#4f3b28" /></linearGradient></defs>
    <ellipse cx="43" cy="73" rx="23" ry="4" fill="#071711" opacity="0.42" />
    <path d="M35 42c2 8 0 18-3 28 6 5 17 5 23 0-4-10-6-20-3-29Z" fill="#e0c38e" />
    <path d="M24 42C18 25 26 5 42 3c17 2 27 22 19 40-10 6-27 6-37-1Z" fill="url(#morel-cap)" />
    <g fill="none" stroke="#513d29" strokeWidth="2.4" strokeLinecap="round"><path d="M29 12c8 5 18 5 26 0M24 24c12 6 26 6 38 0M23 36c12 6 26 6 39 0M34 6c-4 12-5 23-2 36m13-38c-3 13-2 26 1 41m10-33c-5 9-6 20-4 31" /></g>
  </>;
}

function Oyster() {
  return <>
    <defs><linearGradient id="oyster-cap" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#c7c6b5" /><stop offset="0.5" stopColor="#777c78" /><stop offset="1" stopColor="#404744" /></linearGradient></defs>
    <ellipse cx="43" cy="72" rx="34" ry="5" fill="#071711" opacity="0.44" />
    <path d="M37 50c2 6 1 13-1 20h12c-2-8-3-15-1-22Z" fill="#ddd9c8" />
    <path d="M12 49C10 32 23 18 42 18c9-10 27-7 32 7 7 17-9 32-32 31-12 1-23-1-30-7Z" fill="url(#oyster-cap)" />
    <path d="M15 48c15 6 39 8 56-20-6 24-25 33-44 29-6-1-10-4-12-9Z" fill="#d8d5c4" />
    <path d="M24 49c9-1 22-4 38-17M31 53c10-3 21-8 32-18M41 54c8-5 15-11 21-19" fill="none" stroke="#8f9189" strokeWidth="1.5" />
    <path d="M7 39c-1-12 9-20 21-19 5 0 9 2 12 5-13 0-23 6-28 17Z" fill="#8f9691" />
  </>;
}

function Russula() {
  return <>
    <defs><linearGradient id="russula-cap" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#b9c285" /><stop offset="0.5" stopColor="#788153" /><stop offset="1" stopColor="#455136" /></linearGradient></defs>
    <ellipse cx="43" cy="73" rx="28" ry="4" fill="#071711" opacity="0.42" />
    <path d="M36 33c2 10 0 23-3 36 5 5 18 5 23 0-4-13-5-26-2-36Z" fill="#eee7cf" />
    <path d="M9 33C14 16 29 8 44 8c17 0 31 9 35 26-19 7-51 7-70-1Z" fill="url(#russula-cap)" />
    <path d="M11 33c19 6 47 6 66 0-8 8-19 11-33 11S19 40 11 33Z" fill="#ece6cf" />
    <g fill="none" stroke="#d1d7a6" strokeWidth="2" opacity="0.72"><path d="m20 23 8-6 8 4-3 8-9 1Zm20-8 8-4 7 6-4 8-9-2Zm16 12 8-5 8 5-5 7-9-1Z" /></g>
  </>;
}

function Yellowfoot() {
  return <>
    <defs>
      <linearGradient id="yellowfoot-cap" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#b58a4d" /><stop offset="0.52" stopColor="#745332" /><stop offset="1" stopColor="#3e3025" /></linearGradient>
      <linearGradient id="yellowfoot-stem" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#b26e22" /><stop offset="0.5" stopColor="#f0b83e" /><stop offset="1" stopColor="#8b521e" /></linearGradient>
    </defs>
    <ellipse cx="43" cy="73" rx="30" ry="4" fill="#071711" opacity="0.42" />
    <g transform="translate(-2 5) rotate(-6 30 44)">
      <path d="M27 31c4 12 1 25-3 38 5 4 12 4 17 0-4-13-6-27-2-39Z" fill="url(#yellowfoot-stem)" />
      <path d="M10 28c5-10 12-14 19-11 5-6 12-5 16 1 7-2 13 3 14 11-9 1-14 7-23 6-9 1-16-5-26-7Z" fill="url(#yellowfoot-cap)" />
      <path d="M13 29c8 1 14 7 23 6 9 1 14-5 21-6-5 8-13 12-22 12S18 37 13 29Z" fill="#b98742" />
      <path d="M20 30c5 5 8 9 10 18m8-13-2 15m14-20c-5 5-8 10-10 17" fill="none" stroke="#654527" strokeWidth="1.4" opacity="0.78" />
    </g>
    <g transform="translate(35 17) scale(.72) rotate(8 28 39)">
      <path d="M25 28c4 12 1 26-3 40 5 4 13 4 18 0-4-14-6-28-2-41Z" fill="url(#yellowfoot-stem)" />
      <path d="M8 26c5-11 13-15 21-11 5-7 13-6 17 1 8-2 14 3 15 12-10 1-15 7-24 6-10 2-18-5-29-8Z" fill="url(#yellowfoot-cap)" />
      <path d="M11 27c9 1 16 8 26 7 9 1 15-6 22-6-5 9-14 13-23 13S17 37 11 27Z" fill="#b98742" />
    </g>
  </>;
}

function FairyRing() {
  return <>
    <defs>
      <linearGradient id="fairy-ring-cap" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#ead39d" /><stop offset="0.58" stopColor="#b88a55" /><stop offset="1" stopColor="#6c4930" /></linearGradient>
    </defs>
    <ellipse cx="43" cy="73" rx="31" ry="4" fill="#071711" opacity="0.42" />
    <g transform="translate(1 11) rotate(-7 24 38)">
      <path d="M21 27c2 12 0 25-2 37 3 3 8 3 11 0-2-13-4-26-1-38Z" fill="#dbc498" />
      <path d="M7 27c4-11 12-17 20-17s17 6 20 18c-10 5-29 5-40-1Z" fill="url(#fairy-ring-cap)" />
      <path d="M9 27c10 4 25 4 36 0-5 6-12 8-18 8s-13-2-18-8Z" fill="#d9bd84" />
      <ellipse cx="27" cy="14" rx="7" ry="3" fill="#8c613a" opacity="0.62" />
    </g>
    <g transform="translate(31 1) rotate(8 25 41)">
      <path d="M22 29c2 13 0 27-2 40 3 3 8 3 12 0-3-14-4-28-1-41Z" fill="#e0c99c" />
      <path d="M7 29C11 16 19 9 28 9s18 7 21 21c-11 5-31 5-42-1Z" fill="url(#fairy-ring-cap)" />
      <path d="M9 29c11 4 27 4 38 0-5 6-12 9-19 9s-14-3-19-9Z" fill="#dec18a" />
      <ellipse cx="28" cy="14" rx="7" ry="3" fill="#8b6039" opacity="0.6" />
    </g>
    <g transform="translate(52 28) scale(.58)">
      <path d="M22 29c2 13 0 27-2 40h12c-3-14-4-28-1-41Z" fill="#d8c091" />
      <path d="M7 29C11 16 19 9 28 9s18 7 21 21c-11 5-31 5-42-1Z" fill="#b98c58" />
    </g>
  </>;
}
