# My Body — Inner Voyage: research brief for AI agents

*Version 1 · 31 October 2026 · Owner and medical accuracy lead: Jon (former medical student)*

You are being handed this brief so you can research how to extend an existing educational game about the human body. Read it all once, then do the research task you were given (see §9 for the prompts). The goal of every task is the same: **make the next part of the body as true to current science and microscopy as possible, in a form that can be rendered cheaply in a web browser and that teaches students something they will remember.**

---

## 1. What this game is

**My Body — Inner Voyage** is a 3D game where the player pilots a shrunken micro-submarine through a living human body. Everything the player sees is a real structure, cell or molecule doing its real job. There are no invented monsters. The body runs on real physiology: one heartbeat drives the vessel walls, the valves, the blood flow, the sounds and the ECG, so when the patient climbs stairs the whole world changes with them.

The core fantasy is "you are not visiting the body, you live in it." The learning is hidden inside play: you scan things, you listen, you examine a patient, you fly in to see *why* the patient is sick, and then you present the case on ward rounds.

### Who it is for
- **Lead audience: medical students.** The game is designed and playtested at their level first.
- The same world also serves curious learners, school students and pre-med students through **depth levels**, not separate games. Every Codex card has four layers of the same truth:
  - **L1 Curious** — one plain sentence ("it pumps blood").
  - **L2 School** — basic anatomy and vocabulary.
  - **L3 Pre-med** — mechanism and numbers.
  - **L4 Med school** — clinical correlation, signs, pathology, exam pearls.
  - (The original design also planned an **L5 Clinician** layer: managing a deteriorating patient over time. Not built yet.)

### Teaching principles (keep these in every proposal)
1. **Outside, then inside.** First examine the patient at the bedside (listen, feel, test). Then fly inside to see the mechanism that explains what you found. Then reason about it on rounds.
2. **Look, listen, then understand.** A student should be able to learn what something *really* looks and sounds like. If we show a podocyte, it should be the podocyte a pathologist would recognise on electron microscopy.
3. **Learn by needing it.** Objectives only make sense if you understood the thing you just saw.
4. **Honest about compromises.** Wherever the game bends reality for playability (scale, speed, colour, transparency), an amber **"Reality check"** note on the Codex card says so and says what is really true.
5. **Every claim has a named source**, and Jon reviews all medical text before it ships. The current text is a draft awaiting his review.
6. **Awe, not gore.** Realistic, humane, never horror.

---

## 2. Where it stands today (ground truth)

The playable game is a single offline HTML file: `my-body-game/inner-voyage-game.html` (about 800 KB, three.js r149 inlined, no network or build step needed; double-click to play). The original design bible is `my-body-game/inner-voyage.html` (v0.3). Screenshots: `atlas-preview.png`, `lymph-node-preview.png`, `walls-preview.png`.

> Note on engine: the design bible (v0.3) aimed for Unreal Engine 5 hyper-realism. The working build is instead a **browser Three.js game** whose rule is *looks realistic, runs on any laptop*. Research should target the browser build. If you find something that only works in a high-end engine, say so and propose the cheap browser approximation.

### 2.1 The circulation (main mode)
One closed loop that the player flies in order:

Inferior vena cava → right atrium → tricuspid valve → right ventricle → pulmonary valve → pulmonary artery → **alveolar capillary** (red cells load O₂, single file) → pulmonary veins → left atrium → mitral valve → left ventricle (thick, hypertrophied wall) → **stenotic aortic valve** → ascending aorta → aortic arch → descending aorta → **skeletal-muscle capillary** (O₂ unloads, cells darken) → venules → back to the vena cava.

