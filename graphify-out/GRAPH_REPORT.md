# Graph Report - plant-area-system-v2  (2026-11-26)

## Corpus Check
- 377 files · ~288,020 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 37 file(s) not represented in the graph (top: (none) 12, .css 12, .conf 4)

## Summary
- 2774 nodes · 7024 edges · 187 communities (139 shown, 48 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 171 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3cf73c00`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- positionKey
- Plant Area System v2
- Consumable Order Carts
- test-gateway-recovery.ts
- ref_node_assert
- consumables/app/api/[...path]/route.ts
- ref_node_fs
- Consumable Order Carts
- drawing-form.tsx
- server/src/index.ts
- naming.ts
- app/workspace.tsx
- Repository Automation Scripts
- Icon
- Auth Application Dependencies
- Bag Application Dependencies
- Consumables Application Dependencies
- consumables-core/src/index.ts
- drawings-workflow.ts
- Portal Application Dependencies
- database-snapshot.ts
- ref_node_crypto
- db
- bag-core/src/index.ts
- dependencies
- compressImage
- Application Theme Layouts
- Consumables Inventory Schema
- User Administration Services
- documents.ts
- Compose Runtime Services
- insights.ts
- approval.ts
- Database Migration Containers
- Consumables Core Dependencies
- drawings-core/src/index.ts
- drawings-core/src/support.ts
- Continuous Integration Validation
- Auth Core Dependencies
- Shared TypeScript Configuration
- Container Build Arguments
- drawings
- drizzle-kit
- Bag Core Dependencies
- Shared UI Dependencies
- ref_node_url
- Nginx Service Routing
- Cross Application UI Design
- dev.ts
- drawings/app/api/[...path]/route.ts
- environment
- MySQL Credential Configuration
- Authentication Storage Schema
- Container Health Checks
- consumables.spec.ts
- unit/drawings-files.test.ts
- Server Package Dependencies
- pdf-viewer-core.tsx
- Auth TypeScript Configuration
- Bag TypeScript Configuration
- Consumables TypeScript Configuration
- Portal TypeScript Configuration
- Drawing Database v1 — PRD dan prompt implementasi
- Bag Installation Storage
- drawings-model.ts
- Domain Contract Dependencies
- integration/drawings-files.test.ts
- drawings-import-legacy.ts
- stock-summary.tsx
- contracts/src/index.ts
- requests.ts
- monitor.tsx
- drawings-core/package.json
- BagMonitor
- src/workspace.tsx
- hasPermission
- auth-core/src/index.ts
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
- overlay.tsx
- drawings-ops
- smoke-dev.ts
- Prompt: Portal setara gold standard Bag Filter
- integration/drawings-workflow.test.ts
- AppError
- Hasil validasi implementasi v2
- environment
- scripts
- AGENTS.md
- drawings/tsconfig.json
- Panduan agen untuk Plant Area System v2
- drawings-core/src/drawings.ts
- contracts/src/drawings.ts
- Consumable Room v1.1 R22
- services
- masters.ts
- generate-brand.mjs
- Runbook rilis Drawing Database v1
- 4. Alur kerja
- Q: `packages/ui/src/tokens.css` seharusnya jangan dilewati. lalu docs\testing dan `AppError` apakah itu penting sehingga harus dimasukkan dalam graph?
- drawings/app/health/live/route.ts
- CLAUDE.md
- Identity
- drawings.spec.ts
- 15. Prompt implementasi untuk developer
- integration/consumables.test.ts
- copy-pdfjs-assets.mjs
- package.json
- tokens.css
- drawing-view.tsx
- files.ts
- 6. File, storage dan stamp
- dashboard.tsx
- 8. Arsitektur dan integrasi platform
- consumables-ui.spec.ts
- Overlay
- index.tsx
- contracts.test.ts
- summary.tsx
- Desain: kompresi gambar Drawing Database ke WebP
- storage.ts
- admin/workspace.tsx
- drawings-images.test.ts
- canSeeWip
- 3. Spesifikasi per widget
- select-e2e.ts
- Health check, housekeeping, sertifikat
- PRD Plant Area System v2
- test-operations.ts
- health-check.sh
- Operasional produksi tq-cmms
- documents/[id]/page.tsx
- Backup, offsite, restore
- Insiden
- Migrasi database dan impor data
- Setup awal Antigravity CLI di VPS
- auth
- Handover OpenClaw update R22
- brand.tsx
- release
- drawings/app/health/ready/route.ts
- Update release dan rollback
- health-report.sh
- health-record.sh

## God Nodes (most connected - your core abstractions)
1. `AppError` - 196 edges
2. `Identity` - 62 edges
3. `Icon()` - 44 edges
4. `db()` - 43 edges
5. `BagMonitor()` - 41 edges
6. `pageIdentity()` - 38 edges
7. `Overlay()` - 36 edges
8. `canDraw()` - 36 edges
9. `mutate()` - 34 edges
10. `GET()` - 31 edges

## Surprising Connections (you probably didn't know these)
- `3. Skema` --references--> `cleanupStagedFiles()`  [INFERRED]
  docs/superpowers/specs/2026-11-21-drawings-image-compression-design.md → packages/drawings-core/src/files.ts
- `6.1 Upload dua tahap` --references--> `stampPdf()`  [INFERRED]
  docs/DRAWING-DATABASE-PRD.md → packages/drawings-core/src/pdf.ts
- `Cakupan graph proyek` --references--> `AppError`  [INFERRED]
  AGENTS.md → packages/contracts/src/index.ts
- `8.1 Bagian baru dan yang berubah` --references--> `DrawingsGrant`  [INFERRED]
  docs/DRAWING-DATABASE-PRD.md → packages/contracts/src/drawings.ts
- `8.1 Bagian baru dan yang berubah` --references--> `nextRevisionNo()`  [INFERRED]
  docs/DRAWING-DATABASE-PRD.md → packages/contracts/src/drawings-workflow.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Cross-application UI modernization** — docs_design_ui_audit_portal_consumables_operational_hub, docs_design_ui_audit_portal_consumables_reversible_overlays, docs_design_ui_audit_portal_consumables_accessible_design_tokens, docs_design_ui_audit_portal_consumables_shell_skeleton, docs_design_ui_audit_portal_consumables_stock_query_feedback, docs_design_ui_audit_portal_consumables_reversible_cart [EXTRACTED 1.00]

## Communities (187 total, 48 thin omitted)

### Community 0 - "positionKey"
Cohesion: 0.21
Nodes (21): BulkSelection(), BulkSelectionForm(), Props, areaPositions(), BagArea, Compartment, compartmentChoices(), compartmentOptions() (+13 more)

### Community 1 - "Plant Area System v2"
Cohesion: 0.22
Nodes (18): Panduan pembatalan record Bag Filter, Setup development MacBook, Native Mac development setup, Migrasi database lokal ke VPS, Single writer database cutover, Pengembangan lokal sampai pembaruan VPS, Handover OpenClaw database, Database migration checkpoints M0 M8 (+10 more)

### Community 2 - "Consumable Order Carts"
Cohesion: 0.10
Nodes (14): MaterialSearch(), OrderCart(), submit(), Picklist(), submit(), stockApi(), StockApiError, descriptions (+6 more)

### Community 3 - "test-gateway-recovery.ts"
Cohesion: 0.24
Nodes (8): actor, compose, docker(), inspect(), names, run, sentinels, services

### Community 4 - "ref_node_assert"
Cohesion: 0.17
Nodes (9): activeAgeSummary(), ageStops, bagAgeScaleDays, dataTextTone(), relativeLuminance(), actor, url, installed() (+1 more)

### Community 5 - "consumables/app/api/[...path]/route.ts"
Cohesion: 0.13
Nodes (31): Context, dynamic, GET(), json(), PATCH, POST, dateConditions(), documentDetail() (+23 more)

### Community 6 - "ref_node_fs"
Cohesion: 0.11
Nodes (10): pdfCompressionEnabled(), maxRasterSideForPages(), optimizePdfWithQpdf(), processPdf(), shouldKeepCompressed(), verifier, args, extra (+2 more)

### Community 7 - "Consumable Order Carts"
Cohesion: 0.14
Nodes (31): AddToOrder(), QuantityDialog(), createDocument(), replay(), readResult(), amount, canConsume(), canonicalDocumentPayload() (+23 more)

### Community 8 - "drawing-form.tsx"
Cohesion: 0.12
Nodes (14): DrawingForm(), Mode, options(), Person, Props, FileDrop(), ImageUpload(), Item (+6 more)

### Community 9 - "server/src/index.ts"
Cohesion: 0.11
Nodes (30): dynamic, POST(), dynamic, GET(), dynamic, GET(), dynamic, GET() (+22 more)

### Community 10 - "naming.ts"
Cohesion: 0.11
Nodes (20): dynamic, GET(), cache, closeConsumablesDb(), create(), getConsumablesDb(), importCatalog(), parseCatalog() (+12 more)

### Community 11 - "app/workspace.tsx"
Cohesion: 0.12
Nodes (28): AliasInput(), Loading(), AuditItem, ConsumablesWorkspace(), openMaterial(), Enrollment(), get(), InventoryEditor() (+20 more)

### Community 12 - "Repository Automation Scripts"
Cohesion: 0.06
Nodes (31): scripts, bootstrap, brand:generate, build, check:export, consumables:import, consumables:import-naming, consumables:preflight (+23 more)

### Community 13 - "Icon"
Cohesion: 0.13
Nodes (25): dynamic, Portal(), wibDateFormatter, Commit 2: `feat(portal): rebuild hub on the Bag Filter dashboard system`, AppId, formatRelativeWib(), PortalIconName, countScale() (+17 more)

### Community 14 - "Auth Application Dependencies"
Cohesion: 0.13
Nodes (20): dependencies, next@16.4.6, @plant/auth-core@workspace:*, @plant/contracts@workspace:*, @plant/server@workspace:*, @plant/ui@workspace:*, react@19.3.1, react-dom@19.3.1 (+12 more)

### Community 15 - "Bag Application Dependencies"
Cohesion: 0.10
Nodes (25): dependencies, next@16.4.6, @plant/bag-core@workspace:*, @plant/contracts@workspace:*, @plant/server@workspace:*, @plant/ui@workspace:*, react@19.3.1, react-dom@19.3.1 (+17 more)

### Community 16 - "Consumables Application Dependencies"
Cohesion: 0.10
Nodes (25): dependencies, next@16.4.6, @plant/consumables-core@workspace:*, @plant/contracts@workspace:*, @plant/server@workspace:*, @plant/ui@workspace:*, react@19.3.1, react-dom@19.3.1 (+17 more)

### Community 17 - "consumables-core/src/index.ts"
Cohesion: 0.12
Nodes (16): common, inventoryInput, materialInput, MoveKind, schemas, R22_ROOM_ID, Executor, invCols (+8 more)

### Community 18 - "drawings-workflow.ts"
Cohesion: 0.07
Nodes (25): IMAGE_MAX_PER_ITEM, RevisionStatus, ApprovalActionView, approvalDecisionSchema, ApprovalLevel, approvalLevels, approvalPlanSchema, ApprovalStep (+17 more)

### Community 19 - "Portal Application Dependencies"
Cohesion: 0.11
Nodes (22): dependencies, next@16.4.6, @plant/contracts@workspace:*, @plant/server@workspace:*, @plant/ui@workspace:*, react@19.3.1, react-dom@19.3.1, next (+14 more)

### Community 20 - "database-snapshot.ts"
Cohesion: 0.21
Nodes (11): args, capture(), compare(), databases, ephemeral, identifier(), migrationsHash(), walk() (+3 more)

### Community 21 - "ref_node_crypto"
Cohesion: 0.23
Nodes (9): 8.1 Bagian baru dan yang berubah, Grant, migrateConsumablesCatalog(), provision(), provisionConsumables(), migrateDrawingsCatalog(), provision(), provisionDrawings() (+1 more)

### Community 22 - "db"
Cohesion: 0.14
Nodes (23): listTasks(), DirectoryPerson, hacSuggestions(), otherHacLike(), approvalActions, approvalSteps, drawings, files (+15 more)

### Community 23 - "bag-core/src/index.ts"
Cohesion: 0.10
Nodes (38): Context, dynamic, GET(), json(), POST(), CancellationColumns, cancellationMetadata(), cancelReplacement() (+30 more)

### Community 24 - "dependencies"
Cohesion: 0.20
Nodes (10): dependencies, better-auth@1.7.12, drizzle-orm@0.45.4, mysql2@3.24.6, @plant/contracts@workspace:*, @plant/server@workspace:*, drizzle-orm, mysql2 (+2 more)

### Community 25 - "compressImage"
Cohesion: 0.40
Nodes (8): compressedName(), compressImage(), encode(), fitWithin(), keepOriginal(), add(), Task 6: Kompresi di browser dan thumbnail di UI, file()

### Community 26 - "Application Theme Layouts"
Cohesion: 0.09
Nodes (23): inter, Layout(), metadata, inter, Layout(), metadata, inter, Layout() (+15 more)

### Community 27 - "Consumables Inventory Schema"
Cohesion: 0.18
Nodes (19): `catalog_imports`, `consumables_audit`, consumables_audit_time_idx, `inventory`, inventory_location_idx, `locations`, material_category_idx, `materials` (+11 more)

### Community 28 - "User Administration Services"
Cohesion: 0.21
Nodes (25): Context, dynamic, GET(), POST(), getAuthDb(), auditEntry(), authAudit(), changePassword() (+17 more)

### Community 29 - "documents.ts"
Cohesion: 0.13
Nodes (17): date, docCols, DocumentConflict, header, hec, pickLine, qtyLine, requester (+9 more)

### Community 30 - "Compose Runtime Services"
Cohesion: 0.11
Nodes (18): image, init, networks, restart, name, networks, gateway, private (+10 more)

### Community 31 - "insights.ts"
Cohesion: 0.20
Nodes (22): dynamic, GET(), 1. Temuan dari screenshot dan source, 2. Tata letak baru, 4. Perubahan API (aditif), 6. Urutan pengerjaan (satu PR, commit bertahap), 7. Validasi, 8. Di luar cakupan (+14 more)

### Community 32 - "approval.ts"
Cohesion: 0.07
Nodes (6): Directory, drawingDetail(), inactiveAssignee(), Issued, rejectedOrder, taskOrder

### Community 33 - "Database Migration Containers"
Cohesion: 0.22
Nodes (9): entrypoint, environment, image, networks, restart, volumes, MYSQL_HOST, MYSQL_PWD (+1 more)

### Community 34 - "Consumables Core Dependencies"
Cohesion: 0.15
Nodes (16): dependencies, drizzle-orm@0.45.4, mysql2@3.24.6, @plant/contracts@workspace:*, zod@4.6.7, exports, ./import, ./schema (+8 more)

### Community 35 - "drawings-core/src/index.ts"
Cohesion: 0.12
Nodes (35): Task 3: Pemrosesan gambar dengan sharp, IMAGE_MAX_INPUT_PIXELS, IMAGE_MAX_SIDE, IMAGE_PASSTHROUGH_MAX_BYTES, PDF_COMPRESS_MIN_SAVING_BYTES, PDF_COMPRESS_MIN_SAVING_RATIO, PDF_IMAGE_MAX_MAX_SIDE, PDF_IMAGE_MAX_PIXELS (+27 more)

### Community 36 - "drawings-core/src/support.ts"
Cohesion: 0.14
Nodes (18): NotificationItem, notificationReadSchema, auditList(), drawingTimeline(), toTimeline(), listNotifications(), NotificationInput, toItem() (+10 more)

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

### Community 41 - "drawings"
Cohesion: 0.11
Nodes (20): condition, depends_on, depends_on, image, init, networks, restart, depends_on (+12 more)

### Community 43 - "Bag Core Dependencies"
Cohesion: 0.18
Nodes (13): dependencies, drizzle-orm@0.45.4, mysql2@3.24.6, @plant/contracts@workspace:*, exports, ./schema, drizzle-orm, mysql2 (+5 more)

### Community 44 - "Shared UI Dependencies"
Cohesion: 0.18
Nodes (13): dependencies, @plant/contracts@workspace:*, react@19.3.1, react-dom@19.3.1, exports, ./styles.css, @plant/contracts, react (+5 more)

### Community 45 - "ref_node_url"
Cohesion: 0.18
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

### Community 49 - "drawings/app/api/[...path]/route.ts"
Cohesion: 0.09
Nodes (15): Context, directory(), dynamic, GET(), imageVariant(), json(), PATCH, peopleOrNull() (+7 more)

### Community 50 - "environment"
Cohesion: 0.11
Nodes (30): environment, environment, command, depends_on, environment, image, networks, profiles (+22 more)

### Community 51 - "MySQL Credential Configuration"
Cohesion: 0.15
Nodes (13): AUTH_DB_PASSWORD, BAG_DB_PASSWORD, CONSUMABLES_DB_PASSWORD, DRAWINGS_DB_PASSWORD, MYSQL_ROOT_HOST, MYSQL_ROOT_PASSWORD, command, environment (+5 more)

### Community 52 - "Authentication Storage Schema"
Cohesion: 0.27
Nodes (11): account_user_idx, `accounts`, `app_grants`, `applications`, `auth_audit`, auth_audit_time_idx, `login_attempts`, session_user_idx (+3 more)

### Community 53 - "Container Health Checks"
Cohesion: 0.53
Nodes (12): healthcheck, healthcheck, healthcheck, healthcheck, interval, retries, start_period, test (+4 more)

### Community 54 - "consumables.spec.ts"
Cohesion: 0.11
Nodes (11): closeAuthDb(), @playwright/test, paths, users, admin, materials, post(), roleUsers (+3 more)

### Community 55 - "unit/drawings-files.test.ts"
Cohesion: 0.11
Nodes (26): maxPdfBytes(), fileNameFromHeader(), requireContentType(), requireUpload(), uploadLimit(), assertStampable(), clampText(), formatStampTime() (+18 more)

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

### Community 64 - "drawings-model.ts"
Cohesion: 0.05
Nodes (35): DrawingAccessFacts, DrawingCreateInput, drawingCreateSchema, DrawingListItem, drawingMetadataFields, DrawingPage, DrawingsMasters, DrawingUpdateInput (+27 more)

### Community 65 - "Domain Contract Dependencies"
Cohesion: 0.25
Nodes (8): dependencies, zod@4.6.7, exports, zod, name, private, type, version

### Community 66 - "integration/drawings-files.test.ts"
Cohesion: 0.11
Nodes (11): storageConfig(), cache, closeDrawingsDb(), create(), getDrawingsDb(), drawingsSchema, report, storage (+3 more)

### Community 67 - "drawings-import-legacy.ts"
Cohesion: 0.08
Nodes (14): RFC-4180, fieldsSchema, legacyImportKey(), LegacyImportOutcome, LegacyImportRow, legacyImportRow(), parseCsv(), args (+6 more)

### Community 68 - "stock-summary.tsx"
Cohesion: 0.13
Nodes (15): 3. Portal: hub yang tenang tapi berisi, dan siap untuk aplikasi baru, Kondisi sekarang, Kontrak ringkasan aplikasi (inti skalabilitas), Kriteria selesai (Portal), Prinsip desain, Tata letak target, movementLabels, StockActivity() (+7 more)

### Community 69 - "contracts/src/index.ts"
Cohesion: 0.07
Nodes (27): 3.6 Beban umur kritis per equipment (menggantikan "Per equipment"), 3.7 Spotlight "Prioritas tertinggi", bagAgeIntervalDays, BagAgeLoad, BagGrant, BagRole, bagRoles, bagWarningDays (+19 more)

### Community 70 - "requests.ts"
Cohesion: 0.11
Nodes (41): drawingsPermission(), drawingsRole(), DrawingPermissions, drawingPermissions(), canSeeRequest(), drafterDecisionSchema, DrawingsDashboard, hac (+33 more)

### Community 71 - "monitor.tsx"
Cohesion: 0.11
Nodes (27): BatchCancellationDialog(), BatchRecord, CancellationNotice(), CoordinateHistory(), TimelineItem, HistoryActions, HistoryItem, Batch (+19 more)

### Community 72 - "drawings-core/package.json"
Cohesion: 0.12
Nodes (21): dependencies, @aws-sdk/client-s3@3.1160.0, @cantoo/pdf-lib@2.11.1, drizzle-orm@0.45.4, mysql2@3.24.6, @plant/contracts@workspace:*, sharp@0.35.5, zod@4.6.7 (+13 more)

### Community 73 - "BagMonitor"
Cohesion: 0.17
Nodes (20): BagMonitor(), addPositions(), cellKey(), dismiss(), focus(), hover(), keyboard(), leaveHover() (+12 more)

### Community 74 - "src/workspace.tsx"
Cohesion: 0.17
Nodes (10): IconName, paths, App, Collapsible(), Item, NavigationTree(), SidebarNavigation(), Activity (+2 more)

### Community 75 - "hasPermission"
Cohesion: 0.25
Nodes (7): AuditList(), Event, Audit(), dynamic, dynamic, EquipmentPage(), hasPermission()

### Community 76 - "auth-core/src/index.ts"
Cohesion: 0.18
Nodes (14): buildAuth(), cache, createDatabase(), getAuthAdapterDb(), DirectoryEntry, account, applications, audit (+6 more)

### Community 77 - "Workspace Build Permissions"
Cohesion: 0.40
Nodes (4): allowBuilds, esbuild, sharp, packages

### Community 78 - "Source Formatting Configuration"
Cohesion: 0.40
Nodes (4): endOfLine, printWidth, singleQuote, trailingComma

### Community 107 - "requests-ui.tsx"
Cohesion: 0.06
Nodes (32): actionLabels, AuditList(), Item, Page, ApiError, getJson(), parse(), wib (+24 more)

### Community 116 - "overlay.tsx"
Cohesion: 0.49
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

### Community 121 - "AppError"
Cohesion: 0.16
Nodes (42): mutate(), AppError, attachImages(), bump(), cancelRevision(), checkRevision(), createRevision(), decideApproval() (+34 more)

### Community 122 - "Hasil validasi implementasi v2"
Cohesion: 0.24
Nodes (11): BrandLogo artwork pipeline, Identitas TQ-CMMS, Application context sidebar navigation, Perbaikan sidebar dan dashboard Consumables, Proportional count chart and compact Portal, Separate transaction chart semantics, UI refresh v2 Plant Area System, Reversible overlays and momentum gestures (+3 more)

### Community 123 - "environment"
Cohesion: 0.27
Nodes (13): environment, environment, DRAWINGS_DATABASE_URL, DRAWINGS_MAX_PDF_MB, DRAWINGS_PDF_COMPRESSION, DRAWINGS_S3_ACCESS_KEY_ID, DRAWINGS_S3_BUCKET, DRAWINGS_S3_ENDPOINT (+5 more)

### Community 124 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, start, typecheck

### Community 125 - "AGENTS.md"
Cohesion: 0.20
Nodes (7): Kontrak API v2, Idempotent Bag Filter batches, Session identity and exact origin, Whole batch cancellation, Global Constraints, Kompresi Gambar Drawing Database ke WebP — Implementation Plan, Pemeriksaan manual sebelum go-live

### Community 126 - "drawings/tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, allowJs, incremental, jsx, plugins, exclude, extends, include (+1 more)

### Community 127 - "Panduan agen untuk Plant Area System v2"
Cohesion: 0.22
Nodes (9): Agen di VPS produksi, Artefak Graphify bersama, Cakupan graph proyek, Dokumentasi library dan platform, Konteks proyek, Memakai Graphify pada sesi baru, Panduan agen untuk Plant Area System v2, Steps (+1 more)

### Community 128 - "drawings-core/src/drawings.ts"
Cohesion: 0.09
Nodes (16): countLibrary(), drawingDetailBase(), DrawingRow, libraryOwners(), libraryWhere(), listDrawings(), loadVisible(), otherHacsOf() (+8 more)

### Community 129 - "contracts/src/drawings.ts"
Cohesion: 0.15
Nodes (16): canOpenDrawingsSection(), DrawingsAction, drawingsActions, DrawingsGrant, drawingsNavigation(), DrawingsNavItem, drawingsPermissions, DrawingsPermissionValue (+8 more)

### Community 130 - "Consumable Room v1.1 R22"
Cohesion: 0.15
Nodes (19): R22 document API, Audit baseline Plant Area System, Legacy Vinext Cloudflare D1 export, Consumable Room v1.1 R22, Fixed point atomic stock documents, HAC SAC and mandatory Cost Center, Picklist K3 auto enrollment, R22 single shared stock (+11 more)

### Community 131 - "services"
Cohesion: 0.25
Nodes (7): networks, networks, networks, egress, services, drawings, drawings-ops

### Community 132 - "masters.ts"
Cohesion: 0.33
Nodes (9): createMaster(), labels, listMasters(), requireAdmin(), tables, toItem(), updateMaster(), disciplines (+1 more)

### Community 133 - "generate-brand.mjs"
Cohesion: 0.25
Nodes (5): [full, compact], outputs, revision, root, sources

### Community 134 - "Runbook rilis Drawing Database v1"
Cohesion: 0.33
Nodes (6): 1. Persiapan (tanpa downtime), 2. Jendela rilis, 3. Smoke test setelah rilis, 4. Rollback, 5. Pindah driver `fs` → `s3` (setelah go-live), Runbook rilis Drawing Database v1

### Community 135 - "4. Alur kerja"
Cohesion: 0.21
Nodes (12): cancelled(), 4.1 Status revisi, 4.2 Check dan approval plan, 4.3 Reject, perbaikan dan siklus, 4.4 Revisi baru dan Final Drawing (K7), 4.5 Upload Old Drawing (Legacy Ready), 4.6 Drawing Request, 4.7 Void dan pembatalan revisi (K9) (+4 more)

### Community 136 - "Q: `packages/ui/src/tokens.css` seharusnya jangan dilewati. lalu docs\testing dan `AppError` apakah itu penting sehingga harus dimasukkan dalam graph?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: `packages/ui/src/tokens.css` seharusnya jangan dilewati. lalu docs\testing dan `AppError` apakah itu penting sehingga harus dimasukkan dalam graph?, Source Nodes

### Community 143 - "Identity"
Cohesion: 0.07
Nodes (17): authSchema, bagSchema, equipmentCodes, Identity, better-auth, addFull(), area(), choose() (+9 more)

### Community 144 - "drawings.spec.ts"
Cohesion: 0.14
Nodes (8): 5. Data dan aturan bisnis, json(), operator, people, Person, png, suffix, version()

### Community 145 - "15. Prompt implementasi untuk developer"
Cohesion: 0.33
Nodes (6): 15.1 Peran dan tujuan, 15.3 Aturan kerja, 15.4 Fase, 15.5 Hal yang sering salah, 15.6 Laporan akhir tiap fase, 15. Prompt implementasi untuk developer

### Community 146 - "integration/consumables.test.ts"
Cohesion: 0.18
Nodes (17): mutate(), consumablesSchema, postMovement(), replay(), saveInventory(), saveMaterial(), code(), entry() (+9 more)

### Community 147 - "copy-pdfjs-assets.mjs"
Cohesion: 0.25
Nodes (6): app, marker, require, source, target, { version }

### Community 148 - "package.json"
Cohesion: 0.10
Nodes (26): devDependencies, @aws-sdk/client-s3@3.1160.0, @cantoo/pdf-lib@2.11.1, @playwright/test@1.64.1, prettier@3.9.10, sharp@0.35.5, tsx@4.23.15, @types/node@22.19.19 (+18 more)

### Community 149 - "tokens.css"
Cohesion: 0.20
Nodes (18): SIL Open Font License 1.1, Inter v4.1 Self-Hosted Font Asset, Bag age color scale, Brand color aliases, Design system cascade layers, Chart hatch patterns, Theme aware chart series, Component radius tokens (+10 more)

### Community 150 - "drawing-view.tsx"
Cohesion: 0.09
Nodes (37): ClampText(), formatWib(), newKey(), sendJson(), submit(), DrawingTitle(), DrawingView(), run() (+29 more)

### Community 151 - "files.ts"
Cohesion: 0.12
Nodes (29): RFC-5987, Review Focus, Task 1: Batas 10 gambar dan 25 MB, Task 2: Aturan murni gambar dan key thumbnail, Task 4: Simpan hasil konversi dan thumbnail, Task 5: Penyajian thumbnail dan cache gambar, Task 7: Anggaran container, build image, dokumentasi, Kondisi saat ini (+21 more)

### Community 152 - "6. File, storage dan stamp"
Cohesion: 0.40
Nodes (5): 6.1 Upload dua tahap, 6.2 Storage (K4), 6.3 Penyajian file, 6.4 Stamp approval (K6), 6. File, storage dan stamp

### Community 153 - "dashboard.tsx"
Cohesion: 0.20
Nodes (17): BagPriority, EquipmentCode, equipmentSideSummary(), formatDateWib(), hasWorkOrder(), brandColors, brandLabel(), compartmentCapacity() (+9 more)

### Community 154 - "8. Arsitektur dan integrasi platform"
Cohesion: 0.50
Nodes (4): 8.2 Database `plant_drawings`, 8.3 API, 8.4 Gateway, 8. Arsitektur dan integrasi platform

### Community 155 - "consumables-ui.spec.ts"
Cohesion: 0.12
Nodes (6): actor, temporary, types, year, actor, materials

### Community 156 - "Overlay"
Cohesion: 0.19
Nodes (10): Confirmation, ConfirmationOptions, ConfirmationProvider(), ConfirmFunction, DateTimeField(), fitTextarea(), highlight(), TimeColumn() (+2 more)

### Community 157 - "index.tsx"
Cohesion: 0.09
Nodes (34): ChangePassword(), dynamic, LoginForm(), PasswordForm(), dynamic, Login(), BagFilter(), dynamic (+26 more)

### Community 158 - "contracts.test.ts"
Cohesion: 0.21
Nodes (13): canonicalReplacement(), seedEquipment(), appCatalog, equipment, equipmentPositions(), sequence(), validateInstallationDate(), migrateBag() (+5 more)

### Community 159 - "summary.tsx"
Cohesion: 0.21
Nodes (6): dynamic, Page(), DrawingsSummary(), n(), series, ChartSeries

### Community 160 - "Desain: kompresi gambar Drawing Database ke WebP"
Cohesion: 0.12
Nodes (16): 1. Browser: kompresi sebelum upload, 3. Skema, 4. Penyajian dan cache, 5. Batas jumlah gambar, 6. Infra, 7. Dokumentasi, Anti-goal (gagal walau secara teknis jalan), Desain (+8 more)

### Community 161 - "storage.ts"
Cohesion: 0.09
Nodes (15): 2. Server: periksa, konversi bila perlu, buat thumbnail, StorageConfig, assertKey(), ByteRange, createStorage(), FsStorage, getStorage(), S3Storage (+7 more)

### Community 162 - "admin/workspace.tsx"
Cohesion: 0.16
Nodes (11): Application, Applications(), Admin(), dynamic, AdminWorkspace(), act(), ConsumablesAccess(), DrawingsAccess() (+3 more)

### Community 163 - "drawings-images.test.ts"
Cohesion: 0.20
Nodes (5): canvas(), clean, fixture(), sha(), vp8()

### Community 164 - "canSeeWip"
Cohesion: 1.00
Nodes (3): canSeeDrawing(), canSeeRevision(), canSeeWip()

### Community 166 - "3. Spesifikasi per widget"
Cohesion: 0.18
Nodes (11): 3.0 Grafik pemasangan, 3.10 Kartu Equipment bawah, 3.11 Format angka, 3.1 KPI rail, 3.2 Banner "Belum tercatat", 3.3 Kepatuhan WO (menggantikan "Cakupan pemasangan"), 3.4 Kompartemen paling kritis (menggantikan "Satu batch, banyak posisi"), 3.5 Indeks Kesehatan Bag (menggantikan gauge "Posisi terpasang") (+3 more)

### Community 167 - "select-e2e.ts"
Cohesion: 0.18
Nodes (14): Area, areaPaths, noBrowserImpact, selectE2e(), Selection, specAreas, changedSince(), decide() (+6 more)

### Community 169 - "Health check, housekeeping, sertifikat"
Cohesion: 0.29
Nodes (7): Disk penuh / housekeeping, Health check, Health check, housekeeping, sertifikat, Rutin lain yang layak dicek, Sertifikat, 6. Impor arsip Legacy Ready, status()

### Community 170 - "PRD Plant Area System v2"
Cohesion: 0.40
Nodes (5): Active installation age and yearly replacements, PRD Plant Area System v2, Six equipment coordinate catalog, Centralized Auth SSO guards, Portal Auth Bag Filter Consumables

### Community 171 - "test-operations.ts"
Cohesion: 0.33
Nodes (4): compose, docker(), persistedSql, run

### Community 172 - "health-check.sh"
Cohesion: 0.38
Nodes (4): dc.sh script, env_key(), probe(), health-check.sh script

### Community 173 - "Operasional produksi tq-cmms"
Cohesion: 0.29
Nodes (7): Batas keras, Gerbang otorisasi, Identitas produksi, Laporan, Mulai setiap sesi, Operasional produksi tq-cmms, Router tugas

### Community 174 - "documents/[id]/page.tsx"
Cohesion: 0.32
Nodes (4): dynamic, Page(), titles, PrintButton()

### Community 175 - "Backup, offsite, restore"
Cohesion: 0.33
Nodes (6): Backup, offsite, restore, Backup sesuai permintaan, Offsite, Pemulihan sebenarnya, Restore drill (target terpisah), Yang dibuat sidecar `backup`

### Community 176 - "Insiden"
Cohesion: 0.40
Nodes (5): Gejala umum, Insiden, Migrasi gagal, Perubahan tak dikenal di server, Urutan pertama

### Community 177 - "Migrasi database dan impor data"
Cohesion: 0.40
Nodes (5): Bukti untuk laporan, Drawing Database: rekonsiliasi, storage, impor legacy, Impor master Consumables (instalasi tanpa restore saja), Migrasi database dan impor data, Migrasi schema/data

### Community 178 - "Setup awal Antigravity CLI di VPS"
Cohesion: 0.40
Nodes (5): 1. Agy dan workspace, 2. Izin, 3. Timer health read-only, 4. Catat di HANDOVER-RESULT, Setup awal Antigravity CLI di VPS

### Community 179 - "auth"
Cohesion: 0.40
Nodes (5): image, init, networks, restart, auth

### Community 180 - "Handover OpenClaw update R22"
Cohesion: 0.40
Nodes (5): Portable schema and data fingerprint, CI verified full SHA release, Handover OpenClaw update R22, R22 production backup rehearsal, Disposable MySQL and HTTPS QA

### Community 181 - "brand.tsx"
Cohesion: 0.70
Nodes (3): brandRevision, compactArtwork, fullArtwork

### Community 182 - "release"
Cohesion: 0.40
Nodes (5): directory(), key(), ownerOf(), release(), v()

### Community 183 - "drawings/app/health/ready/route.ts"
Cohesion: 0.67
Nodes (3): dynamic, GET(), drawingsDatabaseReady()

### Community 184 - "Update release dan rollback"
Cohesion: 0.67
Nodes (3): Langkah, Rollback, Update release dan rollback

## Knowledge Gaps
- **45 isolated node(s):** `RFC-5987`, `../../tsconfig.json`, `RFC-4180`, `../../tsconfig.json`, `../../tsconfig.json` (+40 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1052 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **48 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AppError` connect `AppError` to `drawings-core/src/drawings.ts`, `masters.ts`, `consumables/app/api/[...path]/route.ts`, `Consumable Order Carts`, `drawing-form.tsx`, `server/src/index.ts`, `Q: `packages/ui/src/tokens.css` seharusnya jangan dilewati. lalu docs\testing dan `AppError` apakah itu penting sehingga harus dimasukkan dalam graph?`, `naming.ts`, `Identity`, `consumables-core/src/index.ts`, `integration/consumables.test.ts`, `drawings-workflow.ts`, `ref_node_crypto`, `drawing-view.tsx`, `bag-core/src/index.ts`, `db`, `files.ts`, `User Administration Services`, `documents.ts`, `contracts.test.ts`, `insights.ts`, `approval.ts`, `storage.ts`, `drawings-core/src/index.ts`, `drawings-core/src/support.ts`, `drawings-images.test.ts`, `documents/[id]/page.tsx`, `drawings/app/api/[...path]/route.ts`, `unit/drawings-files.test.ts`, `integration/drawings-files.test.ts`, `drawings-import-legacy.ts`, `contracts/src/index.ts`, `requests.ts`, `auth-core/src/index.ts`, `requests-ui.tsx`, `integration/drawings-workflow.test.ts`, `Panduan agen untuk Plant Area System v2`?**
  _High betweenness centrality (0.135) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `AppError` (e.g. with `Cakupan graph proyek` and `15.2 Bacaan wajib sebelum menulis kode`) actually correct?**
  _`AppError` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RFC-5987`, `../../tsconfig.json`, `RFC-4180` to the rest of the system?**
  _45 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Consumable Order Carts` be split into smaller, more focused modules?**
  _Cohesion score 0.0971322849213691 - nodes in this community are weakly interconnected._
- **Why does `Panduan agen untuk Plant Area System v2` connect `Panduan agen untuk Plant Area System v2` to `AGENTS.md`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Should `consumables/app/api/[...path]/route.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1282051282051282 - nodes in this community are weakly interconnected._
- **Why does `Cakupan graph proyek` connect `Panduan agen untuk Plant Area System v2` to `AppError`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._