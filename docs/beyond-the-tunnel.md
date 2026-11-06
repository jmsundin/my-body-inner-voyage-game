# Beyond the tunnel: three kinds of space

Inner Voyage began as one tube per system. From 6 Nov 2026 every scene is being rebuilt onto three kinds of space, in this order, each step shipped to `main` as it lands.

| Kind | What it is | Where it is used |
|---|---|---|
| **Open volume (room)** | A space you fly through freely, bounded by a membrane shell with pores where the route enters and leaves, furnished with solid bodies at true scale. Molecules crowd round you in a Brownian cloud. | Shipped: the hepatocyte's cytosol, endosome, mitochondrial matrix and nucleus (the nano world). Next: alveolar sac, interstitium, lymph node, cortex neuropil, space of Disse, islet, Bowman's space, pituitary, neuron soma. |
| **True branching tube** | A tube that really is one, with forks you steer into and generations that narrow on their real ratios. | Next: airways, arterial tree, biliary tree, collecting system, nephron forks (reusing the organ-flight rails and ports). |
| **Surface / sheet** | A wall you fly along rather than inside: an epithelium, a membrane seen face on. | Next: villus forest, alveolar septum, plasma membrane from the inside, ER sheets, hepatocyte plates round a sinusoid, the synapse. |

Then: a compare button (micrograph beside the render) with a scale ladder, and real protein shapes from the PDB for the molecules that are drawn.

## How a room works (for anyone extending the game)

* `addRoom(world, {id, regs, shell, bodies, cuts, spread, densK, fog, fogD, env, shellName, shellSub})` registers a room over one or more route regions. The tube wall is not built for those regions.
* Everything is a signed distance. `volFree(room, x, y, z)` is positive in open space: the shell interior (`sph` or `cap`) minus the solid bodies (`sph`, `cap`, `ell`, `plate`, `skin` = a tube seen from outside), with the pore cuts (capsules) subtracted from both. The ship, the camera and the molecules are pushed out of anything solid along the gradient.
* The route still runs through the room as a guide thread (I shows it, autopilot follows it). Doorways switch you between tube and room when you are inside the mouth; a cut must reach past a tube mouth on the outside, or the tube's end cap blocks it.
* Membranes use one shader: fresnel glass, protein studding, a glow from the ship's headlight, holes where the pores are. Bodies are instanced meshes and can be hovered and clicked for their codex card.

The reference images that set the look (Goodsell and Ingersoll style molecular landscapes, hepatocyte plates and zonation diagrams, H&E and electron micrographs, red cell shapes and pathology) are described in the plan document kept by the project owner.
