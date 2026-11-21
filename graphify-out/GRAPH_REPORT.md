# Graph Report - plant-area-system  (2026-11-21)

## Corpus Check
- 361 files · ~277,408 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 34 file(s) not represented in the graph (top: (none) 12, .css 12, .conf 4)

## Summary
- 2680 nodes · 6803 edges · 174 communities (126 shown, 48 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 160 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `f67a1669`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- selection.ts
- Operasional pilot
- Consumable Order Carts
- drawing-form.tsx
- Identity
- integration/consumables.test.ts
- auth-core/src/index.ts
- Consumable Order Carts
- drawing-view.tsx
- failure
- naming.ts
- app/workspace.tsx
- Repository Automation Scripts
- Icon
- Auth Application Dependencies
- Bag Application Dependencies
- Consumables Application Dependencies
- Shared Errors and Stock Transactions
- drawings-workflow.ts
- Portal Application Dependencies
- database-snapshot.ts
- migrate.ts
- server/src/index.ts
- ref_node_crypto
- dependencies
- approval.ts
- Application Theme Layouts
- Consumables Inventory Schema
- User Administration Services
- unit/consumables.test.ts
- Compose Runtime Services
- insights.ts
- drawings/app/[section]/page.tsx
- Database Migration Containers
- Consumables Core Dependencies
- drawings-model.test.ts
- S3Storage
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
- drawings-core/src/drawings.ts
- Service Authentication Configuration
- MySQL Credential Configuration
- Authentication Storage Schema
- Container Health Checks
- Database Environment Configuration
- unit/drawings-files.test.ts
- Server Package Dependencies
- pdf-viewer-core.tsx
- Auth TypeScript Configuration
- Bag TypeScript Configuration
- Consumables TypeScript Configuration
- Portal TypeScript Configuration
- Drawing Database v1 — PRD dan prompt implementasi
- Bag Installation Storage
- drawings-core/src/drawings.ts
- Domain Contract Dependencies
- drawings-import-legacy.ts
- drawings-requests.ts
- contracts/src/index.ts
- bag-bulk-selection.spec.ts
- ref_node_fs
- drawings-core/package.json
- monitor.tsx
- consumables/app/api/[...path]/route.ts
- Consumables Application Container
- 3. Spesifikasi per widget
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
- requests-ui.tsx
- Auth Migration Checkpoints
- Bag Migration Checkpoints
- Batch Cancellation Migration
- Overlay
- drawings-ops
- summary.tsx
- Prompt: Portal setara gold standard Bag Filter
- integration/drawings-workflow.test.ts
- AppError
- UI refresh v2 Plant Area System
- environment
- scripts
- R22 single shared stock
- drawings/tsconfig.json
- Panduan agen untuk Plant Area System v2
- bag-bulk-selection.spec.ts
- Identity
- Hasil validasi implementasi v2
- services
- Idempotent Bag Filter batches
- drawings
- Runbook rilis Drawing Database v1
- 4. Alur kerja
- Q: `packages/ui/src/tokens.css` seharusnya jangan dilewati. lalu docs\testing dan `AppError` apakah itu penting sehingga harus dimasukkan dalam graph?
- drawings/app/health/live/route.ts
- CLAUDE.md
- test-gateway-recovery.ts
- drawings.spec.ts
- Additive R22 metadata migration
- index.tsx
- ref_node_fs
- package.json
- drawings-storage-copy.ts
- library.tsx
- drawings-core/src/index.ts
- 6. File, storage dan stamp
- dashboard.tsx
- 8. Arsitektur dan integrasi platform
- Additive R22 metadata migration
- Overlay
- change-password/page.tsx
- pageIdentity
- packages_ui_src_index_button
- Desain: kompresi gambar Drawing Database ke WebP
- image-upload.tsx
- Idempotent Bag Filter batches
- tokens.css
- drawingsRole
- drawings-images.test.ts
- normalizeHac
- select-e2e.ts
- consumables-ui.spec.ts
- documents/[id]/page.tsx
- copy-pdfjs-assets.mjs
- test-operations.ts
- ShellSkeleton

## God Nodes (most connected - your core abstractions)
1. `AppError` - 196 edges
2. `Identity` - 62 edges
3. `BagMonitor()` - 50 edges
4. `Icon()` - 46 edges
5. `db()` - 43 edges
6. `Overlay()` - 38 edges
7. `pageIdentity()` - 38 edges
8. `Button()` - 37 edges
9. `canDraw()` - 36 edges
10. `mutate()` - 34 edges

## Surprising Connections (you probably didn't know these)
- `3.11 Format angka` --references--> `portalSummary()`  [INFERRED]
  docs/design/BAG-FILTER-DASHBOARD-POLISH.md → packages/bag-core/src/insights.ts
- `3.4 Kompartemen paling kritis (menggantikan "Satu batch, banyak posisi")` --references--> `displayCompartment()`  [INFERRED]
  docs/design/BAG-FILTER-DASHBOARD-POLISH.md → packages/contracts/src/index.ts
- `Cakupan graph proyek` --references--> `AppError`  [INFERRED]
  AGENTS.md → packages/contracts/src/index.ts
- `3. Skema` --references--> `cleanupStagedFiles()`  [INFERRED]
  docs/superpowers/specs/2026-11-21-drawings-image-compression-design.md → packages/drawings-core/src/files.ts
- `8.1 Bagian baru dan yang berubah` --references--> `nextRevisionNo()`  [INFERRED]
  docs/DRAWING-DATABASE-PRD.md → packages/contracts/src/drawings-workflow.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Cross-application UI modernization** — docs_design_ui_audit_portal_consumables_operational_hub, docs_design_ui_audit_portal_consumables_reversible_overlays, docs_design_ui_audit_portal_consumables_accessible_design_tokens, docs_design_ui_audit_portal_consumables_shell_skeleton, docs_design_ui_audit_portal_consumables_stock_query_feedback, docs_design_ui_audit_portal_consumables_reversible_cart [EXTRACTED 1.00]

## Communities (174 total, 48 thin omitted)

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
Cohesion: 0.15
Nodes (9): Mode, Person, Props, FileDrop(), Item, TYPES, formatSize(), PdfUpload() (+1 more)

### Community 4 - "Identity"
Cohesion: 0.10
Nodes (13): authSchema, closeBagDb(), bagSchema, Identity, Position, users, layouts, actor (+5 more)

### Community 5 - "integration/consumables.test.ts"
Cohesion: 0.13
Nodes (31): mutate(), createDocument(), replay(), DocumentConflict, documentDetail(), hecSuggestions(), readResult(), searchMaterials() (+23 more)

### Community 7 - "Consumable Order Carts"
Cohesion: 0.14
Nodes (28): AddToOrder(), QuantityDialog(), parseNamingCsv(), amount, canConsume(), canonicalDocumentPayload(), ConsumablesGrant, ConsumablesRole (+20 more)

### Community 8 - "drawing-view.tsx"
Cohesion: 0.12
Nodes (26): ClampText(), sendJson(), DrawingView(), run(), Person, shown(), ImageUpload(), PdfViewer() (+18 more)

### Community 9 - "failure"
Cohesion: 0.27
Nodes (9): dynamic, GET(), dynamic, GET(), dynamic, GET(), POST(), failure() (+1 more)

### Community 10 - "naming.ts"
Cohesion: 0.14
Nodes (14): dynamic, GET(), cache, closeConsumablesDb(), create(), getConsumablesDb(), importCatalog(), parseCatalog() (+6 more)

### Community 11 - "app/workspace.tsx"
Cohesion: 0.20
Nodes (23): AliasInput(), AuditItem, ConsumablesWorkspace(), openMaterial(), Enrollment(), get(), InventoryEditor(), labels (+15 more)

### Community 12 - "Repository Automation Scripts"
Cohesion: 0.06
Nodes (31): scripts, bootstrap, brand:generate, build, check:export, consumables:import, consumables:import-naming, consumables:preflight (+23 more)

### Community 13 - "Icon"
Cohesion: 0.12
Nodes (26): dynamic, Portal(), wibDateFormatter, Commit 2: `feat(portal): rebuild hub on the Bag Filter dashboard system`, AppId, formatRelativeWib(), PortalIconName, countScale() (+18 more)

### Community 14 - "Auth Application Dependencies"
Cohesion: 0.13
Nodes (20): dependencies, next@16.4.6, @plant/auth-core@workspace:*, @plant/contracts@workspace:*, @plant/server@workspace:*, @plant/ui@workspace:*, react@19.3.1, react-dom@19.3.1 (+12 more)

### Community 15 - "Bag Application Dependencies"
Cohesion: 0.10
Nodes (25): dependencies, next@16.4.6, @plant/bag-core@workspace:*, @plant/contracts@workspace:*, @plant/server@workspace:*, @plant/ui@workspace:*, react@19.3.1, react-dom@19.3.1 (+17 more)

### Community 16 - "Consumables Application Dependencies"
Cohesion: 0.10
Nodes (25): dependencies, next@16.4.6, @plant/consumables-core@workspace:*, @plant/contracts@workspace:*, @plant/server@workspace:*, @plant/ui@workspace:*, react@19.3.1, react-dom@19.3.1 (+17 more)

### Community 17 - "Shared Errors and Stock Transactions"
Cohesion: 0.11
Nodes (17): common, inventoryInput, materialInput, MoveKind, schemas, R22_ROOM_ID, Executor, invCols (+9 more)

### Community 18 - "drawings-workflow.ts"
Cohesion: 0.07
Nodes (24): IMAGE_MAX_PER_ITEM, RevisionStatus, ApprovalActionView, approvalDecisionSchema, ApprovalLevel, approvalLevels, approvalPlanSchema, ApprovalStep (+16 more)

### Community 19 - "Portal Application Dependencies"
Cohesion: 0.11
Nodes (22): dependencies, next@16.4.6, @plant/contracts@workspace:*, @plant/server@workspace:*, @plant/ui@workspace:*, react@19.3.1, react-dom@19.3.1, next (+14 more)

### Community 20 - "database-snapshot.ts"
Cohesion: 0.21
Nodes (11): args, capture(), compare(), databases, ephemeral, identifier(), migrationsHash(), walk() (+3 more)

### Community 21 - "migrate.ts"
Cohesion: 0.16
Nodes (11): 8.1 Bagian baru dan yang berubah, DrawingsGrant, appCatalog, Grant, migrateConsumablesCatalog(), provision(), provisionConsumables(), migrateDrawingsCatalog() (+3 more)

### Community 22 - "server/src/index.ts"
Cohesion: 0.09
Nodes (29): AuditList(), Event, Audit(), dynamic, dynamic, EquipmentPage(), dynamic, dynamic (+21 more)

### Community 23 - "ref_node_crypto"
Cohesion: 0.09
Nodes (39): Context, dynamic, GET(), json(), POST(), dynamic, GET(), CancellationColumns (+31 more)

### Community 24 - "dependencies"
Cohesion: 0.20
Nodes (10): dependencies, better-auth@1.7.12, drizzle-orm@0.45.4, mysql2@3.24.6, @plant/contracts@workspace:*, @plant/server@workspace:*, drizzle-orm, mysql2 (+2 more)

### Community 25 - "approval.ts"
Cohesion: 0.08
Nodes (24): attachImages(), bump(), checkRevision(), decideApproval(), Directory, done(), drawingLabel(), inactiveAssignee() (+16 more)

### Community 26 - "Application Theme Layouts"
Cohesion: 0.09
Nodes (23): inter, Layout(), metadata, inter, Layout(), metadata, inter, Layout() (+15 more)

### Community 27 - "Consumables Inventory Schema"
Cohesion: 0.18
Nodes (19): `catalog_imports`, `consumables_audit`, consumables_audit_time_idx, `inventory`, inventory_location_idx, `locations`, material_category_idx, `materials` (+11 more)

### Community 28 - "User Administration Services"
Cohesion: 0.16
Nodes (30): Context, dynamic, GET(), POST(), getAuthDb(), auditEntry(), authAudit(), changePassword() (+22 more)

### Community 29 - "unit/consumables.test.ts"
Cohesion: 0.11
Nodes (21): date, docCols, header, hec, pickLine, qtyLine, requester, schemas (+13 more)

### Community 30 - "Compose Runtime Services"
Cohesion: 0.10
Nodes (19): command, depends_on, image, networks, profiles, name, networks, gateway (+11 more)

### Community 31 - "insights.ts"
Cohesion: 0.18
Nodes (23): activeAgeSummary(), 1. Temuan dari screenshot dan source, 2. Tata letak baru, 4. Perubahan API (aditif), 6. Urutan pengerjaan (satu PR, commit bertahap), 7. Validasi, 8. Di luar cakupan, Rencana polish Ringkasan Bag Filter (+15 more)

### Community 32 - "drawings/app/[section]/page.tsx"
Cohesion: 0.14
Nodes (13): DrawingForm(), options(), dynamic, Page(), LibraryParams, kinds, MastersManager(), dynamic (+5 more)

### Community 33 - "Database Migration Containers"
Cohesion: 0.22
Nodes (9): entrypoint, environment, image, networks, restart, volumes, MYSQL_HOST, MYSQL_PWD (+1 more)

### Community 34 - "Consumables Core Dependencies"
Cohesion: 0.15
Nodes (16): dependencies, drizzle-orm@0.45.4, mysql2@3.24.6, @plant/contracts@workspace:*, zod@4.6.7, exports, ./import, ./schema (+8 more)

### Community 35 - "drawings-model.test.ts"
Cohesion: 0.10
Nodes (6): RFC-4180, fieldsSchema, legacyImportKey(), LegacyImportOutcome, LegacyImportRow, parseCsv()

### Community 36 - "S3Storage"
Cohesion: 0.27
Nodes (3): 2. Server: periksa, konversi bila perlu, buat thumbnail, assertKey(), S3Storage

### Community 37 - "Continuous Integration Validation"
Cohesion: 0.07
Nodes (28): BASE_SHA, BEFORE_SHA, EVENT_NAME, GIT_REF, SPECS, jobs, validate, name (+20 more)

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
Cohesion: 0.23
Nodes (5): config, config, config, config, config

### Community 46 - "Nginx Service Routing"
Cohesion: 0.13
Nodes (15): condition, condition, bag-filter, consumables, drawings, portal, condition, depends_on (+7 more)

### Community 47 - "Cross Application UI Design"
Cohesion: 0.09
Nodes (22): Accessible design tokens, Portal and Consumables UI audit, Momentum-aware drawer gestures, Portal operational hub, Reversible cart feedback, ShellSkeleton navigation fallback, 0. Konteks dan prioritas acuan, 1. Keputusan font: self-host Inter (+14 more)

### Community 48 - "dev.ts"
Cohesion: 0.24
Nodes (17): apps, compose(), cores, databases, databaseUrls(), docker(), execute(), exists() (+9 more)

### Community 49 - "drawings-core/src/drawings.ts"
Cohesion: 0.11
Nodes (44): GET(), wibWeekStarts(), approverCandidates(), attachmentFile(), drawingDetail(), isId(), listTasks(), auditList() (+36 more)

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
Nodes (24): uploadLimit(), clampText(), formatStampTime(), invalid(), normalizeRotation(), queue, serialPdfJob(), STAMP_GAP (+16 more)

### Community 56 - "Server Package Dependencies"
Cohesion: 0.22
Nodes (10): dependencies, next@16.4.6, @plant/contracts@workspace:*, exports, next, @plant/contracts, name, private (+2 more)

### Community 57 - "pdf-viewer-core.tsx"
Cohesion: 0.07
Nodes (35): clampScale(), describe(), Failure, LockableOrientation, orientation(), PdfViewerCore(), PdfViewerProps, presets (+27 more)

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
Cohesion: 0.06
Nodes (31): DrawingAccessFacts, DrawingCreateInput, drawingCreateSchema, DrawingListItem, drawingMetadataFields, DrawingPage, DrawingUpdateInput, drawingUpdateSchema (+23 more)

### Community 65 - "Domain Contract Dependencies"
Cohesion: 0.25
Nodes (8): dependencies, zod@4.6.7, exports, zod, name, private, type, version

### Community 67 - "drawings-import-legacy.ts"
Cohesion: 0.11
Nodes (7): args, dryRun, offline, report, Result, started, sha

### Community 68 - "drawings-requests.ts"
Cohesion: 0.11
Nodes (40): drawingsPermission(), drawingsRole(), DrawingPermissions, drawingPermissions(), canSeeRequest(), drafterDecisionSchema, hac, id (+32 more)

### Community 69 - "contracts/src/index.ts"
Cohesion: 0.08
Nodes (27): ageStops, bagAgeIntervalDays, bagColor(), BagGrant, BagRole, bagRoles, cancellationSchema, equipment (+19 more)

### Community 70 - "bag-bulk-selection.spec.ts"
Cohesion: 0.43
Nodes (5): addFull(), area(), choose(), openBulk(), users

### Community 71 - "ref_node_fs"
Cohesion: 0.14
Nodes (17): BatchCancellationDialog(), BatchRecord, CancellationNotice(), CoordinateHistory(), TimelineItem, Batch, Installed, MarqueeDrag (+9 more)

### Community 72 - "drawings-core/package.json"
Cohesion: 0.12
Nodes (21): dependencies, @aws-sdk/client-s3@3.1160.0, @cantoo/pdf-lib@2.11.1, drizzle-orm@0.45.4, mysql2@3.24.6, @plant/contracts@workspace:*, sharp@0.35.5, zod@4.6.7 (+13 more)

### Community 73 - "monitor.tsx"
Cohesion: 0.17
Nodes (20): BagMonitor(), addPositions(), cellKey(), dismiss(), focus(), hover(), keyboard(), leaveHover() (+12 more)

### Community 74 - "consumables/app/api/[...path]/route.ts"
Cohesion: 0.14
Nodes (21): Context, dynamic, GET(), json(), PATCH, POST, dateConditions(), listDocuments() (+13 more)

### Community 75 - "Consumables Application Container"
Cohesion: 0.40
Nodes (5): image, init, networks, restart, consumables

### Community 76 - "3. Spesifikasi per widget"
Cohesion: 0.12
Nodes (24): dynamic, POST(), dynamic, GET(), buildAuth(), getAuth(), publicOrigin(), cache (+16 more)

### Community 77 - "Workspace Build Permissions"
Cohesion: 0.40
Nodes (4): allowBuilds, esbuild, sharp, packages

### Community 78 - "Source Formatting Configuration"
Cohesion: 0.40
Nodes (4): endOfLine, printWidth, singleQuote, trailingComma

### Community 107 - "requests-ui.tsx"
Cohesion: 0.13
Nodes (14): ApiError, getJson(), newKey(), parse(), wib, submit(), Page, Person (+6 more)

### Community 116 - "Overlay"
Cohesion: 0.16
Nodes (16): Confirmation, ConfirmationOptions, ConfirmationProvider(), ConfirmFunction, DateTimeField(), highlight(), TimeColumn(), project() (+8 more)

### Community 117 - "drawings-ops"
Cohesion: 0.14
Nodes (14): depends_on, mysql, depends_on, image, networks, profiles, volumes, command (+6 more)

### Community 118 - "summary.tsx"
Cohesion: 0.39
Nodes (6): docker(), exists(), parseEnv(), root, run, verifyIsolatedRuntime()

### Community 119 - "Prompt: Portal setara gold standard Bag Filter"
Cohesion: 0.17
Nodes (12): 1. Tujuan, 2. Batasan, 3. Hasil audit: Portal dibanding gold standard, 4. Rancangan target (≥1536 px), 5. Langkah implementasi, 6. Kriteria penerimaan, 7. Laporan, 8. Keputusan yang diambil dalam brief ini (dapat dibatalkan pengguna) (+4 more)

### Community 120 - "integration/drawings-workflow.test.ts"
Cohesion: 0.08
Nodes (7): directory(), key(), ownerOf(), people, release(), u, v()

### Community 121 - "AppError"
Cohesion: 0.09
Nodes (49): Context, directory(), dynamic, imageVariant(), json(), mutate(), PATCH, peopleOrNull() (+41 more)

### Community 122 - "UI refresh v2 Plant Area System"
Cohesion: 0.17
Nodes (14): BrandLogo artwork pipeline, Identitas TQ-CMMS, Kontrak API v2, Session identity and exact origin, Application context sidebar navigation, Perbaikan sidebar dan dashboard Consumables, Proportional count chart and compact Portal, Active installation age and yearly replacements (+6 more)

### Community 123 - "environment"
Cohesion: 0.31
Nodes (11): environment, environment, DRAWINGS_MAX_PDF_MB, DRAWINGS_S3_ACCESS_KEY_ID, DRAWINGS_S3_BUCKET, DRAWINGS_S3_ENDPOINT, DRAWINGS_S3_FORCE_PATH_STYLE, DRAWINGS_S3_REGION (+3 more)

### Community 124 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, start, typecheck

### Community 125 - "R22 single shared stock"
Cohesion: 0.33
Nodes (6): R22 document API, HAC SAC and mandatory Cost Center, R22 single shared stock, R22 single room preflight, Centralized Auth SSO guards, Portal Auth Bag Filter Consumables

### Community 126 - "drawings/tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, allowJs, incremental, jsx, plugins, exclude, extends, include (+1 more)

### Community 127 - "Panduan agen untuk Plant Area System v2"
Cohesion: 0.25
Nodes (8): Artefak Graphify bersama, Cakupan graph proyek, Dokumentasi library dan platform, Konteks proyek, Memakai Graphify pada sesi baru, Panduan agen untuk Plant Area System v2, Steps, Validasi perubahan

### Community 128 - "bag-bulk-selection.spec.ts"
Cohesion: 0.08
Nodes (26): NotificationItem, notificationReadSchema, labels, listMasters(), MasterKind, tables, toItem(), NotificationInput (+18 more)

### Community 129 - "Identity"
Cohesion: 0.16
Nodes (15): canOpenDrawingsSection(), DrawingsAction, drawingsActions, drawingsNavigation(), DrawingsNavItem, drawingsPermissions, DrawingsPermissionValue, DrawingsRole (+7 more)

### Community 130 - "Hasil validasi implementasi v2"
Cohesion: 0.16
Nodes (18): Audit baseline Plant Area System, Legacy Vinext Cloudflare D1 export, Consumable Room v1.1 R22, Picklist K3 auto enrollment, Prompt revisi alur bisnis R22, Warehouse R22 Client material flow, Portable schema and data fingerprint, CI verified full SHA release (+10 more)

### Community 131 - "services"
Cohesion: 0.25
Nodes (7): networks, networks, networks, egress, services, drawings, drawings-ops

### Community 132 - "Idempotent Bag Filter batches"
Cohesion: 0.22
Nodes (12): canonicalReplacement(), seedEquipment(), equipmentPositions(), rowDividerBefore(), validateInstallationDate(), equipmentMigrationId, migrateBag(), migrateEquipmentData() (+4 more)

### Community 133 - "drawings"
Cohesion: 0.33
Nodes (6): image, init, networks, restart, volumes, drawings

### Community 134 - "Runbook rilis Drawing Database v1"
Cohesion: 0.13
Nodes (11): 1. Persiapan (tanpa downtime), 2. Jendela rilis, 3. Smoke test setelah rilis, 4. Rollback, 5. Pindah driver `fs` → `s3` (setelah go-live), 6. Impor arsip Legacy Ready, Runbook rilis Drawing Database v1, Global Constraints (+3 more)

### Community 135 - "4. Alur kerja"
Cohesion: 0.21
Nodes (12): cancelled(), 4.1 Status revisi, 4.2 Check dan approval plan, 4.3 Reject, perbaikan dan siklus, 4.4 Revisi baru dan Final Drawing (K7), 4.5 Upload Old Drawing (Legacy Ready), 4.6 Drawing Request, 4.7 Void dan pembatalan revisi (K9) (+4 more)

### Community 136 - "Q: `packages/ui/src/tokens.css` seharusnya jangan dilewati. lalu docs\testing dan `AppError` apakah itu penting sehingga harus dimasukkan dalam graph?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: `packages/ui/src/tokens.css` seharusnya jangan dilewati. lalu docs\testing dan `AppError` apakah itu penting sehingga harus dimasukkan dalam graph?, Source Nodes

### Community 143 - "test-gateway-recovery.ts"
Cohesion: 0.07
Nodes (16): closeAuthDb(), equipmentCodes, better-auth, @playwright/test, paths, actor, compose, docker() (+8 more)

### Community 144 - "drawings.spec.ts"
Cohesion: 0.08
Nodes (8): 5. Data dan aturan bisnis, json(), operator, people, Person, png, suffix, version()

### Community 145 - "Additive R22 metadata migration"
Cohesion: 0.33
Nodes (6): 15.1 Peran dan tujuan, 15.3 Aturan kerja, 15.4 Fase, 15.5 Hal yang sering salah, 15.6 Laporan akhir tiap fase, 15. Prompt implementasi untuk developer

### Community 146 - "index.tsx"
Cohesion: 0.26
Nodes (11): cartCount(), CartDraft, cartKey(), CartLine, clearR22Carts(), emptyCart(), memory, readCart() (+3 more)

### Community 147 - "ref_node_fs"
Cohesion: 0.14
Nodes (7): verifier, [full, compact], outputs, revision, root, sources, extra

### Community 148 - "package.json"
Cohesion: 0.10
Nodes (26): devDependencies, @aws-sdk/client-s3@3.1160.0, @cantoo/pdf-lib@2.11.1, @playwright/test@1.64.1, prettier@3.9.10, sharp@0.35.5, tsx@4.23.15, @types/node@22.19.19 (+18 more)

### Community 149 - "drawings-storage-copy.ts"
Cohesion: 0.20
Nodes (7): storageConfig(), drawingsSchema, report, storage, withHash, dryRun, summary

### Community 150 - "library.tsx"
Cohesion: 0.08
Nodes (23): actionLabels, AuditList(), Item, Page, formatWib(), empty, filterKeys, Filters (+15 more)

### Community 151 - "drawings-core/src/index.ts"
Cohesion: 0.07
Nodes (62): dynamic, GET(), RFC-5987, Review Focus, Task 1: Batas 10 gambar dan 25 MB, Task 2: Aturan murni gambar dan key thumbnail, Task 3: Pemrosesan gambar dengan sharp, Task 4: Simpan hasil konversi dan thumbnail (+54 more)

### Community 152 - "6. File, storage dan stamp"
Cohesion: 0.40
Nodes (5): 6.1 Upload dua tahap, 6.2 Storage (K4), 6.3 Penyajian file, 6.4 Stamp approval (K6), 6. File, storage dan stamp

### Community 153 - "dashboard.tsx"
Cohesion: 0.08
Nodes (36): BagFilter(), 3.0 Grafik pemasangan, 3.10 Kartu Equipment bawah, 3.11 Format angka, 3.1 KPI rail, 3.2 Banner "Belum tercatat", 3.3 Kepatuhan WO (menggantikan "Cakupan pemasangan"), 3.4 Kompartemen paling kritis (menggantikan "Satu batch, banyak posisi") (+28 more)

### Community 154 - "8. Arsitektur dan integrasi platform"
Cohesion: 0.50
Nodes (4): 8.2 Database `plant_drawings`, 8.3 API, 8.4 Gateway, 8. Arsitektur dan integrasi platform

### Community 156 - "Overlay"
Cohesion: 0.19
Nodes (10): IconName, paths, App, Collapsible(), Item, NavigationTree(), SidebarNavigation(), Activity (+2 more)

### Community 157 - "change-password/page.tsx"
Cohesion: 0.21
Nodes (15): ChangePassword(), dynamic, LoginForm(), PasswordForm(), dynamic, Login(), dynamic, Profile() (+7 more)

### Community 158 - "pageIdentity"
Cohesion: 0.13
Nodes (15): 3. Portal: hub yang tenang tapi berisi, dan siap untuk aplikasi baru, Kondisi sekarang, Kontrak ringkasan aplikasi (inti skalabilitas), Kriteria selesai (Portal), Prinsip desain, Tata letak target, movementLabels, StockActivity() (+7 more)

### Community 159 - "packages_ui_src_index_button"
Cohesion: 0.24
Nodes (7): Application, Applications(), Admin(), dynamic, AdminWorkspace(), act(), send()

### Community 160 - "Desain: kompresi gambar Drawing Database ke WebP"
Cohesion: 0.12
Nodes (16): 1. Browser: kompresi sebelum upload, 3. Skema, 4. Penyajian dan cache, 5. Batas jumlah gambar, 6. Infra, 7. Dokumentasi, Anti-goal (gagal walau secara teknis jalan), Desain (+8 more)

### Community 161 - "image-upload.tsx"
Cohesion: 0.40
Nodes (8): compressedName(), compressImage(), encode(), fitWithin(), keepOriginal(), add(), Task 6: Kompresi di browser dan thumbnail di UI, file()

### Community 162 - "Idempotent Bag Filter batches"
Cohesion: 0.50
Nodes (4): Idempotent Bag Filter batches, Whole batch cancellation, Fixed point atomic stock documents, Deterministic document lock ordering

### Community 163 - "tokens.css"
Cohesion: 0.20
Nodes (18): SIL Open Font License 1.1, Inter v4.1 Self-Hosted Font Asset, Bag age color scale, Brand color aliases, Design system cascade layers, Chart hatch patterns, Theme aware chart series, Component radius tokens (+10 more)

### Community 164 - "drawingsRole"
Cohesion: 1.00
Nodes (3): canSeeDrawing(), canSeeRevision(), canSeeWip()

### Community 165 - "drawings-images.test.ts"
Cohesion: 0.22
Nodes (5): canvas(), clean, fixture(), sha(), vp8()

### Community 167 - "select-e2e.ts"
Cohesion: 0.18
Nodes (14): Area, areaPaths, noBrowserImpact, selectE2e(), Selection, specAreas, changedSince(), decide() (+6 more)

### Community 173 - "consumables-ui.spec.ts"
Cohesion: 0.11
Nodes (6): actor, temporary, types, year, actor, materials

### Community 174 - "documents/[id]/page.tsx"
Cohesion: 0.32
Nodes (4): dynamic, Page(), titles, PrintButton()

### Community 175 - "copy-pdfjs-assets.mjs"
Cohesion: 0.25
Nodes (6): app, marker, require, source, target, { version }

### Community 177 - "test-operations.ts"
Cohesion: 0.33
Nodes (4): compose, docker(), persistedSql, run

### Community 178 - "ShellSkeleton"
Cohesion: 0.21
Nodes (7): Loading(), Loading(), Loading(), brandRevision, compactArtwork, fullArtwork, ShellSkeleton()

## Knowledge Gaps
- **45 isolated node(s):** `../../tsconfig.json`, `RFC-5987`, `RFC-4180`, `../../tsconfig.json`, `../../tsconfig.json` (+40 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1029 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **48 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AppError` connect `AppError` to `bag-bulk-selection.spec.ts`, `Idempotent Bag Filter batches`, `integration/consumables.test.ts`, `Identity`, `Consumable Order Carts`, `Q: `packages/ui/src/tokens.css` seharusnya jangan dilewati. lalu docs\testing dan `AppError` apakah itu penting sehingga harus dimasukkan dalam graph?`, `failure`, `naming.ts`, `Shared Errors and Stock Transactions`, `drawings-workflow.ts`, `migrate.ts`, `server/src/index.ts`, `ref_node_crypto`, `drawings-core/src/index.ts`, `approval.ts`, `User Administration Services`, `unit/consumables.test.ts`, `insights.ts`, `drawings/app/[section]/page.tsx`, `drawings-images.test.ts`, `documents/[id]/page.tsx`, `drawings-core/src/drawings.ts`, `unit/drawings-files.test.ts`, `integration/drawings-files.test.ts`, `drawings-import-legacy.ts`, `drawings-requests.ts`, `contracts/src/index.ts`, `consumables/app/api/[...path]/route.ts`, `3. Spesifikasi per widget`, `integration/drawings-workflow.test.ts`, `Panduan agen untuk Plant Area System v2`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `AppError` (e.g. with `Cakupan graph proyek` and `15.2 Bacaan wajib sebelum menulis kode`) actually correct?**
  _`AppError` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `../../tsconfig.json`, `RFC-5987`, `RFC-4180` to the rest of the system?**
  _45 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Consumable Order Carts` be split into smaller, more focused modules?**
  _Cohesion score 0.10609756097560975 - nodes in this community are weakly interconnected._
- **Why does `@playwright/test` connect `test-gateway-recovery.ts` to `Identity`, `bag-bulk-selection.spec.ts`, `consumables-ui.spec.ts`, `drawings.spec.ts`, `test-operations.ts`, `ref_node_fs`, `package.json`, `summary.tsx`, `User Administration Services`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `BagMonitor()` (e.g. with `dismiss()` and `keyboard()`) actually correct?**
  _`BagMonitor()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **Should `Identity` be split into smaller, more focused modules?**
  _Cohesion score 0.0990990990990991 - nodes in this community are weakly interconnected._