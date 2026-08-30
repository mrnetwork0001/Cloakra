/**
 * Section diagrams. Each one shows the actual mechanism of the section it
 * sits in, using one consistent visual grammar:
 *   solid stroke + readable text = public on-chain
 *   dashed stroke + masked dots  = inside the pool, unreadable
 * They are diagrams, not screenshots, and carry no real balances.
 */

const S = {
  wire: "rgba(255,255,255,0.28)",
  wireDim: "rgba(255,255,255,0.14)",
  box: "rgba(255,255,255,0.05)",
  label: "rgba(255,255,255,0.55)",
  faint: "rgba(255,255,255,0.3)",
};

function Frame({ children, viewBox }: { children: React.ReactNode; viewBox: string }) {
  return (
    <svg
      viewBox={viewBox}
      className="h-full w-full"
      fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
      aria-hidden
    >
      {children}
    </svg>
  );
}

/** Public deposit entering the pool - everything visible. */
export function ShieldDiagram() {
  return (
    <Frame viewBox="0 0 420 170">
      <rect x="14" y="52" width="130" height="62" rx="10" fill={S.box} stroke={S.wire} />
      <text x="30" y="76" fontSize="11" fill={S.label}>org wallet</text>
      <text x="30" y="95" fontSize="12" fill="#fff">0x17a6…9f35</text>
      <text x="30" y="108" fontSize="11" fill={S.faint}>26 STRK</text>

      <line x1="150" y1="83" x2="256" y2="83" stroke={S.wire} strokeWidth="1.5" />
      <path d="M256 83 l-8 -4 v8 z" fill={S.wire} />
      <text x="168" y="74" fontSize="10" fill={S.faint}>public: address + amount</text>

      <rect x="264" y="38" width="142" height="90" rx="12" fill={S.box} stroke={S.wire} />
      <text x="282" y="62" fontSize="11" fill={S.label}>STRK20 pool</text>
      <rect x="282" y="74" width="106" height="34" rx="7" stroke={S.wireDim} strokeDasharray="4 3" fill="none" />
      <text x="296" y="96" fontSize="13" fill={S.faint}>•••• note</text>
    </Frame>
  );
}

/** One shielded balance fanning into N unreadable recipient notes. */
export function SplitDiagram() {
  const ys = [40, 70, 100, 130];
  return (
    <Frame viewBox="0 0 420 170">
      <rect x="10" y="20" width="400" height="132" rx="12" stroke={S.wireDim} strokeDasharray="5 4" fill="none" />
      <text x="24" y="40" fontSize="10" fill={S.faint}>inside the pool - unreadable</text>

      <rect x="30" y="70" width="96" height="42" rx="9" fill={S.box} stroke={S.wire} />
      <text x="46" y="88" fontSize="11" fill={S.label}>balance</text>
      <text x="46" y="103" fontSize="12" fill="#fff">••••</text>

      {ys.map((y) => (
        <g key={y}>
          <path
            d={`M130 91 C 190 91, 200 ${y + 14}, 258 ${y + 14}`}
            stroke={S.wireDim}
            strokeDasharray="4 3"
            fill="none"
          />
          <rect x="262" y={y} width="128" height="28" rx="7" fill={S.box} stroke={S.wireDim} />
          <text x="276" y={y + 19} fontSize="11" fill={S.faint}>0x•••• · ••••</text>
        </g>
      ))}
      <text x="262" y="18" fontSize="10" fill={S.faint}>one atomic transaction</text>
    </Frame>
  );
}

/** Withdrawal out: public leg visible, link back to the deposit severed. */
export function UnshieldDiagram() {
  return (
    <Frame viewBox="0 0 420 170">
      <rect x="14" y="38" width="132" height="90" rx="12" fill={S.box} stroke={S.wire} />
      <text x="32" y="62" fontSize="11" fill={S.label}>STRK20 pool</text>
      <rect x="32" y="74" width="96" height="34" rx="7" stroke={S.wireDim} strokeDasharray="4 3" fill="none" />
      <text x="46" y="96" fontSize="13" fill={S.faint}>•••• note</text>

      <line x1="152" y1="83" x2="258" y2="83" stroke={S.wire} strokeWidth="1.5" />
      <path d="M258 83 l-8 -4 v8 z" fill={S.wire} />
      <text x="168" y="74" fontSize="10" fill={S.faint}>public: address + amount</text>

      <rect x="266" y="52" width="140" height="62" rx="10" fill={S.box} stroke={S.wire} />
      <text x="282" y="76" fontSize="11" fill={S.label}>recipient wallet</text>
      <text x="282" y="95" fontSize="12" fill="#fff">0x••••</text>
      <text x="282" y="108" fontSize="11" fill={S.faint}>2 STRK</text>

      {/* severed link back to the deposit */}
      <path d="M300 128 C 240 158, 120 158, 70 132" stroke={S.wireDim} strokeDasharray="3 5" fill="none" />
      <line x1="176" y1="140" x2="196" y2="152" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      <line x1="196" y1="140" x2="176" y2="152" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
      <text x="206" y="152" fontSize="10" fill={S.faint}>no on-chain link back</text>
    </Frame>
  );
}

