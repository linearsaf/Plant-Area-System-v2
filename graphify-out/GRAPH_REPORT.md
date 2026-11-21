# Graph Report - plant-area-system  (2026-11-21)

## Corpus Check
- 354 files · ~268,851 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 34 file(s) not represented in the graph (top: (none) 12, .css 12, .conf 4)

## Summary
- 2592 nodes · 6657 edges · 169 communities (124 shown, 45 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 138 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `59d0957a`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- selection.ts
- Operasional pilot
- Consumable Order Carts
- drawing-form.tsx
- Identity
- integration/consumables.test.ts
- index.tsx
- Consumable Order Carts
- drawing-view.tsx
- server/src/index.ts
- naming.ts
- Consumables Workspace Controls
- Repository Automation Scripts
- Icon
- Auth Application Dependencies
- Bag Application Dependencies
- Consumables Application Dependencies
- Shared Errors and Stock Transactions
- drawings-workflow.ts
- Portal Application Dependencies
- approval.ts
- migrate.ts
- server/src/index.ts
- bag-core/src/index.ts
- dependencies
- AppError
- Application Theme Layouts
- Consumables Inventory Schema
- User Administration Services
- documents.ts
- Compose Runtime Services
- insights.ts
- Administration Workspace Controls
- Database Migration Containers
- Consumables Core Dependencies
- drawings-core/src/index.ts
- drawings/app/[section]/page.tsx
- Continuous Integration Validation
- Auth Core Dependencies
- Shared TypeScript Configuration
- Container Build Arguments
- auth
- drizzle-kit
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
- drawings-requests.ts
- contracts/src/index.ts
- FsStorage
- monitor.tsx
- drawings-core/package.json
- BagMonitor
- consumables/app/api/[...path]/route.ts
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
- react
- Prompt: Portal setara gold standard Bag Filter
- integration/drawings-workflow.test.ts
- drawings/app/api/[...path]/route.ts
- Hasil validasi implementasi v2
- environment
- PRD Plant Area System v2
- Consumable Room v1.1 R22
- drawings/tsconfig.json
- Panduan agen untuk Plant Area System v2
- db
- Identity
- Upgrade Consumable Room R22
- services
- ref_node_assert
- drawings
- Runbook rilis Drawing Database v1
- 4. Alur kerja
- Q: `packages/ui/src/tokens.css` seharusnya jangan dilewati. lalu docs\testing dan `AppError` apakah itu penting sehingga harus dimasukkan dalam graph?
- drawings/app/health/live/route.ts
- CLAUDE.md
- drawings-model.test.ts
- bag-bulk-selection.spec.ts
- drawings.spec.ts
- 15. Prompt implementasi untuk developer
- requests-ui.tsx
- ref_node_fs
- package.json
- integration/drawings-files.test.ts
- library.tsx
- platform.test.ts
- 6. File, storage dan stamp
- requests.ts
- 8. Arsitektur dan integrasi platform
- engines
- bag-core/src/index.ts
- Workspace
- canDraw
- consumables-ui.spec.ts
- Desain: kompresi gambar Drawing Database ke WebP
- image-upload.tsx
- AGENTS.md
- summary.tsx
- drawingsRole
- drawings-images.test.ts
- consumables.spec.ts
- drawings/app/health/ready/route.ts

## God Nodes (most connected - your core abstractions)
1. `AppError` - 196 edges
2. `Identity` - 61 edges
3. `react` - 49 edges
4. `db()` - 43 edges
5. `BagMonitor()` - 40 edges
6. `pageIdentity()` - 38 edges
7. `Icon()` - 37 edges
8. `mutate()` - 34 edges
9. `canDraw()` - 34 edges
10. `Heading()` - 33 edges

## Surprising Connections (you probably didn't know these)
- `1. Browser: kompresi sebelum upload` --references--> `ImageUpload()`  [INFERRED]
  docs/superpowers/specs/2026-11-21-drawings-image-compression-design.md → apps/drawings/app/image-upload.tsx
- `3. Skema` --references--> `cleanupStagedFiles()`  [INFERRED]
  docs/superpowers/specs/2026-11-21-drawings-image-compression-design.md → packages/drawings-core/src/files.ts
- `Pengujian` --references--> `needsConversion()`  [INFERRED]
  docs/superpowers/specs/2026-11-21-drawings-image-compression-design.md → packages/drawings-core/src/images.ts
- `Cakupan graph proyek` --references--> `AppError`  [INFERRED]
  AGENTS.md → packages/contracts/src/index.ts
- `Kontrak ringkasan aplikasi (inti skalabilitas)` --references--> `drawing()`  [INFERRED]
  docs/design/UI-FOLLOWUP-FONT-PORTAL-MENU.md → tests/unit/drawings-model.test.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Cross-application UI modernization** — docs_design_ui_audit_portal_consumables_operational_hub, docs_design_ui_audit_portal_consumables_reversible_overlays, docs_design_ui_audit_portal_consumables_accessible_design_tokens, docs_design_ui_audit_portal_consumables_shell_skeleton, docs_design_ui_audit_portal_consumables_stock_query_feedback, docs_design_ui_audit_portal_consumables_reversible_cart [EXTRACTED 1.00]

## Communities (169 total, 45 thin omitted)

### Community 0 - "selection.ts"
Cohesion: 0.21
Nodes (21): BulkSelection(), BulkSelectionForm(), Props, areaPositions(), BagArea, Compartment, compartmentChoices(), compartmentOptions() (+13 more)

### Community 1 - "Operasional pilot"
Cohesion: 0.23
Nodes (18): Panduan pembatalan record Bag Filter, Setup development MacBook, Native Mac development setup, Migrasi database lokal ke VPS, Single writer database cutover, Pengembangan lokal sampai pembaruan VPS, Handover OpenClaw database, Database migration checkpoints M0 M8 (+10 more)

### Community 2 - "Consumable Order Carts"
Cohesion: 0.11
Nodes (12): MaterialSearch(), OrderCart(), Picklist(), stockApi(), StockApiError, descriptions, dynamic, Page() (+4 more)

### Community 3 - "drawing-form.tsx"
Cohesion: 0.13
Nodes (13): ApiError, DrawingForm(), submit(), Mode, options(), Person, Props, FileDrop() (+5 more)

### Community 4 - "Identity"
Cohesion: 0.09
Nodes (15): closeAuthDb(), authSchema, createUser(), mysqlCode(), stringField(), drawingsRoles, Identity, @playwright/test (+7 more)

### Community 5 - "integration/consumables.test.ts"
Cohesion: 0.22
Nodes (14): mutate(), consumablesSchema, postMovement(), saveInventory(), saveMaterial(), code(), entry(), failValidation() (+6 more)

### Community 6 - "index.tsx"
Cohesion: 0.22
Nodes (16): AddToOrder(), QuantityDialog(), formatQuantity(), InventoryItem, localDecimal(), MaterialSearchResult, cartCount(), CartDraft (+8 more)

### Community 7 - "Consumable Order Carts"
Cohesion: 0.13
Nodes (26): createDocument(), replay(), readResult(), parseNamingCsv(), amount, canonicalDocumentPayload(), ConsumablesGrant, ConsumablesRole (+18 more)

### Community 8 - "drawing-view.tsx"
Cohesion: 0.13
Nodes (14): ClampText(), getJson(), parse(), sendJson(), wib, DrawingView(), run(), Person (+6 more)

### Community 9 - "server/src/index.ts"
Cohesion: 0.11
Nodes (28): dynamic, POST(), dynamic, GET(), dynamic, GET(), dynamic, GET() (+20 more)

### Community 10 - "naming.ts"
Cohesion: 0.10
Nodes (25): dynamic, GET(), cache, closeConsumablesDb(), create(), getConsumablesDb(), importCatalog(), parseCatalog() (+17 more)

### Community 11 - "Consumables Workspace Controls"
Cohesion: 0.17
Nodes (25): AliasInput(), AuditItem, ConsumablesWorkspace(), openMaterial(), Enrollment(), get(), InventoryEditor(), labels (+17 more)

### Community 12 - "Repository Automation Scripts"
Cohesion: 0.06
Nodes (31): scripts, bootstrap, brand:generate, build, check:export, consumables:import, consumables:import-naming, consumables:preflight (+23 more)

### Community 13 - "Icon"
Cohesion: 0.08
Nodes (44): OverviewMap(), dynamic, Portal(), wibDateFormatter, Commit 2: `feat(portal): rebuild hub on the Bag Filter dashboard system`, 3. Portal: hub yang tenang tapi berisi, dan siap untuk aplikasi baru, Kondisi sekarang, Kontrak ringkasan aplikasi (inti skalabilitas) (+36 more)

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
Cohesion: 0.11
Nodes (17): common, inventoryInput, materialInput, MoveKind, schemas, R22_ROOM_ID, Executor, invCols (+9 more)

### Community 18 - "drawings-workflow.ts"
Cohesion: 0.08
Nodes (23): RevisionStatus, ApprovalActionView, approvalDecisionSchema, ApprovalLevel, approvalLevels, approvalPlanSchema, ApprovalStep, approverRoles (+15 more)

### Community 19 - "Portal Application Dependencies"
Cohesion: 0.11
Nodes (22): dependencies, next@16.4.2, @plant/contracts@workspace:*, @plant/server@workspace:*, @plant/ui@workspace:*, react@19.3.1, react-dom@19.3.1, next (+14 more)

### Community 20 - "approval.ts"
Cohesion: 0.10
Nodes (22): attachImages(), bump(), checkRevision(), decideApproval(), Directory, done(), drawingLabel(), Issued (+14 more)

### Community 21 - "migrate.ts"
Cohesion: 0.19
Nodes (10): 8.1 Bagian baru dan yang berubah, DrawingsGrant, nextRevisionNo(), Grant, migrateConsumablesCatalog(), provision(), provisionConsumables(), migrateDrawingsCatalog() (+2 more)

### Community 22 - "server/src/index.ts"
Cohesion: 0.12
Nodes (18): AuditList(), Event, Audit(), dynamic, BagFilter(), dynamic, dynamic, Page() (+10 more)

### Community 23 - "bag-core/src/index.ts"
Cohesion: 0.14
Nodes (24): Context, dynamic, GET(), json(), POST(), dynamic, EquipmentPage(), auditHistory() (+16 more)

### Community 24 - "dependencies"
Cohesion: 0.11
Nodes (18): dependencies, better-auth@1.7.12, drizzle-orm@0.45.4, mysql2@3.24.6, @plant/auth-core@workspace:*, @plant/bag-core@workspace:*, @plant/consumables-core@workspace:*, @plant/contracts@workspace:* (+10 more)

### Community 25 - "AppError"
Cohesion: 0.19
Nodes (36): mutate(), AppError, cancelRevision(), createRevision(), lockRevision(), submitRevision(), attachWorkingFile(), conflictNumber() (+28 more)

### Community 26 - "Application Theme Layouts"
Cohesion: 0.07
Nodes (38): inter, Layout(), metadata, inter, Layout(), metadata, inter, Layout() (+30 more)

### Community 27 - "Consumables Inventory Schema"
Cohesion: 0.18
Nodes (19): `catalog_imports`, `consumables_audit`, consumables_audit_time_idx, `inventory`, inventory_location_idx, `locations`, material_category_idx, `materials` (+11 more)

### Community 28 - "User Administration Services"
Cohesion: 0.22
Nodes (22): dynamic, GET(), Context, dynamic, GET(), POST(), getAuthDb(), auditEntry() (+14 more)

### Community 29 - "documents.ts"
Cohesion: 0.11
Nodes (28): date, dateConditions(), docCols, DocumentConflict, documentDetail(), header, hec, hecSuggestions() (+20 more)

### Community 30 - "Compose Runtime Services"
Cohesion: 0.10
Nodes (19): command, depends_on, image, networks, profiles, name, networks, gateway (+11 more)

### Community 31 - "insights.ts"
Cohesion: 0.20
Nodes (16): activeAgeSummary(), dynamic, GET(), getBagDb(), activity(), ageTones, allowed(), dashboard() (+8 more)

### Community 32 - "Administration Workspace Controls"
Cohesion: 0.24
Nodes (14): Application, Applications(), Admin(), dynamic, AdminWorkspace(), act(), ConsumablesAccess(), DrawingsAccess() (+6 more)

### Community 33 - "Database Migration Containers"
Cohesion: 0.22
Nodes (9): entrypoint, environment, image, networks, restart, volumes, MYSQL_HOST, MYSQL_PWD (+1 more)

### Community 34 - "Consumables Core Dependencies"
Cohesion: 0.15
Nodes (16): dependencies, drizzle-orm@0.45.4, mysql2@3.24.6, @plant/contracts@workspace:*, zod@4.5.4, exports, ./import, ./schema (+8 more)

### Community 35 - "drawings-core/src/index.ts"
Cohesion: 0.11
Nodes (28): RFC-4180, Task 3: Pemrosesan gambar dengan sharp, IMAGE_MAX_BYTES, IMAGE_MAX_INPUT_PIXELS, IMAGE_MAX_SIDE, IMAGE_PASSTHROUGH_MAX_BYTES, maxPdfBytes(), STAGED_TTL_MS (+20 more)

### Community 36 - "drawings/app/[section]/page.tsx"
Cohesion: 0.12
Nodes (13): actionLabels, AuditList(), Item, Page, formatWib(), LibraryParams, MastersManager(), RequestList() (+5 more)

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

### Community 43 - "Bag Core Dependencies"
Cohesion: 0.18
Nodes (13): dependencies, drizzle-orm@0.45.4, mysql2@3.24.6, @plant/contracts@workspace:*, exports, ./schema, drizzle-orm, mysql2 (+5 more)

### Community 44 - "Shared UI Dependencies"
Cohesion: 0.18
Nodes (13): dependencies, @plant/contracts@workspace:*, react@19.3.1, react-dom@19.3.1, exports, ./styles.css, @plant/contracts, react (+5 more)

### Community 45 - "generate-brand.mjs"
Cohesion: 0.13
Nodes (11): config, config, config, config, config, app, marker, require (+3 more)

### Community 46 - "Nginx Service Routing"
Cohesion: 0.13
Nodes (15): condition, condition, bag-filter, consumables, drawings, portal, condition, depends_on (+7 more)

### Community 47 - "Cross Application UI Design"
Cohesion: 0.09
Nodes (22): Accessible design tokens, Portal and Consumables UI audit, Momentum-aware drawer gestures, Portal operational hub, Reversible cart feedback, ShellSkeleton navigation fallback, 0. Konteks dan prioritas acuan, 1. Keputusan font: self-host Inter (+14 more)

### Community 48 - "dev.ts"
Cohesion: 0.05
Nodes (46): project(), record(), rubberband(), Sample, shouldDismiss(), spring(), velocity(), args (+38 more)

### Community 49 - "db"
Cohesion: 0.08
Nodes (42): drawingDetail(), auditList(), countLibrary(), drawingDetailBase(), DrawingRow, drawingTimeline(), hacSuggestions(), libraryOwners() (+34 more)

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
Cohesion: 0.09
Nodes (21): requireContentType(), requireUpload(), clampText(), formatStampTime(), invalid(), normalizeRotation(), queue, serialPdfJob() (+13 more)

### Community 56 - "Server Package Dependencies"
Cohesion: 0.22
Nodes (10): dependencies, next@16.4.2, @plant/contracts@workspace:*, exports, next, @plant/contracts, name, private (+2 more)

### Community 57 - "drawings/package.json"
Cohesion: 0.08
Nodes (29): clampScale(), describe(), Failure, PdfViewerCore(), PdfViewerProps, presets, dependencies, next@16.4.2 (+21 more)

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
Cohesion: 0.17
Nodes (12): 10. Operasional, 11. Kriteria penerimaan, 12. Perbedaan terhadap referensi DrafTerra, 13. Saran lanjutan (belum masuk lingkup), 14. Hal yang masih perlu keputusan, 1. Keputusan yang sudah dikunci, 2. Lingkup, 3. Peran dan izin (+4 more)

### Community 63 - "Bag Installation Storage"
Cohesion: 0.44
Nodes (8): `bag_audit`, bag_audit_equipment_time_idx, batch_equipment_time_idx, `coordinates`, `equipment`, installation_position_time_idx, `installations`, `replacement_batches`

### Community 64 - "drawings-core/src/drawings.ts"
Cohesion: 0.05
Nodes (36): DrawingAccessFacts, DrawingCreateInput, drawingCreateSchema, DrawingDetail, DrawingListItem, drawingMetadataFields, DrawingPage, DrawingsMasters (+28 more)

### Community 65 - "Domain Contract Dependencies"
Cohesion: 0.25
Nodes (8): dependencies, zod@4.5.4, exports, zod, name, private, type, version

### Community 66 - "Gateway Recovery Verification"
Cohesion: 0.24
Nodes (8): actor, compose, docker(), inspect(), names, run, sentinels, services

### Community 67 - "drawings-import-legacy.ts"
Cohesion: 0.10
Nodes (7): args, dryRun, offline, report, Result, started, sha

### Community 68 - "drawings-requests.ts"
Cohesion: 0.11
Nodes (17): IMAGE_MAX_PER_ITEM, drafterDecisionSchema, DrawingsDashboard, hac, id, NotificationItem, notificationReadSchema, requestCancelSchema (+9 more)

### Community 69 - "contracts/src/index.ts"
Cohesion: 0.08
Nodes (32): canonicalReplacement(), ageStops, AppId, bagAgeIntervalDays, bagColor(), BagGrant, BagRole, bagRoles (+24 more)

### Community 70 - "FsStorage"
Cohesion: 0.09
Nodes (13): 2. Server: periksa, konversi bila perlu, buat thumbnail, assertKey(), ByteRange, createStorage(), FsStorage, getStorage(), S3Storage, Storage (+5 more)

### Community 71 - "monitor.tsx"
Cohesion: 0.14
Nodes (16): BatchCancellationDialog(), BatchRecord, CancellationNotice(), CoordinateHistory(), TimelineItem, Batch, Installed, MarqueeDrag (+8 more)

### Community 72 - "drawings-core/package.json"
Cohesion: 0.12
Nodes (20): dependencies, @aws-sdk/client-s3@3.1160.0, @cantoo/pdf-lib@2.11.1, drizzle-orm@0.45.4, mysql2@3.24.6, @plant/contracts@workspace:*, sharp@0.35.5, zod@4.5.4 (+12 more)

### Community 73 - "BagMonitor"
Cohesion: 0.19
Nodes (17): BagMonitor(), addPositions(), cellKey(), dismiss(), focus(), hover(), keyboard(), leaveHover() (+9 more)

### Community 74 - "consumables/app/api/[...path]/route.ts"
Cohesion: 0.15
Nodes (17): Context, dynamic, GET(), json(), PATCH, POST, auditList(), listCategories() (+9 more)

### Community 75 - "Consumables Application Container"
Cohesion: 0.40
Nodes (5): image, init, networks, restart, consumables

### Community 76 - "platform.test.ts"
Cohesion: 0.18
Nodes (14): buildAuth(), cache, createDatabase(), getAuthAdapterDb(), DirectoryEntry, account, applications, audit (+6 more)

### Community 77 - "Workspace Build Permissions"
Cohesion: 0.40
Nodes (4): allowBuilds, esbuild, sharp, packages

### Community 78 - "Source Formatting Configuration"
Cohesion: 0.40
Nodes (4): endOfLine, printWidth, singleQuote, trailingComma

### Community 107 - "files.ts"
Cohesion: 0.13
Nodes (29): RFC-5987, Review Focus, Task 1: Batas 10 gambar dan 25 MB, Task 2: Aturan murni gambar dan key thumbnail, Task 4: Simpan hasil konversi dan thumbnail, Task 5: Penyajian thumbnail dan cache gambar, Task 7: Anggaran container, build image, dokumentasi, Kondisi saat ini (+21 more)

### Community 116 - "ShellSkeleton"
Cohesion: 0.21
Nodes (7): Loading(), Loading(), Loading(), brandRevision, compactArtwork, fullArtwork, ShellSkeleton()

### Community 117 - "drawings-ops"
Cohesion: 0.14
Nodes (14): depends_on, mysql, depends_on, image, networks, profiles, volumes, command (+6 more)

### Community 118 - "react"
Cohesion: 0.10
Nodes (24): Confirmation, ConfirmationOptions, ConfirmationProvider(), ConfirmFunction, DateTimeField(), highlight(), TimeColumn(), IconName (+16 more)

### Community 119 - "Prompt: Portal setara gold standard Bag Filter"
Cohesion: 0.17
Nodes (12): 1. Tujuan, 2. Batasan, 3. Hasil audit: Portal dibanding gold standard, 4. Rancangan target (≥1536 px), 5. Langkah implementasi, 6. Kriteria penerimaan, 7. Laporan, 8. Keputusan yang diambil dalam brief ini (dapat dibatalkan pengguna) (+4 more)

### Community 120 - "integration/drawings-workflow.test.ts"
Cohesion: 0.08
Nodes (7): directory(), key(), ownerOf(), people, release(), u, v()

### Community 121 - "drawings/app/api/[...path]/route.ts"
Cohesion: 0.11
Nodes (15): Context, directory(), dynamic, GET(), imageVariant(), json(), PATCH, peopleOrNull() (+7 more)

### Community 122 - "Hasil validasi implementasi v2"
Cohesion: 0.25
Nodes (11): BrandLogo artwork pipeline, Identitas TQ-CMMS, Application context sidebar navigation, Perbaikan sidebar dan dashboard Consumables, Proportional count chart and compact Portal, Separate transaction chart semantics, UI refresh v2 Plant Area System, Reversible overlays and momentum gestures (+3 more)

### Community 123 - "environment"
Cohesion: 0.31
Nodes (11): environment, environment, DRAWINGS_MAX_PDF_MB, DRAWINGS_S3_ACCESS_KEY_ID, DRAWINGS_S3_BUCKET, DRAWINGS_S3_ENDPOINT, DRAWINGS_S3_FORCE_PATH_STYLE, DRAWINGS_S3_REGION (+3 more)

### Community 124 - "PRD Plant Area System v2"
Cohesion: 0.40
Nodes (5): Active installation age and yearly replacements, PRD Plant Area System v2, Six equipment coordinate catalog, Centralized Auth SSO guards, Portal Auth Bag Filter Consumables

### Community 125 - "Consumable Room v1.1 R22"
Cohesion: 0.15
Nodes (19): R22 document API, Audit baseline Plant Area System, Legacy Vinext Cloudflare D1 export, Consumable Room v1.1 R22, Fixed point atomic stock documents, HAC SAC and mandatory Cost Center, Picklist K3 auto enrollment, R22 single shared stock (+11 more)

### Community 126 - "drawings/tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, allowJs, incremental, jsx, plugins, exclude, extends, include (+1 more)

### Community 127 - "Panduan agen untuk Plant Area System v2"
Cohesion: 0.25
Nodes (8): Artefak Graphify bersama, Cakupan graph proyek, Dokumentasi library dan platform, Konteks proyek, Memakai Graphify pada sesi baru, Panduan agen untuk Plant Area System v2, Steps, Validasi perubahan

### Community 128 - "db"
Cohesion: 0.19
Nodes (14): inactiveAssignee(), listTasks(), DirectoryPerson, otherHacLike(), notifications, counts(), drawingsDashboard(), drawingsDiscovery() (+6 more)

### Community 129 - "Identity"
Cohesion: 0.15
Nodes (15): canOpenDrawingsSection(), DrawingsAction, drawingsActions, drawingsNavigation(), DrawingsNavItem, drawingsPermissions, DrawingsPermissionValue, DrawingsRole (+7 more)

### Community 130 - "Upgrade Consumable Room R22"
Cohesion: 0.40
Nodes (5): Portable schema and data fingerprint, CI verified full SHA release, Handover OpenClaw update R22, R22 production backup rehearsal, Disposable MySQL and HTTPS QA

### Community 131 - "services"
Cohesion: 0.25
Nodes (7): networks, networks, networks, egress, services, drawings, drawings-ops

### Community 132 - "ref_node_assert"
Cohesion: 0.15
Nodes (11): bagSchema, seedEquipment(), equipmentPositions(), Position, equipmentMigrationId, migrateBag(), migrateEquipmentData(), migrateGrants() (+3 more)

### Community 133 - "drawings"
Cohesion: 0.33
Nodes (6): image, init, networks, restart, volumes, drawings

### Community 134 - "Runbook rilis Drawing Database v1"
Cohesion: 0.25
Nodes (8): 1. Persiapan (tanpa downtime), 2. Jendela rilis, 3. Smoke test setelah rilis, 4. Rollback, 5. Pindah driver `fs` → `s3` (setelah go-live), 6. Impor arsip Legacy Ready, Runbook rilis Drawing Database v1, status()

### Community 135 - "4. Alur kerja"
Cohesion: 0.21
Nodes (12): cancelled(), 4.1 Status revisi, 4.2 Check dan approval plan, 4.3 Reject, perbaikan dan siklus, 4.4 Revisi baru dan Final Drawing (K7), 4.5 Upload Old Drawing (Legacy Ready), 4.6 Drawing Request, 4.7 Void dan pembatalan revisi (K9) (+4 more)

### Community 136 - "Q: `packages/ui/src/tokens.css` seharusnya jangan dilewati. lalu docs\testing dan `AppError` apakah itu penting sehingga harus dimasukkan dalam graph?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: `packages/ui/src/tokens.css` seharusnya jangan dilewati. lalu docs\testing dan `AppError` apakah itu penting sehingga harus dimasukkan dalam graph?, Source Nodes

### Community 143 - "bag-bulk-selection.spec.ts"
Cohesion: 0.43
Nodes (5): addFull(), area(), choose(), openBulk(), users

### Community 144 - "drawings.spec.ts"
Cohesion: 0.14
Nodes (8): 5. Data dan aturan bisnis, json(), operator, people, Person, png, suffix, version()

### Community 145 - "15. Prompt implementasi untuk developer"
Cohesion: 0.33
Nodes (6): 15.1 Peran dan tujuan, 15.3 Aturan kerja, 15.4 Fase, 15.5 Hal yang sering salah, 15.6 Laporan akhir tiap fase, 15. Prompt implementasi untuk developer

### Community 146 - "requests-ui.tsx"
Cohesion: 0.15
Nodes (9): newKey(), dynamic, Page(), Page, Person, RequestBadge(), RequestView(), run() (+1 more)

### Community 147 - "ref_node_fs"
Cohesion: 0.14
Nodes (7): verifier, [full, compact], outputs, revision, root, sources, extra

### Community 148 - "package.json"
Cohesion: 0.11
Nodes (24): devDependencies, @aws-sdk/client-s3@3.1160.0, @cantoo/pdf-lib@2.11.1, @playwright/test@1.64.1, prettier@3.9.10, sharp@0.35.5, tsx@4.23.15, @types/node@22.19.19 (+16 more)

### Community 149 - "integration/drawings-files.test.ts"
Cohesion: 0.11
Nodes (11): storageConfig(), cache, closeDrawingsDb(), create(), getDrawingsDb(), drawingsSchema, report, storage (+3 more)

### Community 150 - "library.tsx"
Cohesion: 0.14
Nodes (15): DrawingTitle(), empty, filterKeys, Filters, first(), dynamic, Page(), Library() (+7 more)

### Community 151 - "platform.test.ts"
Cohesion: 0.11
Nodes (7): equipmentCodes, better-auth, actor, actor, actor, pos, signIn()

### Community 152 - "6. File, storage dan stamp"
Cohesion: 0.40
Nodes (5): 6.1 Upload dua tahap, 6.2 Storage (K4), 6.3 Penyajian file, 6.4 Stamp approval (K6), 6. File, storage dan stamp

### Community 153 - "requests.ts"
Cohesion: 0.15
Nodes (20): canSeeRequest(), requestNumber(), requestStatusTone(), wibYear(), createRequest(), isId(), link(), nextSequence() (+12 more)

### Community 154 - "8. Arsitektur dan integrasi platform"
Cohesion: 0.50
Nodes (4): 8.2 Database `plant_drawings`, 8.3 API, 8.4 Gateway, 8. Arsitektur dan integrasi platform

### Community 156 - "bag-core/src/index.ts"
Cohesion: 0.17
Nodes (18): CancellationColumns, cancellationMetadata(), cancelReplacement(), errorCode(), cache, closeBagDb(), createDatabase(), Cursor (+10 more)

### Community 157 - "Workspace"
Cohesion: 0.21
Nodes (15): ChangePassword(), dynamic, LoginForm(), PasswordForm(), dynamic, Login(), dynamic, Profile() (+7 more)

### Community 158 - "canDraw"
Cohesion: 0.20
Nodes (12): dynamic, Page(), PdfViewer(), Core, Person, ReviewPanel(), submit(), dynamic (+4 more)

### Community 159 - "consumables-ui.spec.ts"
Cohesion: 0.12
Nodes (6): actor, temporary, types, year, actor, materials

### Community 160 - "Desain: kompresi gambar Drawing Database ke WebP"
Cohesion: 0.12
Nodes (16): 1. Browser: kompresi sebelum upload, 3. Skema, 4. Penyajian dan cache, 5. Batas jumlah gambar, 6. Infra, 7. Dokumentasi, Anti-goal (gagal walau secara teknis jalan), Desain (+8 more)

### Community 161 - "image-upload.tsx"
Cohesion: 0.28
Nodes (10): compressedName(), compressImage(), encode(), fitWithin(), ImageUpload(), add(), Item, TYPES (+2 more)

### Community 162 - "AGENTS.md"
Cohesion: 0.18
Nodes (7): Kontrak API v2, Idempotent Bag Filter batches, Session identity and exact origin, Whole batch cancellation, Global Constraints, Kompresi Gambar Drawing Database ke WebP — Implementation Plan, Pemeriksaan manual sebelum go-live

### Community 163 - "summary.tsx"
Cohesion: 0.36
Nodes (5): dynamic, Page(), DrawingsSummary(), n(), series

### Community 164 - "drawingsRole"
Cohesion: 0.46
Nodes (8): drawingsPermission(), drawingsRole(), canSeeDrawing(), canSeeRevision(), canSeeWip(), DrawingPermissions, drawingPermissions(), requestScopes()

### Community 165 - "drawings-images.test.ts"
Cohesion: 0.29
Nodes (3): clean, fixture(), sha()

### Community 166 - "consumables.spec.ts"
Cohesion: 0.29
Nodes (6): admin, materials, post(), roleUsers, save(), suffix

### Community 167 - "drawings/app/health/ready/route.ts"
Cohesion: 0.67
Nodes (3): dynamic, GET(), drawingsDatabaseReady()

## Knowledge Gaps
- **45 isolated node(s):** `RFC-5987`, `RFC-4180`, `../../tsconfig.json`, `../../tsconfig.json`, `../../tsconfig.json` (+40 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 990 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **45 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AppError` connect `AppError` to `db`, `drawing-form.tsx`, `Identity`, `integration/consumables.test.ts`, `Consumable Order Carts`, `Q: `packages/ui/src/tokens.css` seharusnya jangan dilewati. lalu docs\testing dan `AppError` apakah itu penting sehingga harus dimasukkan dalam graph?`, `server/src/index.ts`, `naming.ts`, `Shared Errors and Stock Transactions`, `requests-ui.tsx`, `drawings-workflow.ts`, `approval.ts`, `integration/drawings-files.test.ts`, `server/src/index.ts`, `bag-core/src/index.ts`, `library.tsx`, `requests.ts`, `platform.test.ts`, `bag-core/src/index.ts`, `User Administration Services`, `documents.ts`, `insights.ts`, `canDraw`, `drawings-core/src/index.ts`, `drawings-images.test.ts`, `db`, `unit/drawings-files.test.ts`, `drawings-import-legacy.ts`, `contracts/src/index.ts`, `FsStorage`, `consumables/app/api/[...path]/route.ts`, `platform.test.ts`, `files.ts`, `integration/drawings-workflow.test.ts`, `drawings/app/api/[...path]/route.ts`, `Panduan agen untuk Plant Area System v2`?**
  _High betweenness centrality (0.117) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `AppError` (e.g. with `Cakupan graph proyek` and `15.2 Bacaan wajib sebelum menulis kode`) actually correct?**
  _`AppError` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-5987`, `RFC-4180`, `../../tsconfig.json` to the rest of the system?**
  _45 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Consumable Order Carts` be split into smaller, more focused modules?**
  _Cohesion score 0.1064102564102564 - nodes in this community are weakly interconnected._
- **Why does `@playwright/test` connect `Identity` to `Gateway Recovery Verification`, `consumables.spec.ts`, `bag-bulk-selection.spec.ts`, `dev.ts`, `drawings.spec.ts`, `ref_node_fs`, `package.json`, `platform.test.ts`, `consumables-ui.spec.ts`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Should `drawing-form.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.1341991341991342 - nodes in this community are weakly interconnected._
- **Why does `Identity` connect `Identity` to `db`, `Identity`, `Consumable Order Carts`, `integration/consumables.test.ts`, `index.tsx`, `Consumable Order Carts`, `server/src/index.ts`, `Consumables Workspace Controls`, `Icon`, `drawings-model.test.ts`, `bag-bulk-selection.spec.ts`, `drawings.spec.ts`, `Shared Errors and Stock Transactions`, `approval.ts`, `integration/drawings-files.test.ts`, `platform.test.ts`, `bag-core/src/index.ts`, `requests.ts`, `bag-core/src/index.ts`, `documents.ts`, `Workspace`, `insights.ts`, `consumables-ui.spec.ts`, `drawings-core/src/index.ts`, `consumables.spec.ts`, `db`, `unit/drawings-files.test.ts`, `drawings-core/src/drawings.ts`, `Gateway Recovery Verification`, `drawings-import-legacy.ts`, `drawings-requests.ts`, `contracts/src/index.ts`, `platform.test.ts`, `files.ts`, `react`, `integration/drawings-workflow.test.ts`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._