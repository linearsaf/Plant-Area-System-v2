# Graph Report - plant-area-system-v2  (2026-11-27)

## Corpus Check
- 390 files · ~306,725 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 37 file(s) not represented in the graph (top: (none) 12, .css 12, .conf 4)

## Summary
- 2864 nodes · 7310 edges · 172 communities (123 shown, 49 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 178 edges (avg confidence: 0.92)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Drawings UI and Audit Views
- Consumables Management and Loans UI
- bag-core/src/index.ts
- Auth Forms and Account Pages
- Consumable Order Carts and Search
- Consumables API Route Handlers
- Consumables Document and Loan Services
- drawings/app/api/[...path]/route.ts
- approval.ts
- drawings-core/src/drawings.ts
- Icon
- Application Theme Layouts
- AppError
- Next.js Application Configuration
- Identity
- Bag Filter Dashboard and Polish
- integration/drawings-workflow.test.ts
- requests.ts
- drawings-core/src/index.ts
- drawings-model.ts
- Drawings Storage and Runtime Utilities
- pdf-viewer-core.tsx
- BagMonitor
- storage.ts
- Consumables Domain Contracts
- server/src/index.ts
- drawings-import-legacy.ts
- Repository Automation Scripts
- contracts/src/index.ts
- auth-core/src/index.ts
- integration/drawings-files.test.ts
- environment
- Cross Application UI Design
- Continuous Integration Validation
- monitor.tsx
- naming.ts
- unit/drawings-files.test.ts
- package.json
- drawings-workflow.ts
- Bag Application Dependencies
- Consumables Application Dependencies
- insights.ts
- files.ts
- User Administration Services
- positionKey
- Portal Application Dependencies
- drawings-core/package.json
- Auth Application Dependencies
- Consumables Inventory Schema
- drawings
- Consumable Room v1.1 R22
- ref_node_crypto
- Drawings Library and Detail Views
- admin/workspace.tsx
- Compose Runtime Services
- Drawings Image Compression Pipeline
- Consumables Core Dependencies
- contracts/src/drawings.ts
- select-e2e.ts
- Container Build Arguments
- Auth Core Dependencies
- Shared TypeScript Configuration
- Application Root Entry Pages
- Nginx Service Routing
- Plant Area System v2
- Desain: kompresi gambar Drawing Database ke WebP
- Consumables End-to-End Tests
- consumables-ui.spec.ts
- drawings-ops
- Drawing Database v1 — PRD dan prompt implementasi
- Bag Core Dependencies
- Shared UI Dependencies
- drawings.spec.ts
- environment
- MySQL Credential Configuration
- Prompt: Portal setara gold standard Bag Filter
- database-snapshot.ts
- Hasil validasi implementasi v2
- Container Health Checks
- Authentication Storage Schema
- hasPermission
- Handover OpenClaw update R22
- Server Package Dependencies
- Auth TypeScript Configuration
- Bag TypeScript Configuration
- documents/[id]/page.tsx
- Consumables TypeScript Configuration
- compressImage
- drawings/tsconfig.json
- Portal TypeScript Configuration
- dependencies
- overlay.tsx
- test-gateway-recovery.ts
- AGENTS.md
- Panduan agen untuk Plant Area System v2
- Database Migration Containers
- Bag Installation Storage
- Domain Contract Dependencies
- masters.ts
- services
- Platform Integration Tests
- Drawings Role and Visibility Rules
- Health check, housekeeping, sertifikat
- health-check.sh
- Operasional produksi tq-cmms
- Drawings Access Integration Tests
- Backup, offsite, restore
- Runbook rilis Drawing Database v1
- 15. Prompt implementasi untuk developer
- drizzle-kit
- Fixed-Point Quantity Arithmetic
- Insiden
- Migrasi database dan impor data
- Setup awal Antigravity CLI di VPS
- scripts
- auth
- 6. File, storage dan stamp
- PRD Plant Area System v2
- Q: `packages/ui/src/tokens.css` seharusnya jangan dilewati. lalu docs\testing dan `AppError` apakah itu penting sehingga harus dimasukkan dalam graph?
- Workspace Build Permissions
- Source Formatting Configuration
- Drawing Revision Viewer Route
- 8. Arsitektur dan integrasi platform
- Update release dan rollback
- health-report.sh
- Consumables Liveness Endpoint
- drawings/app/health/live/route.ts
- Portal Readiness Endpoint
- R22 Work Area Loans Migration
- Shared Pool Umum R22
- health-record.sh
- Application Brand Symbol
- Application Brand Symbol
- Application Brand Symbol
- Application Brand Symbol
- Expanded Brand Wordmark
- Compact Brand Symbol
- CLAUDE.md
- TLS Certificate Setup
- Database Backup Shell
- Database Initialization Shell
- Auth Migration Checkpoints
- Bag Migration Checkpoints
- Batch Cancellation Migration

## God Nodes (most connected - your core abstractions)
1. `AppError` - 173 edges
2. `Identity` - 66 edges
3. `db()` - 43 edges
4. `BagMonitor()` - 41 edges
5. `Icon()` - 38 edges
6. `pageIdentity()` - 37 edges
7. `canDraw()` - 36 edges
8. `Select()` - 35 edges
9. `mutate()` - 34 edges
10. `GET()` - 31 edges

## Surprising Connections (you probably didn't know these)
- `Cakupan graph proyek` --references--> `AppError`  [INFERRED]
  AGENTS.md → packages/contracts/src/index.ts
- `8.1 Bagian baru dan yang berubah` --references--> `DrawingsGrant`  [INFERRED]
  docs/DRAWING-DATABASE-PRD.md → packages/contracts/src/drawings.ts
- `3. Skema` --references--> `cleanupStagedFiles()`  [INFERRED]
  docs/superpowers/specs/2026-11-21-drawings-image-compression-design.md → packages/drawings-core/src/files.ts
- `8.1 Bagian baru dan yang berubah` --references--> `nextRevisionNo()`  [INFERRED]
  docs/DRAWING-DATABASE-PRD.md → packages/contracts/src/drawings-workflow.ts
- `3.11 Format angka` --references--> `portalSummary()`  [INFERRED]
  docs/design/BAG-FILTER-DASHBOARD-POLISH.md → packages/bag-core/src/insights.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Cross-application UI modernization** — docs_design_ui_audit_portal_consumables_operational_hub, docs_design_ui_audit_portal_consumables_reversible_overlays, docs_design_ui_audit_portal_consumables_accessible_design_tokens, docs_design_ui_audit_portal_consumables_shell_skeleton, docs_design_ui_audit_portal_consumables_stock_query_feedback, docs_design_ui_audit_portal_consumables_reversible_cart [EXTRACTED 1.00]

## Communities (172 total, 49 thin omitted)

### Community 0 - "Drawings UI and Audit Views"
Cohesion: 0.06
Nodes (57): actionLabels, AuditList(), Item, Page, ClampText(), ApiError, formatWib(), getJson() (+49 more)

### Community 1 - "Consumables Management and Loans UI"
Cohesion: 0.06
Nodes (57): AliasInput(), areaOptionLabel(), editableDecimal(), LoanDetailSheet(), LoansPanel(), STATUS_CHIPS, availabilityChips, CatalogEnrollSearch() (+49 more)

### Community 2 - "bag-core/src/index.ts"
Cohesion: 0.07
Nodes (50): Context, dynamic, GET(), json(), POST(), dynamic, GET(), CancellationColumns (+42 more)

### Community 3 - "Auth Forms and Account Pages"
Cohesion: 0.06
Nodes (45): ChangePassword(), dynamic, LoginForm(), PasswordForm(), dynamic, Login(), Loading(), Loading() (+37 more)

### Community 4 - "Consumable Order Carts and Search"
Cohesion: 0.09
Nodes (37): AddToOrder(), availableBorrowOptions(), evaluateOption(), MaterialSearch(), MaterialSearchMode, OptionAvailability, ownStockUnits(), areaOptionLabel() (+29 more)

### Community 5 - "Consumables API Route Handlers"
Cohesion: 0.10
Nodes (56): Context, dynamic, GET(), json(), mutate(), PATCH, POST, createDocument() (+48 more)

### Community 6 - "Consumables Document and Loan Services"
Cohesion: 0.07
Nodes (42): date, dateConditions(), docCols, header, hec, pickLine, qtyLine, requester (+34 more)

### Community 7 - "drawings/app/api/[...path]/route.ts"
Cohesion: 0.07
Nodes (36): Context, directory(), dynamic, GET(), imageVariant(), json(), PATCH, peopleOrNull() (+28 more)

### Community 8 - "approval.ts"
Cohesion: 0.05
Nodes (17): wibWeekStarts(), Directory, Issued, rejectedOrder, taskOrder, DirectoryPerson, DrawingRow, approvalActions (+9 more)

### Community 9 - "drawings-core/src/drawings.ts"
Cohesion: 0.06
Nodes (28): auditList(), countLibrary(), drawingDetailBase(), drawingTimeline(), FileIntent, libraryWhere(), listDrawings(), loadVisible() (+20 more)

### Community 10 - "Icon"
Cohesion: 0.07
Nodes (36): OverviewMap(), ToneBadge(), DrawingsSummary(), n(), series, dynamic, Portal(), wibDateFormatter (+28 more)

### Community 11 - "Application Theme Layouts"
Cohesion: 0.07
Nodes (37): inter, Layout(), metadata, inter, Layout(), metadata, inter, Layout() (+29 more)

### Community 12 - "AppError"
Cohesion: 0.15
Nodes (48): mutate(), AppError, attachImages(), bump(), cancelRevision(), checkRevision(), createRevision(), decideApproval() (+40 more)

### Community 13 - "Next.js Application Configuration"
Cohesion: 0.06
Nodes (33): config, config, config, config, config, app, marker, require (+25 more)

### Community 14 - "Identity"
Cohesion: 0.08
Nodes (15): authSchema, bagSchema, equipmentCodes, better-auth, @playwright/test, extra, addFull(), area() (+7 more)

### Community 15 - "Bag Filter Dashboard and Polish"
Cohesion: 0.08
Nodes (38): BagFilter(), dynamic, 3.0 Grafik pemasangan, 3.10 Kartu Equipment bawah, 3.11 Format angka, 3.1 KPI rail, 3.2 Banner "Belum tercatat", 3.3 Kepatuhan WO (menggantikan "Cakupan pemasangan") (+30 more)

### Community 16 - "integration/drawings-workflow.test.ts"
Cohesion: 0.06
Nodes (19): cancelled(), 4.1 Status revisi, 4.2 Check dan approval plan, 4.3 Reject, perbaikan dan siklus, 4.4 Revisi baru dan Final Drawing (K7), 4.5 Upload Old Drawing (Legacy Ready), 4.6 Drawing Request, 4.7 Void dan pembatalan revisi (K9) (+11 more)

### Community 17 - "requests.ts"
Cohesion: 0.09
Nodes (38): dynamic, Page(), canDraw(), IMAGE_MAX_PER_ITEM, canSeeRequest(), drafterDecisionSchema, DrawingsDashboard, hac (+30 more)

### Community 18 - "drawings-core/src/index.ts"
Cohesion: 0.11
Nodes (35): IMAGE_MAX_BYTES, IMAGE_MAX_INPUT_PIXELS, IMAGE_MAX_SIDE, IMAGE_PASSTHROUGH_MAX_BYTES, maxPdfBytes(), PDF_COMPRESS_MIN_SAVING_BYTES, PDF_COMPRESS_MIN_SAVING_RATIO, PDF_IMAGE_MAX_MAX_SIDE (+27 more)

### Community 19 - "drawings-model.ts"
Cohesion: 0.05
Nodes (35): DrawingAccessFacts, DrawingCreateInput, drawingCreateSchema, DrawingListItem, drawingMetadataFields, DrawingPage, DrawingsMasters, DrawingUpdateInput (+27 more)

### Community 20 - "Drawings Storage and Runtime Utilities"
Cohesion: 0.07
Nodes (17): verifier, args, docker(), exists(), parseEnv(), root, run, verifyIsolatedRuntime() (+9 more)

### Community 21 - "pdf-viewer-core.tsx"
Cohesion: 0.07
Nodes (35): clampScale(), describe(), Failure, LockableOrientation, orientation(), PdfViewerCore(), PdfViewerProps, presets (+27 more)

### Community 22 - "BagMonitor"
Cohesion: 0.12
Nodes (32): BagMonitor(), addPositions(), cellKey(), dismiss(), focus(), hover(), keyboard(), leaveHover() (+24 more)

### Community 23 - "storage.ts"
Cohesion: 0.09
Nodes (13): 2. Server: periksa, konversi bila perlu, buat thumbnail, assertKey(), ByteRange, createStorage(), FsStorage, getStorage(), S3Storage, Storage (+5 more)

### Community 24 - "Consumables Domain Contracts"
Cohesion: 0.06
Nodes (28): AreaStockOption, canonicalDocumentPayload(), ConsumablesGrant, ConsumablesRole, consumablesRoles, COUNT_UNITS, DocumentResult, HEC_PATTERN (+20 more)

### Community 25 - "server/src/index.ts"
Cohesion: 0.14
Nodes (23): dynamic, POST(), dynamic, GET(), dynamic, GET(), dynamic, GET() (+15 more)

### Community 26 - "drawings-import-legacy.ts"
Cohesion: 0.08
Nodes (14): RFC-4180, fieldsSchema, legacyImportKey(), LegacyImportOutcome, LegacyImportRow, legacyImportRow(), parseCsv(), args (+6 more)

### Community 27 - "Repository Automation Scripts"
Cohesion: 0.06
Nodes (31): scripts, bootstrap, brand:generate, build, check:export, consumables:import, consumables:import-naming, consumables:preflight (+23 more)

### Community 28 - "contracts/src/index.ts"
Cohesion: 0.08
Nodes (28): ageStops, AppId, bagAgeIntervalDays, BagGrant, BagRole, bagRoles, cancellationSchema, equipment (+20 more)

### Community 29 - "auth-core/src/index.ts"
Cohesion: 0.12
Nodes (24): dynamic, GET(), buildAuth(), getAuth(), publicOrigin(), cache, closeAuthDb(), createDatabase() (+16 more)

### Community 30 - "integration/drawings-files.test.ts"
Cohesion: 0.09
Nodes (14): dynamic, GET(), storageConfig(), cache, closeDrawingsDb(), create(), getDrawingsDb(), drawingsDatabaseReady() (+6 more)

### Community 31 - "environment"
Cohesion: 0.11
Nodes (30): environment, environment, command, depends_on, environment, image, networks, profiles (+22 more)

### Community 32 - "Cross Application UI Design"
Cohesion: 0.07
Nodes (27): Accessible design tokens, Portal and Consumables UI audit, Momentum-aware drawer gestures, Portal operational hub, Reversible cart feedback, ShellSkeleton navigation fallback, 0. Konteks dan prioritas acuan, 1. Keputusan font: self-host Inter (+19 more)

### Community 33 - "Continuous Integration Validation"
Cohesion: 0.07
Nodes (28): BASE_SHA, BEFORE_SHA, EVENT_NAME, GIT_REF, SPECS, jobs, validate, name (+20 more)

### Community 34 - "monitor.tsx"
Cohesion: 0.15
Nodes (20): BatchCancellationDialog(), BatchRecord, CancellationNotice(), CoordinateHistory(), TimelineItem, HistoryActions, HistoryItem, Batch (+12 more)

### Community 35 - "naming.ts"
Cohesion: 0.12
Nodes (19): dynamic, GET(), cache, closeConsumablesDb(), create(), getConsumablesDb(), importCatalog(), parseCatalog() (+11 more)

### Community 36 - "unit/drawings-files.test.ts"
Cohesion: 0.12
Nodes (23): fileNameFromHeader(), requireContentType(), requireUpload(), assertStampable(), clampText(), formatStampTime(), invalid(), normalizeRotation() (+15 more)

### Community 37 - "package.json"
Cohesion: 0.10
Nodes (26): devDependencies, @aws-sdk/client-s3@3.1160.0, @cantoo/pdf-lib@2.11.1, @playwright/test@1.64.1, prettier@3.9.10, sharp@0.35.5, tsx@4.23.15, @types/node@22.19.19 (+18 more)

### Community 38 - "drawings-workflow.ts"
Cohesion: 0.07
Nodes (24): RevisionStatus, ApprovalActionView, approvalDecisionSchema, ApprovalLevel, approvalLevels, approvalPlanSchema, ApprovalStep, approverRoles (+16 more)

### Community 39 - "Bag Application Dependencies"
Cohesion: 0.10
Nodes (25): dependencies, next@16.4.6, @plant/bag-core@workspace:*, @plant/contracts@workspace:*, @plant/server@workspace:*, @plant/ui@workspace:*, react@19.3.1, react-dom@19.3.1 (+17 more)

### Community 40 - "Consumables Application Dependencies"
Cohesion: 0.10
Nodes (25): dependencies, next@16.4.6, @plant/consumables-core@workspace:*, @plant/contracts@workspace:*, @plant/server@workspace:*, @plant/ui@workspace:*, react@19.3.1, react-dom@19.3.1 (+17 more)

### Community 41 - "insights.ts"
Cohesion: 0.18
Nodes (22): activeAgeSummary(), 1. Temuan dari screenshot dan source, 2. Tata letak baru, 4. Perubahan API (aditif), 6. Urutan pengerjaan (satu PR, commit bertahap), 7. Validasi, 8. Di luar cakupan, Rencana polish Ringkasan Bag Filter (+14 more)

### Community 42 - "files.ts"
Cohesion: 0.16
Nodes (24): RFC-5987, Task 4: Simpan hasil konversi dan thumbnail, Task 5: Penyajian thumbnail dan cache gambar, Kondisi saat ini, Body, cleanupStagedFiles(), contentDisposition(), fileObjects() (+16 more)

### Community 43 - "User Administration Services"
Cohesion: 0.22
Nodes (19): Context, dynamic, GET(), POST(), getAuthDb(), auditEntry(), authAudit(), changePassword() (+11 more)

### Community 44 - "positionKey"
Cohesion: 0.21
Nodes (20): BulkSelection(), BulkSelectionForm(), Props, areaPositions(), BagArea, Compartment, compartmentChoices(), compartmentOptions() (+12 more)

### Community 45 - "Portal Application Dependencies"
Cohesion: 0.11
Nodes (22): dependencies, next@16.4.6, @plant/contracts@workspace:*, @plant/server@workspace:*, @plant/ui@workspace:*, react@19.3.1, react-dom@19.3.1, next (+14 more)

### Community 46 - "drawings-core/package.json"
Cohesion: 0.12
Nodes (21): dependencies, @aws-sdk/client-s3@3.1160.0, @cantoo/pdf-lib@2.11.1, drizzle-orm@0.45.4, mysql2@3.24.6, @plant/contracts@workspace:*, sharp@0.35.5, zod@4.6.7 (+13 more)

### Community 47 - "Auth Application Dependencies"
Cohesion: 0.13
Nodes (20): dependencies, next@16.4.6, @plant/auth-core@workspace:*, @plant/contracts@workspace:*, @plant/server@workspace:*, @plant/ui@workspace:*, react@19.3.1, react-dom@19.3.1 (+12 more)

### Community 48 - "Consumables Inventory Schema"
Cohesion: 0.18
Nodes (19): `catalog_imports`, `consumables_audit`, consumables_audit_time_idx, `inventory`, inventory_location_idx, `locations`, material_category_idx, `materials` (+11 more)

### Community 49 - "drawings"
Cohesion: 0.11
Nodes (20): condition, depends_on, depends_on, image, init, networks, restart, depends_on (+12 more)

### Community 50 - "Consumable Room v1.1 R22"
Cohesion: 0.12
Nodes (20): Idempotent Bag Filter batches, R22 document API, Audit baseline Plant Area System, Legacy Vinext Cloudflare D1 export, Whole batch cancellation, Consumable Room v1.1 R22, Fixed point atomic stock documents, HAC SAC and mandatory Cost Center (+12 more)

### Community 51 - "ref_node_crypto"
Cohesion: 0.16
Nodes (11): 8.1 Bagian baru dan yang berubah, Grant, Identity, migrateConsumablesCatalog(), provision(), provisionConsumables(), preflightSingleRoom(), migrateDrawingsCatalog() (+3 more)

### Community 52 - "Drawings Library and Detail Views"
Cohesion: 0.18
Nodes (13): DrawingTitle(), empty, filterKeys, Filters, first(), dynamic, Page(), Library() (+5 more)

### Community 53 - "admin/workspace.tsx"
Cohesion: 0.15
Nodes (11): Application, Applications(), Admin(), dynamic, AdminWorkspace(), act(), ConsumablesAccess(), DrawingsAccess() (+3 more)

### Community 54 - "Compose Runtime Services"
Cohesion: 0.11
Nodes (18): image, init, networks, restart, name, networks, gateway, private (+10 more)

### Community 55 - "Drawings Image Compression Pipeline"
Cohesion: 0.16
Nodes (18): Review Focus, Task 1: Batas 10 gambar dan 25 MB, Task 2: Aturan murni gambar dan key thumbnail, Task 3: Pemrosesan gambar dengan sharp, Task 7: Anggaran container, build image, dokumentasi, Pengujian, createImageSlots(), defaultSlots (+10 more)

### Community 56 - "Consumables Core Dependencies"
Cohesion: 0.15
Nodes (16): dependencies, drizzle-orm@0.45.4, mysql2@3.24.6, @plant/contracts@workspace:*, zod@4.6.7, exports, ./import, ./schema (+8 more)

### Community 57 - "contracts/src/drawings.ts"
Cohesion: 0.15
Nodes (15): canOpenDrawingsSection(), DrawingsAction, drawingsActions, DrawingsGrant, drawingsNavigation(), DrawingsNavItem, drawingsPermissions, DrawingsPermissionValue (+7 more)

### Community 58 - "select-e2e.ts"
Cohesion: 0.18
Nodes (14): Area, areaPaths, noBrowserImpact, selectE2e(), Selection, specAreas, changedSince(), decide() (+6 more)

### Community 59 - "Container Build Arguments"
Cohesion: 0.20
Nodes (16): APP, build, build, args, context, dockerfile, target, build (+8 more)

### Community 60 - "Auth Core Dependencies"
Cohesion: 0.16
Nodes (15): dependencies, better-auth@1.7.12, drizzle-orm@0.45.4, mysql2@3.24.6, @plant/contracts@workspace:*, exports, ./schema, better-auth (+7 more)

### Community 61 - "Shared TypeScript Configuration"
Cohesion: 0.12
Nodes (15): compilerOptions, allowImportingTsExtensions, esModuleInterop, jsx, lib, module, moduleResolution, noEmit (+7 more)

### Community 62 - "Application Root Entry Pages"
Cohesion: 0.19
Nodes (12): dynamic, Page(), dynamic, Page(), dynamic, Page(), RequestForm(), Kontrak ringkasan aplikasi (inti skalabilitas) (+4 more)

### Community 63 - "Nginx Service Routing"
Cohesion: 0.13
Nodes (15): condition, condition, bag-filter, consumables, drawings, portal, condition, depends_on (+7 more)

### Community 64 - "Plant Area System v2"
Cohesion: 0.27
Nodes (14): Panduan pembatalan record Bag Filter, Migrasi database lokal ke VPS, Single writer database cutover, Handover OpenClaw database, Database migration checkpoints M0 M8, Deployment checkpoints C0 C12, Handover OpenClaw deployment, Deployment VPS tq-cmms.com (+6 more)

### Community 65 - "Desain: kompresi gambar Drawing Database ke WebP"
Cohesion: 0.13
Nodes (15): 1. Browser: kompresi sebelum upload, 3. Skema, 4. Penyajian dan cache, 5. Batas jumlah gambar, 6. Infra, 7. Dokumentasi, Anti-goal (gagal walau secara teknis jalan), Desain (+7 more)

### Community 66 - "Consumables End-to-End Tests"
Cohesion: 0.15
Nodes (8): admin, materials, post(), roleUsers, save(), suffix, actor, materials

### Community 67 - "consumables-ui.spec.ts"
Cohesion: 0.13
Nodes (6): paths, actor, temporary, theme(), types, year

### Community 68 - "drawings-ops"
Cohesion: 0.14
Nodes (14): depends_on, mysql, depends_on, image, networks, profiles, volumes, command (+6 more)

### Community 69 - "Drawing Database v1 — PRD dan prompt implementasi"
Cohesion: 0.14
Nodes (14): 10. Operasional, 11. Kriteria penerimaan, 12. Perbedaan terhadap referensi DrafTerra, 13. Saran lanjutan (belum masuk lingkup), 14. Hal yang masih perlu keputusan, 1. Keputusan yang sudah dikunci, 2. Lingkup, 3. Peran dan izin (+6 more)

### Community 70 - "Bag Core Dependencies"
Cohesion: 0.18
Nodes (13): dependencies, drizzle-orm@0.45.4, mysql2@3.24.6, @plant/contracts@workspace:*, exports, ./schema, drizzle-orm, mysql2 (+5 more)

### Community 71 - "Shared UI Dependencies"
Cohesion: 0.18
Nodes (13): dependencies, @plant/contracts@workspace:*, react@19.3.1, react-dom@19.3.1, exports, ./styles.css, @plant/contracts, react (+5 more)

### Community 72 - "drawings.spec.ts"
Cohesion: 0.15
Nodes (7): json(), operator, people, Person, png, suffix, version()

### Community 73 - "environment"
Cohesion: 0.27
Nodes (13): environment, environment, DRAWINGS_DATABASE_URL, DRAWINGS_MAX_PDF_MB, DRAWINGS_PDF_COMPRESSION, DRAWINGS_S3_ACCESS_KEY_ID, DRAWINGS_S3_BUCKET, DRAWINGS_S3_ENDPOINT (+5 more)

### Community 74 - "MySQL Credential Configuration"
Cohesion: 0.15
Nodes (13): AUTH_DB_PASSWORD, BAG_DB_PASSWORD, CONSUMABLES_DB_PASSWORD, DRAWINGS_DB_PASSWORD, MYSQL_ROOT_HOST, MYSQL_ROOT_PASSWORD, command, environment (+5 more)

### Community 75 - "Prompt: Portal setara gold standard Bag Filter"
Cohesion: 0.17
Nodes (12): 1. Tujuan, 2. Batasan, 3. Hasil audit: Portal dibanding gold standard, 4. Rancangan target (≥1536 px), 5. Langkah implementasi, 6. Kriteria penerimaan, 7. Laporan, 8. Keputusan yang diambil dalam brief ini (dapat dibatalkan pengguna) (+4 more)

### Community 76 - "database-snapshot.ts"
Cohesion: 0.21
Nodes (11): args, capture(), compare(), databases, ephemeral, identifier(), migrationsHash(), walk() (+3 more)

### Community 77 - "Hasil validasi implementasi v2"
Cohesion: 0.24
Nodes (11): BrandLogo artwork pipeline, Identitas TQ-CMMS, Application context sidebar navigation, Perbaikan sidebar dan dashboard Consumables, Proportional count chart and compact Portal, Separate transaction chart semantics, UI refresh v2 Plant Area System, Reversible overlays and momentum gestures (+3 more)

### Community 78 - "Container Health Checks"
Cohesion: 0.53
Nodes (12): healthcheck, healthcheck, healthcheck, healthcheck, interval, retries, start_period, test (+4 more)

### Community 79 - "Authentication Storage Schema"
Cohesion: 0.27
Nodes (11): account_user_idx, `accounts`, `app_grants`, `applications`, `auth_audit`, auth_audit_time_idx, `login_attempts`, session_user_idx (+3 more)

### Community 80 - "hasPermission"
Cohesion: 0.25
Nodes (7): AuditList(), Event, Audit(), dynamic, dynamic, EquipmentPage(), hasPermission()

### Community 81 - "Handover OpenClaw update R22"
Cohesion: 0.22
Nodes (11): Setup development MacBook, Native Mac development setup, Portable schema and data fingerprint, Pengembangan lokal sampai pembaruan VPS, CI verified full SHA release, Handover OpenClaw update R22, R22 production backup rehearsal, Upgrade Consumable Room R22 (+3 more)

### Community 82 - "Server Package Dependencies"
Cohesion: 0.22
Nodes (10): dependencies, next@16.4.6, @plant/contracts@workspace:*, exports, next, @plant/contracts, name, private (+2 more)

### Community 83 - "Auth TypeScript Configuration"
Cohesion: 0.20
Nodes (9): compilerOptions, allowJs, incremental, jsx, plugins, exclude, extends, include (+1 more)

### Community 84 - "Bag TypeScript Configuration"
Cohesion: 0.20
Nodes (9): compilerOptions, allowJs, incremental, jsx, plugins, exclude, extends, include (+1 more)

### Community 85 - "documents/[id]/page.tsx"
Cohesion: 0.22
Nodes (4): dynamic, Page(), titles, PrintButton()

### Community 86 - "Consumables TypeScript Configuration"
Cohesion: 0.20
Nodes (9): compilerOptions, allowJs, incremental, jsx, plugins, exclude, extends, include (+1 more)

### Community 87 - "compressImage"
Cohesion: 0.40
Nodes (8): compressedName(), compressImage(), encode(), fitWithin(), keepOriginal(), add(), Task 6: Kompresi di browser dan thumbnail di UI, file()

### Community 88 - "drawings/tsconfig.json"
Cohesion: 0.20
Nodes (9): compilerOptions, allowJs, incremental, jsx, plugins, exclude, extends, include (+1 more)

### Community 89 - "Portal TypeScript Configuration"
Cohesion: 0.20
Nodes (9): compilerOptions, allowJs, incremental, jsx, plugins, exclude, extends, include (+1 more)

### Community 90 - "dependencies"
Cohesion: 0.20
Nodes (10): dependencies, better-auth@1.7.12, drizzle-orm@0.45.4, mysql2@3.24.6, @plant/contracts@workspace:*, @plant/server@workspace:*, drizzle-orm, mysql2 (+2 more)

### Community 91 - "overlay.tsx"
Cohesion: 0.49
Nodes (7): project(), record(), rubberband(), Sample, shouldDismiss(), spring(), velocity()

### Community 92 - "test-gateway-recovery.ts"
Cohesion: 0.24
Nodes (8): actor, compose, docker(), inspect(), names, run, sentinels, services

### Community 93 - "AGENTS.md"
Cohesion: 0.25
Nodes (5): Kontrak API v2, Session identity and exact origin, Global Constraints, Kompresi Gambar Drawing Database ke WebP — Implementation Plan, Pemeriksaan manual sebelum go-live

### Community 94 - "Panduan agen untuk Plant Area System v2"
Cohesion: 0.22
Nodes (9): Agen di VPS produksi, Artefak Graphify bersama, Cakupan graph proyek, Dokumentasi library dan platform, Konteks proyek, Memakai Graphify pada sesi baru, Panduan agen untuk Plant Area System v2, Steps (+1 more)

### Community 95 - "Database Migration Containers"
Cohesion: 0.22
Nodes (9): entrypoint, environment, image, networks, restart, volumes, MYSQL_HOST, MYSQL_PWD (+1 more)

### Community 96 - "Bag Installation Storage"
Cohesion: 0.44
Nodes (8): `bag_audit`, bag_audit_equipment_time_idx, batch_equipment_time_idx, `coordinates`, `equipment`, installation_position_time_idx, `installations`, `replacement_batches`

### Community 97 - "Domain Contract Dependencies"
Cohesion: 0.25
Nodes (8): dependencies, zod@4.6.7, exports, zod, name, private, type, version

### Community 98 - "masters.ts"
Cohesion: 0.36
Nodes (8): createMaster(), labels, requireAdmin(), tables, toItem(), updateMaster(), disciplines, mysqlCode()

### Community 99 - "services"
Cohesion: 0.25
Nodes (7): networks, networks, networks, egress, services, drawings, drawings-ops

### Community 101 - "Drawings Role and Visibility Rules"
Cohesion: 0.46
Nodes (8): drawingsPermission(), drawingsRole(), canSeeDrawing(), canSeeRevision(), canSeeWip(), DrawingPermissions, drawingPermissions(), requestScopes()

### Community 103 - "Health check, housekeeping, sertifikat"
Cohesion: 0.29
Nodes (7): Disk penuh / housekeeping, Health check, Health check, housekeeping, sertifikat, Rutin lain yang layak dicek, Sertifikat, 6. Impor arsip Legacy Ready, status()

### Community 104 - "health-check.sh"
Cohesion: 0.38
Nodes (4): dc.sh script, env_key(), probe(), health-check.sh script

### Community 105 - "Operasional produksi tq-cmms"
Cohesion: 0.29
Nodes (7): Batas keras, Gerbang otorisasi, Identitas produksi, Laporan, Mulai setiap sesi, Operasional produksi tq-cmms, Router tugas

### Community 106 - "Drawings Access Integration Tests"
Cohesion: 0.33
Nodes (6): createUser(), mysqlCode(), stringField(), drawingsRoles, actor, fixtureUser()

### Community 107 - "Backup, offsite, restore"
Cohesion: 0.33
Nodes (6): Backup, offsite, restore, Backup sesuai permintaan, Offsite, Pemulihan sebenarnya, Restore drill (target terpisah), Yang dibuat sidecar `backup`

### Community 108 - "Runbook rilis Drawing Database v1"
Cohesion: 0.33
Nodes (6): 1. Persiapan (tanpa downtime), 2. Jendela rilis, 3. Smoke test setelah rilis, 4. Rollback, 5. Pindah driver `fs` → `s3` (setelah go-live), Runbook rilis Drawing Database v1

### Community 109 - "15. Prompt implementasi untuk developer"
Cohesion: 0.33
Nodes (6): 15.1 Peran dan tujuan, 15.3 Aturan kerja, 15.4 Fase, 15.5 Hal yang sering salah, 15.6 Laporan akhir tiap fase, 15. Prompt implementasi untuk developer

### Community 111 - "Fixed-Point Quantity Arithmetic"
Cohesion: 0.60
Nodes (6): decimalString(), decimalUnits(), formatQuantity(), sapToR22(), validateCountQuantity(), validateStockQuantity()

### Community 112 - "Insiden"
Cohesion: 0.40
Nodes (5): Gejala umum, Insiden, Migrasi gagal, Perubahan tak dikenal di server, Urutan pertama

### Community 113 - "Migrasi database dan impor data"
Cohesion: 0.40
Nodes (5): Bukti untuk laporan, Drawing Database: rekonsiliasi, storage, impor legacy, Impor master Consumables (instalasi tanpa restore saja), Migrasi database dan impor data, Migrasi schema/data

### Community 114 - "Setup awal Antigravity CLI di VPS"
Cohesion: 0.40
Nodes (5): 1. Agy dan workspace, 2. Izin, 3. Timer health read-only, 4. Catat di HANDOVER-RESULT, Setup awal Antigravity CLI di VPS

### Community 115 - "scripts"
Cohesion: 0.40
Nodes (5): scripts, build, dev, start, typecheck

### Community 116 - "auth"
Cohesion: 0.40
Nodes (5): image, init, networks, restart, auth

### Community 117 - "6. File, storage dan stamp"
Cohesion: 0.40
Nodes (5): 6.1 Upload dua tahap, 6.2 Storage (K4), 6.3 Penyajian file, 6.4 Stamp approval (K6), 6. File, storage dan stamp

### Community 118 - "PRD Plant Area System v2"
Cohesion: 0.40
Nodes (5): Active installation age and yearly replacements, PRD Plant Area System v2, Six equipment coordinate catalog, Centralized Auth SSO guards, Portal Auth Bag Filter Consumables

### Community 119 - "Q: `packages/ui/src/tokens.css` seharusnya jangan dilewati. lalu docs\testing dan `AppError` apakah itu penting sehingga harus dimasukkan dalam graph?"
Cohesion: 0.40
Nodes (4): Answer, Outcome, Q: `packages/ui/src/tokens.css` seharusnya jangan dilewati. lalu docs\testing dan `AppError` apakah itu penting sehingga harus dimasukkan dalam graph?, Source Nodes

### Community 120 - "Workspace Build Permissions"
Cohesion: 0.40
Nodes (4): allowBuilds, esbuild, sharp, packages

### Community 121 - "Source Formatting Configuration"
Cohesion: 0.40
Nodes (4): endOfLine, printWidth, singleQuote, trailingComma

### Community 125 - "Drawing Revision Viewer Route"
Cohesion: 0.67
Nodes (3): dynamic, Page(), revisionContext()

### Community 128 - "8. Arsitektur dan integrasi platform"
Cohesion: 0.50
Nodes (4): 8.2 Database `plant_drawings`, 8.3 API, 8.4 Gateway, 8. Arsitektur dan integrasi platform

### Community 129 - "Update release dan rollback"
Cohesion: 0.67
Nodes (3): Langkah, Rollback, Update release dan rollback

### Community 135 - "Shared Pool Umum R22"
Cohesion: 0.67
Nodes (3): Shared Pool Umum R22, isSharedWorkArea(), R22_SHARED_AREA

## Ambiguous Edges - Review These
- `project()` → `verifyIsolatedRuntime()`  [AMBIGUOUS]
  scripts/smoke-dev.ts · relation: indirect_call

## Knowledge Gaps
- **45 isolated node(s):** `../../tsconfig.json`, `RFC-5987`, `../../tsconfig.json`, `../../tsconfig.json`, `../../tsconfig.json` (+40 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1090 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **49 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AppError` connect `AppError` to `bag-core/src/index.ts`, `Consumable Order Carts and Search`, `Consumables API Route Handlers`, `Consumables Document and Loan Services`, `drawings/app/api/[...path]/route.ts`, `approval.ts`, `drawings-core/src/drawings.ts`, `integration/drawings-workflow.test.ts`, `requests.ts`, `drawings-core/src/index.ts`, `Drawings Storage and Runtime Utilities`, `BagMonitor`, `storage.ts`, `server/src/index.ts`, `drawings-import-legacy.ts`, `contracts/src/index.ts`, `auth-core/src/index.ts`, `integration/drawings-files.test.ts`, `naming.ts`, `unit/drawings-files.test.ts`, `drawings-workflow.ts`, `insights.ts`, `files.ts`, `User Administration Services`, `ref_node_crypto`, `Drawings Library and Detail Views`, `Drawings Image Compression Pipeline`, `documents/[id]/page.tsx`, `Panduan agen untuk Plant Area System v2`, `masters.ts`, `Platform Integration Tests`, `Drawings Access Integration Tests`, `Q: `packages/ui/src/tokens.css` seharusnya jangan dilewati. lalu docs\testing dan `AppError` apakah itu penting sehingga harus dimasukkan dalam graph?`, `Drawing Revision Viewer Route`?**
  _High betweenness centrality (0.081) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `AppError` (e.g. with `Cakupan graph proyek` and `15.2 Bacaan wajib sebelum menulis kode`) actually correct?**
  _`AppError` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `../../tsconfig.json`, `RFC-5987`, `../../tsconfig.json` to the rest of the system?**
  _45 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Drawings UI and Audit Views` be split into smaller, more focused modules?**
  _Cohesion score 0.05593008739076155 - nodes in this community are weakly interconnected._
- **Why does `@playwright/test` connect `Identity` to `Consumables End-to-End Tests`, `consumables-ui.spec.ts`, `package.json`, `drawings.spec.ts`, `User Administration Services`, `Drawings Storage and Runtime Utilities`, `test-gateway-recovery.ts`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `BagMonitor()` (e.g. with `dismiss()` and `focus()`) actually correct?**
  _`BagMonitor()` has 8 INFERRED edges - model-reasoned connections that need verification._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `project()` and `verifyIsolatedRuntime()`?**
  _Edge tagged AMBIGUOUS (relation: indirect_call) - confidence is low._