- **One cardiac clock** (72 bpm at rest, 118 bpm on exertion) drives: atrial and ventricular wall contraction, the arterial pulse wave travelling down the aorta at a set pulse-wave velocity, valve opening and closing, synthesized heart sounds (S1, S2, the aortic stenosis murmur, a soft A2), a live ECG, a phonocardiogram, and displayed vitals (HR, BP, local SO₂ and PO₂).
- **Valves are anatomically shaped.** Semilunar valves have three cusps with U-shaped hinge lines, a coaptation "Y" and nodules of Arantius. AV valves have leaflets tethered by chordae tendineae to papillary muscles. The aortic valve can be toggled between the patient's calcified, stenotic valve and a healthy comparison valve (V key).
- **Flow.** Pulsatile flow with inertia, a laminar parabolic profile (fast core, slow wall layer), and real turbulence only downstream of valves, strongest in the stenotic aortic jet. The sub gets buffeted there. Valves must be passed when open; autopilot waits for them.
- **Blood cells.** Red cells use the Evans–Fung biconcave profile and change colour with saturation. Platelets are resting discs. Neutrophils (multilobed nucleus, granules) roll along the wall; lymphocytes, monocytes and eosinophils ride mid-stream. White cells are translucent so their nuclei and granules show.
- **Vessel walls** show an endothelial cell mosaic (cells elongated along the flow, raised nuclei, junction lines), smooth-muscle and elastic-lamina texture in arteries, trabeculae carneae in ventricles, pectinate texture in atria, alveolar "bubbles" behind lung capillaries, and vasa vasorum.

### 2.2 The lymphatic detour
From the muscle capillary, the player presses K to leak out with the plasma through an endothelial cleft and follow tissue fluid home. This is a separate, open-ended tube:

Interstitial space (between striated muscle fibres, collagen and fibroblasts) → blind-ended **lymphatic capillary** (overlapping flap junctions that open to let fluid in) → **collecting lymphatics** (lymphangions that squeeze in sequence; one-way valves open when the segment behind squeezes) → **lymph node** (subcapsular sinus → cortex with bulging B-cell follicles and high endothelial venules → medullary sinuses lined with macrophages) → efferent lymphatic → **cisterna chyli** (milky with chylomicrons from the gut) → **thoracic duct** → left venous angle, back into the blood.

Lymph-world cells: lymphocytes, macrophages, dendritic cells with long veils, bacteria being carried to the node, and chylomicrons.

### 2.3 The patient case: Case 01, "The patient who fainted on the stairs"
**Mr. Daniel Reyes, 74, fictional, severe calcific aortic stenosis.**
- **Bedside exam (G):** place the stethoscope on six chest landmarks and find where the murmur is loudest. Bell and diaphragm toggle (B) changes what you hear. This is the first objective, before you fly in.
- **Inside listening (hold H):** listen at the valve from inside the heart, with a phonocardiogram drawn live. Labelled as *intracardiac*, not the bedside sound.
- **Flashback (X):** Mr. Reyes climbs the stairs last week. Heart rate rises, BP falls because the stenotic valve caps his stroke volume, and he feels light-headed (exertional syncope).
- **Objectives:** a numbered list from the bedside exam through each valve, the lung capillary, the stenotic valve, scanning six things, and presenting on rounds. The lymph detour has its own objectives.
- **Patient-course meter:** wrong calls at the bedside or on rounds lower it and change the ending.
- **Rounds (R):** a 10-question OSCE-style quiz with explanations (murmur description, cause of AS at 74, pulsus parvus et tardus, concentric LVH, mechanism of exertional syncope, prognosis by symptom, pulmonary capillary transit time, definitive treatment, pitting oedema in heart failure, lymph drainage route of the leg).

### 2.4 Learning tools
- **Hover and click cells.** The cursor is free. Hovering over any cell shows its name; clicking opens its Codex card plus live facts about *that* cell (where it is, which flow lane it is in, its saturation).
- **Scan (E)** structures and regions to add them to the Codex.
- **Codex / Journal (J):** about 40 cards (every region, valve and cell type, the murmur, bedside exam, exertion, capillary leak, and each lymph structure), each with four depth levels, a source line (mostly OpenStax Anatomy & Physiology 2e), and Reality-check notes. Depth is switched with L.
- **Body minimap (M):** a 2D body silhouette with the player's live position on the blood loop or the lymph route.
- **Gross anatomy atlas (N, or click the minimap):** an SVG textbook plate of arteries, veins, lymphatics, nodes and organs with layer toggles, clickable info and the player's route drawn on it.
- **Route bar:** a strip showing the stations of the current world and where you are.

