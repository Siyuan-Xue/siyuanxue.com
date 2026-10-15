const ribbon = [
  'M 24 24 C 3 5 7 40 24 24 C 41 8 45 42 24 24 C 5 43 41 43 24 24 C 7 5 42 5 24 24',
  'M 24 24 C 0 17 18 45 24 24 C 30 3 48 30 24 24 C 6 49 47 33 24 24 C 1 15 32 0 24 24',
  'M 24 24 C 9 0 1 34 24 24 C 47 14 34 48 24 24 C 0 33 35 49 24 24 C 13 0 48 16 24 24',
];
// Three 1.25s morphs with a sine in-out curve, inside one slow 12s turn.
const morph = { values: [...ribbon, ribbon[0]].join(';'), keyTimes: '0;0.3333;0.6667;1', keySplines: Array(3).fill('0.37 0 0.63 1').join(';') };

/** A continuous ink ribbon drawn with native SVG animation; static under reduced motion. */
export function ThinkingIndicator({ label, reduceMotion }: { label: string; reduceMotion: boolean }) {
  return <span aria-label={label} className="xue-thinking" data-xue-loader="" role="status">
    <svg aria-hidden="true" fill="none" height="40" viewBox="0 0 48 48" width="40">
      <g>
        {!reduceMotion && <animateTransform attributeName="transform" dur="12s" from="0 24 24" repeatCount="indefinite" to="360 24 24" type="rotate" />}
        <path d={ribbon[0]} stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
          {!reduceMotion && <animate attributeName="d" calcMode="spline" dur="3.75s" keySplines={morph.keySplines} keyTimes={morph.keyTimes} repeatCount="indefinite" values={morph.values} />}
        </path>
      </g>
    </svg>
  </span>;
}
