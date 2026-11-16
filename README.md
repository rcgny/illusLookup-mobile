# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Phase 2 Summary

- Phase 2.1: Connected list and home browsing to local SQLite through a repository layer.
- Phase 2.2: Implemented create flow with required-field validation, Keep/Undo confirmation, and insert persistence.
- Phase 2.3: Implemented edit/update + delete flow with record selection, prefilled form state, validation, Keep/Undo confirmation, and SQLite update persistence.
- Phase 2.4: Added searchable combo-box flows and list-selection UX alignment across Home, Edit, and Delete.
- Phase 2.5: Standardized combo-box interaction behavior and extracted a shared TopicComboBox component.
- Phase 2.6: Added read-only detail route, simplified save behavior in create/edit, and connected detail -> edit/delete route prefill.
- Phase 2.7: Added unified search/sort filtering, stable selection for duplicate topics, keyboard behavior updates, and focus-refresh behavior.
- Phase 2.9 Step 1: Added on-device export actions for a shareable SQLite backup file and a JSON dump.
- Phase 2.9 Step 2: Added on-device SQLite `.db` import to restore shared backups.
- Phase 2.9 Step 3: Switched startup seed behavior to one-time marker-based seeding per DB lifecycle.

### Phase 2 Detailed Steps (2.4 to 2.7)

#### Phase 2.4 Steps

1. Home: Added topic combo-box search/select with clear/reset controls and default A-Z list behavior.
2. Home: Preserved default A-Z ordering for visible cards.
3. Delete: Added Home-style searchable combo-box for selecting an illustration.
4. Delete: Removed outer ScrollView to avoid nested VirtualizedList warnings.
5. Edit: Added Home-style searchable combo-box for selecting an illustration.
6. Edit: Used non-ScrollView outer layout to avoid nested VirtualizedList warnings.

#### Phase 2.5 Steps

1. Phase 2.5.1: Enabled tap-to-open combo input behavior and topic pick-or-type flow.
2. Phase 2.5.2: Extracted and adopted shared TopicComboBox across Home/Create/Edit/Delete.
3. Phase 2.5.3: Added close-on-outside-tap and close-on-Android-back/keyboard-dismiss behavior.

#### Phase 2.6 Steps

1. Phase 2.6.1 Step 1: Added fullscreen read-only illustration detail route.
2. Phase 2.6.1 Step 2: Loaded detail data by route id through repository lookup.
3. Phase 2.6.2 Step 1: Updated Create to save immediately after validation (no Keep/Undo prompt).
4. Phase 2.6.2 Step 2: Updated Edit to save immediately after validation/dirty checks (no Keep/Undo prompt).
5. Phase 2.6.3 Step 1: Added Edit/Delete actions on detail route with id forwarding.
6. Phase 2.6.3 Step 2: Added one-time route-id prefill support in Edit.
7. Phase 2.6.3 Step 3: Added one-time route-id prefill support in Delete.

#### Phase 2.7 Steps

1. Repository: Added optional DB-level filtering/sorting inputs in listIllustrations.
2. Home: Unified keyword search across topic/illustration/application and aligned dropdown with current results.
3. Home: Added one-tap reset to clear search and restore default sort.
4. Home: Refreshed list on screen focus while preserving active filters.
5. Edit/Delete: Switched option labels to include id so duplicate-topic rows remain uniquely selectable.
6. TopicComboBox: Removed auto-focus on open to prevent Android soft keyboard popups.
7. Home: Added debounced search commit and keyboard dismiss on typing pause.

#### Phase 2.9 Steps

1. Phase 2.9 Step 1: Added Home-screen export actions for a SQLite `.db` backup and a JSON dump.
2. Phase 2.9 Step 1: Save export files in the app documents area and open the system share sheet when available.
3. Phase 2.9 Step 2: Added Home-screen import action that restores data from a selected SQLite `.db` backup.
4. Phase 2.9 Step 2: Import flow validates expected tables, replaces local DB contents, and refreshes Home rows.
5. Phase 2.9 Step 2: Added pre-import snapshot + automatic rollback so failed imports restore previous local data.
6. Phase 2.9 Step 3: Seed rows now run once per database lifecycle using `app_meta.seed_complete_v1`; deleting all rows no longer auto-reseeds.

