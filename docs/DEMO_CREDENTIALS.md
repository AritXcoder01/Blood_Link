# Evaluator Guide & Demonstration Script — Blood_Link

This guide is designed for academic evaluators, professors, and examiners conducting live evaluations of the **Blood_Link** final-year project.

---

## 🔑 Demonstration Accounts & Roles

> [!NOTE]
> For security, default passwords are never stored in public version control. When running locally in demonstration mode, seed credentials can be inspected in `docs/DEMO_CREDENTIALS.local.md` (local only, Git-ignored) or configured via local environment variables.

| Role | Account Email | Password / Access | Pre-Seeded Context |
| :--- | :--- | :--- | :--- |
| **Medical Administrator** | `admin@bloodlink.org` | *Configured locally (see local guide)* | Dr. Sarah Mitchell (Chief Admin). Full authority to verify/reject emergency requests, suspend users, and view audit trails. |
| **Voluntary Donor (O+)** | `donor@bloodlink.org` | *Configured locally (see local guide)* | Arjun Mehta (Bund Garden, Pune). Within 1.25 km of Ruby Hall Clinic. Has 1 active critical emergency match. |
| **Patient Attendant** | `priya.sharma@example.com` | *Configured locally (see local guide)* | Priya Sharma (Kothrud, Pune). Has active emergency requests and received donor responses. |

*Local Development SMS / OTP:* Configured in local `.env` (Demo Mode bypass).

---

## 🎬 Recommended 5-Minute Demonstration Walkthrough

### Step 1: Landing Page & Public Information
1. Open **`http://localhost:3000`** in your browser.
2. Observe the clean healthcare SaaS aesthetic with brand primary red (`#B91C32`), crisp white cards, and Lucide icons.
3. Review the headline: *"Every Second Matters. Every Donor Counts."*
4. Explore the **Interactive Compatibility Matrix**: Click blood group buttons (`O-`, `O+`, `B+`, `AB+`) to see real-time updates of who can give and receive blood.
5. Review the 4-step workflow, demonstration stats (9 donors, 4 hospitals in Pune hub), and regulatory statements.

### Step 2: 1-Click Role Switcher (Top Banner)
1. Notice the top dark evaluation banner with the green pulsating dot: `DEMO EVALUATION MODE`.
2. Click the **"Donor (O+)"** button.
3. You are instantly logged in as *Arjun Mehta (O+)* and navigated to the **Donor Dashboard**.
4. Test the **Availability Toggle**: Switch between *Available*, *Temporarily Unavailable*, and *Not Accepting*.
5. View the matched emergency request at Ruby Hall Clinic (1.25 km away, 5 km tier).
6. Click **"Express Willingness"**: Read the mandatory non-medical disclaimer, add an optional arrival time note, and confirm.

### Step 3: Requester Perspective & Tracking Pipeline
1. Click the **"Requester"** button on the top banner.
2. You are instantly logged in as *Priya Sharma (Patient Attendant)*.
3. Review the active emergency requests in the left column.
4. Select the critical request for *Kavita Joshi (O+)*: Observe the 4-stage tracking pipeline (*Verification -> 5-25km Search -> Willing Donors -> Safe*).
5. Look at the **"Potential Donors Identified"** card: See *Arjun Mehta (O+)* listed as **"Willing to Donate"** with contact phone number and distance!

### Step 4: Emergency Request Creation
1. Click **"Create Emergency Blood Request"** on the requester dashboard.
2. Fill in patient name, select blood group (e.g. `B+`), units (e.g. `2`), and choose a hospital (e.g. *Jehangir Hospital Blood Centre*).
3. Submit the request: Observe that it safely enters **`PENDING_VERIFICATION`** to prevent unverified alerts.

### Step 5: Administrator Clinical Verification & Matching Engine
1. Click the **"Admin"** button on the top banner.
2. You are instantly logged in as *Dr. Sarah Mitchell (Chief Admin)* in the **Administrator Portal**.
3. In the **"Pending Verification Queue"**, find the newly created request.
4. Click **"Verify & Dispatch Matches"**:
   - The matching engine calculates geographical distances using the Haversine formula across progressive 5km, 10km, and 25km radiuses.
   - It identifies compatible donors and dispatches in-app notifications.
   - Notice the feedback banner displaying the exact count of matched donors across tiers!
5. Navigate to the **"User Management"** tab to inspect all registered donors, and the **"Analytics"** tab to view blood group inventory distributions.

---

## 🛠️ Verification of External Integrations & Demo Mode

- **Maps**: Runs smoothly via OpenStreetMap/Leaflet.
- **SMS/OTP**: Simulated development OTP accepted automatically in local demo mode.
- **Database**: Runs smoothly on SQLite WebAssembly with zero C++ compilation dependencies, while full PostgreSQL DDL is provided in `server/src/db/schema.sql`.
