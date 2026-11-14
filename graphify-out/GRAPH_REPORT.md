# Graph Report - plant-area-system  (2026-11-15)

## Corpus Check
- 337 files · ~246,727 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 34 file(s) not represented in the graph (top: (none) 12, .css 12, .conf 4)

## Summary
- 2345 nodes · 6536 edges · 142 communities (100 shown, 42 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 97 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `b531a25c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- selection.ts
- Operasional pilot
- Consumable Order Carts
- Shared Errors and Stock Transactions
- Identity
- Shared Errors and Stock Transactions
- index.tsx
- Consumable Order Carts
- requests-ui.tsx
- auth-core/src/index.ts
- documents.ts
- Consumables Workspace Controls
- Repository Automation Scripts
- react
- Auth Application Dependencies
- Bag Application Dependencies
- Consumables Application Dependencies
- Shared Errors and Stock Transactions
- change-password/page.tsx
- Portal Application Dependencies
- approval.ts
- ref_node_crypto
- pageIdentity
- bag-core/src/index.ts
- Runtime Dependency Catalog
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
- portal/app/page.tsx
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
- dev.ts
- db
- Service Authentication Configuration
- MySQL Credential Configuration
- Authentication Storage Schema
- Container Health Checks
- Database Environment Configuration
- drawings-core/src/index.ts
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
- server/src/index.ts
- requests.ts
- contracts/src/index.ts
- FsStorage
- monitor.tsx
- drawings-core/package.json
- BagMonitor
- integration/consumables.test.ts
- Consumables Application Container
- Drizzle Migration Tooling
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
- pdf-viewer-core.tsx
- Auth Migration Checkpoints
- Bag Migration Checkpoints
- Batch Cancellation Migration
- drawings/app/layout.tsx
- drawings-ops
- contracts/src/drawings.ts
- Prompt: Portal setara gold standard Bag Filter
- integration/drawings-workflow.test.ts
- AGENTS.md
- Hasil validasi implementasi v2
- environment
- Plant Area System v2
- Consumable Room v1.1 R22
- drawings/tsconfig.json
- Panduan agen untuk Plant Area System v2
- hasPermission
- documents/[id]/page.tsx
- Upgrade Consumable Room R22
- services
- bag-bulk-selection.spec.ts
- drawings
- Runbook rilis Drawing Database v1
- color.test.ts
- Q: `packages/ui/src/tokens.css` seharusnya jangan dilewati. lalu docs\testing dan `AppError` apakah itu penting sehingga harus dimasukkan dalam graph?
- drawings/app/health/live/route.ts
- CLAUDE.md

## God Nodes (most connected - your core abstractions)
1. `AppError` - 187 edges
2. `canDraw()` - 72 edges
3. `Identity` - 59 edges
4. `Button()` - 53 edges
5. `BagMonitor()` - 49 edges
6. `react` - 46 edges
7. `Icon()` - 44 edges
8. `db()` - 41 edges
9. `pageIdentity()` - 38 edges
10. `Input()` - 36 edges

## Surprising Connections (you probably didn't know these)
- `8.1 Bagian baru dan yang berubah` --references--> `DrawingsGrant`  [INFERRED]
  docs/DRAWING-DATABASE-PRD.md → packages/contracts/src/drawings.ts
- `Cakupan graph proyek` --references--> `AppError`  [INFERRED]
  AGENTS.md → packages/contracts/src/index.ts
- `4.4 Revisi baru dan Final Drawing (K7)` --references--> `draft()`  [INFERRED]
  docs/DRAWING-DATABASE-PRD.md → tests/integration/drawings-workflow.test.ts
- `4.6 Drawing Request` --references--> `draft()`  [INFERRED]
  docs/DRAWING-DATABASE-PRD.md → tests/integration/drawings-workflow.test.ts
- `Kontrak ringkasan aplikasi (inti skalabilitas)` --references--> `drawing()`  [INFERRED]
  docs/design/UI-FOLLOWUP-FONT-PORTAL-MENU.md → tests/unit/drawings-model.test.ts

## Import Cycles
- 2-file cycle: `packages/contracts/src/drawings-requests.ts -> packages/contracts/src/index.ts -> packages/contracts/src/drawings-requests.ts`
- 2-file cycle: `packages/contracts/src/drawings-workflow.ts -> packages/contracts/src/index.ts -> packages/contracts/src/drawings-workflow.ts`
- 2-file cycle: `packages/contracts/src/drawings.ts -> packages/contracts/src/index.ts -> packages/contracts/src/drawings.ts`
- 2-file cycle: `packages/contracts/src/drawings-model.ts -> packages/contracts/src/index.ts -> packages/contracts/src/drawings-model.ts`
- 3-file cycle: `packages/contracts/src/drawings-model.ts -> packages/contracts/src/index.ts -> packages/contracts/src/drawings-requests.ts -> packages/contracts/src/drawings-model.ts`
- 3-file cycle: `packages/contracts/src/drawings-requests.ts -> packages/contracts/src/drawings.ts -> packages/contracts/src/index.ts -> packages/contracts/src/drawings-requests.ts`
- 3-file cycle: `packages/contracts/src/drawings-model.ts -> packages/contracts/src/drawings.ts -> packages/contracts/src/index.ts -> packages/contracts/src/drawings-model.ts`
- 4-file cycle: `packages/contracts/src/drawings-model.ts -> packages/contracts/src/drawings.ts -> packages/contracts/src/index.ts -> packages/contracts/src/drawings-requests.ts -> packages/contracts/src/drawings-model.ts`

## Hyperedges (group relationships)
- **Cross-application UI modernization** — docs_design_ui_audit_portal_consumables_operational_hub, docs_design_ui_audit_portal_consumables_reversible_overlays, docs_design_ui_audit_portal_consumables_accessible_design_tokens, docs_design_ui_audit_portal_consumables_shell_skeleton, docs_design_ui_audit_portal_consumables_stock_query_feedback, docs_design_ui_audit_portal_consumables_reversible_cart [EXTRACTED 1.00]

## Communities (142 total, 42 thin omitted)

### Community 0 - "selection.ts"
Cohesion: 0.20
Nodes (22): BulkSelection(), BulkSelectionForm(), Props, areaPositions(), BagArea, Compartment, compartmentChoices(), compartmentOptions() (+14 more)

### Community 1 - "Operasional pilot"
Cohesion: 0.27
Nodes (12): Migrasi database lokal ke VPS, Single writer database cutover, Handover OpenClaw database, Database migration checkpoints M0 M8, Deployment checkpoints C0 C12, Handover OpenClaw deployment, Deployment VPS tq-cmms.com, VPS resource budget and serial builds (+4 more)

### Community 2 - "Consumable Order Carts"
Cohesion: 0.10
Nodes (12): MaterialSearch(), OrderCart(), Picklist(), stockApi(), StockApiError, descriptions, dynamic, Page() (+4 more)

### Community 3 - "Shared Errors and Stock Transactions"
Cohesion: 0.13
Nodes (31): Context, dynamic, GET(), json(), PATCH, POST, dateConditions(), hecSuggestions() (+23 more)

### Community 4 - "Identity"
Cohesion: 0.05
Nodes (19): closeAuthDb(), authSchema, equipmentCodes, Identity, @playwright/test, paths, users, layouts (+11 more)

### Community 5 - "Shared Errors and Stock Transactions"
Cohesion: 0.14
Nodes (16): dynamic, GET(), cache, closeConsumablesDb(), create(), getConsumablesDb(), consumablesSchema, headers (+8 more)

### Community 6 - "index.tsx"
Cohesion: 0.14
Nodes (17): Loading(), Loading(), Loading(), Confirmation, ConfirmationOptions, ConfirmationProvider(), ConfirmFunction, cartCount() (+9 more)

### Community 7 - "Consumable Order Carts"
Cohesion: 0.18
Nodes (25): AddToOrder(), QuantityDialog(), createDocument(), amount, canConsume(), canonicalDocumentPayload(), ConsumablesGrant, ConsumablesRole (+17 more)

### Community 8 - "requests-ui.tsx"
Cohesion: 0.06
Nodes (66): AuditList(), Item, Page, ApiError, formatWib(), getJson(), newKey(), parse() (+58 more)

### Community 9 - "auth-core/src/index.ts"
Cohesion: 0.07
Nodes (43): dynamic, POST(), dynamic, GET(), dynamic, GET(), dynamic, GET() (+35 more)

### Community 10 - "documents.ts"
Cohesion: 0.08
Nodes (27): replay(), date, docCols, DocumentConflict, documentDetail(), header, hec, pickLine (+19 more)

### Community 11 - "Consumables Workspace Controls"
Cohesion: 0.19
Nodes (22): AliasInput(), AuditItem, ConsumablesWorkspace(), openMaterial(), Enrollment(), get(), InventoryEditor(), labels (+14 more)

### Community 12 - "Repository Automation Scripts"
Cohesion: 0.07
Nodes (30): scripts, bootstrap, brand:generate, build, check:export, consumables:import, consumables:import-naming, consumables:preflight (+22 more)

### Community 13 - "react"
Cohesion: 0.05
Nodes (61): Item, TYPES, Commit 2: `feat(portal): rebuild hub on the Bag Filter dashboard system`, 3. Portal: hub yang tenang tapi berisi, dan siap untuk aplikasi baru, Kondisi sekarang, Kontrak ringkasan aplikasi (inti skalabilitas), Kriteria selesai (Portal), Prinsip desain (+53 more)

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
Cohesion: 0.13
Nodes (15): common, inventoryInput, materialInput, MoveKind, schemas, Executor, invCols, joinInv (+7 more)

### Community 18 - "change-password/page.tsx"
Cohesion: 0.36
Nodes (9): ChangePassword(), dynamic, LoginForm(), PasswordForm(), dynamic, Login(), safeReturnTo(), BrandLogo() (+1 more)

### Community 19 - "Portal Application Dependencies"
Cohesion: 0.11
Nodes (22): dependencies, next@16.4.2, @plant/contracts@workspace:*, @plant/server@workspace:*, @plant/ui@workspace:*, react@19.3.1, react-dom@19.3.1, next (+14 more)

### Community 20 - "approval.ts"
Cohesion: 0.09
Nodes (67): canDraw(), drawingsPermission(), drawingsRole(), canSeeDrawing(), canSeeWip(), DrawingPermissions, drawingPermissions(), ApprovalActionView (+59 more)

### Community 21 - "ref_node_crypto"
Cohesion: 0.14
Nodes (13): 8.1 Bagian baru dan yang berubah, seedEquipment(), R22_ROOM_ID, Grant, migrateConsumablesCatalog(), provision(), provisionConsumables(), preflightSingleRoom() (+5 more)

### Community 22 - "pageIdentity"
Cohesion: 0.13
Nodes (24): BagFilter(), dynamic, dynamic, Page(), dynamic, Page(), dynamic, Page() (+16 more)

### Community 23 - "bag-core/src/index.ts"
Cohesion: 0.07
Nodes (52): Context, dynamic, GET(), json(), POST(), EquipmentPage(), dynamic, GET() (+44 more)

### Community 24 - "Runtime Dependency Catalog"
Cohesion: 0.10
Nodes (25): dependencies, better-auth@1.7.12, drizzle-orm@0.45.4, mysql2@3.24.6, @plant/auth-core@workspace:*, @plant/bag-core@workspace:*, @plant/consumables-core@workspace:*, @plant/contracts@workspace:* (+17 more)

### Community 25 - "AppError"
Cohesion: 0.12
Nodes (40): Context, directory(), dynamic, GET(), json(), mutate(), PATCH, peopleOrNull() (+32 more)

### Community 26 - "Application Theme Layouts"
Cohesion: 0.12
Nodes (19): inter, Layout(), metadata, inter, Layout(), metadata, inter, Layout() (+11 more)

### Community 27 - "Consumables Inventory Schema"
Cohesion: 0.18
Nodes (19): `catalog_imports`, `consumables_audit`, consumables_audit_time_idx, `inventory`, inventory_location_idx, `locations`, material_category_idx, `materials` (+11 more)

### Community 28 - "User Administration Services"
Cohesion: 0.16
Nodes (29): Context, dynamic, GET(), POST(), getAuthDb(), auditEntry(), authAudit(), changePassword() (+21 more)

### Community 29 - "UI Design Token System"
Cohesion: 0.20
Nodes (18): SIL Open Font License 1.1, Inter v4.1 Self-Hosted Font Asset, Bag age color scale, Brand color aliases, Design system cascade layers, Chart hatch patterns, Theme aware chart series, Component radius tokens (+10 more)

### Community 30 - "Compose Runtime Services"
Cohesion: 0.10
Nodes (19): command, depends_on, image, networks, profiles, name, networks, gateway (+11 more)

### Community 31 - "insights.ts"
Cohesion: 0.24
Nodes (14): activeAgeSummary(), activity(), ageTones, allowed(), dashboard(), iso(), portalSummary(), scope() (+6 more)

### Community 32 - "Administration Workspace Controls"
Cohesion: 0.21
Nodes (14): Application, Applications(), AdminWorkspace(), act(), ConsumablesAccess(), DrawingsAccess(), ManagedUser, send() (+6 more)

### Community 33 - "Database Migration Containers"
Cohesion: 0.22
Nodes (9): entrypoint, environment, image, networks, restart, volumes, MYSQL_HOST, MYSQL_PWD (+1 more)

### Community 34 - "Consumables Core Dependencies"
Cohesion: 0.15
Nodes (16): dependencies, drizzle-orm@0.45.4, mysql2@3.24.6, @plant/contracts@workspace:*, zod@4.5.4, exports, ./import, ./schema (+8 more)

### Community 35 - "Cross Application Acceptance Tests"
Cohesion: 0.10
Nodes (8): InventoryItem, StockDashboard, actor, temporary, types, year, actor, materials

### Community 36 - "portal/app/page.tsx"
Cohesion: 0.50
Nodes (3): dynamic, Portal(), wibDateFormatter

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
Nodes (18): devDependencies, @aws-sdk/client-s3@3.1160.0, @cantoo/pdf-lib@2.11.1, @playwright/test@1.64.1, prettier@3.9.10, tsx@4.23.15, @types/node@22.19.19, @types/react@19.2.14 (+10 more)

### Community 43 - "Bag Core Dependencies"
Cohesion: 0.18
Nodes (13): dependencies, drizzle-orm@0.45.4, mysql2@3.24.6, @plant/contracts@workspace:*, exports, ./schema, drizzle-orm, mysql2 (+5 more)

### Community 44 - "Shared UI Dependencies"
Cohesion: 0.18
Nodes (13): dependencies, @plant/contracts@workspace:*, react@19.3.1, react-dom@19.3.1, exports, ./styles.css, @plant/contracts, react (+5 more)

### Community 45 - "generate-brand.mjs"
Cohesion: 0.07
Nodes (16): config, config, config, config, config, app, marker, require (+8 more)

### Community 46 - "Nginx Service Routing"
Cohesion: 0.13
Nodes (15): condition, condition, bag-filter, consumables, drawings, portal, condition, depends_on (+7 more)

### Community 47 - "Cross Application UI Design"
Cohesion: 0.09
Nodes (22): Accessible design tokens, Portal and Consumables UI audit, Momentum-aware drawer gestures, Portal operational hub, Reversible cart feedback, ShellSkeleton navigation fallback, 0. Konteks dan prioritas acuan, 1. Keputusan font: self-host Inter (+14 more)

### Community 48 - "dev.ts"
Cohesion: 0.06
Nodes (46): project(), record(), rubberband(), Sample, shouldDismiss(), spring(), velocity(), args (+38 more)

### Community 49 - "db"
Cohesion: 0.09
Nodes (44): IDEMPOTENCY_KEY, requestScopes(), wibYear(), listTasks(), auditList(), drawingTimeline(), hacSuggestions(), listDrawings() (+36 more)

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

### Community 55 - "drawings-core/src/index.ts"
Cohesion: 0.06
Nodes (62): dynamic, GET(), RFC-5987, IMAGE_MAX_BYTES, IMAGE_MAX_PER_ITEM, maxPdfBytes(), STAGED_TTL_MS, StorageConfig (+54 more)

### Community 56 - "Server Package Dependencies"
Cohesion: 0.22
Nodes (10): dependencies, next@16.4.2, @plant/contracts@workspace:*, exports, next, @plant/contracts, name, private (+2 more)

### Community 57 - "drawings/package.json"
Cohesion: 0.10
Nodes (24): dependencies, next@16.4.2, pdfjs-dist@6.4.299, @plant/contracts@workspace:*, @plant/drawings-core@workspace:*, @plant/server@workspace:*, @plant/ui@workspace:*, react@19.3.1 (+16 more)

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
Cohesion: 0.05
Nodes (40): cancelled(), 10. Operasional, 11. Kriteria penerimaan, 12. Perbedaan terhadap referensi DrafTerra, 13. Saran lanjutan (belum masuk lingkup), 14. Hal yang masih perlu keputusan, 15.1 Peran dan tujuan, 15.3 Aturan kerja (+32 more)

### Community 63 - "Bag Installation Storage"
Cohesion: 0.44
Nodes (8): `bag_audit`, bag_audit_equipment_time_idx, batch_equipment_time_idx, `coordinates`, `equipment`, installation_position_time_idx, `installations`, `replacement_batches`

### Community 64 - "drawings-core/src/drawings.ts"
Cohesion: 0.08
Nodes (35): DrawingsRole, canSeeRevision(), DrawingAccessFacts, DrawingCreateInput, drawingCreateSchema, drawingFileName(), DrawingListItem, drawingMetadataFields (+27 more)

### Community 65 - "Domain Contract Dependencies"
Cohesion: 0.25
Nodes (8): dependencies, zod@4.5.4, exports, zod, name, private, type, version

### Community 66 - "Gateway Recovery Verification"
Cohesion: 0.24
Nodes (8): actor, compose, docker(), inspect(), names, run, sentinels, services

### Community 67 - "server/src/index.ts"
Cohesion: 0.20
Nodes (9): dynamic, dynamic, Page(), dynamic, Page(), BinaryBody, DirectoryPerson, fetchDirectory() (+1 more)

### Community 68 - "requests.ts"
Cohesion: 0.11
Nodes (36): canSeeRequest(), drafterDecisionSchema, DrawingsDashboard, hac, id, NotificationItem, notificationReadSchema, requestCancelSchema (+28 more)

### Community 69 - "contracts/src/index.ts"
Cohesion: 0.08
Nodes (31): save(), bagAgeIntervalDays, BagGrant, BagRole, bagRoles, cancellationSchema, compartmentFromLabel(), displayCompartment() (+23 more)

### Community 70 - "FsStorage"
Cohesion: 0.12
Nodes (4): assertKey(), FsStorage, S3Storage, Storage

### Community 71 - "monitor.tsx"
Cohesion: 0.20
Nodes (14): BatchCancellationDialog(), BatchRecord, CancellationNotice(), CoordinateHistory(), TimelineItem, Batch, Installed, Page (+6 more)

### Community 72 - "drawings-core/package.json"
Cohesion: 0.13
Nodes (18): dependencies, @aws-sdk/client-s3@3.1160.0, @cantoo/pdf-lib@2.11.1, drizzle-orm@0.45.4, mysql2@3.24.6, @plant/contracts@workspace:*, zod@4.5.4, exports (+10 more)

### Community 73 - "BagMonitor"
Cohesion: 0.20
Nodes (14): BagMonitor(), addPositions(), cellKey(), dismiss(), focus(), hover(), keyboard(), leaveHover() (+6 more)

### Community 74 - "integration/consumables.test.ts"
Cohesion: 0.23
Nodes (13): mutate(), postMovement(), replay(), saveInventory(), saveMaterial(), code(), entry(), failValidation() (+5 more)

### Community 75 - "Consumables Application Container"
Cohesion: 0.40
Nodes (5): image, init, networks, restart, consumables

### Community 77 - "Workspace Build Permissions"
Cohesion: 0.40
Nodes (4): allowBuilds, esbuild, sharp, packages

### Community 78 - "Source Formatting Configuration"
Cohesion: 0.40
Nodes (4): endOfLine, printWidth, singleQuote, trailingComma

### Community 107 - "pdf-viewer-core.tsx"
Cohesion: 0.19
Nodes (11): formatSize(), PdfUpload(), Staged, clampScale(), describe(), Failure, PdfViewerCore(), PdfViewerProps (+3 more)

### Community 116 - "drawings/app/layout.tsx"
Cohesion: 0.19
Nodes (8): inter, Layout(), metadata, brandRevision, compactArtwork, fullArtwork, brandIcon(), ThemeScript()

### Community 117 - "drawings-ops"
Cohesion: 0.14
Nodes (14): depends_on, mysql, depends_on, image, networks, profiles, volumes, command (+6 more)

### Community 118 - "contracts/src/drawings.ts"
Cohesion: 0.16
Nodes (12): DrawingsAction, drawingsActions, DrawingsGrant, DrawingsNavItem, drawingsPermissions, DrawingsPermissionValue, drawingsRoleDescriptions, drawingsSections (+4 more)

### Community 119 - "Prompt: Portal setara gold standard Bag Filter"
Cohesion: 0.17
Nodes (12): 1. Tujuan, 2. Batasan, 3. Hasil audit: Portal dibanding gold standard, 4. Rancangan target (≥1536 px), 5. Langkah implementasi, 6. Kriteria penerimaan, 7. Laporan, 8. Keputusan yang diambil dalam brief ini (dapat dibatalkan pengguna) (+4 more)

### Community 120 - "integration/drawings-workflow.test.ts"
Cohesion: 0.23
Nodes (10): DirectoryPerson, directory(), draft(), key(), ownerOf(), people, release(), stagedPdf() (+2 more)

### Community 121 - "AGENTS.md"
Cohesion: 0.18
Nodes (9): Kontrak API v2, Idempotent Bag Filter batches, R22 document API, Session identity and exact origin, Panduan pembatalan record Bag Filter, Whole batch cancellation, HAC SAC and mandatory Cost Center, R22 single shared stock (+1 more)

### Community 122 - "Hasil validasi implementasi v2"
Cohesion: 0.25
Nodes (11): BrandLogo artwork pipeline, Identitas TQ-CMMS, Application context sidebar navigation, Perbaikan sidebar dan dashboard Consumables, Proportional count chart and compact Portal, Separate transaction chart semantics, UI refresh v2 Plant Area System, Reversible overlays and momentum gestures (+3 more)

### Community 123 - "environment"
Cohesion: 0.31
Nodes (11): environment, environment, DRAWINGS_MAX_PDF_MB, DRAWINGS_S3_ACCESS_KEY_ID, DRAWINGS_S3_BUCKET, DRAWINGS_S3_ENDPOINT, DRAWINGS_S3_FORCE_PATH_STYLE, DRAWINGS_S3_REGION (+3 more)

### Community 124 - "Plant Area System v2"
Cohesion: 0.22
Nodes (11): Audit baseline Plant Area System, Legacy Vinext Cloudflare D1 export, Setup development MacBook, Native Mac development setup, Active installation age and yearly replacements, PRD Plant Area System v2, Six equipment coordinate catalog, Centralized Auth SSO guards (+3 more)

### Community 125 - "Consumable Room v1.1 R22"
Cohesion: 0.24
Nodes (11): Consumable Room v1.1 R22, Fixed point atomic stock documents, Picklist K3 auto enrollment, Prompt revisi alur bisnis R22, Warehouse R22 Client material flow, Additive R22 metadata migration, Deterministic document lock ordering, Rencana implementasi R22 (+3 more)

### Community 126 - "drawings/tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, allowJs, incremental, jsx, plugins, exclude, extends, include (+1 more)

### Community 127 - "Panduan agen untuk Plant Area System v2"
Cohesion: 0.25
Nodes (8): Artefak Graphify bersama, Cakupan graph proyek, Dokumentasi library dan platform, Konteks proyek, Memakai Graphify pada sesi baru, Panduan agen untuk Plant Area System v2, Steps, Validasi perubahan

### Community 128 - "hasPermission"
Cohesion: 0.36
Nodes (5): AuditList(), Event, Audit(), dynamic, hasPermission()

### Community 129 - "documents/[id]/page.tsx"
Cohesion: 0.32
Nodes (4): dynamic, Page(), titles, PrintButton()

### Community 130 - "Upgrade Consumable Room R22"
Cohesion: 0.32
Nodes (8): Portable schema and data fingerprint, Pengembangan lokal sampai pembaruan VPS, CI verified full SHA release, Handover OpenClaw update R22, R22 production backup rehearsal, Upgrade Consumable Room R22, Private atomic naming CSV import, Disposable MySQL and HTTPS QA

### Community 131 - "services"
Cohesion: 0.25
Nodes (7): networks, networks, networks, egress, services, drawings, drawings-ops

### Community 132 - "bag-bulk-selection.spec.ts"
Cohesion: 0.43
Nodes (5): addFull(), area(), choose(), openBulk(), users

### Community 133 - "drawings"
Cohesion: 0.33
Nodes (6): image, init, networks, restart, volumes, drawings

### Community 134 - "Runbook rilis Drawing Database v1"
Cohesion: 0.33
Nodes (6): 1. Persiapan (tanpa downtime), 2. Jendela rilis, 3. Smoke test setelah rilis, 4. Rollback, 5. Pindah driver `fs` → `s3` (setelah go-live), Runbook rilis Drawing Database v1

### Community 135 - "color.test.ts"
Cohesion: 0.53
Nodes (4): ageStops, bagColor(), dataTextTone(), relativeLuminance()

### Community 136 - "Q: `packages/ui/src/tokens.css` seharusnya jangan dilewati. lalu docs\testing dan `AppError` apakah itu penting sehingga harus dimasukkan dalam graph?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: `packages/ui/src/tokens.css` seharusnya jangan dilewati. lalu docs\testing dan `AppError` apakah itu penting sehingga harus dimasukkan dalam graph?, Source Nodes

## Knowledge Gaps
- **44 isolated node(s):** `../../tsconfig.json`, `RFC-5987`, `../../tsconfig.json`, `../../tsconfig.json`, `../../tsconfig.json` (+39 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 854 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **42 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AppError` connect `AppError` to `documents/[id]/page.tsx`, `Shared Errors and Stock Transactions`, `Identity`, `Shared Errors and Stock Transactions`, `Consumable Order Carts`, `Q: `packages/ui/src/tokens.css` seharusnya jangan dilewati. lalu docs\testing dan `AppError` apakah itu penting sehingga harus dimasukkan dalam graph?`, `auth-core/src/index.ts`, `documents.ts`, `Shared Errors and Stock Transactions`, `approval.ts`, `ref_node_crypto`, `pageIdentity`, `bag-core/src/index.ts`, `User Administration Services`, `insights.ts`, `db`, `drawings-core/src/index.ts`, `drawings-core/src/drawings.ts`, `server/src/index.ts`, `requests.ts`, `contracts/src/index.ts`, `integration/consumables.test.ts`, `integration/drawings-workflow.test.ts`, `Panduan agen untuk Plant Area System v2`?**
  _High betweenness centrality (0.094) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `AppError` (e.g. with `Cakupan graph proyek` and `15.2 Bacaan wajib sebelum menulis kode`) actually correct?**
  _`AppError` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `../../tsconfig.json`, `RFC-5987`, `../../tsconfig.json` to the rest of the system?**
  _44 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Consumable Order Carts` be split into smaller, more focused modules?**
  _Cohesion score 0.10253699788583509 - nodes in this community are weakly interconnected._
- **Why does `@playwright/test` connect `Identity` to `Gateway Recovery Verification`, `Cross Application Acceptance Tests`, `bag-bulk-selection.spec.ts`, `Development Tool Dependencies`, `dev.ts`, `Runtime Dependency Catalog`, `User Administration Services`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Should `Shared Errors and Stock Transactions` be split into smaller, more focused modules?**
  _Cohesion score 0.1282051282051282 - nodes in this community are weakly interconnected._
- **Why does `Identity` connect `Identity` to `Consumable Order Carts`, `Shared Errors and Stock Transactions`, `bag-bulk-selection.spec.ts`, `Shared Errors and Stock Transactions`, `Consumable Order Carts`, `auth-core/src/index.ts`, `documents.ts`, `Consumables Workspace Controls`, `react`, `Shared Errors and Stock Transactions`, `approval.ts`, `ref_node_crypto`, `bag-core/src/index.ts`, `AppError`, `User Administration Services`, `insights.ts`, `Administration Workspace Controls`, `Cross Application Acceptance Tests`, `db`, `drawings-core/src/index.ts`, `drawings-core/src/drawings.ts`, `Gateway Recovery Verification`, `server/src/index.ts`, `requests.ts`, `contracts/src/index.ts`, `integration/consumables.test.ts`, `contracts/src/drawings.ts`, `integration/drawings-workflow.test.ts`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._