# Graph Report - plant-area-system  (2026-11-16)

## Corpus Check
- 340 files · ~250,595 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 34 file(s) not represented in the graph (top: (none) 12, .css 12, .conf 4)

## Summary
- 2437 nodes · 6570 edges · 155 communities (114 shown, 41 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 100 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `283dd53c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- selection.ts
- Operasional pilot
- Consumable Order Carts
- Shared Errors and Stock Transactions
- theme.spec.ts
- Shared Errors and Stock Transactions
- index.tsx
- Consumable Order Carts
- drawing-form.tsx
- server/src/index.ts
- documents.ts
- Consumables Workspace Controls
- Repository Automation Scripts
- Icon
- Auth Application Dependencies
- Bag Application Dependencies
- Consumables Application Dependencies
- Shared Errors and Stock Transactions
- change-password/page.tsx
- Portal Application Dependencies
- approval.ts
- migrate.ts
- pageIdentity
- bag-core/src/index.ts
- dependencies
- AppError
- Application Theme Layouts
- Consumables Inventory Schema
- User Administration Services
- UI Design Token System
- Compose Runtime Services
- insights.ts
- Administration Workspace Controls
- Database Migration Containers
- Consumables Core Dependencies
- Cross Application Acceptance Tests
- drawings/app/[section]/page.tsx
- Continuous Integration Validation
- Auth Core Dependencies
- Shared TypeScript Configuration
- Container Build Arguments
- auth
- Development Tool Dependencies
- Bag Core Dependencies
- Shared UI Dependencies
- generate-brand.mjs
- Nginx Service Routing
- Cross Application UI Design
- smoke-dev.ts
- db
- Service Authentication Configuration
- MySQL Credential Configuration
- Authentication Storage Schema
- Container Health Checks
- Database Environment Configuration
- unit/drawings-files.test.ts
- Server Package Dependencies
- drawings/package.json
- Auth TypeScript Configuration
- Bag TypeScript Configuration
- Consumables TypeScript Configuration
- Portal TypeScript Configuration
- Drawing Database v1 — PRD dan prompt implementasi
- Bag Installation Storage
- drawings-core/src/drawings.ts
- Domain Contract Dependencies
- Gateway Recovery Verification
- drawings-import-legacy.ts
- requests.ts
- contracts/src/index.ts
- FsStorage
- monitor.tsx
- drawings-core/package.json
- BagMonitor
- integration/consumables.test.ts
- Consumables Application Container
- platform.test.ts
- Workspace Build Permissions
- Source Formatting Configuration
- Consumables Liveness Endpoint
- Portal Readiness Endpoint
- Application Brand Symbol
- Application Brand Symbol
- Application Brand Symbol
- Application Brand Symbol
- Expanded Brand Wordmark
- Compact Brand Symbol
- TLS Certificate Setup
- Database Backup Shell
- Database Initialization Shell
- files.ts
- Auth Migration Checkpoints
- Bag Migration Checkpoints
- Batch Cancellation Migration
- ShellSkeleton
- drawings-ops
- stock-summary.tsx
- Prompt: Portal setara gold standard Bag Filter
- integration/drawings-workflow.test.ts
- R22 single shared stock
- Hasil validasi implementasi v2
- environment
- Plant Area System v2
- Consumable Room v1.1 R22
- drawings/tsconfig.json
- Panduan agen untuk Plant Area System v2
- db
- documents/[id]/page.tsx
- Upgrade Consumable Room R22
- services
- Identity
- drawings
- Runbook rilis Drawing Database v1
- getDrawingsDb
- Q: `packages/ui/src/tokens.css` seharusnya jangan dilewati. lalu docs\testing dan `AppError` apakah itu penting sehingga harus dimasukkan dalam graph?
- drawings/app/health/live/route.ts
- CLAUDE.md
- dev.ts
- Overlay
- drawings.spec.ts
- auth-core/src/index.ts
- requests-ui.tsx
- ref_node_fs
- package.json
- database-snapshot.ts
- StockSummary
- overlay.tsx
- ref_node_assert
- equipment-migration.ts
- consumables.spec.ts

## God Nodes (most connected - your core abstractions)
1. `AppError` - 189 edges
2. `Identity` - 61 edges
3. `drizzle-orm` - 56 edges
4. `canDraw()` - 53 edges
5. `Button()` - 49 edges
6. `react` - 46 edges
7. `db()` - 41 edges
8. `BagMonitor()` - 40 edges
9. `Icon()` - 40 edges
10. `pageIdentity()` - 38 edges

## Surprising Connections (you probably didn't know these)
- `Cakupan graph proyek` --references--> `AppError`  [INFERRED]
  AGENTS.md → packages/contracts/src/index.ts
- `8.1 Bagian baru dan yang berubah` --references--> `DrawingsGrant`  [INFERRED]
  docs/DRAWING-DATABASE-PRD.md → packages/contracts/src/drawings.ts
- `8.1 Bagian baru dan yang berubah` --references--> `canDraw()`  [INFERRED]
  docs/DRAWING-DATABASE-PRD.md → packages/contracts/src/drawings.ts
- `9. UI` --references--> `Input()`  [INFERRED]
  docs/DRAWING-DATABASE-PRD.md → packages/ui/src/fields.tsx
- `9. UI` --references--> `Textarea()`  [INFERRED]
  docs/DRAWING-DATABASE-PRD.md → packages/ui/src/fields.tsx

## Import Cycles
- 2-file cycle: `packages/contracts/src/drawings-requests.ts -> packages/contracts/src/index.ts -> packages/contracts/src/drawings-requests.ts`
- 2-file cycle: `packages/contracts/src/drawings-workflow.ts -> packages/contracts/src/index.ts -> packages/contracts/src/drawings-workflow.ts`
- 2-file cycle: `packages/contracts/src/drawings-model.ts -> packages/contracts/src/index.ts -> packages/contracts/src/drawings-model.ts`
- 3-file cycle: `packages/contracts/src/drawings-model.ts -> packages/contracts/src/index.ts -> packages/contracts/src/drawings-requests.ts -> packages/contracts/src/drawings-model.ts`

## Hyperedges (group relationships)
- **Cross-application UI modernization** — docs_design_ui_audit_portal_consumables_operational_hub, docs_design_ui_audit_portal_consumables_reversible_overlays, docs_design_ui_audit_portal_consumables_accessible_design_tokens, docs_design_ui_audit_portal_consumables_shell_skeleton, docs_design_ui_audit_portal_consumables_stock_query_feedback, docs_design_ui_audit_portal_consumables_reversible_cart [EXTRACTED 1.00]

## Communities (155 total, 41 thin omitted)

### Community 0 - "selection.ts"
Cohesion: 0.23
Nodes (19): BulkSelection(), BulkSelectionForm(), Props, areaPositions(), BagArea, Compartment, compartmentChoices(), compartmentOptions() (+11 more)

### Community 1 - "Operasional pilot"
Cohesion: 0.27
Nodes (12): Migrasi database lokal ke VPS, Single writer database cutover, Handover OpenClaw database, Database migration checkpoints M0 M8, Deployment checkpoints C0 C12, Handover OpenClaw deployment, Deployment VPS tq-cmms.com, VPS resource budget and serial builds (+4 more)

### Community 2 - "Consumable Order Carts"
Cohesion: 0.10
Nodes (13): MaterialSearch(), OrderCart(), Picklist(), stockApi(), StockApiError, descriptions, dynamic, Page() (+5 more)

### Community 3 - "Shared Errors and Stock Transactions"
Cohesion: 0.14
Nodes (23): Context, dynamic, GET(), json(), PATCH, POST, dateConditions(), listDocuments() (+15 more)

### Community 4 - "theme.spec.ts"
Cohesion: 0.11
Nodes (8): changePassword(), passwordField(), equipmentCodes, better-auth, paths, theme(), actor, actor

### Community 5 - "Shared Errors and Stock Transactions"
Cohesion: 0.14
Nodes (14): dynamic, GET(), cache, closeConsumablesDb(), create(), getConsumablesDb(), importCatalog(), parseCatalog() (+6 more)

### Community 6 - "index.tsx"
Cohesion: 0.13
Nodes (22): dynamic, Profile(), Confirmation, ConfirmationOptions, ConfirmationProvider(), ConfirmFunction, cartCount(), CartDraft (+14 more)

### Community 7 - "Consumable Order Carts"
Cohesion: 0.14
Nodes (30): AddToOrder(), QuantityDialog(), createDocument(), parseNamingCsv(), amount, canConsume(), canonicalDocumentPayload(), ConsumablesGrant (+22 more)

### Community 8 - "drawing-form.tsx"
Cohesion: 0.09
Nodes (38): ApiError, getJson(), newKey(), parse(), sendJson(), wib, DrawingForm(), submit() (+30 more)

### Community 9 - "server/src/index.ts"
Cohesion: 0.12
Nodes (23): dynamic, GET(), dynamic, GET(), dynamic, GET(), AuditList(), Event (+15 more)

### Community 10 - "documents.ts"
Cohesion: 0.09
Nodes (25): replay(), date, docCols, DocumentConflict, documentDetail(), header, hec, pickLine (+17 more)

### Community 11 - "Consumables Workspace Controls"
Cohesion: 0.18
Nodes (20): AliasInput(), AuditItem, ConsumablesWorkspace(), openMaterial(), Enrollment(), get(), InventoryEditor(), labels (+12 more)

### Community 12 - "Repository Automation Scripts"
Cohesion: 0.06
Nodes (31): scripts, bootstrap, brand:generate, build, check:export, consumables:import, consumables:import-naming, consumables:preflight (+23 more)

### Community 13 - "Icon"
Cohesion: 0.12
Nodes (26): OverviewMap(), dynamic, Portal(), wibDateFormatter, Commit 2: `feat(portal): rebuild hub on the Bag Filter dashboard system`, AppId, bagBrands, formatRelativeWib() (+18 more)

### Community 14 - "Auth Application Dependencies"
Cohesion: 0.10
Nodes (24): dependencies, next@16.4.2, @plant/auth-core@workspace:*, @plant/contracts@workspace:*, @plant/server@workspace:*, @plant/ui@workspace:*, react@19.3.1, react-dom@19.3.1 (+16 more)

### Community 15 - "Bag Application Dependencies"
Cohesion: 0.10
Nodes (24): dependencies, next@16.4.2, @plant/bag-core@workspace:*, @plant/contracts@workspace:*, @plant/server@workspace:*, @plant/ui@workspace:*, react@19.3.1, react-dom@19.3.1 (+16 more)

### Community 16 - "Consumables Application Dependencies"
Cohesion: 0.10
Nodes (24): dependencies, next@16.4.2, @plant/consumables-core@workspace:*, @plant/contracts@workspace:*, @plant/server@workspace:*, @plant/ui@workspace:*, react@19.3.1, react-dom@19.3.1 (+16 more)

### Community 17 - "Shared Errors and Stock Transactions"
Cohesion: 0.14
Nodes (14): common, inventoryInput, materialInput, MoveKind, schemas, Executor, invCols, joinInv (+6 more)

### Community 18 - "change-password/page.tsx"
Cohesion: 0.21
Nodes (14): ChangePassword(), dynamic, LoginForm(), PasswordForm(), dynamic, Login(), safeReturnTo(), BrandLogo() (+6 more)

### Community 19 - "Portal Application Dependencies"
Cohesion: 0.11
Nodes (22): dependencies, next@16.4.2, @plant/contracts@workspace:*, @plant/server@workspace:*, @plant/ui@workspace:*, react@19.3.1, react-dom@19.3.1, next (+14 more)

### Community 20 - "approval.ts"
Cohesion: 0.09
Nodes (59): RevisionStatus, revisionStatuses, ApprovalActionView, approvalDecisionSchema, ApprovalLevel, approvalPlanSchema, ApprovalStep, approverRoles (+51 more)

### Community 21 - "migrate.ts"
Cohesion: 0.10
Nodes (21): 8.1 Bagian baru dan yang berubah, DrawingsAction, drawingsActions, DrawingsGrant, DrawingsNavItem, drawingsPermissions, DrawingsPermissionValue, drawingsRoleDescriptions (+13 more)

### Community 22 - "pageIdentity"
Cohesion: 0.19
Nodes (21): dynamic, Page(), dynamic, Page(), dynamic, Page(), dynamic, Page() (+13 more)

### Community 23 - "bag-core/src/index.ts"
Cohesion: 0.09
Nodes (40): Context, dynamic, GET(), json(), POST(), dynamic, EquipmentPage(), CancellationColumns (+32 more)

### Community 24 - "dependencies"
Cohesion: 0.12
Nodes (16): dependencies, better-auth@1.7.12, drizzle-orm@0.45.4, mysql2@3.24.6, @plant/auth-core@workspace:*, @plant/bag-core@workspace:*, @plant/consumables-core@workspace:*, @plant/contracts@workspace:* (+8 more)

### Community 25 - "AppError"
Cohesion: 0.12
Nodes (45): Context, directory(), dynamic, GET(), json(), mutate(), PATCH, peopleOrNull() (+37 more)

### Community 26 - "Application Theme Layouts"
Cohesion: 0.12
Nodes (17): inter, Layout(), metadata, inter, Layout(), metadata, inter, Layout() (+9 more)

### Community 27 - "Consumables Inventory Schema"
Cohesion: 0.18
Nodes (19): `catalog_imports`, `consumables_audit`, consumables_audit_time_idx, `inventory`, inventory_location_idx, `locations`, material_category_idx, `materials` (+11 more)

### Community 28 - "User Administration Services"
Cohesion: 0.23
Nodes (23): Context, dynamic, GET(), POST(), getAuthDb(), auditEntry(), authAudit(), createUser() (+15 more)

### Community 29 - "UI Design Token System"
Cohesion: 0.20
Nodes (18): SIL Open Font License 1.1, Inter v4.1 Self-Hosted Font Asset, Bag age color scale, Brand color aliases, Design system cascade layers, Chart hatch patterns, Theme aware chart series, Component radius tokens (+10 more)

### Community 30 - "Compose Runtime Services"
Cohesion: 0.10
Nodes (19): command, depends_on, image, networks, profiles, name, networks, gateway (+11 more)

### Community 31 - "insights.ts"
Cohesion: 0.19
Nodes (17): activeAgeSummary(), dynamic, GET(), createDatabase(), getBagDb(), activity(), ageTones, allowed() (+9 more)

### Community 32 - "Administration Workspace Controls"
Cohesion: 0.19
Nodes (17): RequestView(), run(), Application, Applications(), Admin(), dynamic, AdminWorkspace(), act() (+9 more)

### Community 33 - "Database Migration Containers"
Cohesion: 0.22
Nodes (9): entrypoint, environment, image, networks, restart, volumes, MYSQL_HOST, MYSQL_PWD (+1 more)

### Community 34 - "Consumables Core Dependencies"
Cohesion: 0.15
Nodes (16): dependencies, drizzle-orm@0.45.4, mysql2@3.24.6, @plant/contracts@workspace:*, zod@4.5.4, exports, ./import, ./schema (+8 more)

### Community 35 - "Cross Application Acceptance Tests"
Cohesion: 0.11
Nodes (6): actor, temporary, types, year, actor, materials

### Community 36 - "drawings/app/[section]/page.tsx"
Cohesion: 0.12
Nodes (27): MaterialRows(), AuditList(), Item, Page, formatWib(), empty, Filters, Library() (+19 more)

### Community 37 - "Continuous Integration Validation"
Cohesion: 0.12
Nodes (15): jobs, validate, name, on, permissions, contents, if, name (+7 more)

### Community 38 - "Auth Core Dependencies"
Cohesion: 0.16
Nodes (15): dependencies, better-auth@1.7.12, drizzle-orm@0.45.4, mysql2@3.24.6, @plant/contracts@workspace:*, exports, ./schema, better-auth (+7 more)

### Community 39 - "Shared TypeScript Configuration"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, esModuleInterop, jsx, lib, module, moduleResolution, noEmit (+7 more)

### Community 40 - "Container Build Arguments"
Cohesion: 0.20
Nodes (16): APP, build, build, args, context, dockerfile, target, build (+8 more)

### Community 41 - "auth"
Cohesion: 0.12
Nodes (19): condition, depends_on, image, init, networks, restart, depends_on, image (+11 more)

### Community 42 - "Development Tool Dependencies"
Cohesion: 0.11
Nodes (14): devDependencies, @aws-sdk/client-s3@3.1160.0, @cantoo/pdf-lib@2.11.1, drizzle-kit@0.31.11, @playwright/test@1.64.1, prettier@3.9.10, tsx@4.23.15, typescript@5.9.3 (+6 more)

### Community 43 - "Bag Core Dependencies"
Cohesion: 0.18
Nodes (13): dependencies, drizzle-orm@0.45.4, mysql2@3.24.6, @plant/contracts@workspace:*, exports, ./schema, drizzle-orm, mysql2 (+5 more)

### Community 44 - "Shared UI Dependencies"
Cohesion: 0.18
Nodes (13): dependencies, @plant/contracts@workspace:*, react@19.3.1, react-dom@19.3.1, exports, ./styles.css, @plant/contracts, react (+5 more)

### Community 45 - "generate-brand.mjs"
Cohesion: 0.12
Nodes (12): config, config, config, config, config, next, app, marker (+4 more)

### Community 46 - "Nginx Service Routing"
Cohesion: 0.13
Nodes (15): condition, condition, bag-filter, consumables, drawings, portal, condition, depends_on (+7 more)

### Community 47 - "Cross Application UI Design"
Cohesion: 0.09
Nodes (22): Accessible design tokens, Portal and Consumables UI audit, Momentum-aware drawer gestures, Portal operational hub, Reversible cart feedback, ShellSkeleton navigation fallback, 0. Konteks dan prioritas acuan, 1. Keputusan font: self-host Inter (+14 more)

### Community 48 - "smoke-dev.ts"
Cohesion: 0.12
Nodes (11): args, docker(), exists(), parseEnv(), root, run, verifyIsolatedRuntime(), compose (+3 more)

### Community 49 - "db"
Cohesion: 0.06
Nodes (35): IDEMPOTENCY_KEY, NotificationItem, notificationReadSchema, auditList(), drawingDetailBase(), DrawingRow, drawingTimeline(), listDrawings() (+27 more)

### Community 50 - "Service Authentication Configuration"
Cohesion: 0.36
Nodes (12): environment, environment, environment, AUTH_INTERNAL_URL, AUTH_SECRET, NGINX_ENVSUBST_FILTER, NODE_ENV, PUBLIC_ORIGIN (+4 more)

### Community 51 - "MySQL Credential Configuration"
Cohesion: 0.15
Nodes (13): AUTH_DB_PASSWORD, BAG_DB_PASSWORD, CONSUMABLES_DB_PASSWORD, DRAWINGS_DB_PASSWORD, MYSQL_ROOT_HOST, MYSQL_ROOT_PASSWORD, command, environment (+5 more)

### Community 52 - "Authentication Storage Schema"
Cohesion: 0.27
Nodes (11): account_user_idx, `accounts`, `app_grants`, `applications`, `auth_audit`, auth_audit_time_idx, `login_attempts`, session_user_idx (+3 more)

### Community 53 - "Container Health Checks"
Cohesion: 0.53
Nodes (12): healthcheck, healthcheck, healthcheck, healthcheck, interval, retries, start_period, test (+4 more)

### Community 54 - "Database Environment Configuration"
Cohesion: 0.24
Nodes (13): environment, AUTH_DATABASE_URL, AUTH_MIGRATION_DATABASE_URL, BAG_DATABASE_URL, BAG_MIGRATION_DATABASE_URL, BOOTSTRAP_EMAIL, BOOTSTRAP_NAME, BOOTSTRAP_PASSWORD (+5 more)

### Community 55 - "unit/drawings-files.test.ts"
Cohesion: 0.07
Nodes (17): clampText(), formatStampTime(), invalid(), normalizeRotation(), queue, STAMP_GAP, STAMP_HEIGHT, STAMP_MARGIN (+9 more)

### Community 56 - "Server Package Dependencies"
Cohesion: 0.22
Nodes (10): dependencies, next@16.4.2, @plant/contracts@workspace:*, exports, next, @plant/contracts, name, private (+2 more)

### Community 57 - "drawings/package.json"
Cohesion: 0.08
Nodes (28): clampScale(), describe(), Failure, PdfViewerCore(), PdfViewerProps, presets, dependencies, next@16.4.2 (+20 more)

### Community 58 - "Auth TypeScript Configuration"
Cohesion: 0.20
Nodes (9): compilerOptions, allowJs, incremental, jsx, plugins, exclude, extends, include (+1 more)

### Community 59 - "Bag TypeScript Configuration"
Cohesion: 0.20
Nodes (9): compilerOptions, allowJs, incremental, jsx, plugins, exclude, extends, include (+1 more)

### Community 60 - "Consumables TypeScript Configuration"
Cohesion: 0.20
Nodes (9): compilerOptions, allowJs, incremental, jsx, plugins, exclude, extends, include (+1 more)

### Community 61 - "Portal TypeScript Configuration"
Cohesion: 0.20
Nodes (9): compilerOptions, allowJs, incremental, jsx, plugins, exclude, extends, include (+1 more)

### Community 62 - "Drawing Database v1 — PRD dan prompt implementasi"
Cohesion: 0.06
Nodes (39): cancelled(), 10. Operasional, 11. Kriteria penerimaan, 12. Perbedaan terhadap referensi DrafTerra, 13. Saran lanjutan (belum masuk lingkup), 14. Hal yang masih perlu keputusan, 15.1 Peran dan tujuan, 15.3 Aturan kerja (+31 more)

### Community 63 - "Bag Installation Storage"
Cohesion: 0.44
Nodes (8): `bag_audit`, bag_audit_equipment_time_idx, batch_equipment_time_idx, `coordinates`, `equipment`, installation_position_time_idx, `installations`, `replacement_batches`

### Community 64 - "drawings-core/src/drawings.ts"
Cohesion: 0.08
Nodes (31): canSeeDrawing(), canSeeRevision(), canSeeWip(), DrawingAccessFacts, DrawingCreateInput, drawingCreateSchema, drawingFileName(), DrawingListItem (+23 more)

### Community 65 - "Domain Contract Dependencies"
Cohesion: 0.25
Nodes (8): dependencies, zod@4.5.4, exports, zod, name, private, type, version

### Community 66 - "Gateway Recovery Verification"
Cohesion: 0.24
Nodes (8): actor, compose, docker(), inspect(), names, run, sentinels, services

### Community 67 - "drawings-import-legacy.ts"
Cohesion: 0.06
Nodes (14): RFC-4180, fieldsSchema, legacyImportKey(), LegacyImportOutcome, LegacyImportRow, legacyImportRow(), parseCsv(), args (+6 more)

### Community 68 - "requests.ts"
Cohesion: 0.11
Nodes (39): drawingsPermission(), DrawingsRole, drawingsRole(), DrawingPermissions, canSeeRequest(), drafterDecisionSchema, DrawingsDashboard, hac (+31 more)

### Community 69 - "contracts/src/index.ts"
Cohesion: 0.07
Nodes (35): BagFilter(), dynamic, canonicalReplacement(), ageStops, bagAgeIntervalDays, bagColor(), BagGrant, BagRole (+27 more)

### Community 70 - "FsStorage"
Cohesion: 0.10
Nodes (10): StorageConfig, assertKey(), ByteRange, createStorage(), FsStorage, getStorage(), S3Storage, Storage (+2 more)

### Community 71 - "monitor.tsx"
Cohesion: 0.15
Nodes (16): BatchCancellationDialog(), BatchRecord, CancellationNotice(), CoordinateHistory(), TimelineItem, Batch, Installed, MarqueeDrag (+8 more)

### Community 72 - "drawings-core/package.json"
Cohesion: 0.13
Nodes (18): dependencies, @aws-sdk/client-s3@3.1160.0, @cantoo/pdf-lib@2.11.1, drizzle-orm@0.45.4, mysql2@3.24.6, @plant/contracts@workspace:*, zod@4.5.4, exports (+10 more)

### Community 73 - "BagMonitor"
Cohesion: 0.19
Nodes (17): BagMonitor(), addPositions(), cellKey(), dismiss(), focus(), hover(), keyboard(), leaveHover() (+9 more)

### Community 74 - "integration/consumables.test.ts"
Cohesion: 0.16
Nodes (24): mutate(), hecSuggestions(), consumablesSchema, listCategories(), materialDetail(), postMovement(), replay(), reconcile() (+16 more)

### Community 75 - "Consumables Application Container"
Cohesion: 0.40
Nodes (5): image, init, networks, restart, consumables

### Community 76 - "platform.test.ts"
Cohesion: 0.10
Nodes (18): dynamic, POST(), dynamic, GET(), 15.2 Bacaan wajib sebelum menulis kode, buildAuth(), getAuth(), publicOrigin() (+10 more)

### Community 77 - "Workspace Build Permissions"
Cohesion: 0.40
Nodes (4): allowBuilds, esbuild, sharp, packages

### Community 78 - "Source Formatting Configuration"
Cohesion: 0.40
Nodes (4): endOfLine, printWidth, singleQuote, trailingComma

### Community 107 - "files.ts"
Cohesion: 0.14
Nodes (19): RFC-5987, IMAGE_MAX_BYTES, IMAGE_MAX_PER_ITEM, STAGED_TTL_MS, storageConfig(), Body, cleanupStagedFiles(), contentDisposition() (+11 more)

### Community 116 - "ShellSkeleton"
Cohesion: 0.19
Nodes (8): Loading(), Loading(), Loading(), brandRevision, compactArtwork, fullArtwork, brandIcon(), ShellSkeleton()

### Community 117 - "drawings-ops"
Cohesion: 0.14
Nodes (14): depends_on, mysql, depends_on, image, networks, profiles, volumes, command (+6 more)

### Community 118 - "stock-summary.tsx"
Cohesion: 0.13
Nodes (12): countScale(), ChartQuarter, ChartSeries, number(), QuarterlyChart(), ranges, movementLabels, StockActivity() (+4 more)

### Community 119 - "Prompt: Portal setara gold standard Bag Filter"
Cohesion: 0.17
Nodes (12): 1. Tujuan, 2. Batasan, 3. Hasil audit: Portal dibanding gold standard, 4. Rancangan target (≥1536 px), 5. Langkah implementasi, 6. Kriteria penerimaan, 7. Laporan, 8. Keputusan yang diambil dalam brief ini (dapat dibatalkan pengguna) (+4 more)

### Community 120 - "integration/drawings-workflow.test.ts"
Cohesion: 0.11
Nodes (7): directory(), key(), ownerOf(), people, release(), u, v()

### Community 121 - "R22 single shared stock"
Cohesion: 0.50
Nodes (4): R22 document API, HAC SAC and mandatory Cost Center, R22 single shared stock, R22 single room preflight

### Community 122 - "Hasil validasi implementasi v2"
Cohesion: 0.25
Nodes (11): BrandLogo artwork pipeline, Identitas TQ-CMMS, Application context sidebar navigation, Perbaikan sidebar dan dashboard Consumables, Proportional count chart and compact Portal, Separate transaction chart semantics, UI refresh v2 Plant Area System, Reversible overlays and momentum gestures (+3 more)

### Community 123 - "environment"
Cohesion: 0.31
Nodes (11): environment, environment, DRAWINGS_MAX_PDF_MB, DRAWINGS_S3_ACCESS_KEY_ID, DRAWINGS_S3_BUCKET, DRAWINGS_S3_ENDPOINT, DRAWINGS_S3_FORCE_PATH_STYLE, DRAWINGS_S3_REGION (+3 more)

### Community 124 - "Plant Area System v2"
Cohesion: 0.21
Nodes (11): Kontrak API v2, Session identity and exact origin, Setup development MacBook, Native Mac development setup, Active installation age and yearly replacements, PRD Plant Area System v2, Six equipment coordinate catalog, Centralized Auth SSO guards (+3 more)

### Community 125 - "Consumable Room v1.1 R22"
Cohesion: 0.15
Nodes (16): Idempotent Bag Filter batches, Audit baseline Plant Area System, Legacy Vinext Cloudflare D1 export, Panduan pembatalan record Bag Filter, Whole batch cancellation, Consumable Room v1.1 R22, Fixed point atomic stock documents, Picklist K3 auto enrollment (+8 more)

### Community 126 - "drawings/tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, allowJs, incremental, jsx, plugins, exclude, extends, include (+1 more)

### Community 127 - "Panduan agen untuk Plant Area System v2"
Cohesion: 0.25
Nodes (8): Artefak Graphify bersama, Cakupan graph proyek, Dokumentasi library dan platform, Konteks proyek, Memakai Graphify pada sesi baru, Panduan agen untuk Plant Area System v2, Steps, Validasi perubahan

### Community 128 - "db"
Cohesion: 0.19
Nodes (13): inactiveAssignee(), listTasks(), DirectoryPerson, requestTasks(), counts(), drawingsDashboard(), drawingsPortalSummary(), n() (+5 more)

### Community 129 - "documents/[id]/page.tsx"
Cohesion: 0.32
Nodes (4): dynamic, Page(), titles, PrintButton()

### Community 130 - "Upgrade Consumable Room R22"
Cohesion: 0.32
Nodes (8): Portable schema and data fingerprint, Pengembangan lokal sampai pembaruan VPS, CI verified full SHA release, Handover OpenClaw update R22, R22 production backup rehearsal, Upgrade Consumable Room R22, Private atomic naming CSV import, Disposable MySQL and HTTPS QA

### Community 131 - "services"
Cohesion: 0.25
Nodes (7): networks, networks, networks, egress, services, drawings, drawings-ops

### Community 132 - "Identity"
Cohesion: 0.11
Nodes (16): authSchema, closeBagDb(), bagSchema, Identity, drizzle-orm, @playwright/test, addFull(), area() (+8 more)

### Community 133 - "drawings"
Cohesion: 0.33
Nodes (6): image, init, networks, restart, volumes, drawings

### Community 134 - "Runbook rilis Drawing Database v1"
Cohesion: 0.25
Nodes (8): 1. Persiapan (tanpa downtime), 2. Jendela rilis, 3. Smoke test setelah rilis, 4. Rollback, 5. Pindah driver `fs` → `s3` (setelah go-live), 6. Impor arsip Legacy Ready, Runbook rilis Drawing Database v1, status()

### Community 135 - "getDrawingsDb"
Cohesion: 0.14
Nodes (13): dynamic, GET(), cache, closeDrawingsDb(), create(), getDrawingsDb(), drawingsDatabaseReady(), drawingsSchema (+5 more)

### Community 136 - "Q: `packages/ui/src/tokens.css` seharusnya jangan dilewati. lalu docs\testing dan `AppError` apakah itu penting sehingga harus dimasukkan dalam graph?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: `packages/ui/src/tokens.css` seharusnya jangan dilewati. lalu docs\testing dan `AppError` apakah itu penting sehingga harus dimasukkan dalam graph?, Source Nodes

### Community 142 - "dev.ts"
Cohesion: 0.24
Nodes (17): apps, compose(), cores, databases, databaseUrls(), docker(), execute(), exists() (+9 more)

### Community 143 - "Overlay"
Cohesion: 0.18
Nodes (12): DateTimeField(), highlight(), TimeColumn(), IconName, paths, Overlay(), move(), App (+4 more)

### Community 144 - "drawings.spec.ts"
Cohesion: 0.13
Nodes (8): 5. Data dan aturan bisnis, json(), operator, people, Person, png, suffix, version()

### Community 145 - "auth-core/src/index.ts"
Cohesion: 0.19
Nodes (13): appDirectory(), DirectoryEntry, account, applications, audit, dataMigrations, grants, loginAttempts (+5 more)

### Community 146 - "requests-ui.tsx"
Cohesion: 0.19
Nodes (10): ImageUpload(), Item, TYPES, Page, Person, RequestBadge(), RequestForm(), scopeLabels (+2 more)

### Community 147 - "ref_node_fs"
Cohesion: 0.14
Nodes (7): verifier, [full, compact], outputs, revision, root, sources, extra

### Community 148 - "package.json"
Cohesion: 0.15
Nodes (12): @types/node@22.19.19, @types/react@19.2.14, @types/react-dom@19.2.3, engines, node, name, packageManager, private (+4 more)

### Community 149 - "database-snapshot.ts"
Cohesion: 0.21
Nodes (11): args, capture(), compare(), databases, ephemeral, identifier(), migrationsHash(), walk() (+3 more)

### Community 150 - "StockSummary"
Cohesion: 0.21
Nodes (11): dynamic, Page(), 3. Portal: hub yang tenang tapi berisi, dan siap untuk aplikasi baru, Kondisi sekarang, Kontrak ringkasan aplikasi (inti skalabilitas), Kriteria selesai (Portal), Prinsip desain, Tata letak target (+3 more)

### Community 151 - "overlay.tsx"
Cohesion: 0.36
Nodes (9): react-dom@19.3.1, project(), record(), rubberband(), Sample, shouldDismiss(), spring(), velocity() (+1 more)

### Community 152 - "ref_node_assert"
Cohesion: 0.30
Nodes (3): R22_ROOM_ID, mysql2, preflightSingleRoom()

### Community 153 - "equipment-migration.ts"
Cohesion: 0.43
Nodes (7): seedEquipment(), equipmentPositions(), validPosition(), migrateBag(), migrateEquipmentData(), migrateGrants(), verifyBagCatalog()

### Community 154 - "consumables.spec.ts"
Cohesion: 0.29
Nodes (6): admin, materials, post(), roleUsers, save(), suffix

## Knowledge Gaps
- **45 isolated node(s):** `RFC-4180`, `../../tsconfig.json`, `RFC-5987`, `../../tsconfig.json`, `../../tsconfig.json` (+40 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 933 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **41 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AppError` connect `AppError` to `db`, `documents/[id]/page.tsx`, `Shared Errors and Stock Transactions`, `theme.spec.ts`, `Shared Errors and Stock Transactions`, `Identity`, `Consumable Order Carts`, `Q: `packages/ui/src/tokens.css` seharusnya jangan dilewati. lalu docs\testing dan `AppError` apakah itu penting sehingga harus dimasukkan dalam graph?`, `server/src/index.ts`, `documents.ts`, `auth-core/src/index.ts`, `Shared Errors and Stock Transactions`, `approval.ts`, `pageIdentity`, `bag-core/src/index.ts`, `User Administration Services`, `insights.ts`, `db`, `unit/drawings-files.test.ts`, `drawings-core/src/drawings.ts`, `drawings-import-legacy.ts`, `requests.ts`, `contracts/src/index.ts`, `FsStorage`, `integration/consumables.test.ts`, `platform.test.ts`, `files.ts`, `integration/drawings-workflow.test.ts`, `Panduan agen untuk Plant Area System v2`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `AppError` (e.g. with `Cakupan graph proyek` and `15.2 Bacaan wajib sebelum menulis kode`) actually correct?**
  _`AppError` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-4180`, `../../tsconfig.json`, `RFC-5987` to the rest of the system?**
  _45 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Consumable Order Carts` be split into smaller, more focused modules?**
  _Cohesion score 0.10253699788583509 - nodes in this community are weakly interconnected._
- **Why does `Identity` connect `Identity` to `db`, `Consumable Order Carts`, `theme.spec.ts`, `Consumable Order Carts`, `server/src/index.ts`, `documents.ts`, `Consumables Workspace Controls`, `Icon`, `Overlay`, `drawings.spec.ts`, `auth-core/src/index.ts`, `Shared Errors and Stock Transactions`, `change-password/page.tsx`, `approval.ts`, `migrate.ts`, `bag-core/src/index.ts`, `AppError`, `consumables.spec.ts`, `User Administration Services`, `insights.ts`, `Cross Application Acceptance Tests`, `db`, `unit/drawings-files.test.ts`, `drawings-core/src/drawings.ts`, `Gateway Recovery Verification`, `drawings-import-legacy.ts`, `requests.ts`, `contracts/src/index.ts`, `integration/consumables.test.ts`, `platform.test.ts`, `files.ts`, `stock-summary.tsx`, `integration/drawings-workflow.test.ts`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._
- **Should `Shared Errors and Stock Transactions` be split into smaller, more focused modules?**
  _Cohesion score 0.1354679802955665 - nodes in this community are weakly interconnected._
- **Why does `drizzle-orm` connect `Identity` to `db`, `theme.spec.ts`, `Shared Errors and Stock Transactions`, `getDrawingsDb`, `documents.ts`, `auth-core/src/index.ts`, `Shared Errors and Stock Transactions`, `package.json`, `approval.ts`, `migrate.ts`, `bag-core/src/index.ts`, `dependencies`, `AppError`, `consumables.spec.ts`, `ref_node_assert`, `User Administration Services`, `insights.ts`, `Cross Application Acceptance Tests`, `db`, `Gateway Recovery Verification`, `drawings-import-legacy.ts`, `requests.ts`, `integration/consumables.test.ts`, `platform.test.ts`, `files.ts`?**
  _High betweenness centrality (0.037) - this node is a cross-community bridge._