### 2.5 Controls (for reference)
W/A/S/D fly · Shift boost · drag mouse or arrow keys to steer · F autopilot · E scan · H hold to listen · B bell/diaphragm · G bedside exam · X exertion flashback · V healthy vs stenotic valve · K leak into the lymph · J Codex · L depth level · M minimap · N atlas · R rounds · P pause · ? help.

---

## 3. Architecture and conventions

You do not need to write code, but your research should come back in a shape that drops into this structure.

### 3.1 A "world" is one tube
Each mode is built as a **single tube along a smooth spline** (`buildWorld(name, NODES, VALVES, closed)`). The blood loop is closed; the lymph detour is open. A future mode (nephron, liver sinusoid, axon) would be another tube, or a short chain of tubes with "warp" transitions between them.

A tube is defined by a list of **nodes**, each:

```
[x, y, z, radius, kind, region]
e.g. [40, 110, -32, 1.7, 'cap', 'lungcap']
```

- **kind** sets the physics and look of that stretch: flow speed, wall tint, and how much it contracts with the atrium, ventricle, arterial pulse or capillary rhythm, plus endothelial cell width and length, nucleus prominence, muscle striation and lymphatic squeeze. Existing kinds: `vein, atrium, valve, ventricle, artery, cap, tissue, lcap, lcoll, lvalve, sinus, duct, vangle`.
- **region** is the named place (shown on the banner, route bar and Codex), with a short subtitle and a body-map colour code.
- **Valves** are attached to nodes with a type (`sl` semilunar, `av` atrioventricular, `ly` lymphatic) and number of leaflets.

### 3.2 Cells are instanced and local
Each cell type is an instanced mesh with a count, a spawn window ahead of and behind the player, a radial range in the lumen, a speed factor, a size, whether it sticks to the wall, and a **density per region** (so macrophages crowd the medullary sinus and chylomicrons fill the cisterna). Only cells near the player exist. This is how thousands of cells run on a laptop.

### 3.3 Content tables
- **CODEX[key]** = `{ title, tag, src, L: [L1, L2, L3, L4], rc }` where `rc` is the Reality-check note.
- **REGIONS[key]** = `{ n: name, s: subtitle, b: body-map code }`.
- **OBJ** = ordered objectives with ids completed by entering regions or doing actions.
- **QUIZ** = Rounds questions: `{ q, a: [correct first, then distractors], e: explanation }`.
- **Atlas** entries: SVG paths per structure with layer, colour and info text.

### 3.4 One physiology clock
All motion, sound and readouts come from a small shared state (heart rate, cycle time, systole fraction, exercise on/off, stenosis on/off, pulse-wave velocity). Do not propose per-room fakes. If a new system has its own rhythm (breathing, peristalsis, action potentials, urine flow), propose how it couples to this clock or to a second clock.

### 3.5 Scale is compressed on purpose
Distances and speeds are squashed so the trip is playable. A real cell-sized sub would feel blood as thick syrup (very low Reynolds number), could never coast, and a capillary is about 5–8 µm across while the aorta is about 25 mm. The game keeps the *relative order* of sizes and speeds true and explains the rest in Reality-check notes. Your research must give **real dimensions and real speeds**, then suggest how to compress them.

---

## 4. Design constraints (non-negotiable)

**Looks realistic, runs on any laptop.** Assume a five-year-old integrated-GPU laptop in a library, at 60 fps (the game drops resolution automatically if it falls below 35 fps).

What that means in practice:
- **Faked lighting.** One headlight on the sub plus a small lamp. No real-time shadows, no ray tracing. Translucency, wetness and subsurface glow are faked in the shader (Fresnel rim, a reddish wrap term, a soft tonemap).
- **Fog** hides the far end of every tube and is part of the look.
- **Procedural detail in one shader.** Wall textures (cell mosaics, nuclei, fibres, striations) are computed from noise and Voronoi patterns in a single fragment shader, with detail fading where it would shimmer. No big texture downloads.
- **Level of detail.** Walls are built in chunks so most are culled. Cells exist only near the player and fade out near the camera.
- **Instancing** for every repeated thing (cells, granules, vesicles, villi, myelin segments).
- **Single offline file**, no servers, no external assets at runtime.
- **Never fake the science to save polygons.** A low-poly alveolus is fine. Oxygen moving the wrong way is not. Simplify the rendering, never what is true.

