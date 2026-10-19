# pipelines

Python scripts run at build time, never in the browser. They fetch from PubChem, scrape CCCBDB, run PySCF optimisations, turn cube files into orbital meshes and drive the Blender import and render scripts. Their output is committed under `content/` and read through the cited-data lookup (ADR 0002).

Empty in the walking skeleton; the geometry (#67), orbital (#70) and Blender (#69) tickets fill it.
