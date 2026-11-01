/* Inner Voyage · storylines (content for IVStory).
 *
 * One main journey and six alternative paths through the same body. Every beat waits on
 * progress the game already records (objective ids from OBJ, mission stars from Neuro and
 * Chest rounds, worlds, Codex cards), so this file plays on the current build as it is.
 * Beats marked `needs` ask for content the game does not have yet: an `optional` one is
 * skipped until it exists; a required one shows "coming soon" and pauses that storyline.
 *
 * Medical text is a draft in our own words, for Jon to review before it ships (brief §1,
 * principle 5). Sources to verify against are listed per chapter in `src`. All patients and
 * staff are fictional.
 *
 * Condition keys: obj, anyObj, world, scale, codex, scans, stars, starsAny, rounds, flag,
 * beat, choice, feature, health, and all / any / not. Mission stars are namespaced:
 * 'neuro:L1' (Neuro rounds), 'chest:T2' (Chest rounds).
 * `go` tells the HUD where to send the player: { system } is a SYSTEMS id, { atlas, mission }
 * opens an atlas board at that mission.
 */
(function (root) {
  'use strict';

  const CAST = {
    osei:  { name: 'Dr Amara Osei', role: 'Cardiology registrar, your supervisor' },
    tran:  { name: 'Ben Tran', role: 'Charge nurse, cardiac ward' },
    reyes: { name: 'Daniel Reyes', role: 'Patient, 74, retired bus driver' },
    rosa:  { name: 'Rosa Reyes', role: 'His daughter' },
    priya: { name: 'Priya Shah', role: 'Speech and language therapist' },
    lind:  { name: 'Dr Erik Lind', role: 'Stroke consultant' },
    you:   { name: 'You', role: 'Final-year medical student on the Inner Voyage programme' },
    log:   { name: 'Ship log', role: '' }
  };

  const STORYLINES = [

  /* =====================================================================================
   * MAIN JOURNEY · One body. The whole admission of one patient: every complication opens
   * another system, and all of it happens inside the same man.
   * ===================================================================================== */
  {
    id: 'main', kind: 'main', caseId: 'reyes', hours: '4–6 h',
    title: 'One body: the admission of Daniel Reyes',
    blurb: 'Follow one patient from the day he collapses on the stairs to the day he walks out. A stiff valve, a new valve, a stroke, a pneumonia and a failing kidney, all inside the same body.',
    chapters: [
      {
        id: 'm1', title: 'Chapter 1 · The stairs', place: 'Emergency department, 14:20',
        src: ['2020 ACC/AHA Valvular Heart Disease Guideline', '2025 ESC/EACTS Valvular Heart Disease Guidelines', 'OpenStax Anatomy & Physiology 2e, ch. 19'],
        beats: [
          { id: 'm1_meet', title: 'Meet Mr Reyes',
            intro: [
              ['tran', 'Bed 4. Seventy-four, went grey and dropped halfway up the stairs at his daughter\'s flat. Came round in under a minute. BP 104 over 82.'],
              ['reyes', 'I was fine on the flat. It\'s only stairs. It\'s been stairs for a few months, to be honest.'],
              ['osei', 'Faint on exertion, narrow pulse pressure, older man. Before you guess, listen. Then go and look.']
            ] },
          { id: 'm1_exam', title: 'Find the murmur', goal: 'Examine him at the bedside and find where the murmur is loudest (G)',
            when: { obj: 'exam' }, xp: { cardio: 60, clinical: 40 },
            outro: [['osei', 'Harsh, ejection, right second space, up into the neck, and a soft second sound. Now go in and see what makes it.']] },
          { id: 'm1_right', title: 'The right heart', goal: 'Enter the right atrium and cross the tricuspid and pulmonary valves',
            go: { system: 'circ' }, when: { obj: ['ra', 'tricuspid', 'pulmonic'] }, xp: { cardio: 60 },
            outro: [['log', 'Low pressure side. The valves open on cue and nothing fights you.']] },
          { id: 'm1_lungs', title: 'Through the lung', goal: 'Watch red cells load oxygen in an alveolar capillary',
            when: { obj: 'lungcap' }, xp: { resp: 40, cardio: 20 } },
          { id: 'm1_left', title: 'The left heart', goal: 'Cross the mitral valve, then hold H at the aortic valve and listen',
            when: { obj: ['mitral', 'steth'] }, xp: { cardio: 60 },
            outro: [['osei', 'Hear how the sound starts after the valve should be open? That\'s the jet, not the closure.']] },
          { id: 'm1_valve', title: 'The stiff valve', goal: 'Squeeze through the calcified aortic valve, then study it close up (Y)',
            when: { obj: ['aortic', 'study'] }, xp: { cardio: 80, anatomy: 40 },
            outro: [['log', 'Three cusps, fused with calcium at their bases. The opening is a slit. Every beat the left ventricle forces the whole stroke volume through it.']] },
          { id: 'm1_rounds', title: 'Present him', goal: 'Present Mr Reyes on Rounds (R)',
            when: { obj: 'rounds' }, xp: { clinical: 80 },
            outro: [
              ['osei', 'Severe aortic stenosis, and he has symptoms. Once that happens, untreated survival drops fast. This valve needs replacing.'],
              ['rosa', 'Replacing? He\'s seventy-four. Does that mean opening his chest?'],
              ['osei', 'Not necessarily. The heart team meets tomorrow.']
            ] }
        ]
      },
      {
        id: 'm2', title: 'Chapter 2 · The heart team', place: 'Cardiac ward, day 2',
        src: ['2025 ESC/EACTS Valvular Heart Disease Guidelines (TAVI age threshold)', '2020 ACC/AHA VHD Guideline (shared decision 65–80)'],
        beats: [
          { id: 'm2_anatomy', title: 'Know the territory', goal: 'Before anyone plans a route, earn a star on Chest Tag test 2 (heart and great vessels)',
            go: { atlas: 'chest', mission: 'T2' }, when: { stars: { 'chest:T2': 1 } }, xp: { anatomy: 80 },
            intro: [['osei', 'Zoom out until you\'re bigger than his chest (Q). If you can\'t name his great vessels from outside, you can\'t plan a catheter through them.']] },
          { id: 'm2_decide', title: 'Which valve?', goal: 'Give the heart team your recommendation',
            intro: [['osei', 'Seventy-four, frail but independent, normal coronaries on the CT, good-sized femoral arteries. What do you offer him?']],
            choice: {
              case: 'reyes', xp: { clinical: 60 },
              prompt: 'Your recommendation for Mr Reyes',
              options: [
                { id: 'tavi', label: 'Transfemoral TAVI', best: true,
                  lines: [['osei', 'That\'s where current European guidance points at his age when the femoral route is suitable, and it\'s what he wants after we talked it through. A new valve, delivered on a catheter from the groin.']] },
                { id: 'savr', label: 'Surgical valve replacement',
                  lines: [['osei', 'Defensible, and some teams would offer it. But with his frailty and his anatomy suiting the femoral route, the team and he settle on TAVI. Shared decision, not a coin toss.']] },
                { id: 'meds', label: 'Medicines and watch', harm: 15, why: 'Severe symptomatic AS left untreated',
                  lines: [['osei', 'No tablet opens a calcified valve. Once severe stenosis causes symptoms, waiting costs him. The team books TAVI.']] }
              ]
            } },
          { id: 'm2_route', title: 'Plan the route', goal: 'Trace the catheter\'s route on the chest atlas',
            go: { atlas: 'chest', mission: 'R4' },
            when: { any: [{ stars: { 'chest:R4': 1 } }, { all: [{ not: { feature: 'chest.tavi' } }, { stars: { 'chest:R2': 1 } }] }] },
            xp: { anatomy: 60, cardio: 40 },
            intro: [['osei', 'Common femoral artery, external iliac, common iliac, up the aorta, round the arch, down the ascending aorta and backwards across the valve. Trace it.']],
            hint: 'Until the dedicated TAVI route exists, Chest rounds R2 (lung to brain, past a stiff valve) counts.' },
          { id: 'm2_newvalve', title: 'The new valve', goal: 'After the procedure, fly the aortic root and feel the jet gone', optional: true,
            needs: 'blood.tavi', when: { obj: 'tavi' }, xp: { cardio: 60 },
            outro: [['log', 'A metal frame holds the old cusps against the wall. Inside it, three thin pig-tissue leaflets open wide. The turbulence is gone.']] },
          { id: 'm2_done', title: 'Back on the ward',
            intro: [
              ['tran', 'He\'s back from the cath lab. Groin\'s dry, pressure 132 over 70. He asked for a cup of tea.'],
              ['reyes', 'My chest feels... lighter. Is that possible?']
            ] }
        ]
      },
      {
        id: 'm3', title: 'Chapter 3 · The words won\'t come', place: 'Cardiac ward, day 3, 06:10',
        src: ['AHA/ASA 2019 Acute Ischaemic Stroke Guideline', 'Published TAVI registries: 30-day stroke about 2–3%', 'Blumenfeld, Neuroanatomy through Clinical Cases'],
        beats: [
          { id: 'm3_call', title: 'Code stroke',
            intro: [
              ['tran', 'Bed 4. He dropped his cup, his right hand isn\'t working and he can\'t get his words out. He knows what he wants to say. Last seen well at 05:00.'],
              ['reyes', '...Tea. No. The... the...'],
              ['osei', 'Stroke is a known risk in the first days after TAVI: debris from the old valve or the arch can travel up the carotid. The clock started at five.']
            ] },
          { id: 'm3_first', title: 'First move', goal: 'Choose the first step',
            choice: {
              case: 'reyes', xp: { neuro: 40, clinical: 40 },
              prompt: 'What happens first?',
              options: [
                { id: 'ct', label: 'CT head and CT angiogram now', best: true,
                  lines: [['lind', 'Right. Rule out bleeding, find the blocked vessel. Everything else depends on those two pictures.']] },
                { id: 'lyse', label: 'Give a clot-buster straight away', harm: 20, why: 'Thrombolysis given before imaging',
                  lines: [['lind', 'Not before a scan. You can\'t tell a clot from a bleed at the bedside, and he has a large fresh puncture in his femoral artery.']] },
                { id: 'mri', label: 'Book an MRI for the morning list', harm: 15, why: 'Imaging delayed in acute stroke',
                  lines: [['lind', 'Brain is being lost every minute this waits. CT and CTA now.']] }
              ]
            } },
          { id: 'm3_localise', title: 'Where is it?', goal: 'Localise the lesion: solve Neuro rounds case L1 in the brain atlas',
            go: { atlas: 'brain', mission: 'L1' }, when: { starsAny: { 'neuro:L1': 1, 'neuro:L9': 1 } }, xp: { neuro: 80 },
            intro: [['lind', 'Effortful speech, understanding intact, face and arm worse than leg. Where do you put your finger?']],
            outro: [['lind', 'Left frontal lobe: Broca\'s area and the arm and face strip of motor cortex, the territory of the upper branch of the left middle cerebral artery. CTA agrees: a branch is cut off.']] },
          { id: 'm3_inside', title: 'The road the clot took', goal: 'From the aortic arch take the carotid to the brain (K), then cross the blood-brain barrier',
            go: { system: 'nerve' }, when: { obj: ['carotid', 'bbb'] }, xp: { neuro: 60, cardio: 20 },
            outro: [['log', 'Downstream of a blocked branch, the tissue is starving. Some is already lost. Around it, a rim is stunned but alive: the penumbra. That rim is what the team is racing for.']] },
          { id: 'm3_tract', title: 'Why the right hand', goal: 'Let an action potential overtake you, then cross the pyramidal decussation',
            when: { obj: ['ap', 'decuss'] }, xp: { neuro: 60 },
            outro: [['log', 'Fibres from his left motor cortex cross at the bottom of the medulla. Left brain, right hand.']] },
          { id: 'm3_trace', title: 'Trace the pathway', goal: 'Trace the motor pathway: earn a star on Neuro rounds P2',
            go: { atlas: 'brain', mission: 'P2' }, when: { stars: { 'neuro:P2': 1 } }, xp: { neuro: 60 } },
          { id: 'm3_after', title: 'Afterwards',
            intro: [
              ['lind', 'The interventional team pulled the clot out of the branch. His arm is coming back. The speech will take longer.'],
              ['priya', 'Nothing by mouth until I\'ve seen him. A stroke here can wreck the swallow.']
            ] }
        ]
      },
      {
        id: 'm4', title: 'Chapter 4 · The cough after breakfast', place: 'Stroke unit, day 5',
        src: ['National stroke guidelines on swallow screening before oral intake', 'Moore, Clinically Oriented Anatomy (bronchial tree)', 'Mandell, Aspiration pneumonia (NEJM 2019)'],
        beats: [
          { id: 'm4_fever', title: 'A new fever',
            intro: [
              ['tran', 'Thirty-eight point four, breathing 26, sats 90 percent on air. Someone gave him porridge before the swallow assessment. He was slumped flat afterwards.'],
              ['osei', 'Crackles at the back on the right. Think about where something swallowed the wrong way would fall in a man lying on his back.']
            ] },
          { id: 'm4_screen', title: 'Bedside swallow screen', goal: 'Run the bedside water swallow screen', optional: true,
            needs: 'gi.swallowscreen', when: { obj: 'swscreen' }, xp: { gi: 40, clinical: 40 } },
          { id: 'm4_swallow', title: 'A normal swallow', goal: 'In the gut, ride a swallow through the oesophagus and LES',
            go: { system: 'gi' }, when: { obj: 'swallow' }, xp: { gi: 60 },
            outro: [
              ['priya', 'Yours went the right way because the larynx lifted, the epiglottis tipped over and the cords shut, all inside a second. In him that timing is off, and the cough that should protect him is weak.'],
              ['log', 'Food or saliva that slips past the cords without a cough is silent aspiration.']
            ] },
          { id: 'm4_carina', title: 'The fork', goal: 'Enter the lungs and let the airflow choose your bronchus at the carina',
            go: { system: 'lung' }, when: { obj: 'carina' }, xp: { resp: 60, anatomy: 20 },
            outro: [['log', 'The right main bronchus is wider, shorter and more upright than the left. That is where things fall.']] },
          { id: 'm4_where', title: 'Which segment?', goal: 'On the chest atlas, solve Chest rounds A1',
            go: { atlas: 'chest', mission: 'A1' }, when: { stars: { 'chest:A1': 1 } }, xp: { anatomy: 60, resp: 40 },
            outro: [['osei', 'Lying flat, gravity takes it to the back: the superior segment of the lower lobe or the posterior segment of the upper lobe, usually on the right. Sitting up, it goes to the bases.']] },
          { id: 'm4_flood', title: 'Flooded air sacs', goal: 'Flood the acinus with the case toggle (V), then run the oxygen trial (O)',
            when: { obj: ['cons', 'o2trial'] }, xp: { resp: 80 },
            outro: [['osei', 'Blood still flows past alveoli full of pus. Extra oxygen barely helps: that\'s shunt. Antibiotics, sit him up, and no more porridge until Priya says so.']] },
          { id: 'm4_defence', title: 'The defences he lost', goal: 'Watch the mucus escalator, then cough (Z) in the trachea and below generation 8',
            when: { obj: ['escalator', 'cough'] }, xp: { resp: 40, immune: 40 } }
        ]
      },
      {
        id: 'm5', title: 'Chapter 5 · The creatinine is rising', place: 'Stroke unit, day 6',
        src: ['KDIGO Clinical Practice Guideline for AKI (2012)', 'Boron & Boulpaep, Medical Physiology (tubular injury)'],
        beats: [
          { id: 'm5_bloods', title: 'The bloods',
            intro: [
              ['tran', 'Creatinine was 88 when he came in. Today it\'s 196. Urine\'s down to about 20 mL an hour for the last eight hours.'],
              ['osei', 'More than double his baseline inside a week, and low urine output. That\'s acute kidney injury, stage 2. He\'s had contrast for two CT scans and a TAVI, a spell of low pressure with the sepsis, and he\'s barely drinking.']
            ] },
          { id: 'm5_why', title: 'What kind of injury?', goal: 'Make your call before the urine results come back',
            choice: {
              case: 'reyes', xp: { renal: 60, clinical: 40 },
              prompt: 'Most likely mechanism',
              options: [
                { id: 'atn', label: 'Acute tubular necrosis', best: true,
                  lines: [['osei', 'Urine microscopy: muddy brown granular casts. Fractional sodium excretion over 2 percent. The tubule cells themselves are injured. Contrast, low pressure and sepsis all hit the same cells.']] },
                { id: 'pre', label: 'Pre-renal: just dry', harm: 5, why: 'AKI mechanism misjudged',
                  lines: [['osei', 'It started that way, maybe. But the casts and a sodium excretion over 2 percent say the tubules are damaged now, not just underfilled. Fluids alone won\'t fix it.']] },
                { id: 'post', label: 'Post-renal: blocked outflow', harm: 5, why: 'AKI mechanism misjudged',
                  lines: [['osei', 'Worth ruling out. The bladder scan shows 60 mL and the ultrasound shows no swelling of the kidneys. It\'s not the plumbing.']] }
              ]
            } },
          { id: 'm5_glom', title: 'The filter', goal: 'Enter the kidney, feel the glomerular pressure, then cross the filtration barrier (K)',
            go: { system: 'renal' }, when: { obj: ['glom', 'filter'] }, xp: { renal: 60 } },
          { id: 'm5_pct', title: 'The hardest-working cells', goal: 'In the proximal tubule, hover and watch what it takes back',
            when: { obj: 'pct' }, xp: { renal: 60 },
            outro: [['log', 'These cells reclaim most of the filtered salt and water, and nearly all the glucose, burning oxygen to do it. That is why they die first when blood flow or oxygen falls.']] },
          { id: 'm5_atn', title: 'Injured tubule', goal: 'Turn on the ATN toggle and watch the cells slough into the lumen', optional: true,
            needs: 'renal.atn', when: { obj: 'atn' }, xp: { renal: 60 } },
          { id: 'm5_tal', title: 'The thick limb', goal: 'Climb the thick ascending limb',
            when: { obj: 'tal' }, xp: { renal: 40 },
            outro: [['log', 'The thick limb in the outer medulla is the other weak spot: lots of pumping, not much oxygen around it.']] },
          { id: 'm5_lasix', title: 'The furosemide question', goal: 'Give furosemide (O) and watch what it does to the gradient',
            when: { obj: 'lasix' }, xp: { renal: 40, clinical: 40 },
            outro: [['osei', 'More urine, yes. Faster recovery, no: it does not heal the tubule. We use it for fluid overload, not to make the numbers look better. Stop the nephrotoxins, keep his pressure up, wait for the tubule to regrow.']] }
        ]
      },
      {
        id: 'm6', title: 'Chapter 6 · Going home', place: 'Ward, day 12',
        src: [],
        beats: [
          { id: 'm6_final', title: 'Final rounds', goal: 'Present the whole admission on final rounds', optional: true,
            needs: 'rounds.reyesFinal', when: { rounds: { reyesFinal: 0.6 } }, xp: { clinical: 150 } },
          { id: 'm6_bye', title: 'Discharge',
            intro: [
              ['reyes', 'Twelve days. A new valve, a stroke, a pneumonia and my kidneys sulking. And you\'ve been inside all of it.'],
              ['rosa', 'He did the stairs to the physio gym this morning. Slowly. But all of them.']
            ] }
        ]
      }
    ],
    // shown when the last beat completes; the first whose condition holds wins
    endings: [
      { id: 'good', when: { health: { reyes: 70 } }, title: 'He walks up the stairs',
        lines: [['log', 'Six weeks later Daniel Reyes climbs the stairs to his daughter\'s flat without stopping. His speech still catches on long words. He tells everyone about the new valve.']] },
      { id: 'mixed', when: { health: { reyes: 40 } }, title: 'Home, with help',
        lines: [['log', 'He goes home with a frame, a carer twice a day and thickened drinks. Some of the delays cost him. He is alive, and he is home.']] },
      { id: 'hard', when: null, title: 'A long road',
        lines: [['log', 'He leaves for a rehabilitation unit, weaker than he came in. Look back at the decisions that cost him, and play the chapter again.']] }
    ]
  },

  /* =====================================================================================
   * ALTERNATIVE STORYLINES
   * ===================================================================================== */
  {
    id: 'oxygen', kind: 'physiology', hours: '45 min',
    title: 'Follow the oxygen',
    blurb: 'Be one breath of air. From the nose to a working muscle and back: bulk flow, diffusion, haemoglobin, the heart as a pump, and why extra oxygen fails in shunt.',
    chapters: [
      { id: 'o1', title: 'Air side', beats: [
        { id: 'o1_in', title: 'Breathe in', goal: 'Enter the lungs (Tab → Pulmonary)', go: { system: 'lung' }, when: { obj: 'lung' }, xp: { resp: 30 },
          intro: [['log', 'You are 21 percent of a breath. Ride it down.']] },
        { id: 'o1_carina', title: 'Right or left', goal: 'Let the airflow choose at the carina', when: { obj: 'carina' }, xp: { resp: 30 } },
        { id: 'o1_diff', title: 'Where flow stops', goal: 'Cross generation 16, where bulk flow gives way to diffusion', when: { obj: 'diffuse' }, xp: { resp: 50 },
          outro: [['log', 'The airways have branched so often that the total cross-section is huge and the air barely moves. From here oxygen gets the rest of the way by diffusion alone.']] },
        { id: 'o1_dock', title: 'Across the wall', goal: 'In an alveolar sac, inspect the septum and watch a red cell load in 0.25 s', when: { obj: 'dock' }, xp: { resp: 60 } }
      ] },
      { id: 'o2', title: 'Blood side', beats: [
        { id: 'o2_exit', title: 'Into the blood', goal: 'Cross the barrier and ride the pulmonary vein', when: { obj: 'lexit' }, xp: { resp: 40, cardio: 20 } },
        { id: 'o2_left', title: 'The pump', goal: 'Cross the mitral valve and the aortic valve', go: { system: 'circ' }, when: { obj: ['mitral', 'aortic'] }, xp: { cardio: 60 } },
        { id: 'o2_muscle', title: 'Delivery', goal: 'In the working muscle capillary, press K and follow the plasma out', when: { obj: 'leak' }, xp: { cardio: 40 },
          outro: [['log', 'At rest a red cell gives up only about a quarter of its oxygen here. Exercise pulls far more off, helped by heat, acid and CO₂.']] }
      ] },
      { id: 'o3', title: 'When it goes wrong', beats: [
        { id: 'o3_zone', title: 'Gravity', goal: 'Stand the patient up and lie him down (U): watch V/Q change', go: { system: 'lung' }, when: { obj: 'zone' }, xp: { resp: 50 } },
        { id: 'o3_shunt', title: 'Shunt', goal: 'Flood the acinus (V), then run the oxygen trial (O)', when: { obj: ['cons', 'o2trial'] }, xp: { resp: 80, clinical: 30 } }
      ] }
    ]
  },

  {
    id: 'meal', kind: 'physiology', hours: '1–1.5 h',
    title: 'Follow a meal',
    blurb: 'A slice of bread from the tongue to the colon: the swallow, the stomach\'s grinding, the villus fork, and what happens when that bread is the problem.',
    chapters: [
      { id: 'f1', title: 'Down the tube', beats: [
        { id: 'f1_in', title: 'First bite', goal: 'Enter the gut (Tab → Gastrointestinal)', go: { system: 'gi' }, when: { obj: 'gut' }, xp: { gi: 30 } },
        { id: 'f1_swallow', title: 'The swallow', goal: 'Let a peristaltic wave carry you through the LES', when: { obj: 'swallow' }, xp: { gi: 40 } },
        { id: 'f1_pylorus', title: 'The grinder', goal: 'Pass the pylorus when an antral wave opens it', when: { obj: 'grind' }, xp: { gi: 40 } },
        { id: 'f1_duo', title: 'Neutralised', goal: 'Stay in the duodenum while bile and pancreatic juice arrive', when: { obj: 'ampulla' }, xp: { gi: 40 } }
      ] },
      { id: 'f2', title: 'The fork', beats: [
        { id: 'f2_villus', title: 'The villus forest', goal: 'Scan a villus in the jejunum', when: { obj: 'villus' }, xp: { gi: 40 } },
        { id: 'f2_routes', title: 'Two exits', goal: 'Take both exits: glucose into the portal blood, fat into the lacteal (K)', when: { obj: ['portal', 'lacteal'] }, xp: { gi: 80 },
          outro: [['log', 'Sugars and amino acids go to the liver first by the portal vein. Fat, packed into chylomicrons, skips the liver and goes by lymph to the thoracic duct.']] },
        { id: 'f2_peyer', title: 'The guards', goal: 'Find a Peyer\'s patch in the ileum', when: { obj: 'peyer' }, xp: { gi: 30, immune: 30 } },
        { id: 'f2_colon', title: 'The slow end', goal: 'Cross the colon to the rectum', when: { obj: 'colon' }, xp: { gi: 40 } }
      ] },
      { id: 'f3', title: 'When bread is the problem', place: 'Case 03 · Ms Nair', beats: [
        { id: 'f3_exam', title: 'Ms Nair', goal: 'Examine Ms Nair and localise the lesion (G)', when: { obj: 'gexam' }, xp: { clinical: 40, gi: 30 } },
        { id: 'f3_marsh', title: 'Flat villi', goal: 'In the jejunum press V until the villi flatten (Marsh 3)', when: { obj: 'marsh' }, xp: { gi: 60 } },
        { id: 'f3_rounds', title: 'Present her', goal: 'Present Ms Nair on Rounds (R)', when: { obj: 'grounds' }, xp: { clinical: 80 } }
      ] },
      { id: 'f4', title: 'Where the portal blood goes', beats: [
        { id: 'f4_liver', title: 'The liver', goal: 'Ride portal blood into a liver sinusoid and out by the central vein', needs: 'liver', when: { obj: 'sinusoid' }, xp: { gi: 80 } },
        { id: 'f4_insulin', title: 'The answer to sugar', goal: 'Visit an islet as the glucose arrives', needs: 'pancreas', when: { obj: 'islet' }, xp: { endo: 80 } }
      ] }
    ]
  },

  {
    id: 'signal', kind: 'system', hours: '2–3 h',
    title: 'The signal',
    blurb: 'Neuroscience at med-school depth. Cross into the brain, ride one motor command to a muscle, then localise lesions like a neurologist.',
    chapters: [
      { id: 's1', title: 'Into the brain', beats: [
        { id: 's1_carotid', title: 'The carotid', goal: 'In the aortic arch, press K to take the carotid', go: { system: 'circ' }, when: { obj: 'carotid' }, xp: { neuro: 30 } },
        { id: 's1_bbb', title: 'The barrier', goal: 'Cross the blood-brain barrier', when: { obj: 'bbb' }, xp: { neuro: 50 } },
        { id: 's1_glia', title: 'The other cells', goal: 'Inspect a neuron, an astrocyte and a microglial cell', when: { obj: 'glia' }, xp: { neuro: 50 } }
      ] },
      { id: 's2', title: 'One command', beats: [
        { id: 's2_ap', title: 'The spike', goal: 'Let an action potential overtake you', when: { obj: 'ap' }, xp: { neuro: 40 } },
        { id: 's2_cross', title: 'The crossing', goal: 'Cross the pyramidal decussation', when: { obj: 'decuss' }, xp: { neuro: 40 } },
        { id: 's2_syn', title: 'The gap', goal: 'Cross the synaptic cleft onto the lower motor neuron', when: { obj: 'synapse' }, xp: { neuro: 40 } },
        { id: 's2_nmj', title: 'The muscle', goal: 'Reach the neuromuscular junction', when: { obj: 'nmj' }, xp: { neuro: 60 } }
      ] },
      { id: 's3', title: 'Where is the lesion?', beats: [
        { id: 's3_cortex', title: 'Cortex', goal: 'Neuro rounds: earn a star on L1, L2 and L4', go: { atlas: 'brain', mission: 'L1' }, when: { stars: { 'neuro:L1': 1, 'neuro:L2': 1, 'neuro:L4': 1 } }, xp: { neuro: 120 } },
        { id: 's3_deep', title: 'Deep and below', goal: 'Neuro rounds: L3, L5 and L6', when: { stars: { 'neuro:L3': 1, 'neuro:L5': 1, 'neuro:L6': 1 } }, xp: { neuro: 120 } },
        { id: 's3_loops', title: 'The loops', goal: 'Neuro rounds: L7 (cerebellum) and L8 (basal ganglia)', when: { stars: { 'neuro:L7': 1, 'neuro:L8': 1 } }, xp: { neuro: 100 } },
        { id: 's3_paths', title: 'The pathways', goal: 'Trace all three pathways: P1, P2, P3', when: { stars: { 'neuro:P1': 1, 'neuro:P2': 1, 'neuro:P3': 1 } }, xp: { neuro: 120, anatomy: 40 } },
        { id: 's3_master', title: 'Three stars', goal: 'Three stars on every case in one set: L1–L5, or L6–L8 with P1 and P2',
          when: { any: [{ stars: { 'neuro:L1': 3, 'neuro:L2': 3, 'neuro:L3': 3, 'neuro:L4': 3, 'neuro:L5': 3 } }, { stars: { 'neuro:L6': 3, 'neuro:L7': 3, 'neuro:L8': 3, 'neuro:P1': 3, 'neuro:P2': 3 } }] }, xp: { neuro: 200 } }
      ] },
      { id: 's4', title: 'A disease of the insulation', place: 'Coming case · multiple sclerosis', beats: [
        { id: 's4_ms', title: 'Patchy myelin', goal: 'Fly a demyelinated axon and watch conduction fail', needs: 'nerve.ms', when: { obj: 'msplaque' }, xp: { neuro: 120 } }
      ] }
    ]
  },

  {
    id: 'cases', kind: 'cases', hours: '20–40 min each',
    title: 'Case files',
    blurb: 'Four separate patients, each a short story: bedside, inside, rounds. Play them in any order.',
    chapters: [
      { id: 'c1', title: 'Case 01 · Mr Reyes, the stiff valve', beats: [
        { id: 'c1_exam', title: 'Bedside', goal: 'Find the murmur (G)', go: { system: 'circ' }, when: { obj: 'exam' }, xp: { clinical: 30 } },
        { id: 'c1_in', title: 'Inside', goal: 'Listen at the valve (H) and cross it', when: { obj: ['steth', 'aortic'] }, xp: { cardio: 40 } },
        { id: 'c1_r', title: 'Rounds', goal: 'Present him (R)', when: { obj: 'rounds' }, xp: { clinical: 50 } }
      ] },
      { id: 'c3', title: 'Case 03 · Ms Nair, coeliac disease', beats: [
        { id: 'c3_exam', title: 'Bedside', goal: 'Examine Ms Nair (G)', go: { system: 'gi' }, when: { obj: 'gexam' }, xp: { clinical: 30 } },
        { id: 'c3_in', title: 'Inside', goal: 'Flatten the villi (V) in the jejunum', when: { obj: 'marsh' }, xp: { gi: 40 } },
        { id: 'c3_r', title: 'Rounds', goal: 'Present her (R)', when: { obj: 'grounds' }, xp: { clinical: 50 } }
      ] },
      { id: 'c4', title: 'Case 04 · Mr Herrera, lobar pneumonia', beats: [
        { id: 'c4_exam', title: 'Bedside', goal: 'Examine Mr Herrera and localise the consolidation (G)', go: { system: 'lung' }, when: { obj: 'lexam' }, xp: { clinical: 30 } },
        { id: 'c4_in', title: 'Inside', goal: 'Flood the acinus (V) and prove shunt (O)', when: { obj: ['cons', 'o2trial'] }, xp: { resp: 40 } },
        { id: 'c4_r', title: 'Rounds', goal: 'Present him (R)', when: { obj: 'lrounds' }, xp: { clinical: 50 } }
      ] },
      { id: 'c5', title: 'Case 05 · Ms Okafor, diabetic ketoacidosis', beats: [
        { id: 'c5_exam', title: 'Bedside', goal: 'Read her gas and explain the polyuria (G)', go: { system: 'renal' }, when: { obj: 'rexam' }, xp: { clinical: 30 } },
        { id: 'c5_in', title: 'Inside', goal: 'Put her in DKA (V) and follow the glucose to the calyx', when: { obj: ['dka', 'calyx'] }, xp: { renal: 40, endo: 20 } },
        { id: 'c5_r', title: 'Rounds', goal: 'Present her (R)', when: { obj: 'rrounds' }, xp: { clinical: 50 } }
      ] }
    ]
  },

  {
    id: 'defenders', kind: 'system', hours: '1 h',
    title: 'The defenders',
    blurb: 'Immunity as a road trip: leak out of a capillary, ride the lymph through a node, meet the gut\'s guards and the lung\'s escalator, then watch a pneumonia fill an air sac.',
    chapters: [
      { id: 'd1', title: 'The lymph road', beats: [
        { id: 'd1_leak', title: 'Out of the blood', goal: 'In the muscle capillary, press K to leak out', go: { system: 'circ' }, when: { obj: 'leak' }, xp: { immune: 30 } },
        { id: 'd1_cap', title: 'Blind-ended', goal: 'Drift into a lymphatic capillary and pass a valve', when: { obj: ['lymphcap', 'lyvalve'] }, xp: { immune: 40 } },
        { id: 'd1_node', title: 'The node', goal: 'Cross a lymph node and inspect a dendritic cell and a macrophage', when: { obj: ['node', 'immune'] }, xp: { immune: 80 } },
        { id: 'd1_home', title: 'Home', goal: 'Ride the thoracic duct back into the blood', when: { obj: 'duct' }, xp: { immune: 40 } }
      ] },
      { id: 'd2', title: 'The borders', beats: [
        { id: 'd2_peyer', title: 'Gut guards', goal: 'Find a Peyer\'s patch in the ileum', go: { system: 'gi' }, when: { obj: 'peyer' }, xp: { immune: 40 } },
        { id: 'd2_esc', title: 'The escalator', goal: 'Watch the mucus escalator and cough (Z)', go: { system: 'lung' }, when: { obj: ['escalator', 'cough'] }, xp: { immune: 40, resp: 20 } },
        { id: 'd2_cons', title: 'When the border falls', goal: 'Flood the acinus (V): neutrophils and fluid fill the air sacs', when: { obj: 'cons' }, xp: { immune: 60 } }
      ] }
    ]
  },

  {
    id: 'practical', kind: 'exam', hours: 'open-ended',
    title: 'Anatomy practical',
    blurb: 'Exam prep. Tag tests against the clock, localisation, routes, bedside landmarks and CT, plus a daily flashcard round.',
    chapters: [
      { id: 'p1', title: 'Tag tests', beats: [
        { id: 'p1_t1', title: 'Lungs from outside', goal: 'Chest rounds T1', go: { atlas: 'chest', mission: 'T1' }, when: { stars: { 'chest:T1': 1 } }, xp: { anatomy: 50 } },
        { id: 'p1_t2', title: 'Heart and great vessels', goal: 'Chest rounds T2', when: { stars: { 'chest:T2': 1 } }, xp: { anatomy: 50 } },
        { id: 'p1_t3', title: 'Roots and mediastinum', goal: 'Chest rounds T3', when: { stars: { 'chest:T3': 1 } }, xp: { anatomy: 60 } },
        { id: 'p1_t4', title: 'Segments', goal: 'Chest rounds T4', when: { stars: { 'chest:T4': 1 } }, xp: { anatomy: 60 } }
      ] },
      { id: 'p2', title: 'Clinical anatomy', beats: [
        { id: 'p2_ecg', title: 'Coronary territories', goal: 'Chest rounds E1, E2 and E3', when: { stars: { 'chest:E1': 1, 'chest:E2': 1, 'chest:E3': 1 } }, xp: { anatomy: 60, cardio: 40 } },
        { id: 'p2_air', title: 'Airway', goal: 'Chest rounds A1, A2 and N1', when: { stars: { 'chest:A1': 1, 'chest:A2': 1, 'chest:N1': 1 } }, xp: { anatomy: 60, resp: 30 } },
        { id: 'p2_routes', title: 'Routes', goal: 'Chest rounds R1, R2 and R3', when: { stars: { 'chest:R1': 1, 'chest:R2': 1, 'chest:R3': 1 } }, xp: { anatomy: 80 } },
        { id: 'p2_proc', title: 'Bedside landmarks', goal: 'Chest rounds X2 to X5', when: { stars: { 'chest:X2': 1, 'chest:X3': 1, 'chest:X4': 1, 'chest:X5': 1 } }, xp: { anatomy: 80, clinical: 40 } },
        { id: 'p2_ct', title: 'Read the CT', goal: 'Chest rounds C1', when: { stars: { 'chest:C1': 1 } }, xp: { anatomy: 60 } }
      ] },
      { id: 'p3', title: 'Daily round', beats: [
        { id: 'p3_cards', title: 'Flashcards', goal: 'Review a set of flashcards (T)', when: { obj: 'review' }, xp: { clinical: 20 } }
      ] }
    ]
  },

  {
    id: 'balance', kind: 'system', hours: '1–2 h (grows as worlds land)',
    title: 'Keeping the balance',
    blurb: 'Hormones as messages: ADH in the collecting duct, insulin and the islet, the pituitary\'s portal system. Grows as the liver, pancreas and pituitary worlds arrive.',
    chapters: [
      { id: 'b1', title: 'Water', beats: [
        { id: 'b1_adh', title: 'ADH', goal: 'In the kidney, change hydration (U) and watch the collecting duct obey ADH', go: { system: 'renal' }, when: { obj: 'adh' }, xp: { renal: 50, endo: 40 } }
      ] },
      { id: 'b2', title: 'Sugar', beats: [
        { id: 'b2_dka', title: 'No insulin', goal: 'Put Ms Okafor in DKA (V) and follow the glucose', when: { obj: 'dka' }, xp: { endo: 60, renal: 30 } },
        { id: 'b2_islet', title: 'The islet', goal: 'Visit a pancreatic islet: beta cells release insulin', needs: 'pancreas', when: { obj: 'islet' }, xp: { endo: 80 } }
      ] },
      { id: 'b3', title: 'The master gland', beats: [
        { id: 'b3_portal', title: 'The portal system', goal: 'Ride the hypophyseal portal veins from hypothalamus to anterior pituitary', needs: 'pituitary', when: { obj: 'hypoportal' }, xp: { endo: 100 } }
      ] }
    ]
  }
  ];

  /* Final rounds for the main journey (feature 'rounds.reyesFinal'). Same shape as the game's
   * QUIZ arrays: q, a (first answer is correct; the game shuffles), e (explanation). */
  const QUIZ_REYES_FINAL = [
    { q: 'Mr Reyes, 74, fainted climbing stairs and has a harsh ejection systolic murmur at the right second intercostal space with a soft S2. Echo: peak velocity 4.6 m/s, mean gradient 52 mmHg. What is indicated?',
      a: ['Aortic valve replacement, because severe aortic stenosis is now symptomatic', 'Repeat echo in 12 months', 'Start a beta-blocker and review', 'Valve replacement only if the gradient exceeds 80 mmHg'],
      e: 'A peak velocity of 4 m/s or more or a mean gradient of 40 mmHg or more is severe. Syncope, angina or breathlessness make valve replacement a class I indication.' },
    { q: 'For transfemoral TAVI, which sequence does the delivery catheter follow?',
      a: ['Common femoral → external iliac → common iliac → abdominal aorta → arch → ascending aorta → aortic valve', 'Femoral vein → IVC → right atrium → septum → left atrium → aortic valve', 'Radial → brachial → subclavian → ascending aorta → aortic valve', 'Common femoral → internal iliac → aorta → aortic valve'],
      e: 'TAVI is delivered retrograde through the arterial tree and crosses the valve from the aorta.' },
    { q: 'On day 3 he has effortful, non-fluent speech with intact comprehension, and right face and arm weakness worse than the leg. Which vessel is most likely occluded?',
      a: ['Superior division of the left middle cerebral artery', 'Left anterior cerebral artery', 'Right middle cerebral artery', 'Basilar artery'],
      e: 'Broca\'s area and the face and arm motor cortex lie on the lateral left frontal lobe, supplied by the upper branch of the left MCA. ACA strokes hit the leg.' },
    { q: 'What must happen before thrombolysis or thrombectomy is considered?',
      a: ['Non-contrast CT to exclude haemorrhage, with CT angiography to find a large-vessel occlusion', 'MRI with diffusion imaging the next morning', 'Lumbar puncture', 'Echocardiogram to find the source'],
      e: 'Haemorrhage must be excluded first. CTA identifies an occlusion that thrombectomy can reach. Time is brain.' },
    { q: 'Lying flat after aspirating porridge, where does he most likely develop pneumonia?',
      a: ['Superior segment of the right lower lobe', 'Basal segments of the left lower lobe', 'Lingula', 'Apical segment of the left upper lobe'],
      e: 'The right main bronchus is wider, shorter and more vertical. Supine, aspirate runs to dependent posterior segments: the superior segment of the lower lobe and the posterior segment of the upper lobe.' },
    { q: 'His SpO₂ barely rises on high-flow oxygen while a lobe is consolidated. Why?',
      a: ['Shunt: blood perfuses alveoli that contain no gas, so extra inspired oxygen never reaches it', 'Dead space: ventilated alveoli are not perfused', 'Diffusion limitation from a thick membrane', 'Hypoventilation from the stroke'],
      e: 'In a true shunt, increasing FiO₂ cannot oxygenate blood that passes airless alveoli; low V/Q areas, by contrast, respond to oxygen.' },
    { q: 'Creatinine rose from 88 to 196 µmol/L over 4 days. Urine shows muddy brown granular casts and FENa 3%. What is the diagnosis?',
      a: ['Acute tubular necrosis', 'Pre-renal acute kidney injury', 'Post-renal obstruction', 'Acute interstitial nephritis'],
      e: 'Granular casts and FENa above 2% mean the tubular cells are injured and cannot hold on to sodium. Pre-renal AKI usually has FENa below 1%.' },
    { q: 'Which parts of the nephron are most vulnerable to ischaemic injury?',
      a: ['The straight part of the proximal tubule and the medullary thick ascending limb', 'The glomerular capillaries and Bowman\'s capsule', 'The distal convoluted tubule and the macula densa', 'The cortical collecting duct'],
      e: 'Both segments do heavy active transport and sit where oxygen delivery is lowest, at the corticomedullary junction and the outer medulla.' }
  ];

  const out = { CAST, STORYLINES, QUIZ_REYES_FINAL };
  if (typeof module !== 'undefined' && module.exports) module.exports = out;
  else { root.IV_CAST = CAST; root.IV_STORYLINES = STORYLINES; root.QUIZ_REYES_FINAL = QUIZ_REYES_FINAL; }
})(typeof window !== 'undefined' ? window : globalThis);
