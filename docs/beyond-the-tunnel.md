# Beyond the tunnel: three kinds of space

Inner Voyage began as one tube per system. From 6 Nov 2026 every scene is being rebuilt onto three kinds of space, in this order, each step shipped to `main` as it lands.

| Kind | What it is | Where it is used |
|---|---|---|
| **Open volume (room)** | A space you fly through freely, bounded by a membrane shell with pores where the route enters and leaves, furnished with solid bodies at true scale. Molecules crowd round you in a Brownian cloud. | Shipped: the hepatocyte's cytosol, endosome, mitochondrial matrix and nucleus (the nano world); the alveolar duct and sac (lung); Bowman's space round the tuft (kidney); the lymph node (lymph); the motor cortex neuropil and the anterior horn cell's soma (nerve). Next: the heart chambers, the islet and the anterior pituitary between the cords, the space of Disse at nanoscale. |
| **True branching tube** | A tube that really is one: side branches leave through real holes in its wall, and you steer into them. | Shipped: 41 branches in nine worlds, each a hole in the wall with a short side tube behind it. Most close after a few diameters and tell you where they go (the coronary ostia, coeliac trunk and superior mesenteric artery, the other pulmonary artery, hepatic vein and coronary sinus, tributary lymphatics, axon collaterals and the terminal branches of a motor unit, the appendix, the other main bronchus, lobar and side bronchioles, the maxillary sinus ostium, collecting-duct tributaries and another calyx, the hepatic arteriole, an anastomosing sinusoid and a joining bile ductule, pancreatic and pituitary side vessels). Four lead on: the left common carotid to the brain, the renal artery to the nephron, the ampulla of Vater to the pancreas, and the laryngeal inlet and the oesophagus between the gut and the lungs. Next: generations that keep branching on their real ratios. |
| **Surface / sheet** | A wall you fly along rather than inside: an epithelium, a membrane seen face on. | Next: villus forest, alveolar septum, plasma membrane from the inside, ER sheets, hepatocyte plates round a sinusoid, the synapse. |

Then: a compare button (micrograph beside the render) with a scale ladder, and real protein shapes from the PDB for the molecules that are drawn.

## How a room works (for anyone extending the game)

* `addRoom(world, {id, regs, shell, bodies, cuts, spread, densK, fog, fogD, env, shellName, shellSub, nearR, flowK})` registers a room over one or more route regions. The tube wall is not built for those regions (`world.skipIdx`).
* A shell is a sphere, a capsule, or a cluster of spheres (`{t:'union', parts:[{c, r}, …]}`): a string of spheres along the route makes a duct or a bean-shaped node, extra spheres budding off it make alveoli. Each sphere is drawn as its own mesh and the shader discards the parts that lie inside a neighbour, so only the outer skin of the cluster is seen.
* The wall shader has looks: 0 a membrane (fresnel glass with protein studs), 1 an alveolar septum (a capillary sheet with red cells flickering through, exudate when the acinus is consolidated), 2 a flat epithelium (polygonal cells with nuclei), 3 a fibrous capsule (collagen bands). `nearR` is the radius within which bodies are tested for collisions (keep it near the room's size); `flowK` lets the tube's flow (the breath in the sac) push the ship along the thread.
* Everything is a signed distance. `volFree(room, x, y, z)` is positive in open space: the shell interior (`sph` or `cap`) minus the solid bodies (`sph`, `cap`, `ell`, `plate`, `skin` = a tube seen from outside), with the pore cuts (capsules) subtracted from both. The ship, the camera and the molecules are pushed out of anything solid along the gradient.
* The route still runs through the room as a guide thread (I shows it, autopilot follows it). Doorways switch you between tube and room when you are inside the mouth; a cut must reach past a tube mouth on the outside, or the tube's end cap blocks it.
* Membranes use one shader: fresnel glass, protein studding, a glow from the ship's headlight, holes where the pores are. Bodies are instanced meshes and can be hovered and clicked for their codex card.

## How a branch works

* `addBranch(world, {reg, f, th | up, tilt, rbf, Lf, bend, taper, name, sub, codex, text | lead})` puts a branch on the wall at a fraction `f` along a region: `th` is the angle round the wall (or `up`, a world direction to project), `tilt` leans it downstream, `rbf` and `Lf` are its radius and length as fractions of the parent radius, `bend` curves it. `text` is the lesson shown at its closed end; `lead` is a function that takes you on (a warp into another world).
* The hole is cut by the tube wall shader: the twelve nearest holes of the current world go up as `uHole` (centre and radius) and fragments within the radius are discarded, so the edge is a clean circle whatever the mesh resolution.
* Behind the hole the branch is a side room: a tapered tube with a domed end for the look, a chain of spheres plus the parent lumen round the mouth for the free space, so nothing snaps as you cross. Flying into the hole enters it (`sbEnter`), flying back into the lumen leaves it (`sbLocate`); the autopilot always flies back out. Branches have no walls built on the parent route, so a hole costs nothing until you are near it.
* Entering a branch unlocks its codex card the first time; the hover label shows the branch's name and what it is.

The reference images that set the look (Goodsell and Ingersoll style molecular landscapes, hepatocyte plates and zonation diagrams, H&E and electron micrographs, red cell shapes and pathology) are described in the plan document kept by the project owner.
