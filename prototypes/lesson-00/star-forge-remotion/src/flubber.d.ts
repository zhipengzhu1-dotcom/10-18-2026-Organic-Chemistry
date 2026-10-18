declare module 'flubber' {
  export function fromCircle(x: number, y: number, r: number, to: string, opts?: {maxSegmentLength?: number; string?: boolean}): (t: number) => string;
}
