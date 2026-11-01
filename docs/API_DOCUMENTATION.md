# REST API Documentation — Blood_Link

Base URL: `http://localhost:5000/api/v1`

---

## 1. System & Health

### `GET /health`
Returns system health, active database engine (PostgreSQL or SQLite WebAssembly fallback), and configured integrations.
- **Access:** Public
- **Sample Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-11-01T06:03:43.647Z",
  "service": "Blood_Link Emergency Platform API",
  "version": "1.0.0",
  "database": {
    "mode": "sqlite",
    "productionIntended": "PostgreSQL with PostGIS",
    "activeEngine": "SQLite WebAssembly (Zero-Config Demonstrable Fallback)"
  },
  "integrations": {
    "googleMaps": "Demo Mode (Interactive OpenStreetMap/Leaflet + Manual Fallback)",
    "smsGateway": "Demo Mode (Simulated Development OTP)",
    "pushNotifications": "Demo Mode (In-App Live Alerts)"
  }
}
```

---

## 2. Authentication (`/auth`)

### `POST /auth/register/donor`
Registers a new voluntary blood donor (enforces age ≥ 18).
- **Body:**
```json
{
  "fullName": "Rahul Deshmukh",
  "email": "rahul@example.com",
  "password": "Password@123",
  "mobile": "+91-9822011111",
  "dateOfBirth": "1995-04-12",
  "bloodGroup": "O+",
  "donationType": "Whole Blood",
  "state": "Maharashtra",
  "district": "Pune",
  "taluka": "Haveli",
  "locality": "Shivajinagar",
  "latitude": 18.5308,
  "longitude": 73.8475,
  "consentGiven": true
}
```

### `POST /auth/register/requester`
Registers a patient or attendant.
- **Body:** `fullName`, `email`, `password`, `mobile`, `requesterType` ('Patient' | 'Attendant'), `district`, `locality`, `latitude`, `longitude`.

### `POST /auth/login`
Authenticates a user and returns a signed JWT token.
- **Body:** `{ "email": "user@example.com", "password": "<YOUR_SECURE_PASSWORD>" }`
- **Response:** `{ "success": true, "token": "...", "user": { ... } }`

### `GET /auth/me`
Returns authenticated user session with role profile and location.
- **Headers:** `Authorization: Bearer <token>`

---

## 3. Donors (`/donors`)

### `GET /donors/profile`
Returns donor profile, health questionnaire, and donation summary.
- **Headers:** `Authorization: Bearer <donor_token>`

### `PATCH /donors/availability`
Updates availability toggle.
- **Body:** `{ "status": "AVAILABLE" }` (or `'TEMPORARILY_UNAVAILABLE'`, `'NOT_ACCEPTING'`)

### `GET /donors/requests`
Returns emergency blood requests matched to this donor based on blood group and distance.

### `POST /donors/requests/:requestId/respond`
Donor expresses willingness to be contacted or declines.
- **Body:** `{ "response": "ACCEPTED", "notes": "Can reach by 2:00 PM" }`
- **Notice:** Response indicates willingness; clinical compatibility is evaluated at blood centre.

### `GET /donors/history`
Returns history of completed blood donations.

### `POST /donors/history`
Logs a newly completed voluntary donation record.

---

## 4. Emergency Requests (`/requests`)

### `POST /requests`
Registers a new emergency request (enters `PENDING_VERIFICATION`).
- **Body:**
```json
{
  "patientName": "Kavita Joshi",
  "patientAge": 34,
  "bloodGroup": "O+",
  "bloodComponent": "Packed Red Blood Cells (PRBC)",
  "unitsRequired": 2,
  "hospitalName": "Ruby Hall Clinic & Research Center",
  "hospitalAddress": "40 Sassoon Road, Sangamvadi, Pune",
  "latitude": 18.5312,
  "longitude": 73.8741,
  "requiredDate": "2026-11-02",
  "requiredTime": "14:00",
  "priority": "CRITICAL",
  "additionalDetails": "Emergency cardiac procedure."
}
```

### `GET /requests`
Lists requests for the authenticated user (or all requests if admin).

### `GET /requests/:id`
Returns request details, hospital address, and list of matched potential donors with privacy masking.

### `PATCH /requests/:id/cancel`
Cancels the request, immediately stopping progressive matching and donor notifications.

---

## 5. Administration (`/admin`)

### `GET /admin/dashboard`
Returns metrics: total donors, requesters, active requests, fulfilled requests, pending verification count, and blood group breakdown.
- **Headers:** `Authorization: Bearer <admin_token>`

### `GET /admin/users`
Lists all users with filtering by `role` and `status`.

### `PATCH /admin/users/:id/status`
Suspends or reactivates a user account.
- **Body:** `{ "status": "suspended" }` (or `'active'`)

### `PATCH /admin/requests/:id/verify`
Clinically verifies an emergency request, updates state to `VERIFIED` / `SEARCHING`, and triggers the matching engine to dispatch notifications to nearby donors.

### `PATCH /admin/requests/:id/reject`
Rejects unverified or fraudulent requests.
- **Body:** `{ "reason": "Hospital admission could not be validated." }`

### `GET /admin/audit-logs`
Returns the system administrative audit trail.

---

## 6. Hospitals & Notifications

- `GET /hospitals`: Returns verified hospitals and blood centres in the region.
- `GET /notifications`: Returns user's in-app alerts and unread counter.
- `PATCH /notifications/:id/read`: Marks an individual notification as read.
- `PATCH /notifications/read-all`: Marks all user notifications as read.