## Phase 2.8 Samsung Phone Setup

Use this exact checklist to run Illus Mobile on a Samsung phone with Expo Go and verify SQLite persistence.

### Phase 2.8 Step 1: Prepare your laptop and project

1. Open a terminal in this project root.
2. Install dependencies:

   ```bash
   npm install
   ```

3. Confirm Expo CLI can start the project:

   ```bash
   npx expo start --clear
   ```

Expected result: Metro starts successfully and displays a QR code.

### Phase 2.8 Step 2: Prepare your Samsung phone

1. Install Expo Go from Google Play.
2. Connect the phone to the same Wi-Fi network as your laptop.
3. On Samsung, allow camera permissions for Expo Go (needed for QR scan).

Expected result: Expo Go opens and can scan a QR code.

### Phase 2.8 Step 3: Launch the app on phone

1. Keep Metro running from Step 1.
2. Scan the QR code with Expo Go.
3. Wait for the JavaScript bundle to load.

Expected result: Home screen renders on the phone without red-screen runtime errors.

### Phase 2.8 Step 4: Verify SQLite behavior on device

1. In the app, create one new illustration.
2. Return to list/home and confirm the new row appears.
3. On the Samsung phone, fully close Expo Go, reopen Expo Go, then reopen the Illus Mobile project from Expo Go. Keep the Expo server running on your laptop during this check.
4. Confirm the created row still exists after relaunch.

Expected result: Data persists and startup loads without SQLite initialization errors.

### Phase 2.8 Step 5: Smoke test key user flows

1. Open an illustration detail screen.
2. Test edit and save.
3. Test delete and confirm list updates.

Expected result: Detail, edit, and delete all work normally on Samsung.

### Phase 2.8 Troubleshooting

1. QR scan fails:
   - Ensure phone and laptop are on the same Wi-Fi.
   - Restart Metro with `npx expo start --clear`.
2. App does not connect over Wi-Fi:
   - In Expo dev tools, switch connection mode from LAN to Tunnel.
3. Runtime red screen appears:
   - Check Metro logs for the first error line and fix that error before retrying.
4. Phone reports HTTP 500 and Metro cannot resolve `react-native/asset-registry`:
   - This is a bundling failure, not a Wi-Fi connection failure.
   - Keep Expo, React Native, React, and Expo modules on compatible SDK versions. This project targets Expo SDK 58.
   - Run `npx expo install --check` to detect mismatches. After an SDK upgrade, run `npx expo install --fix` to align dependencies.
   - Stop the existing Metro process, then run `npx expo start --clear` and scan the new QR code.
   - Use an Expo Go version that supports the project's SDK.

### Phase 2.8 Completion Criteria

1. App launches from Expo Go on Samsung.
2. Home screen loads cleanly.
3. Create/edit/delete flows work on-device.
4. Created SQLite data survives app relaunch.

## Phase 2.9 Data Export and Import

Phase 2.9 Step 1 adds an export feature for device-local SQLite data. Use the `Export Data` button on the home screen to generate one of these outputs:

1. SQLite DB backup: Creates a shareable `.db` file snapshot of the current local database.
2. JSON dump: Creates a readable JSON export of the current database rows and app metadata.

Notes:

1. These exports are created on the phone from the phone-local database.
2. The raw private app data folder is still not directly browsable on a normal non-rooted Android phone.
3. The exported `.db` file is the format intended for later import into Illus Mobile on another device.
4. Phase 2.9 Step 2 import is available from the `Import Data` button on the home screen.

### Phase 2.9 Import Notes

1. Import uses a selected `.db` backup file and replaces local data on the current device.
2. Import is intended for moving data between phones running Illus Mobile.
3. Keep a current export backup before running import, since import overwrites local DB state.
4. If import fails after starting, the app attempts automatic rollback to the pre-import local DB snapshot.

### Phase 2.9 Import QA Checklist

Use this checklist to validate both the happy path and failure safety path on Android devices.

