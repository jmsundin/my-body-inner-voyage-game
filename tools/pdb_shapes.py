#!/usr/bin/env python3
"""Low-polygon surfaces of real molecular machines for Inner Voyage's nano mode, built from Protein Data Bank entries.

For each machine in SHAPES the script downloads the first biological assembly (mmCIF) from the RCSB PDB, keeps the heavy
atoms, lays a Gaussian density over them, extracts the isosurface (marching tetrahedra), smooths it, decimates it with
quadric edge collapses down to a small triangle budget, orients it (long axis, heavy end), colours it by what each patch
of surface is made of (protein, nucleic acid, other) and writes everything quantised to:

  assets/pdb/shapes.json     one entry per kind: positions (int16), indices (uint16), groups (uint8), credit
  assets/pdb/CREDITS.md      the PDB entries used, with their primary citations

The game (inner-voyage-game.html, pdbLoad) fetches shapes.json when it is served from a web address and swaps the real
shape in for the hand-made one; without the file the hand-made shapes stay.

Needs Python 3.8+ and numpy; nothing else. Run from the repo root on a machine that can reach files.rcsb.org
(the cloud sessions cannot):

  python3 tools/pdb_shapes.py              # every entry
  python3 tools/pdb_shapes.py ribo atps    # only these kinds
  python3 tools/pdb_shapes.py --demo       # no network: a synthetic structure through the whole pipeline (for tests)

Downloads are cached in tools/pdb_cache/ (not committed). PDB data is released under CC0 1.0 by the wwPDB.
"""
import base64
import gzip
import heapq
import json
import math
import os
import sys
import time
import urllib.request

import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "assets", "pdb")
CACHE = os.path.join(ROOT, "tools", "pdb_cache")
UA = "InnerVoyagePDBShapes/1.0 (educational game; https://github.com/jmsundin/my-body-inner-voyage-game)"

