# Graph Report - plant-area-system  (2026-11-21)

## Corpus Check
- 354 files · ~269,485 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 34 file(s) not represented in the graph (top: (none) 12, .css 12, .conf 4)

## Summary
- 2605 nodes · 6677 edges · 165 communities (118 shown, 47 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 138 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `5c55d8d2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- selection.ts
- Operasional pilot
- Consumable Order Carts
- packages_ui_src_index_button
- Identity
- integration/consumables.test.ts
- test-operations.ts
- Consumable Order Carts
- requests-ui.tsx
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
- database-snapshot.ts
- 8.1 Bagian baru dan yang berubah
- pageIdentity
- bag-core/src/index.ts
- dependencies
- AppError
- Application Theme Layouts
- Consumables Inventory Schema
- User Administration Services
- documents.ts
- Compose Runtime Services
- insights.ts
- ref_node_assert
- Database Migration Containers
- Consumables Core Dependencies
- drawings-core/src/index.ts
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
- approval.ts
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
- Review Focus
- Auth Migration Checkpoints
- Bag Migration Checkpoints
- Batch Cancellation Migration
- gesture.ts
- drawings-ops
- smoke-dev.ts
- Prompt: Portal setara gold standard Bag Filter
- integration/drawings-workflow.test.ts
- drawings/app/api/[...path]/route.ts
- Hasil validasi implementasi v2
- environment
- Desain
- Consumable Room v1.1 R22
- drawings/tsconfig.json
- Panduan agen untuk Plant Area System v2
- notifications.ts
- Identity
- Hasil validasi implementasi v2
- services
- contracts.test.ts
- drawings
- Runbook rilis Drawing Database v1
- 4. Alur kerja
- Q: `packages/ui/src/tokens.css` seharusnya jangan dilewati. lalu docs\testing dan `AppError` apakah itu penting sehingga harus dimasukkan dalam graph?
- drawings/app/health/live/route.ts
- CLAUDE.md
- ref_node_crypto
- drawings.spec.ts
- 15. Prompt implementasi untuk developer
- Plant Area System v2
- ref_node_fs
- package.json
- integration/drawings-files.test.ts
- Storage
- platform.test.ts
- 6. File, storage dan stamp
- drawings-migration.ts
- 8. Arsitektur dan integrasi platform
- engines
- bag-core/src/index.ts
- index.tsx
- Desain: kompresi gambar Drawing Database ke WebP
- image-upload.tsx
- AGENTS.md
- canSeeWip
- drawings-images.test.ts
- consumables.spec.ts

## God Nodes (most connected - your core abstractions)
1. `AppError` - 196 edges
2. `Identity` - 61 edges
3. `react` - 49 edges
4. `db()` - 43 edges
5. `BagMonitor()` - 40 edges
6. `pageIdentity()` - 38 edges
7. `Icon()` - 37 edges
8. `canDraw()` - 34 edges
9. `mutate()` - 34 edges
10. `Heading()` - 33 edges

## Surprising Connections (you probably didn't know these)
- `Pengujian` --references--> `needsConversion()`  [INFERRED]
  docs/superpowers/specs/2026-11-21-drawings-image-compression-design.md → packages/drawings-core/src/images.ts
- `8.1 Bagian baru dan yang berubah` --references--> `DrawingsGrant`  [INFERRED]
  docs/DRAWING-DATABASE-PRD.md → packages/contracts/src/drawings.ts
- `Cakupan graph proyek` --references--> `AppError`  [INFERRED]
  AGENTS.md → packages/contracts/src/index.ts
- `3. Skema` --references--> `cleanupStagedFiles()`  [INFERRED]
  docs/superpowers/specs/2026-11-21-drawings-image-compression-design.md → packages/drawings-core/src/files.ts
- `Kontrak ringkasan aplikasi (inti skalabilitas)` --references--> `drawing()`  [INFERRED]
  docs/design/UI-FOLLOWUP-FONT-PORTAL-MENU.md → tests/unit/drawings-model.test.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Cross-application UI modernization** — docs_design_ui_audit_portal_consumables_operational_hub, docs_design_ui_audit_portal_consumables_reversible_overlays, docs_design_ui_audit_portal_consumables_accessible_design_tokens, docs_design_ui_audit_portal_consumables_shell_skeleton, docs_design_ui_audit_portal_consumables_stock_query_feedback, docs_design_ui_audit_portal_consumables_reversible_cart [EXTRACTED 1.00]

## Communities (165 total, 47 thin omitted)

### Community 0 - "selection.ts"
Cohesion: 0.23
Nodes (19): BulkSelection(), BulkSelectionForm(), Props, areaPositions(), BagArea, Compartment, compartmentChoices(), compartmentOptions() (+11 more)

### Community 1 - "Operasional pilot"
Cohesion: 0.22
Nodes (14): Migrasi database lokal ke VPS, Single writer database cutover, Handover OpenClaw database, Database migration checkpoints M0 M8, Deployment checkpoints C0 C12, Handover OpenClaw deployment, Deployment VPS tq-cmms.com, VPS resource budget and serial builds (+6 more)

### Community 2 - "Consumable Order Carts"
Cohesion: 0.13
Nodes (7): MaterialSearch(), OrderCart(), Picklist(), stockApi(), StockApiError, useCartFeedback(), Toast()

### Community 3 - "packages_ui_src_index_button"
Cohesion: 0.26
Nodes (7): FileDrop(), formatSize(), PdfUpload(), Staged, PdfViewerProps, PdfViewer(), Core

### Community 4 - "Identity"
Cohesion: 0.06
Nodes (17): closeAuthDb(), authSchema, equipmentCodes, Identity, better-auth, @playwright/test, paths, actor (+9 more)

### Community 5 - "integration/consumables.test.ts"
Cohesion: 0.18
Nodes (17): mutate(), consumablesSchema, postMovement(), replay(), saveInventory(), saveMaterial(), code(), entry() (+9 more)

### Community 6 - "test-operations.ts"
Cohesion: 0.15
Nodes (5): args, compose, docker(), persistedSql, run

### Community 7 - "Consumable Order Carts"
Cohesion: 0.13
Nodes (33): AddToOrder(), QuantityDialog(), createDocument(), replay(), readResult(), parseNamingCsv(), amount, canConsume() (+25 more)

### Community 8 - "requests-ui.tsx"
Cohesion: 0.04
Nodes (60): actionLabels, AuditList(), Item, Page, ClampText(), ApiError, formatWib(), getJson() (+52 more)

### Community 9 - "server/src/index.ts"
Cohesion: 0.17
Nodes (19): dynamic, GET(), dynamic, GET(), dynamic, GET(), dynamic, GET (+11 more)

### Community 10 - "naming.ts"
Cohesion: 0.14
Nodes (14): dynamic, GET(), cache, closeConsumablesDb(), create(), getConsumablesDb(), importCatalog(), parseCatalog() (+6 more)

### Community 11 - "Consumables Workspace Controls"
Cohesion: 0.09
Nodes (43): BatchCancellationDialog(), AliasInput(), AuditItem, ConsumablesWorkspace(), openMaterial(), Enrollment(), get(), InventoryEditor() (+35 more)

### Community 12 - "Repository Automation Scripts"
Cohesion: 0.06
Nodes (31): scripts, bootstrap, brand:generate, build, check:export, consumables:import, consumables:import-naming, consumables:preflight (+23 more)

### Community 13 - "Icon"
Cohesion: 0.06
Nodes (64): OverviewMap(), Commit 2: `feat(portal): rebuild hub on the Bag Filter dashboard system`, 3. Portal: hub yang tenang tapi berisi, dan siap untuk aplikasi baru, Kondisi sekarang, Kontrak ringkasan aplikasi (inti skalabilitas), Kriteria selesai (Portal), Prinsip desain, Tata letak target (+56 more)

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

### Community 18 - "drawings-workflow.ts"
Cohesion: 0.07
Nodes (25): IMAGE_MAX_PER_ITEM, RevisionStatus, ApprovalActionView, approvalDecisionSchema, ApprovalLevel, approvalLevels, approvalPlanSchema, ApprovalStep (+17 more)

### Community 19 - "Portal Application Dependencies"
Cohesion: 0.11
Nodes (22): dependencies, next@16.4.2, @plant/contracts@workspace:*, @plant/server@workspace:*, @plant/ui@workspace:*, react@19.3.1, react-dom@19.3.1, next (+14 more)

### Community 20 - "database-snapshot.ts"
Cohesion: 0.21
Nodes (11): args, capture(), compare(), databases, ephemeral, identifier(), migrationsHash(), walk() (+3 more)

### Community 21 - "8.1 Bagian baru dan yang berubah"
Cohesion: 0.43
Nodes (5): 8.1 Bagian baru dan yang berubah, Grant, migrateConsumablesCatalog(), provision(), provisionConsumables()

### Community 22 - "pageIdentity"
Cohesion: 0.07
Nodes (40): AuditList(), Event, Audit(), dynamic, BagFilter(), dynamic, dynamic, Page() (+32 more)

### Community 23 - "bag-core/src/index.ts"
Cohesion: 0.13
Nodes (22): Context, dynamic, GET(), json(), POST(), dynamic, EquipmentPage(), auditHistory() (+14 more)

### Community 24 - "dependencies"
Cohesion: 0.11
Nodes (18): dependencies, better-auth@1.7.12, drizzle-orm@0.45.4, mysql2@3.24.6, @plant/auth-core@workspace:*, @plant/bag-core@workspace:*, @plant/consumables-core@workspace:*, @plant/contracts@workspace:* (+10 more)

### Community 25 - "AppError"
Cohesion: 0.11
Nodes (56): json(), mutate(), replayable(), AppError, attachImages(), bump(), cancelRevision(), checkRevision() (+48 more)

### Community 26 - "Application Theme Layouts"
Cohesion: 0.07
Nodes (37): inter, Layout(), metadata, inter, Layout(), metadata, inter, Layout() (+29 more)

### Community 27 - "Consumables Inventory Schema"
Cohesion: 0.18
Nodes (19): `catalog_imports`, `consumables_audit`, consumables_audit_time_idx, `inventory`, inventory_location_idx, `locations`, material_category_idx, `materials` (+11 more)

### Community 28 - "User Administration Services"
Cohesion: 0.23
Nodes (23): Context, dynamic, GET(), POST(), getAuthDb(), auditEntry(), authAudit(), changePassword() (+15 more)

### Community 29 - "documents.ts"
Cohesion: 0.11
Nodes (22): date, docCols, DocumentConflict, header, hec, pickLine, qtyLine, requester (+14 more)

### Community 30 - "Compose Runtime Services"
Cohesion: 0.10
Nodes (19): command, depends_on, image, networks, profiles, name, networks, gateway (+11 more)

### Community 31 - "insights.ts"
Cohesion: 0.29
Nodes (14): dynamic, GET(), createDatabase(), getBagDb(), activity(), ageTones, allowed(), dashboard() (+6 more)

### Community 33 - "Database Migration Containers"
Cohesion: 0.22
Nodes (9): entrypoint, environment, image, networks, restart, volumes, MYSQL_HOST, MYSQL_PWD (+1 more)

### Community 34 - "Consumables Core Dependencies"
Cohesion: 0.15
Nodes (16): dependencies, drizzle-orm@0.45.4, mysql2@3.24.6, @plant/contracts@workspace:*, zod@4.5.4, exports, ./import, ./schema (+8 more)

### Community 35 - "drawings-core/src/index.ts"
Cohesion: 0.07
Nodes (64): dynamic, GET(), RFC-4180, RFC-5987, Task 3: Pemrosesan gambar dengan sharp, Task 4: Simpan hasil konversi dan thumbnail, Task 5: Penyajian thumbnail dan cache gambar, Kondisi saat ini (+56 more)

### Community 36 - "S3Storage"
Cohesion: 0.27
Nodes (3): 2. Server: periksa, konversi bila perlu, buat thumbnail, assertKey(), S3Storage

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
Cohesion: 0.24
Nodes (17): apps, compose(), cores, databases, databaseUrls(), docker(), execute(), exists() (+9 more)

### Community 49 - "approval.ts"
Cohesion: 0.05
Nodes (25): Directory, Issued, rejectedOrder, taskOrder, DirectoryPerson, DrawingRow, RevisionRow, WipScope (+17 more)

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
Nodes (28): clampScale(), describe(), Failure, PdfViewerCore(), presets, dependencies, next@16.4.2, pdfjs-dist@6.4.299 (+20 more)

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
Cohesion: 0.11
Nodes (7): args, dryRun, offline, report, Result, started, sha

### Community 68 - "requests.ts"
Cohesion: 0.11
Nodes (43): canDraw(), drawingsPermission(), drawingsRole(), DrawingPermissions, drawingPermissions(), canSeeRequest(), drafterDecisionSchema, DrawingsDashboard (+35 more)

### Community 69 - "contracts/src/index.ts"
Cohesion: 0.08
Nodes (28): ageStops, AppId, bagAgeIntervalDays, bagColor(), BagGrant, BagRole, bagRoles, cancellationSchema (+20 more)

### Community 70 - "FsStorage"
Cohesion: 0.29
Nodes (4): FsStorage, file(), imageFixture(), sha()

### Community 71 - "monitor.tsx"
Cohesion: 0.12
Nodes (18): activeAgeSummary(), BatchRecord, CancellationNotice(), CoordinateHistory(), TimelineItem, Batch, Installed, MarqueeDrag (+10 more)

### Community 72 - "drawings-core/package.json"
Cohesion: 0.12
Nodes (20): dependencies, @aws-sdk/client-s3@3.1160.0, @cantoo/pdf-lib@2.11.1, drizzle-orm@0.45.4, mysql2@3.24.6, @plant/contracts@workspace:*, sharp@0.35.5, zod@4.5.4 (+12 more)

### Community 73 - "BagMonitor"
Cohesion: 0.19
Nodes (17): BagMonitor(), addPositions(), cellKey(), dismiss(), focus(), hover(), keyboard(), leaveHover() (+9 more)

### Community 74 - "consumables/app/api/[...path]/route.ts"
Cohesion: 0.13
Nodes (30): Context, dynamic, GET(), json(), PATCH, POST, dateConditions(), documentDetail() (+22 more)

### Community 75 - "Consumables Application Container"
Cohesion: 0.40
Nodes (5): image, init, networks, restart, consumables

### Community 76 - "platform.test.ts"
Cohesion: 0.15
Nodes (17): buildAuth(), cache, createDatabase(), getAuthAdapterDb(), decodeGrant(), DirectoryEntry, account, applications (+9 more)

### Community 77 - "Workspace Build Permissions"
Cohesion: 0.40
Nodes (4): allowBuilds, esbuild, sharp, packages

### Community 78 - "Source Formatting Configuration"
Cohesion: 0.40
Nodes (4): endOfLine, printWidth, singleQuote, trailingComma

### Community 107 - "Review Focus"
Cohesion: 0.25
Nodes (7): Global Constraints, Kompresi Gambar Drawing Database ke WebP — Implementation Plan, Pemeriksaan manual sebelum go-live, Review Focus, Task 1: Batas 10 gambar dan 25 MB, Task 2: Aturan murni gambar dan key thumbnail, Task 7: Anggaran container, build image, dokumentasi

### Community 116 - "gesture.ts"
Cohesion: 0.42
Nodes (7): project(), record(), rubberband(), Sample, shouldDismiss(), spring(), velocity()

### Community 117 - "drawings-ops"
Cohesion: 0.14
Nodes (14): depends_on, mysql, depends_on, image, networks, profiles, volumes, command (+6 more)

### Community 118 - "smoke-dev.ts"
Cohesion: 0.39
Nodes (6): docker(), exists(), parseEnv(), root, run, verifyIsolatedRuntime()

### Community 119 - "Prompt: Portal setara gold standard Bag Filter"
Cohesion: 0.17
Nodes (12): 1. Tujuan, 2. Batasan, 3. Hasil audit: Portal dibanding gold standard, 4. Rancangan target (≥1536 px), 5. Langkah implementasi, 6. Kriteria penerimaan, 7. Laporan, 8. Keputusan yang diambil dalam brief ini (dapat dibatalkan pengguna) (+4 more)

### Community 120 - "integration/drawings-workflow.test.ts"
Cohesion: 0.08
Nodes (7): directory(), key(), ownerOf(), people, release(), u, v()

### Community 121 - "drawings/app/api/[...path]/route.ts"
Cohesion: 0.08
Nodes (40): Context, directory(), dynamic, GET(), imageVariant(), PATCH, peopleOrNull(), POST (+32 more)

### Community 122 - "Hasil validasi implementasi v2"
Cohesion: 0.31
Nodes (9): BrandLogo artwork pipeline, Identitas TQ-CMMS, Application context sidebar navigation, Perbaikan sidebar dan dashboard Consumables, Proportional count chart and compact Portal, Separate transaction chart semantics, UI refresh v2 Plant Area System, Reversible overlays and momentum gestures (+1 more)

### Community 123 - "environment"
Cohesion: 0.31
Nodes (11): environment, environment, DRAWINGS_MAX_PDF_MB, DRAWINGS_S3_ACCESS_KEY_ID, DRAWINGS_S3_BUCKET, DRAWINGS_S3_ENDPOINT, DRAWINGS_S3_FORCE_PATH_STYLE, DRAWINGS_S3_REGION (+3 more)

### Community 124 - "Desain"
Cohesion: 0.29
Nodes (7): 1. Browser: kompresi sebelum upload, 3. Skema, 4. Penyajian dan cache, 5. Batas jumlah gambar, 6. Infra, 7. Dokumentasi, Desain

### Community 125 - "Consumable Room v1.1 R22"
Cohesion: 0.18
Nodes (13): R22 document API, Consumable Room v1.1 R22, HAC SAC and mandatory Cost Center, Picklist K3 auto enrollment, R22 single shared stock, Prompt revisi alur bisnis R22, Warehouse R22 Client material flow, R22 single room preflight (+5 more)

### Community 126 - "drawings/tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, allowJs, incremental, jsx, plugins, exclude, extends, include (+1 more)

### Community 127 - "Panduan agen untuk Plant Area System v2"
Cohesion: 0.25
Nodes (8): Artefak Graphify bersama, Cakupan graph proyek, Dokumentasi library dan platform, Konteks proyek, Memakai Graphify pada sesi baru, Panduan agen untuk Plant Area System v2, Steps, Validasi perubahan

### Community 128 - "notifications.ts"
Cohesion: 0.21
Nodes (13): NotificationItem, notificationReadSchema, auditList(), drawingTimeline(), toTimeline(), listNotifications(), markNotificationsRead(), NotificationInput (+5 more)

### Community 129 - "Identity"
Cohesion: 0.14
Nodes (17): canOpenDrawingsSection(), DrawingsAction, drawingsActions, DrawingsGrant, drawingsNavigation(), DrawingsNavItem, drawingsPermissions, DrawingsPermissionValue (+9 more)

### Community 130 - "Hasil validasi implementasi v2"
Cohesion: 0.23
Nodes (13): Portable schema and data fingerprint, Pengembangan lokal sampai pembaruan VPS, CI verified full SHA release, Handover OpenClaw update R22, R22 production backup rehearsal, Upgrade Consumable Room R22, Private atomic naming CSV import, Rencana implementasi R22 (+5 more)

### Community 131 - "services"
Cohesion: 0.25
Nodes (7): networks, networks, networks, egress, services, drawings, drawings-ops

### Community 132 - "contracts.test.ts"
Cohesion: 0.20
Nodes (14): canonicalReplacement(), seedEquipment(), compartmentFromLabel(), equipmentPositions(), replacementSchema, rowDividerBefore(), validateInstallationDate(), validPosition() (+6 more)

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

### Community 143 - "ref_node_crypto"
Cohesion: 0.13
Nodes (12): closeBagDb(), bagSchema, createReplacement(), addFull(), area(), choose(), openBulk(), users (+4 more)

### Community 144 - "drawings.spec.ts"
Cohesion: 0.13
Nodes (8): 5. Data dan aturan bisnis, json(), operator, people, Person, png, suffix, version()

### Community 145 - "15. Prompt implementasi untuk developer"
Cohesion: 0.33
Nodes (6): 15.1 Peran dan tujuan, 15.3 Aturan kerja, 15.4 Fase, 15.5 Hal yang sering salah, 15.6 Laporan akhir tiap fase, 15. Prompt implementasi untuk developer

### Community 146 - "Plant Area System v2"
Cohesion: 0.40
Nodes (6): Audit baseline Plant Area System, Legacy Vinext Cloudflare D1 export, Setup development MacBook, Native Mac development setup, Plant Area System v2, plant-v2-dev isolated development

### Community 147 - "ref_node_fs"
Cohesion: 0.14
Nodes (7): verifier, [full, compact], outputs, revision, root, sources, extra

### Community 148 - "package.json"
Cohesion: 0.11
Nodes (24): devDependencies, @aws-sdk/client-s3@3.1160.0, @cantoo/pdf-lib@2.11.1, @playwright/test@1.64.1, prettier@3.9.10, sharp@0.35.5, tsx@4.23.15, @types/node@22.19.19 (+16 more)

### Community 149 - "integration/drawings-files.test.ts"
Cohesion: 0.09
Nodes (7): storageConfig(), drawingsSchema, report, storage, withHash, dryRun, summary

### Community 151 - "platform.test.ts"
Cohesion: 0.12
Nodes (13): dynamic, POST(), dynamic, GET(), 15.2 Bacaan wajib sebelum menulis kode, getAuth(), publicOrigin(), login() (+5 more)

### Community 152 - "6. File, storage dan stamp"
Cohesion: 0.40
Nodes (5): 6.1 Upload dua tahap, 6.2 Storage (K4), 6.3 Penyajian file, 6.4 Stamp approval (K6), 6. File, storage dan stamp

### Community 153 - "drawings-migration.ts"
Cohesion: 0.60
Nodes (3): migrateDrawingsCatalog(), provision(), provisionDrawings()

### Community 154 - "8. Arsitektur dan integrasi platform"
Cohesion: 0.50
Nodes (4): 8.2 Database `plant_drawings`, 8.3 API, 8.4 Gateway, 8. Arsitektur dan integrasi platform

### Community 156 - "bag-core/src/index.ts"
Cohesion: 0.18
Nodes (16): CancellationColumns, cancellationMetadata(), cancelReplacement(), errorCode(), cache, codeOf(), Cursor, likeText() (+8 more)

### Community 157 - "index.tsx"
Cohesion: 0.09
Nodes (31): ChangePassword(), dynamic, LoginForm(), PasswordForm(), dynamic, Login(), Loading(), Loading() (+23 more)

### Community 160 - "Desain: kompresi gambar Drawing Database ke WebP"
Cohesion: 0.22
Nodes (9): Anti-goal (gagal walau secara teknis jalan), Desain: kompresi gambar Drawing Database ke WebP, Diserahkan ke builder, Keputusan builder (dibuat saat desain, dapat dikoreksi), Maksud, Non-goal, Pendekatan yang dipertimbangkan, Pengujian (+1 more)

### Community 161 - "image-upload.tsx"
Cohesion: 0.27
Nodes (10): compressedName(), compressImage(), encode(), fitWithin(), keepOriginal(), ImageUpload(), add(), Item (+2 more)

### Community 162 - "AGENTS.md"
Cohesion: 0.22
Nodes (7): Kontrak API v2, Idempotent Bag Filter batches, Session identity and exact origin, Panduan pembatalan record Bag Filter, Whole batch cancellation, Fixed point atomic stock documents, Deterministic document lock ordering

### Community 164 - "canSeeWip"
Cohesion: 1.00
Nodes (3): canSeeDrawing(), canSeeRevision(), canSeeWip()

### Community 165 - "drawings-images.test.ts"
Cohesion: 0.20
Nodes (5): canvas(), clean, fixture(), sha(), vp8()

### Community 166 - "consumables.spec.ts"
Cohesion: 0.29
Nodes (6): admin, materials, post(), roleUsers, save(), suffix

## Knowledge Gaps
- **45 isolated node(s):** `RFC-5987`, `../../tsconfig.json`, `RFC-4180`, `../../tsconfig.json`, `../../tsconfig.json` (+40 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 999 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **47 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AppError` connect `AppError` to `notifications.ts`, `contracts.test.ts`, `integration/consumables.test.ts`, `Identity`, `Consumable Order Carts`, `requests-ui.tsx`, `server/src/index.ts`, `Q: `packages/ui/src/tokens.css` seharusnya jangan dilewati. lalu docs\testing dan `AppError` apakah itu penting sehingga harus dimasukkan dalam graph?`, `naming.ts`, `drawings-requests.test.ts`, `ref_node_crypto`, `Shared Errors and Stock Transactions`, `drawings-workflow.ts`, `integration/drawings-files.test.ts`, `pageIdentity`, `bag-core/src/index.ts`, `platform.test.ts`, `bag-core/src/index.ts`, `User Administration Services`, `documents.ts`, `insights.ts`, `drawings-core/src/index.ts`, `drawings-images.test.ts`, `approval.ts`, `unit/drawings-files.test.ts`, `drawings-import-legacy.ts`, `requests.ts`, `contracts/src/index.ts`, `consumables/app/api/[...path]/route.ts`, `platform.test.ts`, `integration/drawings-workflow.test.ts`, `drawings/app/api/[...path]/route.ts`, `Panduan agen untuk Plant Area System v2`?**
  _High betweenness centrality (0.087) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `AppError` (e.g. with `Cakupan graph proyek` and `15.2 Bacaan wajib sebelum menulis kode`) actually correct?**
  _`AppError` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-5987`, `../../tsconfig.json`, `RFC-4180` to the rest of the system?**
  _45 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Consumable Order Carts` be split into smaller, more focused modules?**
  _Cohesion score 0.1265597147950089 - nodes in this community are weakly interconnected._
- **Why does `Identity` connect `Identity` to `notifications.ts`, `Identity`, `Consumable Order Carts`, `contracts.test.ts`, `integration/consumables.test.ts`, `Consumable Order Carts`, `server/src/index.ts`, `Consumables Workspace Controls`, `Icon`, `drawings-requests.test.ts`, `ref_node_crypto`, `drawings.spec.ts`, `Shared Errors and Stock Transactions`, `integration/drawings-files.test.ts`, `bag-core/src/index.ts`, `platform.test.ts`, `AppError`, `bag-core/src/index.ts`, `documents.ts`, `index.tsx`, `insights.ts`, `User Administration Services`, `drawings-core/src/index.ts`, `consumables.spec.ts`, `approval.ts`, `unit/drawings-files.test.ts`, `drawings-core/src/drawings.ts`, `Gateway Recovery Verification`, `drawings-import-legacy.ts`, `requests.ts`, `contracts/src/index.ts`, `consumables/app/api/[...path]/route.ts`, `platform.test.ts`, `integration/drawings-workflow.test.ts`, `drawings/app/api/[...path]/route.ts`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Should `Identity` be split into smaller, more focused modules?**
  _Cohesion score 0.06262626262626263 - nodes in this community are weakly interconnected._
- **Why does `3. Portal: hub yang tenang tapi berisi, dan siap untuk aplikasi baru` connect `Icon` to `Cross Application UI Design`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._