#### A) Successful Import Test

1. On source phone, create a known test dataset (for example, exactly 3 topics).
2. Export a SQLite backup from `Export Data` -> `SQLite DB`.
3. Transfer the backup file to target phone (Downloads is recommended).
4. On target phone, note the current row count before import.
5. Run `Import Data` and select the transferred backup file.
6. Confirm success message appears and imported row count matches expectation.
7. Verify list data on Home reflects the source dataset.

Pass criteria:

1. Import completes without crash.
2. Imported row count is correct.
3. Expected topics/illustrations are visible on Home.

#### B) Intentionally Bad-File Import Test

1. Create a fake invalid file (for example, a plain text file renamed to `.db`).
2. Ensure you know current good row count before test.
3. Run `Import Data` and select the invalid file.
4. Confirm import fails with an error message.
5. Verify Home data and row count remain unchanged.

Pass criteria:

1. Import fails gracefully (no app crash).
2. Existing local data is preserved after failed import.
3. You can continue normal app usage immediately.

#### C) Multi-Device Confidence Sweep

1. Repeat A and B on at least 2 to 3 Android devices when possible.
2. Include at least one test where import file is selected via Android Downloads provider (`content://` URI path).

### Phase 2.9 Known Import Errors and Meaning

Support info to collect for bug reports: device model, Android version, exact first error line, and whether file was chosen from Downloads (`content://`) or local file path.

1. `The selected file is not a valid Illus Mobile backup.`
   - Meaning: the chosen file is not a compatible SQLite backup for this app schema.
   - Action: select a `.db` file exported by Illus Mobile `Export Data`.

2. `Import rollback could not be confirmed; please restore from your latest exported backup.`
   - Meaning: import failed and automatic rollback could not be guaranteed.
   - Action: import your most recent known-good backup file.

3. `URI is not absolute`
   - Meaning: file path handling failed for the selected provider URI.
   - Action: retry from Android Downloads and confirm latest app code is running.

4. `Call to function 'FileSystemFile.copy' ... cannot be used with content URIs`
   - Meaning: runtime rejected direct copy from a `content://` source.
   - Action: use the current bytes-based import flow (already implemented in this project).

5. `Received 3 arguments, but 2 was expected`
   - Meaning: runtime method signature mismatch with a previous API call shape.
   - Action: ensure latest import code is deployed; this project uses compatible call forms.

### Key Files

- `services/illustrationsRepo.ts`: List, create, and update repository operations.
- `app/create.tsx`: Phase 2.2 create UI and save flow.
- `app/edit.tsx`: Phase 2.3 edit UI and update flow.
- `types/illustration.ts`: Shared record and input payload types.

## Phase 3.0 Plan: Standalone Android Beta

Status: Phases 3.0.1 and 3.0.2 complete; later steps are planned. Complete and verify each step below in order before moving to the next.

Goal: Install Illus Mobile as its own Android app, migrate existing data safely, and share it with a small test group. The installed app must work with the laptop turned off, without Expo Go or a running Expo/Metro server.

This phase keeps Expo and the existing local SQLite architecture; no app rewrite is required. Google Play publishing, accounts/authentication, and cloud syncing are deferred to later phases.

### Phase 3.0.1: Configure a Standalone Release

- [x] Choose the permanent Android application ID (package name): `com.rcgny.illuslookup`.
- [x] Confirm the app display name (`Illustration Repo`), existing launcher icons, and initial release version (`1.0.0`).
- [x] Choose the build route before configuring it: EAS cloud builds selected.
  - EAS Build is the standard Expo cloud-build route and uploads project source to Expo's build service; confirm that this is acceptable before using it.
  - Local Android Studio/Gradle builds are an alternative if source must remain local, with additional tooling/setup.
- [x] Add an `eas.json` `preview` profile for a release-mode, internally distributed APK, not a development client.
- [x] Log in to EAS and link the Expo project under the `rcgny-expo` account.
- [x] Configure remote version-code management with automatic increments for preview builds; the local initial Android version code is `1`.
- [x] Generate an Android release keystore managed remotely by EAS. Preserve signing credentials securely outside source control.

