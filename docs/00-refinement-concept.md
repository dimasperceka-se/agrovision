# PROMPT — REFINE AGROFORESTRY PLATFORM PROTOTYPE

Copy everything below the line into Claude Code / Claude in VS Code.

---

## CONTEXT

I'm building a management platform for an agroforestry plantation project in Kalimantan, Indonesia. An initial prototype already exists in this workspace. Your job is to **refine and restructure** it — not to build from scratch.

**Project profile:**
- Crops: **Durian** (serving as the forestry/timber component) + **Coconut** (the agri component; product direction is copra / fresh coconut water)
- Potential area: up to **100,000 hectares**, divided into blocks (assume ~30 ha per block → ~3,300 blocks)
- **Current field status: still in the seedling procurement phase. Nothing has been planted. There is no harvest.** This matters — do not build features that assume productive trees.
- The land will likely be split across several corporate entities (5–10 companies), so the data model must be multi-tenant / multi-group.
- Users: field officers (data collection, mainly mobile), supervisors (approval), management and the finance director (reports).
- Client's business goals: (a) improve cultivation productivity, (b) demonstrate positive environmental impact for corporate reputation, (c) most important to management — **financial visibility on the project: profit/loss and when it reaches break-even**.

---

## CORE REQUIREMENT — THE RESULT MUST BE DYNAMIC, NOT STATIC

The existing prototype is **static / a mockup**: hardcoded data, sample numbers, nothing persisted. **The refined result must be dynamic.** Below is exactly what I mean by "dynamic." Do not reinterpret it and do not relax it.

### MANDATORY IN THIS PHASE

**1. Real persistence**
- Every form performs real CRUD against a database. Data must survive a page refresh and a server restart.
- No mock state, no `useState` as the source of truth for data, no in-memory arrays as storage.
- Include explicit schema migrations / table definitions.

**2. Master data comes from the database, not from code**
- All dropdown contents (`fertilizer_type`, `seedling_variety`, `cost_category`, `unit_of_measure`, `supplier`, `block`, `company_entity`, etc.) are queried from master tables.
- **Moving a hardcoded array into a `constants.ts` / `enums.ts` file does NOT count as dynamic.** That is still static.
- A super admin must be able to add or edit master data from the UI, and the change must appear immediately in every related dropdown with no redeploy.

**3. Every number is computed — no sample values anywhere**
- Remove **all** hardcoded/dummy numbers from dashboards and reports. No exceptions.
- Must be computed from actual data: total expenditure per category, actual vs budget, remaining budget, cost per hectare, cost per block, cost per tree, P&L, break-even projection, net carbon (sequestration − emissions), healthy seedling count, land preparation progress, cost per km for transport.
- If there is no data yet, render an **honest empty state** ("No data yet") — **do not fill it with placeholder numbers.** Fabricated numbers on a financial dashboard are a fatal failure for this deliverable.
- Charts must render from query results, not from a static dataset inside the component.

**4. Map and polygons driven by data**
- Block polygons render from a GeoJSON column in the database — not a static file, not an image.
- A newly added block appears on the map immediately. Clicking a block pulls that block's live operational and cost data.

**5. Filtering, search, sorting, and pagination genuinely work**
- All of it handled at the query/server level, not by filtering an already fully-loaded array in the frontend.
- Keep the scale in mind: **~3,300 blocks**. A table without server-side pagination will not survive.

**6. Real approval state**
- Approval status is a database column that actually changes when an approver acts, and that change drives both access rights and the status shown in the originating module.
- Not a static badge, not a status hardcoded per row.

**7. Cross-module relationships must be live**
- This chain must demonstrably work: enter an expenditure against block X → it immediately affects cost per hectare for block X → it immediately appears in the Financial Report → it is immediately compared against block X's budget.
- Likewise: enter a DBH measurement → carbon sequestration figures in the Sustainability Report change immediately.
- If any link in these chains is broken, that module is not done.

### BUILD THE DYNAMIC FOUNDATION NOW, BUILDER UI IN PHASE 2

**8. Form rendering must be schema-driven**
- Forms must **not** be written as static JSX per form. Render each form from a **schema definition (JSON) stored in the database**: fields, labels, input types, options (or a reference to a master table), validation rules, required/optional, ordering.
- The consequence: adding a field to a form means editing a schema row, **not** editing code and redeploying.
- For this phase, schemas may be seeded via migration/seeder. **An end-user form builder UI is phase 2** — but because rendering is already schema-driven, phase 2 only needs an editor on top of that schema, with no rewrite.
- Add `// TODO: phase 2 — form builder UI on top of this schema`.