When you propose a visual, always give **(a)** what it really looks like with a microscopy reference and **(b)** the cheapest rendering trick that preserves the features a student must recognise.

---

## 5. What makes a good research answer

For every system you research, deliver these sections. Keep the format; Jon will review and the builder will implement directly from it.

1. **Route.** The ordered stations the sub flies through, as a node table: station name, real diameter, real flow speed or transit time, the suggested game radius and speed, the wall *kind* it needs (reuse an existing kind or define a new one), and any valves, sphincters or gates.
2. **What it looks like, station by station.** Wall surface, lumen contents, cells and their real sizes, colours and shapes. Cite the microscopy: light microscopy and histology stains, scanning EM, transmission EM, cryo-electron tomography, confocal, two-photon in vivo imaging, expansion microscopy, endoscopy, as relevant. Describe what is recognisable to an expert, and what is a common textbook simplification that is actually wrong.
3. **What moves and on what clock.** Rhythms, waves, transport rates, and how they couple to the heartbeat or a new clock.
4. **What it sounds like and how it is examined.** Bedside signs and the exam the student does before going in (the equivalent of the stethoscope in Case 01). Real sounds or signals that can be synthesized.
5. **A patient case.** One fictional patient, a presenting story, bedside findings, what the student sees inside that explains it, a healthy-vs-disease toggle, and the ending variants.
6. **Codex cards.** For each key structure, four depth layers (L1–L4) plus a Reality-check note where the game bends the truth.
7. **Rounds questions.** 6–10 OSCE-style questions, correct answer first, with explanations.
8. **Objectives.** 6–10 in-world tasks in play order.
9. **Rendering plan.** For each visual, the cheap browser technique (shader trick, instancing, baked geometry, sprite, etc.) and a rough cost.
10. **Links to existing modes.** Where the new mode connects to the circulation or lymph worlds and to other systems.
11. **Sources.** Named, current, and checkable (textbook chapter, review article with DOI, atlas, dataset, or microscopy image source). Prefer open-licence material that could be shown in-game. Mark each claim's confidence and flag anything still debated in the literature.
12. **Open questions for Jon** (things only the accuracy lead can decide).

### Source guidance
- Anchors already used: OpenStax Anatomy & Physiology 2e. Good complements: Junqueira's Basic Histology, Ross & Pawlina, Guyton & Hall, Boron & Boulpaep, Kandel's *Principles of Neural Science*, Netter, Gray's.
- Imaging and data: the Cell Image Library, Human Protein Atlas, Allen Brain Cell Atlas, the MICrONS cubic-millimetre mouse visual cortex reconstruction (2025), the Harvard/Google H01 human cortex fragment, EMDB/PDB for molecular structures (channels, receptors, vesicles), and the Human Reference Atlas from HuBMAP.
- Prefer findings from the last 10 years when they change the picture, but say when an older textbook model is still the teaching standard.
- Never copy proprietary text or images. Summarise and cite.

---

## 6. Cross-system vision

The body is one world. New modes should connect to what exists so the student sees systems interact:
- Chylomicrons in the cisterna chyli already hint at the **gut** (lacteals in villi).
- The muscle capillary leak already teaches **Starling forces**, which the **kidney** glomerulus uses at much higher pressure.
- **Right heart failure** backs up into the **liver** (congestive hepatopathy) and the legs (oedema, the lymph quiz question).
- **Meningeal lymphatics** drain the brain's fluid to deep cervical lymph nodes, linking the **nervous system** to the lymph mode.
- The **enteric nervous system** links the gut to the nervous system.
- **Baroreceptors** in the aortic arch (already a region) link the circulation to the autonomic nervous system.

---

## 7. Research prompts: organs and systems

Each prompt below is a starting point. Expand it using §5.

