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

### Phase 2.8 Completion Criteria

1. App launches from Expo Go on Samsung.
2. Home screen loads cleanly.
3. Create/edit/delete flows work on-device.
4. Created SQLite data survives app relaunch.

### Key Files

- `services/illustrationsRepo.ts`: List, create, and update repository operations.
- `app/create.tsx`: Phase 2.2 create UI and save flow.
- `app/edit.tsx`: Phase 2.3 edit UI and update flow.
- `types/illustration.ts`: Shared record and input payload types.

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