**9. Reports must be query-driven**
- A report is assembled from a stored definition (data source, fields, filters, aggregations) that is translated into a query at runtime.
- The three built-in reports (Operational / Sustainability / Financial) must be implemented as **three report definition rows**, not three hardcoded pages.
- **An end-user custom report builder UI is phase 2.** The query-driven foundation is mandatory now.
- Add `// TODO: phase 2 — custom report builder UI`.

### ACCEPTANCE TESTS — PROVE THESE BEFORE CLAIMING DONE

Do not report completion until you can demonstrate all of the following:

1. A super admin adds a new fertilizer type via the UI → it appears in the fertilizer application form dropdown **with no code change**.
2. A creator adds a new block with a polygon → the block appears on the map **and** in the block dropdown of every form.
3. A creator enters 3 expenditure records against different blocks → totals, cost per hectare per block, and the Financial Report charts all change accordingly, and actual-vs-budget shifts.
4. An approver rejects one record with a reason → the status changes in the originating module, the record is excluded from report calculations, and the creator can resubmit.
5. Refresh the browser and restart the server → all of the above data is still there.
6. Grep the dashboard and report components for hardcoded numeric literals → **the result must be zero**.

If any part cannot be made dynamic because of a technical constraint or an unresolved decision, **say plainly which part and why.** Do not paper over it with fake data that merely looks functional in a demo.

---

## STEP 1 — AUDIT FIRST, DO NOT START CODING

Before changing anything:

1. Read the workspace structure and map out what the current prototype actually contains.
2. Produce a mapping table: **existing feature → which new group it belongs to → status (keep / refactor / merge / drop / not built yet) → currently static or dynamic**.
   - That last column matters: identify every hardcoded point in the prototype (dummy data, sample numbers, option arrays, static chart datasets) and list the file locations. These are what must be torn out.
3. Explicitly flag any already-built feature that has no home in the new structure — do not silently delete it, ask me first.
4. Report the audit back to me and **wait for my confirmation** before making structural changes.

---

## STEP 2 — TARGET MODULE STRUCTURE

Restructure the navigation into the following five groups.

### A. OPERATIONAL
Focus: farming practice — all of it takes the form of field surveys / data entry forms.

