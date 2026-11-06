# assets/pdb

Low-polygon surfaces of real molecular machines for the nano mode. This folder is filled by

    python3 tools/pdb_shapes.py

run from the repo root on a machine with internet access (it downloads mmCIF files from files.rcsb.org; needs numpy).
It writes `shapes.json` (the meshes, quantised) and `CREDITS.md` (the PDB entries and their primary citations).
The game loads `shapes.json` when it is served from a web address; until the file exists the hand-made shapes are used.
PDB data is released by the wwPDB under CC0 1.0.