# kind in CELLS_NC → PDB entry. tris = triangle budget. orient: long axis → 'x' (drifting) or 'y' (sits on a membrane, +y into the lumen);
# heavy_up puts the heavier half toward +y. Colours are hex strings for groups 0 protein, 1 nucleic acid, 2 other (lipid, ligand, sugar).
SHAPES = [
    dict(kind="ribo", pdb="6QZP", name="Human 80S ribosome", tris=2400, orient="x", colors=["e0b07a", "b8824e", "d0d0d0"],
         note="rRNA darker, proteins lighter"),
    dict(kind="riboW", pdb="6QZP", name="Human 80S ribosome (membrane-bound)", tris=2000, orient="y", heavy_up=False, colors=["e0b07a", "b8824e", "d0d0d0"],
         note="the large subunit sits on the ER membrane"),
    dict(kind="rsub", pdb="6QZP", name="Human 80S ribosome (pre-ribosomal particle stands in)", tris=1200, orient="x", colors=["d8a070", "b0784a", "d0d0d0"]),
    dict(kind="atps", pdb="5ARA", name="Bovine mitochondrial ATP synthase", tris=1400, orient="y", heavy_up=True, colors=["f0c070", "ffffff", "c0b0a0"],
         note="F1 head in the matrix, c-ring in the inner membrane"),
    dict(kind="cx1", pdb="5LNK", name="Ovine respiratory complex I", tris=1200, orient="y", heavy_up=True, colors=["e08878", "ffffff", "c09080"],
         note="L-shape: membrane arm and matrix arm"),
    dict(kind="cx4", pdb="1V54", name="Bovine cytochrome c oxidase", tris=800, orient="y", heavy_up=True, colors=["5a9ccc", "ffffff", "ff6060"]),
    dict(kind="cytc", pdb="1HRC", name="Horse heart cytochrome c", tris=300, orient="x", colors=["ff5050", "ffffff", "ff9030"]),
    dict(kind="kin", pdb="3KIN", name="Rat kinesin motor domain dimer", tris=800, orient="x", colors=["ffa040", "ffffff", "ffe0a0"],
         note="the two motor heads with the start of the neck; the long stalk and the cargo are not in the crystal"),
    dict(kind="prot", pdb="5GJR", name="Human 26S proteasome", tris=1600, orient="x", colors=["90a8e8", "ffffff", "c0c8f0"]),
    dict(kind="cyp", pdb="1TQN", name="Human cytochrome P450 3A4", tris=500, orient="y", heavy_up=True, colors=["d8a050", "ffffff", "e04040"],
         note="the haem shows as the 'other' colour"),
    dict(kind="pol2", pdb="1WCM", name="Yeast RNA polymerase II (12 subunits)", tris=1200, orient="x", colors=["9078e8", "ff80b0", "c0c0c0"]),
    dict(kind="splc", pdb="3JB9", name="Fission-yeast spliceosome (intron lariat complex)", tris=1600, orient="x", colors=["a088e0", "ff80b0", "c0c0c0"]),
    dict(kind="imp", pdb="1QGK", name="Human importin β with the importin α IBB domain", tris=600, orient="x", colors=["70e0c0", "ffffff", "c0c0c0"]),
    dict(kind="nucs", pdb="1KX5", name="Nucleosome core particle", tris=900, orient="x", colors=["d070c0", "ff90d0", "c0c0c0"],
         note="histone octamer with 147 bp of DNA"),
    dict(kind="gkN", pdb="1V4S", name="Human glucokinase (closed, with glucose)", tris=500, orient="x", colors=["50d0f0", "ffffff", "ffffff"]),
    dict(kind="albN", pdb="1AO6", name="Human serum albumin", tris=600, orient="x", colors=["f0e0a8", "ffffff", "ffd070"]),
    dict(kind="cps1", pdb="5DOT", name="Human carbamoyl phosphate synthetase 1", tris=600, orient="x", colors=["80c8ff", "ffffff", "ffffff"]),
    dict(kind="enz", pdb="4ALD", name="Human muscle aldolase A (tetramer)", tris=500, orient="x", colors=["8890e8", "ffffff", "ffffff"]),
    dict(kind="tcaN", pdb="1CTS", name="Pig heart citrate synthase (dimer)", tris=500, orient="x", colors=["f0a070", "ffffff", "ffffff"]),
]
SIGMA, ISO, GRID_N, PAD = 2.0, 0.7, 44, 6.0   # Gaussian width (Å), isovalue (a protein interior sums to ≈3), voxels along the longest axis, padding (Å)


# ---------------------------------------------------------------- mmCIF -------------------------------------------------------------
def fetch(pdb):
    os.makedirs(CACHE, exist_ok=True)
    for name in (f"{pdb}-assembly1.cif.gz", f"{pdb}.cif.gz"):
        path = os.path.join(CACHE, name)
        if os.path.exists(path):
            return path
        url = "https://files.rcsb.org/download/" + name
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=180) as r, open(path + ".part", "wb") as f:
                while True:
                    chunk = r.read(1 << 20)
                    if not chunk:
                        break
                    f.write(chunk)
            os.replace(path + ".part", path)
            return path
        except Exception as e:  # try the plain entry file next
            print(f"  {name}: {e}")
    raise RuntimeError(f"could not download {pdb}")


def cif_tokens(text):
    """Tokens of a small mmCIF block: ;-delimited text fields, quoted strings, bare words."""
    out, lines, i = [], text.split("\n"), 0
    while i < len(lines):
        line = lines[i]
        if line.startswith(";"):
            buf = [line[1:]]
            i += 1
            while i < len(lines) and not lines[i].startswith(";"):
                buf.append(lines[i])
                i += 1
            out.append("\n".join(buf).strip())
            i += 1
            continue
        j, n = 0, len(line)
        while j < n:
            c = line[j]
            if c in " \t":
                j += 1
            elif c == "#":
                break
            elif c in "'\"":
                k = j + 1
                while k < n and not (line[k] == c and (k + 1 == n or line[k + 1] in " \t")):
                    k += 1
                out.append(line[j + 1:k])
                j = k + 1
            else:
                k = j
                while k < n and line[k] not in " \t":
                    k += 1
                out.append(line[j:k])
                j = k
        i += 1
    return out