Completion criteria: App identity and build route are agreed, and configuration is ready to produce a signed standalone APK.

#### Phase 3.0.1 Completion Notes

Local configuration is in [app.json](./app.json) and [eas.json](./eas.json). The EAS project is linked to the `rcgny-expo` account, Android release signing is configured with an EAS-managed keystore, and the `preview` profile resolves to an internally distributed standalone APK. The Expo slug and URL scheme are unchanged; only the phone's display name has changed.

The EAS configuration command resolved the expected Android application ID and `preview` APK profile. Its notice that no preview environment variables are configured is informational; this app does not currently require any.

Versioning: `expo.version` remains the manually managed user-facing version. EAS manages and increments Android build version codes remotely; the local `android.versionCode` is only the initial baseline, not the authoritative value after remote versioning is initialized. Keep the application ID and signing key stable for in-place updates that preserve local app data.

### Phase 3.0.2: Produce and Install an APK

- [x] Run dependency compatibility checks, lint, and TypeScript checks; resolve release-blocking issues.
- [x] Build a signed release-mode APK with JavaScript and required assets bundled into the app.
- [x] Download or locate the APK and install it on the primary Android phone.
- [x] Confirm the app opens from its own launcher icon, without Expo Go or a development-server prompt.
- [x] Record the build command, app version, and installation procedure for repeatable builds.

Build formats:

| Build | Purpose |
|---|---|
| Expo Go / development client | Development workflow, normally connected to the laptop's Metro server |
| Standalone release-mode APK | Direct installation and use without the laptop |
| Android App Bundle (AAB) | Later distribution through Google Play; not directly installable like an APK |

Completion criteria: The standalone APK installs and launches successfully on the primary phone.

Completion note: The user confirmed the APK is installed and the standalone app launches on the phone without Expo Go or the Expo development server.

### Phase 3.0.3: Migrate Existing Data Safely

Expo Go and the standalone app use separate private storage. Existing Expo Go data will not automatically appear in the standalone app.

- [ ] Export a current SQLite `.db` backup from the existing app running in Expo Go.
- [ ] Save the backup outside Expo Go's private storage, such as Downloads or another safe backup location.
- [ ] Import the backup into the installed standalone app.
- [ ] Verify the illustration count and known topics, illustration text, application text, and source links.
- [ ] Keep Expo Go and the exported backup until migration has been verified.

Completion criteria: Existing illustrations are available in the standalone app, with a retained external backup.

### Phase 3.0.4: Verify Independence and Data Persistence

- [ ] Stop the Expo/Metro server and turn off the laptop.
- [ ] Enable airplane mode on the phone and launch the standalone app.
- [ ] Test Home browsing, search/sort, and illustration detail viewing.
- [ ] Test create, edit, and delete with disposable test records while offline.
- [ ] Fully close and reopen the app, then restart the phone; verify saved data remains.
- [ ] Test SQLite backup export and successful import using a backup accessible on the device.
- [ ] Test invalid-file import and confirm existing data remains usable and unchanged.
- [ ] Build and install a subsequent signed APK over the existing installation, without uninstalling; verify user data survives the update.

Completion criteria: Core flows work without the laptop or network, data survives app/phone restarts, backup/import works, and an in-place app update preserves data.

### Phase 3.0.5: Share with a Small Test Group

- [ ] Prepare brief instructions for APK installation, Android's trusted-source installation permission, first launch, backup/import, and future updates.
- [ ] Explain that each installation has its own local database, with no automatic syncing.
- [ ] Explain that SQLite backup import replaces local data rather than merging changes; users should export a backup before importing.
- [ ] Share the APK through a controlled channel with a small group of trusted Android testers.
- [ ] Verify installation and offline use on at least one additional Android phone.
- [ ] Collect device model, Android version, app version, reproduction steps, and exact error messages for reported problems.
- [ ] Resolve beta-blocking issues before expanding distribution or planning Google Play publication.

Completion criteria: The owner and at least one other tester can use the installed app with the laptop completely off, and testers understand local-only data, backups, and updates.

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