### 7.1 Kidney: the nephron voyage
**Question:** What does a single nephron look like and do, from renal artery to bladder, at the resolution of current microscopy, and how can a student fly it?
- Suggested route: renal artery → interlobar and arcuate arteries → afferent arteriole → **glomerulus** → Bowman's space → proximal convoluted tubule → loop of Henle (thin descending, thin and thick ascending limbs) → distal convoluted tubule past the **macula densa** → collecting duct → renal pelvis → ureter (peristalsis) → bladder. Also the parallel vascular route: efferent arteriole → peritubular capillaries and vasa recta.
- Key visuals to ground: the three-layer filtration barrier (fenestrated endothelium, glomerular basement membrane, podocyte foot processes with slit diaphragms seen on SEM and TEM), mesangial cells, the PCT brush border, the juxtaglomerular apparatus, principal and intercalated cells, aquaporin-2 insertion.
- Physiology to make visible: the filtration pressure balance (compare with the muscle capillary), the countercurrent multiplier and osmotic gradient (could be shown as a colour field), tubuloglomerular feedback, the effect of ADH.
- Case ideas: diabetic nephropathy (thickened GBM, effaced foot processes, albuminuria), nephrotic vs nephritic syndrome, or a cardiorenal link to Mr. Reyes. Bedside: blood pressure, oedema, urine dipstick, renal bruit.
- Hard question to answer: how does the sub "become filtrate" when the slit diaphragm passes only small molecules? (Compare with the K-key leak through an endothelial cleft.)

### 7.2 Liver: the sinusoid and the lobule
**Question:** What does blood flowing through a liver lobule look like, and how do we show the liver's jobs?
- Route: portal vein and hepatic artery (portal triad) → **sinusoid** (discontinuous, fenestrated endothelium with sieve plates) → central vein → hepatic veins → IVC (already in the game). Bile flows the opposite way in canaliculi.
- Key visuals: hepatocyte plates, the space of Disse with microvilli, Kupffer cells, stellate (Ito) cells with vitamin A droplets, zonation (zones 1–3 and their oxygen gradient), bile canaliculi between hepatocytes.
- Case ideas: congestive hepatopathy from right heart failure (links to the heart), or cirrhosis with portal hypertension (stellate cell activation, capillarised sinusoids, fibrosis, varices). Bedside: jaundice, liver span, ascites with shifting dullness, spider naevi, asterixis (a neuro link).