def parse_block(block):
    """A category block → list of row dicts (works for loops and for single-row key: value blocks)."""
    toks = cif_tokens(block)
    if not toks:
        return []
    if toks[0] == "loop_":
        cols, k = [], 1
        while k < len(toks) and toks[k].startswith("_"):
            cols.append(toks[k].split(".", 1)[1])
            k += 1
        vals = toks[k:]
        return [dict(zip(cols, vals[r:r + len(cols)])) for r in range(0, len(vals) - len(vals) % len(cols), len(cols))]
    row = {}
    for k in range(0, len(toks) - 1, 2):
        if toks[k].startswith("_"):
            row[toks[k].split(".", 1)[1]] = toks[k + 1]
    return [row]


def read_cif(path):
    """Heavy-atom coordinates (model 1), their group (0 protein, 1 nucleic, 2 other), the title and the primary citation."""
    with gzip.open(path, "rt", encoding="utf8", errors="replace") as f:
        text = f.read()
    info, atoms, groups = {"title": "", "cite": ""}, [], []
    poly_type, ent_type = {}, {}
    blocks = text.split("\n#")
    for b in blocks:
        s = b.lstrip("\n")
        if not s or s.startswith("data_"):
            continue
        head = s[:200]
        if head.startswith("loop_\n_atom_site.") or head.startswith("_atom_site."):
            lines = s.split("\n")
            cols, k = [], 1 if lines[0] == "loop_" else 0
            while k < len(lines) and lines[k].startswith("_atom_site."):
                cols.append(lines[k].split(".", 1)[1].strip())
                k += 1
            ci = {c: i for i, c in enumerate(cols)}
            ix, iy, iz = ci["Cartn_x"], ci["Cartn_y"], ci["Cartn_z"]
            isym, ient, icomp = ci.get("type_symbol"), ci.get("label_entity_id"), ci.get("label_comp_id")
            imodel = ci.get("pdbx_PDB_model_num")
            for line in lines[k:]:
                if not line or line[0] in "#_":
                    continue
                t = line.split()
                if len(t) < len(cols):
                    continue
                if imodel is not None and t[imodel] not in ("1", "."):
                    continue
                if isym is not None and t[isym] in ("H", "D"):
                    continue
                if icomp is not None and t[icomp] in ("HOH", "DOD", "WAT"):
                    continue
                atoms.append((float(t[ix]), float(t[iy]), float(t[iz])))
                groups.append(t[ient] if ient is not None else "?")
        elif "_entity_poly." in head[:60]:
            for r in parse_block(s):
                poly_type[r.get("entity_id")] = r.get("type", "")
        elif head.startswith("loop_\n_entity.") or head.startswith("_entity."):
            for r in parse_block(s):
                ent_type[r.get("id")] = r.get("type", "")
        elif "_struct.title" in head[:40]:
            for r in parse_block(s):
                info["title"] = r.get("title", "").replace("\n", " ")
        elif head.startswith("loop_\n_citation.") or head.startswith("_citation."):
            for r in parse_block(s):
                if r.get("id") == "primary":
                    info["cite"] = r
        elif head.startswith("loop_\n_citation_author.") or head.startswith("_citation_author."):
            rows = [r for r in parse_block(s) if r.get("citation_id") == "primary"]
            if rows:
                info["first_author"] = rows[0].get("name", "")
                info["n_authors"] = len(rows)
    if not atoms:
        raise RuntimeError("no atoms found")
    gmap = {}
    for eid, t in poly_type.items():
        gmap[eid] = 1 if "nucleotide" in t else 0
    for eid, t in ent_type.items():
        if eid not in gmap:
            gmap[eid] = 2
    g = np.array([gmap.get(e, 2) for e in groups], dtype=np.uint8)
    xyz = np.array(atoms, dtype=np.float64)
    c = info.get("cite") or {}
    if c:
        fa = info.get("first_author", "")
        who = fa + (" et al." if info.get("n_authors", 1) > 1 else "")
        info["cite"] = f"{who}, {c.get('title', '')}. {c.get('journal_abbrev', '')} {c.get('year', '')}" + \
                       (f", doi:{c.get('pdbx_database_id_DOI')}" if c.get("pdbx_database_id_DOI") not in (None, "?", ".") else "")
    else:
        info["cite"] = ""
    return xyz, g, info


