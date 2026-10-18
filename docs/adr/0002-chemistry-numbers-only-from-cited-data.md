# Chemistry numbers come only from cited data files

Every geometry or property number (bond lengths, radii, angles, pKa, colours tied to elements) lives in a data file, either produced by `pipelines/` from PubChem and standard tables or entered by hand under `content/<subject>/data/`, and each value carries its source and licence. Scenes, Problems and the 3Dmol.js "Explore in 3D" viewer read numbers only through a lookup that returns the value with its citation, and the Source note is generated from that. We chose this over letting authors tune values "to look right" because accuracy is a core promise of the site, and a chemist owner must be able to trace any number to its source.

Geometry shown to Students is **experimental** (NIST CCCBDB) where it exists, not PubChem's computed MMFF94 conformers: PubChem gives methane's C–H as 1.092 Å, while experiment gives 1.087 Å. CCCBDB counts only when it has a complete Cartesian table. Every other molecule gets our own PySCF B3LYP/cc-pVTZ optimisation, labelled "computed", and one molecule never mixes the two sources (see "Research: NIST CCCBDB coverage and a fallback geometry source", #19).

## Consequences

A lint check flags chemistry-looking numeric constants in Scene code. Library defaults (e.g. 3Dmol.js colours and radii) are overridden with our cited values. Third-party data keeps its own licence, recorded per value, separate from the content's CC BY-NC-SA.