### 7.3 Gallbladder and biliary tree
**Question:** How does bile get from a hepatocyte to the duodenum, and what goes wrong?
- Route: bile canaliculus → canals of Hering → bile ductules and ducts → common hepatic duct → cystic duct (spiral folds of Heister) → **gallbladder** (concentration, mucosal folds) → common bile duct → ampulla and sphincter of Oddi → duodenum.
- Key visuals: cholangiocytes, gallbladder mucosa, gallstones (cholesterol vs pigment, real appearance), bile micelles. CCK triggering contraction after a fatty meal.
- Case ideas: biliary colic, acute cholecystitis (Murphy's sign at the bedside), or choledocholithiasis with obstructive jaundice. Ultrasound appearance as the "outside" view.

### 7.4 Gastrointestinal tract
**Question:** What does the gut look like from the inside at endoscopy and at microscopy scale, and how do we show digestion and absorption?
- Route: mouth → oesophagus (peristalsis, lower oesophageal sphincter) → stomach (rugae, gastric pits, parietal and chief cells, mucus layer, acid) → pylorus → duodenum → jejunum (**villi and microvilli**, enterocytes, goblet cells, crypts) → ileum (Peyer's patches, M cells) → colon (crypts, microbiome, mucus bilayer).
- Key visuals: villus core with a **lacteal** (connects to the chylomicrons already in the lymph mode), brush border with glycocalyx, tight junctions, the microbiome at real density and diversity, peristaltic and segmentation waves.
- Clocks: slow waves set by interstitial cells of Cajal, the migrating motor complex.
- Case ideas: coeliac disease (villous atrophy is a striking healthy-vs-disease toggle), small bowel obstruction (bowel sounds at the bedside are a natural stethoscope sequel), or *H. pylori* peptic ulcer.

---

## 8. The nervous system mode (Jon's top interest)

This section is a design sketch to research, refine and correct. Treat every number as something to verify.

### 8.1 Why it is special
In the heart and lymph modes the sub rides a fluid. Neurons are mostly not tubes you can float down, and their key events happen at very different scales (a motor axon can be a metre long, a synaptic cleft is about 20 nm, an action potential lasts about 1 ms). So the nervous system mode needs **three linked "zoom stations"** rather than one tube, plus a new kind of clock: **the action potential**, which plays the role the heartbeat plays now.

The design bible noted that the brain is "eerily quiet except blood pulse, which teaches that neurons are electrical, not noisy." Keep that: the soundscape of neural mode should come from real electrophysiology audio monitors (spike clicks, EMG sounds), not invented hums.

### 8.2 Proposed routes

**Route A: the reflex arc (knee-jerk), the first episode**

A complete, small circuit that mirrors the heart loop and has a perfect bedside exam (the reflex hammer).
1. **Muscle spindle** in the quadriceps (intrafusal fibres with annulospiral endings), stretched by the hammer tap.
2. **Ia afferent axon**, large and heavily myelinated. The sub rides **alongside** the axon in the endoneurium, or inside the axoplasm along microtubules (see 8.3). The action potential overtakes the sub as a glowing band, jumping from **node of Ranvier** to node.
3. **Dorsal root ganglion**: pseudounipolar cell bodies wrapped in satellite glia.
4. **Spinal cord dorsal horn to ventral horn**: grey matter neuropil, astrocytes, microglia.
5. **Synapse onto the alpha motor neuron** (zoom station: the synapse).
6. **Motor axon** out the ventral root and femoral nerve.
7. **Neuromuscular junction** (zoom station: acetylcholine release, nicotinic receptors on junctional folds, acetylcholinesterase).
8. The quadriceps contracts and the leg kicks. The patient's reflex is seen from the outside.

**Route B: blood to brain, the barrier and the fluid**

Starts from the existing circulation (the aortic arch branches to the head).
1. Internal carotid → circle of Willis → middle cerebral artery → cortical penetrating arteriole → **brain capillary with the blood-brain barrier**: continuous endothelium with tight junctions (claudin-5, occludin), very few vesicles, a basement membrane, **pericytes**, and **astrocyte endfeet** tiling the vessel (aquaporin-4). The sub *cannot* leak out here the way it did in the muscle capillary. That contrast is the lesson.
2. **Choroid plexus** (fenestrated capillaries, but tight-junctioned epithelium: the blood-CSF barrier) → the sub enters the **CSF**.
3. CSF route: lateral ventricle (ependymal cilia beating) → interventricular foramen → third ventricle → cerebral aqueduct → fourth ventricle → foramina of Luschka and Magendie → subarachnoid space around the brain and spinal cord.
4. Exits: arachnoid granulations into the venous sinuses, **perivascular (glymphatic) pathways** along arteries, and **meningeal lymphatics** to the deep cervical lymph nodes, which connect to the existing lymph mode. Research must state clearly which of these routes are well established and which are still debated in 2025–2026 literature.

**Route C (later): inside the cortex**

A zoom station inside the cortical neuropil: pyramidal neuron with apical dendrite and **dendritic spines**, interneurons, oligodendrocytes, microglia surveying with moving processes, and the tight packing of the neuropil (almost no free space). Ground this in connectomic reconstructions (MICrONS, H01). The sub may have to be very small here; consider making this a "frozen moment" viewer rather than a flight.

### 8.3 Structures to ground in current science and microscopy

| Structure | What students must recognise | Ground it in |
|---|---|---|
| Neuron cell body | Large nucleus with prominent nucleolus, Nissl substance (rough ER), axon hillock without Nissl | Light microscopy (Nissl stain), TEM |
| Dendrites and spines | Branching trees; spines with heads and necks, thin, stubby and mushroom shapes | Golgi stain, two-photon imaging, EM reconstructions |
| Axon interior | Microtubules and neurofilaments; mitochondria and vesicles carried by kinesin (outward) and dynein (inward) | Cryo-ET, TEM cross-sections, live imaging of axonal transport |
| Myelin | Compact spiral lamellae, major dense and intraperiod lines; internodes; paranodal loops; node of Ranvier with dense Na⁺ channels | TEM of myelin, teased-fibre preparations, freeze-fracture |
| CNS vs PNS myelin | Oligodendrocyte myelinates many axons; Schwann cell myelinates one internode; Schwann cell has a basal lamina | TEM, histology |
| Action potential | Resting −70 mV, Na⁺ in, K⁺ out, overshoot near +30 to +40 mV, refractory period; saltatory conduction; velocity scales with diameter and myelin | Hodgkin–Huxley, modern channel structures (PDB/EMDB) |
| Chemical synapse | Presynaptic bouton with vesicles (~40 nm), active zone, synaptic cleft (~20 nm), postsynaptic density; vesicle fusion by SNAREs triggered by Ca²⁺ | Cryo-ET of synapses, TEM, super-resolution |
| Neuromuscular junction | Junctional folds, acetylcholine receptors at crests, acetylcholinesterase in the cleft | TEM, α-bungarotoxin staining |
| Glia | Astrocytes (endfeet, tiled domains), microglia (ramified, constantly moving), oligodendrocytes, ependymal cells | Immunofluorescence, in vivo two-photon |
| Blood-brain barrier | Tight junctions, pericytes, endfeet, basement membrane, few transcytotic vesicles | TEM, immunostaining |
| CSF spaces | Volumes, production rate, ependymal cilia, choroid plexus villi | MRI, histology, SEM of ependyma |

For each, give real dimensions (for example axon diameters from about 0.2 µm to about 20 µm, internodes of roughly 0.2–2 mm, conduction from under 1 m/s in unmyelinated C fibres to over 100 m/s in large myelinated fibres) and verify them.

### 8.4 How it could look and run on a laptop
- **Axon as a tube world.** The existing tube builder fits a nerve fascicle or a single axon. Myelin internodes are instanced sleeves with a shader for the lamellar sheen; nodes of Ranvier are narrow bright gaps.
- **The action potential as a travelling band.** The game already sends the arterial pulse down the aorta as a wave keyed to arc length and a pulse-wave velocity. An action potential is the same trick: a uniform-driven band of depolarisation colour (with Na⁺ inflow and K⁺ outflow shown as particle sprites) that *jumps* node to node on myelinated axons and creeps continuously on unmyelinated ones. A healthy-vs-demyelinated toggle slows or blocks it.
- **Voltage made visible.** A colour overlay on the membrane (like the SO₂ colour of red cells) and a live trace on the HUD, like the ECG: a membrane-potential trace for the segment you are in, and a nerve conduction study trace in the bedside view.
- **Synapse as a zoom station.** A baked scene of a bouton and cleft at nanometre scale: instanced vesicles, a few fusion events per action potential, neurotransmitter as point sprites diffusing across the cleft, receptors as instanced molecular models from PDB structures simplified to low-poly. Show the time scale honestly with slow motion and a Reality-check note.
- **Glia and neuropil** as translucent instanced shapes with a fog-heavy look; microglia processes animated with cheap vertex noise.
- **Sound:** spike clicks from an audio monitor, EMG sounds at the bedside (normal motor-unit potentials, fibrillation potentials, the myotonic "dive-bomber"), all synthesized.

### 8.5 Bedside exam (the neurology "stethoscope")
Mirror the cardiac bedside exam with a neuro exam the student performs before going in:
- **Reflex hammer:** tap the patellar tendon, biceps, ankle; grade reflexes (0 to 4+); look for clonus and the plantar response (Babinski).
- **Sensation:** light touch, pinprick, vibration with a tuning fork, proprioception, mapped onto dermatomes.
- **Power and tone** graded with the MRC scale.
- **Eyes:** pupils, eye movements, visual fields, fundoscopy (optic disc).
- **Studies:** nerve conduction (latency, velocity, amplitude), EMG, lumbar puncture (opening pressure, CSF cells, protein, glucose, oligoclonal bands), MRI as an outside view.

### 8.6 Case options (research and recommend one)
1. **Multiple sclerosis (recommended for a first neuro case).** A young adult with optic neuritis or a numb, weak leg. It uses almost everything above: myelin and saltatory conduction (demyelinated segments slow or block the action potential), the blood-brain barrier breached by autoreactive T cells (links to the lymphocytes and lymph nodes already in the game), microglia and plaques, CSF oligoclonal bands from lumbar puncture, MRI lesions. Bedside: brisk reflexes, Babinski, Lhermitte's sign, Uhthoff's phenomenon.
2. **Myasthenia gravis.** Fatigable weakness and ptosis; antibodies against acetylcholine receptors at the neuromuscular junction. A tight, visual NMJ episode with a striking healthy-vs-disease toggle and the repetitive-stimulation decrement on EMG.
3. **Guillain–Barré syndrome.** Ascending weakness with lost reflexes after an infection; peripheral demyelination by macrophages stripping myelin. Contrasts PNS with CNS, and lower vs upper motor neuron signs, against MS.
4. **Ischaemic stroke.** Links to the existing circulation: atrial fibrillation or carotid plaque throws an embolus into the middle cerebral artery. The sub follows the clot and sees the penumbra. Strong on blood flow, weaker on the cellular neuroscience Jon wants.
5. **Bacterial meningitis.** Bacteria cross the barrier, neutrophils flood the CSF; links to the immune cells already in the game. Bedside: neck stiffness, Kernig's and Brudzinski's signs.

Ask: which case best teaches the neuroscience that medical students find hardest, and which reuses the most of the existing game?

### 8.7 Specific research questions for the nervous system
1. What does current cryo-electron tomography show inside a synaptic bouton and an axon, and what in standard textbook diagrams is now known to be wrong or oversimplified?
2. What is the best current evidence on the glymphatic system and meningeal lymphatics in humans (not just mice)? What can we safely teach as established?
3. How should an action potential be shown so it is accurate (it is a change in membrane voltage and local ion flux, not a moving particle) yet readable? What do experts consider the most common misconception?
4. What are the real numbers for CSF volume, daily production and turnover, and where is current research revising the classic "produced by choroid plexus, absorbed by arachnoid granulations" model?
5. What does an MS lesion look like across scales (MRI, histology with myelin stains, EM of demyelinated and remyelinated axons)?
6. Which open datasets (MICrONS, H01, Allen Brain Cell Atlas, Human Protein Atlas) have imagery or meshes that could be simplified into low-poly in-game models, and under what licences?
7. How should scale be handled between the reflex arc (metres), the axon (micrometres) and the synapse (nanometres) without misleading students? Propose the zoom transitions and Reality-check notes.

---

## 9. How to use this brief: ready-to-paste research prompts

Give one of these to an agent together with this file.

> **Nervous system (priority).** Using the Inner Voyage brief, research and design the nervous system mode in §8. Deliver every section in §5 for Route A (reflex arc) and Route B (blood-brain barrier and CSF), recommend one case from §8.6 with reasons, and answer the questions in §8.7. Ground every visual in named microscopy sources and give real dimensions, speeds and time scales, then a cheap browser rendering approach for each.

> **Kidney.** Using the brief, research the nephron voyage in §7.1 and deliver every section in §5.

> **Liver.** Using the brief, research the liver lobule and sinusoid in §7.2 and deliver every section in §5, including a case that links to the existing right heart.

> **Gallbladder and biliary tree.** Using the brief, research §7.3 and deliver every section in §5.

> **GI tract.** Using the brief, research §7.4 and deliver every section in §5, including how villi and lacteals connect to the existing chylomicron and lymph mode.

> **Realism audit of what exists.** Using the brief and §2, audit the current heart and lymph modes against current science and microscopy. List what is wrong or oversimplified in the visuals, physiology numbers, sounds and Codex text, ranked by how much it would mislead a medical student, with sources and a cheap fix for each.

---

## 10. Open decisions for Jon
- Which neuro case comes first (recommendation: multiple sclerosis, with myasthenia gravis as a short NMJ episode).
- Whether new modes keep Mr. Reyes as a recurring patient (one body, many cases) or introduce new patients per system.
- Whether to add the L5 Clinician layer (managing a patient over time) with the next mode.
- Which external reviewer checks neuroscience content.