# ---------------------------------------------------------------- density → surface -------------------------------------------------
def density(xyz, g, h):
    lo = xyz.min(0) - PAD
    hi = xyz.max(0) + PAD
    dims = np.ceil((hi - lo) / h).astype(int) + 1
    V = np.zeros(tuple(dims), dtype=np.float32)
    G = np.zeros((3,) + tuple(dims), dtype=np.float32)
    f = (xyz - lo) / h
    i0 = np.floor(f).astype(int)
    k = int(math.ceil(3 * SIGMA / h))
    w0 = 1.0 / (2 * SIGMA * SIGMA)
    for dx in range(-k, k + 2):
        for dy in range(-k, k + 2):
            for dz in range(-k, k + 2):
                ii = i0 + (dx, dy, dz)
                ok = np.all((ii >= 0) & (ii < dims), axis=1)
                if not ok.any():
                    continue
                d2 = ((ii[ok] - f[ok]) ** 2).sum(1) * h * h
                w = np.exp(-d2 * w0).astype(np.float32)
                flat = np.ravel_multi_index(ii[ok].T, dims)
                np.add.at(V.ravel(), flat, w)
                for gi in range(3):
                    sel = g[ok] == gi
                    if sel.any():
                        np.add.at(G[gi].ravel(), flat[sel], w[sel])
    return V, G, lo


def marching_tets(V, iso, lo, h):
    """Isosurface of V at iso as an indexed triangle mesh (vertices welded along cube edges)."""
    nx, ny, nz = V.shape
    idx = np.arange(nx * ny * nz).reshape(nx, ny, nz)
    corners = [idx[:-1, :-1, :-1], idx[1:, :-1, :-1], idx[:-1, 1:, :-1], idx[1:, 1:, :-1],
               idx[:-1, :-1, 1:], idx[1:, :-1, 1:], idx[:-1, 1:, 1:], idx[1:, 1:, 1:]]
    corners = [c.ravel() for c in corners]
    vals = V.ravel()
    TETS = [(0, 1, 3, 7), (0, 1, 5, 7), (0, 2, 3, 7), (0, 2, 6, 7), (0, 4, 5, 7), (0, 4, 6, 7)]
    # per case: list of triangles, each a triple of (tet-vertex a, tet-vertex b) edges
    CASES = {}
    for case in range(1, 15):
        inside = [v for v in range(4) if case >> v & 1]
        outside = [v for v in range(4) if not case >> v & 1]
        if len(inside) == 1 or len(inside) == 3:
            one, three = (inside[0], outside) if len(inside) == 1 else (outside[0], inside)
            CASES[case] = [[(one, three[0]), (one, three[1]), (one, three[2])]]
        else:
            i1, i2 = inside
            o1, o2 = outside
            q = [(i1, o1), (i1, o2), (i2, o2), (i2, o1)]
            CASES[case] = [[q[0], q[1], q[2]], [q[0], q[2], q[3]]]
    keys, tris = [], []
    ncell = corners[0].size
    for tet in TETS:
        cv = [corners[t] for t in tet]
        inside = [vals[c] > iso for c in cv]
        case = inside[0].astype(np.int8) | inside[1] << 1 | inside[2] << 2 | inside[3] << 3
        for c, tl in CASES.items():
            sel = np.nonzero(case == c)[0]
            if not sel.size:
                continue
            for tri in tl:
                ek = []
                for (a, b) in tri:
                    pa, pb = cv[a][sel], cv[b][sel]
                    ek.append(np.minimum(pa, pb).astype(np.int64) * (nx * ny * nz) + np.maximum(pa, pb))
                tris.append(np.stack(ek, 1))
    if not tris:
        raise RuntimeError("empty surface: lower ISO or check the density")
    T = np.concatenate(tris, 0)
    uk, inv = np.unique(T.ravel(), return_inverse=True)
    F = inv.reshape(-1, 3).astype(np.int64)
    pa = uk // (nx * ny * nz)
    pb = uk % (nx * ny * nz)
    Pa = np.stack(np.unravel_index(pa, V.shape), 1).astype(np.float64)
    Pb = np.stack(np.unravel_index(pb, V.shape), 1).astype(np.float64)
    va, vb = vals[pa], vals[pb]
    t = np.clip((iso - va) / np.where(vb - va == 0, 1e-9, vb - va), 0, 1)[:, None]
    P = (Pa + t * (Pb - Pa)) * h + lo
    # orient every triangle outward: along -gradient of the density at its centre
    gx, gy, gz = np.gradient(V)
    cen = P[F].mean(1)
    ci = np.clip(np.round((cen - lo) / h).astype(int), 0, np.array(V.shape) - 1)
    grad = np.stack([gx[ci[:, 0], ci[:, 1], ci[:, 2]], gy[ci[:, 0], ci[:, 1], ci[:, 2]], gz[ci[:, 0], ci[:, 1], ci[:, 2]]], 1)
    F = F[(F[:, 0] != F[:, 1]) & (F[:, 1] != F[:, 2]) & (F[:, 0] != F[:, 2])]
    F = consistent_winding(F)
    n = np.cross(P[F[:, 1]] - P[F[:, 0]], P[F[:, 2]] - P[F[:, 0]])
    cen = P[F].mean(1)
    ci = np.clip(np.round((cen - lo) / h).astype(int), 0, np.array(V.shape) - 1)
    grad = np.stack([gx[ci[:, 0], ci[:, 1], ci[:, 2]], gy[ci[:, 0], ci[:, 1], ci[:, 2]], gz[ci[:, 0], ci[:, 1], ci[:, 2]]], 1)
    if ((n * grad).sum(1) > 0).mean() > 0.5:      # the surface normal must point down the density gradient (outward)
        F = F[:, [0, 2, 1]]
    return P, F


