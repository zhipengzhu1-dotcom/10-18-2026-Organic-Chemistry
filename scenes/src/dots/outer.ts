// How many outer (valence) electrons each element in Lesson 0's dot drawings brings: its
// place in the periodic table (group), a count, not a measurement. The give-or-take Scene,
// whose argument rests on these counts, reads them from the cited data instead
// (ionization-li-f/<el>.valence, from NIST ASD ground configurations); a test checks they agree.
export const OUTER: Record<string, number> = { H: 1, C: 4, N: 5, O: 6, F: 7, Ne: 8 };