1. **Seedling / Nursery Monitoring**
   - Seedling inventory: type, variety, quantity, condition (healthy / diseased / dead), source/supplier, received date
   - Periodic seedling condition surveys
   - Seedling tagging → allocation to a specific block/plantation (build this relationship now, even though planting hasn't started)
2. **Land Preparation Check**
   - Per-block readiness checklist: soil pH, number and dimensions of planting holes, effective area, planting layout, land clearing status
   - Status: not started / in progress / ready to plant
3. **Land Suitability Assessment**
   - A **one-time assessment per block**, kept separate from land preparation. Do not merge them — they have different data lifecycles.
   - Parameters: soil type, drainage, slope, elevation, rainfall, suitability score for durian vs coconut
4. **Fertilizer / Farm Input Monitoring**
   - Records of fertilizer application: fertilizer type, dosage, date, block, officer
   - Distinguish the **vegetative** phase (single fertilizers: Urea, KCl, ZA — roughly 6-month intervals) from the **generative** phase (compound fertilizers such as NPK)
5. **Farm Input Recommendation**
   - **IMPORTANT — constrain the scope for this phase:** implement this as an **admin-maintained reference table plus fertilization schedule**, not an automated rules engine.
   - Structure: a `fertilizer_schedule` master table (crop × growth phase × tree age × fertilizer type × dosage per tree × interval), and the system surfaces a "scheduled recommendation" for a block based on its tree age.
   - Add `// TODO: phase 2 — rules engine driven by soil test results` at the extension point. Do not invent agronomic logic.
6. **Pruning Monitoring**
   - Records of routine pruning activity, per block, per officer
7. **Plantation Survey / Adoption Observation (AOC)**
   - General plantation maintenance survey, weed control, herbicide/compost application
   - Eventually also harvest recording (build the data structure, keep the UI disabled for now)
8. **Spatial / Block Management** ← *this was not in my original list of groups, but it MUST live here*
   - Block master data: block code, area, owning company entity, polygon (GeoJSON)
   - Polygon capture and upload, map view visualization
   - A slot for ingesting drone data (mapping / aerial imagery) — build it as attachments plus a map layer; do not build a processing pipeline
   - **Every other module must reference `block_id` from here.** This is foundation data.

### B. SUSTAINABILITY
1. **Carbon Sequestration**
   - **Emissions side**: land preparation (clearing and felling — the largest emission source in the current phase), transport/hauling, fuel consumption, fertilizer application
   - **Sequestration side**: tree growth, calculated from **stem diameter (DBH)** by growth phase. Since everything is still a seedling, sequestration is effectively zero today — design so the DBH measurement form becomes relevant from the juvenile phase onward.
   - Output: **net carbon** = sequestration − emissions, per block and in aggregate
   - Treat emission factors and allometric equations as **admin-configurable constants**, not hardcoded values. Leave a TODO noting that reference sources are required — do not invent coefficients.
   - Clearly mark which figures require agronomic validation.
2. **Organic Certification**
   - A form builder for certification checklists (the client will author the actual checklist later)
   - Audit workflow: submit → review → pass / fail with reason
   - Note: certification is only relevant in roughly 3 years. Build the framework, not the checklist content.
3. **Traceability**
   - **Constrain the scope firmly for this phase.** There is no harvest yet, so there is nothing to trace end to end.
   - What to build now: the **identity and relationship schema** — `seedling batch → block → (later) harvest batch`. Make sure the ID scheme is consistent and extensible.
   - Do not build a traceability chain UI, QR/RFID, or chain-of-custody. Add `// TODO: phase 2`.

### C. COSTING
Forms for recording **Expenditure vs Budget vs Revenue**, following the pattern of the Koltiva ERP farm-level costing module.

1. **AN ARCHITECTURAL DECISION IS REQUIRED FIRST — ask me before coding:**
   Is this module (a) an **API integration** with the Koltiva ERP, or (b) **standalone**, merely mirroring Koltiva's form and report patterns? This determines the data model, authentication, and synchronization. Do not assume.
2. **Expenditure Form**
   - Cost categories: seedling procurement, land preparation, fertilizer procurement, farm tools/mechanization, vehicles and fuel, vehicle servicing, labor (man power), logistics
   - Each entry: category, sub-category, related block, quantity, unit, unit price, total, date
   - **Required: attachment upload for proof of purchase** (photo of receipt/invoice). Flow: creator uploads → supervisor reviews → approve / reject (a rejection must carry a reason, e.g. the photo is illegible).
   - `// TODO: phase 2 — OCR auto-extraction from receipt photos`
3. **Revenue / Accounts Receivable Form**
   - Coconut and durian sales: volume, price, buyer, date
   - Keep the UI disabled/hidden for now (there is no harvest yet), but the data model must be complete
4. **Budget Setting**
   - Budget allocated up front, per category and per period
   - Actual vs budget comparison with an over-budget indicator
5. **Derived Calculations**
   - Cost per hectare, cost per block, cost per tree
   - Project profit and loss (P&L)
   - Break-even point indicator — this is what the finance director is waiting for
   - Unit-cost tracking: e.g. fuel consumption → cost per km and cost per liter, used as a basis for estimating inter-block transport cost

### D. REPORT
**Treat this as a view layer over the same data, not as a module with its own datastore.**

1. **Custom Report Builder** — the user selects data source, fields, filters, and aggregations. A report is by nature an **aggregation/consolidation**, not a dump of form rows. Example: a certification form may have 100 fields, but the report only needs "passed: X, failed: Y, most common failure reason: Z."
2. **Three built-in reports:**
   - **Operational Report** — fertilizer application actuals, healthy seedling counts, trees planted, land preparation progress
   - **Sustainability Report** — net carbon per block, certification status, traceability summary
   - **Financial Report** — expenditure vs budget, P&L, cost per hectare, break-even projection
3. **Output formats:** a dashboard view (charts plus tables) **and** a document export (PDF) that looks like a formal report rather than a screenshot of a dashboard. The client specifically asked for a document-style output.

### E. APPROVAL
**Build this as a cross-cutting workflow layer, not a siloed module.**

1. **A single state machine** used by every form: `draft → submitted → under_review → approved | rejected`. A rejection must carry a reason field and must be resubmittable.
2. **Roles:**
   - `creator` — data entry, primarily via mobile
   - `approver` — can approve/reject **and** can create (approver is a superset of creator)
   - `super_admin` — manages master data, users, and configuration
3. **Per-group/entity access configuration:** one user may have access to one or several company entities / block groups. This is a multi-tenancy requirement, because the land is split across multiple companies.
4. **UI:** one centralized approval inbox (all pending items across modules) **plus** a status indicator on each record inside its originating module. Both read from the same state machine.

---

## STEP 3 — CROSS-CUTTING RULES (NON-NEGOTIABLE)

### Form and validation rules
The client asked for these explicitly — do not relax them:
- **Minimize free text.** Controlled fields must be dropdowns / multi-selects backed by master data.
- Monetary and quantity fields → **numeric validation required**, with an explicit unit and thousands formatting.
- Dates → date picker, never a free-form string.
- Free text is only for notes/remarks fields.
- Every form must carry: `created_by`, `created_at`, `approval_status`, `block_id` (where relevant), and attachments (where relevant).

### Required master data
Dropdowns cannot function without this. Build a master data module under `super_admin`:
`fertilizer_type`, `pesticide_herbicide_type`, `seedling_variety`, `supplier`, `cost_category`, `unit_of_measure`, `block`, `company_entity`, `growth_phase`, `plantation_activity_type`, `emission_factor`, `allometric_coefficient`.

### Mobile
- Mobile exists **only for data collection** — not dashboards, not approvals.
- Target: **PWA** (faster to deliver than a native APK).
- This phase may be **online-only**. But design the data layer so an offline queue plus sync can be added later without a major refactor. Add `// TODO: phase 2 — offline sync`.

### Web
- Contains: dashboards, reports, the approval inbox, master data/settings, and form entry (for office-side corrections and entry).

---

## STEP 4 — OPEN DECISIONS: ASK, DO NOT ASSUME

Do not invent answers to any of the following. Ask me, or mark them with `// DECISION NEEDED:` in the code:

1. Costing: Koltiva ERP API integration or standalone? (blocker — ask before starting)
2. **Backend and database stack** for persistence. A static prototype may have no backend at all — if so, propose options with their trade-offs (setup speed vs production readiness) and wait for my decision. This blocks every dynamic requirement above.
3. Has the land already been surveyed and divided into blocks in the field, or is blocking performed inside the system?
4. How many corporate entities will the 100,000 ha be split across?
5. Reference sources for emission factors and allometric equations used in carbon calculations
6. Budget structure: per year, per project phase, or per block?
7. Does labor cost sit in per-block costing, or as separate overhead?

---

## STEP 5 — WHAT I EXPECT AS OUTPUT

Work through these in order — do not skip ahead:

1. **The audit results** plus the mapping table to the new structure → then wait for my confirmation
2. **A navigation structure diagram** for the five groups and the screens within each
3. **Data schema / ERD** — in particular `block` as foundation data, how approval state attaches to every entity, and the tables holding form schema definitions and report definitions
4. **A working backend, database, and migrations/seeders** — this is a prerequisite, not an add-on. Do this before touching any form UI.
5. **Refactor the navigation and routing** of the prototype into the new structure
6. **Form implementation priority** — each one must be **fully dynamic** per the acceptance tests above. Two genuinely live forms are worth more than eight mockups. This order reflects what the client asked to see at the upcoming demo:
   - a. **Costing / Expenditure form** ← the client is most curious about this one
   - b. Seedling Monitoring form
   - c. Land Preparation form
   - d. Map view with block polygons (it just needs to render something real)
   - e. Financial dashboard (expenditure vs budget)
7. Everything else as stubs with correct data structures and schemas — **label them clearly as stubs in the UI**, do not disguise them as finished features using fake data

**Conventions:** UI copy in Indonesian; code, identifiers, and comments in English. Follow the conventions already present in the prototype — don't change them without a reason.

**Operating principle:** if a requirement strikes you as inconsistent, risky, or dependent on domain knowledge that isn't available, **say so up front.** Do not quietly invent an implementation. An honest stub is better than incorrect agronomy or carbon math.

---

## OPTIONAL LINE — ADD THIS IF YOU DECIDE TO GO DEPTH-FIRST

> Absolute priority: one genuinely live end-to-end flow (Expenditure → database → Financial Report) matters more than screen coverage. Every other screen can be a labeled stub.