def consistent_winding(F):
    """Flip triangles until every shared edge runs in opposite directions in its two faces (one pass of propagation per component)."""
    F = F.copy()
    m = len(F)
    edge_faces = {}
    for fi in range(m):
        a, b, c = F[fi]
        for u, v in ((a, b), (b, c), (c, a)):
            edge_faces.setdefault((u, v) if u < v else (v, u), []).append(fi)
    seen = np.zeros(m, dtype=bool)
    for start in range(m):
        if seen[start]:
            continue
        seen[start] = True
        stack = [start]
        while stack:
            fi = stack.pop()
            a, b, c = F[fi]
            for u, v in ((a, b), (b, c), (c, a)):
                for fj in edge_faces[(u, v) if u < v else (v, u)]:
                    if seen[fj]:
                        continue
                    x, y, z = F[fj]
                    same = (x, y) == (u, v) or (y, z) == (u, v) or (z, x) == (u, v)   # the neighbour runs the edge the same way: flip it
                    if same:
                        F[fj] = (x, z, y)
                    seen[fj] = True
                    stack.append(fj)
    return F


def taubin(P, F, iters=8, lam=0.5, mu=-0.53):
    n = len(P)
    a = np.concatenate([F[:, 0], F[:, 1], F[:, 2], F[:, 1], F[:, 2], F[:, 0]])
    b = np.concatenate([F[:, 1], F[:, 2], F[:, 0], F[:, 0], F[:, 1], F[:, 2]])
    deg = np.bincount(a, minlength=n).astype(np.float64)
    deg[deg == 0] = 1
    for _ in range(iters):
        for k in (lam, mu):
            s = np.zeros_like(P)
            np.add.at(s, a, P[b])
            P = P + k * (s / deg[:, None] - P)
    return P