/** Hero: the whole lifecycle in one picture. */
export function FlowDiagram() {
  const ys = [46, 74, 102];
  return (
    <Frame viewBox="0 0 640 210">
      <rect x="16" y="70" width="118" height="58" rx="10" fill={S.box} stroke={S.wire} />
      <text x="32" y="92" fontSize="11" fill={S.label}>treasury</text>
      <text x="32" y="112" fontSize="12" fill="#fff">26 STRK</text>
      <line x1="140" y1="99" x2="212" y2="99" stroke={S.wire} strokeWidth="1.5" />
      <path d="M212 99 l-8 -4 v8 z" fill={S.wire} />
      <text x="146" y="90" fontSize="9" fill={S.faint}>public</text>

      <rect x="220" y="28" width="200" height="150" rx="14" stroke={S.wireDim} strokeDasharray="5 4" fill="none" />
      <text x="236" y="48" fontSize="10" fill={S.faint}>STRK20 pool - unreadable</text>
      <rect x="238" y="82" width="66" height="34" rx="8" fill={S.box} stroke={S.wireDim} />
      <text x="254" y="104" fontSize="12" fill={S.faint}>••••</text>
      {ys.map((y) => (
        <g key={y}>
          <path d={`M306 99 C 336 99, 340 ${y + 12}, 366 ${y + 12}`} stroke={S.wireDim} strokeDasharray="4 3" fill="none" />
          <rect x="368" y={y} width="44" height="24" rx="6" fill={S.box} stroke={S.wireDim} />
          <text x="380" y={y + 16} fontSize="10" fill={S.faint}>••••</text>
        </g>
      ))}

      {ys.map((y, i) => (
        <g key={`out-${y}`}>
          <line x1="424" y1={y + 12} x2="486" y2={y + 12} stroke={S.wire} strokeWidth="1.2" />
          <path d={`M486 ${y + 12} l-7 -3.5 v7 z`} fill={S.wire} />
          <rect x="492" y={y} width="132" height="24" rx="6" fill={S.box} stroke={S.wire} />
          <text x="504" y={y + 16} fontSize="10" fill={S.faint}>
            0x•••• · {["4", "9", "7"][i]} STRK
          </text>
        </g>
      ))}
      <text x="492" y="152" fontSize="9" fill={S.faint}>recipients unshield on their own schedule</text>
    </Frame>
  );
}

/** Small module glyphs. */
export function ModuleGlyph({ kind }: { kind: "split" | "bounty" | "grant" }) {
  if (kind === "split") {
    return (
      <Frame viewBox="0 0 200 90">
        <circle cx="34" cy="45" r="11" fill={S.box} stroke={S.wire} />
        {[20, 45, 70].map((y) => (
          <g key={y}>
            <path d={`M46 45 C 80 45, 90 ${y}, 122 ${y}`} stroke={S.wireDim} strokeDasharray="4 3" fill="none" />
            <rect x="126" y={y - 9} width="52" height="18" rx="5" fill={S.box} stroke={S.wireDim} />
            <text x="140" y={y + 4} fontSize="9" fill={S.faint} fontFamily="ui-monospace, monospace">••••</text>
          </g>
        ))}
      </Frame>
    );
  }
  if (kind === "bounty") {
    return (
      <Frame viewBox="0 0 200 90">
        <rect x="14" y="32" width="56" height="26" rx="7" fill={S.box} stroke={S.wire} />
        <text x="24" y="49" fontSize="9" fill={S.faint} fontFamily="ui-monospace, monospace">program</text>
        <path d="M74 45 C 100 45, 106 45, 124 45" stroke={S.wireDim} strokeDasharray="4 3" fill="none" />
        <path d="M150 22 l16 6v12c0 9-6.5 16.5-16 20-9.5-3.5-16-11-16-20V28z" fill="none" stroke={S.wire} strokeLinejoin="round" />
        <circle cx="150" cy="45" r="5" fill={S.wire} />
      </Frame>
    );
  }
  return (
    <Frame viewBox="0 0 200 90">
      <rect x="14" y="30" width="46" height="30" rx="7" fill={S.box} stroke={S.wire} />
      <text x="24" y="49" fontSize="9" fill={S.faint} fontFamily="ui-monospace, monospace">round</text>
      {[
        [96, 18],
        [96, 50],
        [150, 18],
        [150, 50],
      ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="44" height="22" rx="5" fill={S.box} stroke={S.wireDim} />
          <text x={x + 12} y={y + 15} fontSize="9" fill={S.faint} fontFamily="ui-monospace, monospace">••••</text>
        </g>
      ))}
      <path d="M62 45 C 76 45, 80 29, 94 29" stroke={S.wireDim} strokeDasharray="4 3" fill="none" />
      <path d="M62 45 C 76 45, 80 61, 94 61" stroke={S.wireDim} strokeDasharray="4 3" fill="none" />
    </Frame>
  );
}