def decimate(P, F, target):
    """Quadric-error edge collapse down to about `target` triangles, keeping the mesh manifold and orientation-safe."""
    V = P.copy()
    n = len(V)
    F = [list(map(int, f)) for f in F]
    Q = np.zeros((n, 4, 4))
    for f in F:
        p0, p1, p2 = V[f[0]], V[f[1]], V[f[2]]
        nrm = np.cross(p1 - p0, p2 - p0)
        area = np.linalg.norm(nrm)
        if area < 1e-12:
            continue
        nrm = nrm / area
        pl = np.append(nrm, -nrm.dot(p0))
        K = np.outer(pl, pl) * (area * 0.5)
        Q[f[0]] += K
        Q[f[1]] += K
        Q[f[2]] += K
    vf = [set() for _ in range(n)]
    for fi, f in enumerate(F):
        for v in f:
            vf[v].add(fi)
    alive = [True] * len(F)
    nf = len(F)
    ver = [0] * n

    def cost(a, b):
        Qs = Q[a] + Q[b]
        A = Qs.copy()
        A[3] = (0, 0, 0, 1)
        mid = (V[a] + V[b]) / 2
        cands = [mid, V[a], V[b]]
        try:
            x = np.linalg.solve(A, np.array([0, 0, 0, 1.0]))[:3]
            if np.isfinite(x).all() and np.linalg.norm(x - mid) < 2 * np.linalg.norm(V[a] - V[b]) + 1e-9:
                cands.insert(0, x)
        except np.linalg.LinAlgError:
            pass
        best, bc = None, None
        for c in cands:
            h = np.append(c, 1.0)
            e = float(h @ Qs @ h)
            if best is None or e < best:
                best, bc = e, c
        return best, bc

    heap = []
    seen = set()
    for f in F:
        for a, b in ((f[0], f[1]), (f[1], f[2]), (f[2], f[0])):
            e = (a, b) if a < b else (b, a)
            if e in seen:
                continue
            seen.add(e)
            c, x = cost(*e)
            heapq.heappush(heap, (c, e[0], e[1], 0, 0, tuple(x), 0))

    def tri_normal(f, moved=None, to=None):
        p = [V[v] if v != moved else to for v in f]
        return np.cross(p[1] - p[0], p[2] - p[0])

    while nf > target and heap:
        c, a, b, va, vb, x_t, retry = heapq.heappop(heap)
        x = x_t
        if ver[a] != va or ver[b] != vb or a == b:
            continue
        shared = vf[a] & vf[b]
        if not shared:
            continue
        # link condition: the vertices that neighbour both a and b must be exactly the third corners of the shared faces
        na = {v for fi in vf[a] for v in F[fi]} - {a}
        nb = {v for fi in vf[b] for v in F[fi]} - {b}
        third = {v for fi in shared for v in F[fi]} - {a, b}
        if (na & nb) != third or len(shared) > 2:
            continue
        x = np.array(x)
        ok = True
        for v in (a, b):
            for fi in vf[v]:
                if fi in shared:
                    continue
                n0 = tri_normal(F[fi])
                n1 = tri_normal(F[fi], v, x)
                l1 = np.linalg.norm(n1)
                if l1 < 1e-14 or n0.dot(n1) < 0.2 * np.linalg.norm(n0) * l1:   # the face would turn over or collapse
                    ok = False
                    break
            if not ok:
                break
        if not ok:
            if retry < 2:
                heapq.heappush(heap, (c * 4 + 1e-9, a, b, va, vb, x_t, retry + 1))
            continue
        V[a] = x
        Q[a] = Q[a] + Q[b]
        for fi in list(vf[b]):
            if fi in shared:
                continue
            F[fi] = [a if v == b else v for v in F[fi]]
            vf[a].add(fi)
        for fi in shared:
            alive[fi] = False
            nf -= 1
            for v in F[fi]:
                vf[v].discard(fi)
        vf[b] = set()
        ver[a] += 1
        ver[b] += 1
        for fi in vf[a]:
            for v in F[fi]:
                if v != a:
                    e = (a, v) if a < v else (v, a)
                    cc, xx = cost(*e)
                    heapq.heappush(heap, (cc, e[0], e[1], ver[e[0]], ver[e[1]], tuple(xx), 0))
    F2 = np.array([f for fi, f in enumerate(F) if alive[fi]], dtype=np.int64)
    used, inv = np.unique(F2.ravel(), return_inverse=True)
    return V[used], inv.reshape(-1, 3)


def orient(P, xyz, spec):
    """Rotate with the principal axes: the long axis → spec['orient'] ('x' or 'y'), the heavier half → +y when heavy_up."""
    c = xyz.mean(0)
    cov = np.cov((xyz - c).T)
    w, E = np.linalg.eigh(cov)
    E = E[:, ::-1]                       # columns: long, middle, short axis
    if np.linalg.det(E) < 0:
        E[:, 2] *= -1                    # a proper rotation, never a mirror image
    R = E.T                              # rows: new x = long axis, new y = middle, new z = short
    if spec.get("orient", "x") == "y":
        R = R[[1, 0, 2]]                 # long axis → y
        R[2] *= -1                       # keep det = +1 after the swap
    P2 = (P - c) @ R.T
    A2 = (xyz - c) @ R.T
    if "heavy_up" in spec:
        up = (A2[:, 1] > 0).sum() > (A2[:, 1] < 0).sum()
        if up != bool(spec["heavy_up"]):
            P2[:, 1:] *= -1              # 180° about x
    return P2


def build(spec, xyz, g, info):
    extent = float((xyz.max(0) - xyz.min(0)).max())
    h = max(1.2, (extent + 2 * PAD) / GRID_N)
    V, G, lo = density(xyz, g, h)
    P, F = marching_tets(V, ISO, lo, h)
    # keep the largest connected piece (stray blobs of loose ligands would float beside the machine)
    P, F = largest_component(P, F)
    P = taubin(P, F)
    before = len(F)
    P, F = decimate(P, F, spec["tris"])
    # group per vertex from the per-group densities at the vertex
    ci = np.clip(np.round((P - lo) / h).astype(int), 0, np.array(V.shape) - 1)
    gd = np.stack([G[k][ci[:, 0], ci[:, 1], ci[:, 2]] for k in range(3)], 1)
    grp = gd.argmax(1).astype(np.uint8)
    P = orient(P, xyz, spec)
    size_nm = ((P.max(0) - P.min(0)) / 10).round(1).tolist()
    P -= (P.max(0) + P.min(0)) / 2
    s = float(np.abs(P).max())
    q = np.clip(np.round(P / s * 32767), -32767, 32767).astype("<i2")
    F = F.astype("<u2") if len(P) < 65536 else F.astype("<u4")
    b64 = lambda a: base64.b64encode(np.ascontiguousarray(a).tobytes()).decode("ascii")
    return dict(pdb=spec["pdb"], name=spec["name"], title=info.get("title", ""), cite=info.get("cite", ""), note=spec.get("note", ""),
                atoms=int(len(xyz)), size_nm=size_nm, verts=int(len(P)), tris=int(len(F)), tris_raw=int(before), voxel_A=round(h, 2),
                colors=spec["colors"], pos=b64(q), idx=b64(F), idx32=bool(F.dtype == np.uint32), grp=b64(grp))


def largest_component(P, F):
    n = len(P)
    parent = np.arange(n)

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x
    for f in F:
        a, b, c = int(f[0]), int(f[1]), int(f[2])
        ra, rb, rc = find(a), find(b), find(c)
        parent[rb] = ra
        parent[rc] = find(a)
    roots = np.array([find(int(v)) for v in range(n)])
    big = np.bincount(roots[F[:, 0]]).argmax()
    keep = roots[F[:, 0]] == big
    F2 = F[keep]
    used, inv = np.unique(F2.ravel(), return_inverse=True)
    return P[used], inv.reshape(-1, 3)


# ---------------------------------------------------------------- main --------------------------------------------------------------
def demo_structure():
    """A synthetic two-lobed 'machine' with a tunnel: tests the pipeline without the network."""
    rng = np.random.default_rng(3)
    pts = []
    for cen, r, n in (((0, 0, 0), 60, 22000), ((0, 75, 0), 42, 7500)):
        p = rng.normal(size=(n * 3, 3))
        p = p / np.linalg.norm(p, axis=1)[:, None] * (rng.random(n * 3) ** (1 / 3))[:, None] * r + cen
        p = p[np.hypot(p[:, 0], p[:, 2]) > 12]      # a tunnel down the y axis
        pts.append(p[:n])
    xyz = np.concatenate(pts)
    g = np.zeros(len(xyz), dtype=np.uint8)
    g[len(pts[0]):] = 1
    return xyz, g, {"title": "Synthetic test particle", "cite": "none: generated by --demo"}


def main(argv):
    demo = "--demo" in argv
    kinds = [a for a in argv if not a.startswith("--")]
    specs = [s for s in SHAPES if not kinds or s["kind"] in kinds]
    os.makedirs(OUT, exist_ok=True)
    out_path = os.path.join(OUT, "shapes.json" if not demo else "shapes-demo.json")
    data = {"version": 1, "generated": time.strftime("%Y-%m-%d"), "source": "RCSB Protein Data Bank (wwPDB), CC0 1.0; surfaces computed by tools/pdb_shapes.py",
            "shapes": {}}
    if os.path.exists(out_path) and not demo:
        try:
            data["shapes"] = json.load(open(out_path, encoding="utf8")).get("shapes", {})
        except Exception:
            pass
    cache = {}
    if demo:
        specs = [dict(kind="demo", pdb="DEMO", name="Synthetic test particle", tris=1200, orient="y", heavy_up=True, colors=["e0b07a", "b8824e", "d0d0d0"]),
                 dict(kind="ribo", pdb="DEMO", name="Synthetic (stands in for the ribosome in tests)", tris=1600, orient="x", colors=["e0b07a", "b8824e", "d0d0d0"]),
                 dict(kind="atps", pdb="DEMO", name="Synthetic (stands in for ATP synthase in tests)", tris=900, orient="y", heavy_up=True, colors=["f0c070", "ffffff", "c0b0a0"])]
    for spec in specs:
        t0 = time.time()
        print(f"{spec['kind']:6s} {spec['pdb']} {spec['name']}")
        try:
            if demo:
                xyz, g, info = demo_structure()
            else:
                if spec["pdb"] not in cache:
                    path = fetch(spec["pdb"])
                    cache[spec["pdb"]] = read_cif(path)
                xyz, g, info = cache[spec["pdb"]]
                print(f"       {len(xyz)} heavy atoms · {info.get('title','')[:90]}")
            sh = build(spec, xyz, g, info)
            data["shapes"][spec["kind"]] = sh
            print(f"       {sh['tris_raw']} → {sh['tris']} triangles, {sh['verts']} vertices, voxel {sh['voxel_A']} Å, size {sh['size_nm']} nm, {time.time()-t0:.1f} s")
        except Exception as e:
            print(f"       FAILED: {e}")
    json.dump(data, open(out_path, "w", encoding="utf8"), separators=(",", ":"))
    print(f"wrote {out_path} ({os.path.getsize(out_path)//1024} KB, {len(data['shapes'])} shapes)")
    if not demo:
        write_credits(data)


def write_credits(data):
    lines = ["# Molecular shapes", "",
             "Low-polygon surfaces of real molecular machines in the nano mode, computed by `tools/pdb_shapes.py` from the first",
             "biological assembly of each Protein Data Bank entry below (heavy atoms → Gaussian density → isosurface → decimation).",
             "PDB data is released by the wwPDB under CC0 1.0. The simplified surfaces are ours; please cite the entries and papers",
             "listed here when reusing them.", "", "| Kind in game | PDB | What it is | Primary citation |", "|---|---|---|---|"]
    for k, sh in data["shapes"].items():
        lines.append(f"| `{k}` | [{sh['pdb']}](https://www.rcsb.org/structure/{sh['pdb']}) | {sh['name']}: {sh['title']} | {sh['cite']} |")
    open(os.path.join(OUT, "CREDITS.md"), "w", encoding="utf8").write("\n".join(lines) + "\n")


if __name__ == "__main__":
    main(sys.argv[1:])
