import { calculateHaversineDistanceKm } from './services/matchingService.js';

// Strict Production Gate: Prevent QA test suite execution in production
if (process.env.NODE_ENV === 'production') {
  console.error('FATAL: QA test runner cannot execute against a production environment!');
  process.exit(1);
}

const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'Admin@123';
const TEST_DONOR_PASSWORD = process.env.TEST_DONOR_PASSWORD || 'Donor@123';
const TEST_REQUESTER_PASSWORD = process.env.TEST_REQUESTER_PASSWORD || 'Requester@123';

interface TestResult {
  id: string;
  category: string;
  description: string;
  status: 'PASSED' | 'FAILED';
  details: string;
}

const results: TestResult[] = [];
const BASE_URL = 'http://localhost:5000/api/v1';

async function runTest(
  id: string,
  category: string,
  description: string,
  fn: () => Promise<string | void>
) {
  try {
    const detail = await fn();
    results.push({
      id,
      category,
      description,
      status: 'PASSED',
      details: detail || 'Executed successfully with expected status and payload.',
    });
    console.log(`✅ [PASS] ${id}: ${description}`);
  } catch (err: any) {
    results.push({
      id,
      category,
      description,
      status: 'FAILED',
      details: err.message || String(err),
    });
    console.error(`❌ [FAIL] ${id}: ${description} -> ${err.message}`);
  }
}

async function api(path: string, options: RequestInit = {}): Promise<{ status: number; ok: boolean; data: any }> {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data: any = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function main() {
  console.log('\n======================================================');
  console.log('🧪 BLOOD_LINK COMPREHENSIVE QA AUDIT & VERIFICATION');
  console.log('======================================================\n');

  let adminToken = '';
  let donorToken = '';
  let requesterToken = '';
  let otherRequesterToken = '';
  let testRequestId = '';

  // -------------------------------------------------------------------------
  // 1. SYSTEM HEALTH & RUNTIME VERIFICATION
  // -------------------------------------------------------------------------
  await runTest('SYS-01', 'System Verification', 'Check API Health Endpoint', async () => {
    const res = await api('/health');
    if (res.status !== 200 || res.data?.status !== 'healthy') {
      throw new Error(`Expected HTTP 200 healthy, got ${res.status}: ${JSON.stringify(res.data)}`);
    }
    return `Status: ${res.data.status}, Engine: ${res.data.database?.activeEngine}, Version: ${res.data.version}`;
  });

  await runTest('SYS-02', 'System Verification', 'Check Frontend Availability on Port 3000', async () => {
    const res = await fetch('http://localhost:3000');
    if (res.status !== 200) {
      throw new Error(`Frontend returned HTTP ${res.status}`);
    }
    const html = await res.text();
    if (!html.includes('Blood_Link') && !html.includes('root')) {
      throw new Error('Frontend HTML does not contain root div or app title');
    }
    return `Frontend HTTP 200 OK. Contains HTML root container.`;
  });

  // -------------------------------------------------------------------------
  // 2. AUTHENTICATION & LOGIN
  // -------------------------------------------------------------------------
  await runTest('AUTH-01', 'Authentication', 'Admin Login with Seed Credentials', async () => {
    const res = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@bloodlink.org', password: TEST_ADMIN_PASSWORD }),
    });
    if (res.status !== 200 || !res.data?.token || res.data?.user?.role !== 'admin') {
      throw new Error(`Login failed: ${JSON.stringify(res.data)}`);
    }
    adminToken = res.data.token;
    return `Admin authenticated. Token issued. Role: ${res.data.user.role}`;
  });

  await runTest('AUTH-02', 'Authentication', 'Donor Login with Seed Credentials', async () => {
    const res = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'donor@bloodlink.org', password: TEST_DONOR_PASSWORD }),
    });
    if (res.status !== 200 || !res.data?.token || res.data?.user?.role !== 'donor') {
      throw new Error(`Donor login failed: ${JSON.stringify(res.data)}`);
    }
    donorToken = res.data.token;
    return `Donor authenticated. Blood group: ${res.data.user.blood_group}, Availability: ${res.data.user.availability_status}`;
  });

  await runTest('AUTH-03', 'Authentication', 'Requester Login with Seed Credentials', async () => {
    const res = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'priya.sharma@example.com', password: TEST_REQUESTER_PASSWORD }),
    });
    if (res.status !== 200 || !res.data?.token || res.data?.user?.role !== 'requester') {
      throw new Error(`Requester login failed: ${JSON.stringify(res.data)}`);
    }
    requesterToken = res.data.token;
    return `Requester authenticated. Name: ${res.data.user.fullName}`;
  });

  await runTest('AUTH-04', 'Authentication', 'Second Requester Login (for Cross-Tenant check)', async () => {
    const res = await api('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'amitabh.joshi@example.com', password: TEST_REQUESTER_PASSWORD }),
    });
    if (res.status !== 200 || !res.data?.token) {
      throw new Error(`Second requester login failed: ${JSON.stringify(res.data)}`);
    }
    otherRequesterToken = res.data.token;
    return `Second requester authenticated for isolation testing.`;
  });

  // -------------------------------------------------------------------------
  // 3. MAIN END-TO-END WORKFLOW
  // -------------------------------------------------------------------------

  // Requester creates emergency blood request
  await runTest('FLOW-01', 'End-to-End Workflow', 'Requester Creates Emergency Blood Request', async () => {
    const res = await api('/requests', {
      method: 'POST',
      headers: { Authorization: `Bearer ${requesterToken}` },
      body: JSON.stringify({
        patientName: 'Sunil Rao',
        patientAge: 45,
        bloodGroup: 'O+',
        bloodComponent: 'Whole Blood',
        unitsRequired: 2,
        hospitalName: 'Ruby Hall Clinic & Research Center',
        hospitalAddress: '40 Sassoon Road, Sangamvadi, Pune',
        latitude: 18.5312,
        longitude: 73.8741,
        requiredDate: '2026-11-05',
        requiredTime: '15:00',
        priority: 'CRITICAL',
        additionalDetails: 'Acute trauma emergency. Immediate crossmatch needed.',
      }),
    });

    if (res.status !== 201 || !res.data?.requestId) {
      throw new Error(`Failed to create request: ${JSON.stringify(res.data)}`);
    }
    if (res.data.status !== 'PENDING_VERIFICATION') {
      throw new Error(`Expected initial status PENDING_VERIFICATION, got ${res.data.status}`);
    }
    testRequestId = res.data.requestId;
    return `Request #${testRequestId.slice(0, 8)} created in status PENDING_VERIFICATION.`;
  });

  // Admin views pending requests
  await runTest('FLOW-02', 'End-to-End Workflow', 'Admin Views Pending Verification Queue', async () => {
    const res = await api('/requests', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.status !== 200 || !Array.isArray(res.data?.requests)) {
      throw new Error(`Failed to fetch admin requests: ${JSON.stringify(res.data)}`);
    }
    const found = res.data.requests.find((r: any) => r.id === testRequestId);
    if (!found) {
      throw new Error(`Created test request ${testRequestId} not found in admin requests list`);
    }
    if (found.status !== 'PENDING_VERIFICATION') {
      throw new Error(`Expected PENDING_VERIFICATION, found ${found.status}`);
    }
    return `Found test request #${testRequestId.slice(0, 8)} in admin pending queue. Total requests: ${res.data.requests.length}`;
  });

  // Admin verifies test request and triggers matching
  await runTest('FLOW-03', 'End-to-End Workflow', 'Admin Clinically Verifies Request & Runs Matching Engine', async () => {
    const res = await api(`/admin/requests/${testRequestId}/verify`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.status !== 200 || !res.data?.success) {
      throw new Error(`Verification failed: ${JSON.stringify(res.data)}`);
    }
    if (typeof res.data.matchesFound !== 'number' || res.data.matchesFound === 0) {
      throw new Error(`Matching engine returned 0 matches: ${JSON.stringify(res.data)}`);
    }
    return `Request verified. Matching engine matched ${res.data.matchesFound} donors (5km: ${res.data.tiersSummary?.tier5km}, 10km: ${res.data.tiersSummary?.tier10km}, 25km: ${res.data.tiersSummary?.tier25km})`;
  });

  // Admin audit trail confirmation
  await runTest('FLOW-04', 'End-to-End Workflow', 'Confirm Admin Audit Trail Record', async () => {
    const res = await api('/admin/audit-logs', {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    if (res.status !== 200 || !Array.isArray(res.data?.logs)) {
      throw new Error(`Failed to fetch audit logs: ${JSON.stringify(res.data)}`);
    }
    const matchLog = res.data.logs.find((l: any) => l.target_id === testRequestId);
    if (!matchLog) {
      throw new Error(`Audit log for request ${testRequestId} not recorded`);
    }
    return `Audit action recorded: "${matchLog.action}" for target "${matchLog.target_type}" at ${matchLog.created_at}`;
  });

  // Donor views matched request
  await runTest('FLOW-05', 'End-to-End Workflow', 'Donor Receives Emergency Request in Feed', async () => {
    const res = await api('/donors/requests', {
      headers: { Authorization: `Bearer ${donorToken}` },
    });
    if (res.status !== 200 || !Array.isArray(res.data?.requests)) {
      throw new Error(`Failed to fetch donor requests: ${JSON.stringify(res.data)}`);
    }
    const found = res.data.requests.find((r: any) => r.request_id === testRequestId);
    if (!found) {
      throw new Error(`Verified request ${testRequestId} was not assigned to donor (O+) feed`);
    }
    return `Donor feed contains matched request #${testRequestId.slice(0, 8)} (${found.distance_km} km away, tier: ${found.search_radius_km}km).`;
  });

  // Donor expresses willingness to be contacted
  await runTest('FLOW-06', 'End-to-End Workflow', 'Donor Expresses Willingness to Donate', async () => {
    const res = await api(`/donors/requests/${testRequestId}/respond`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${donorToken}` },
      body: JSON.stringify({
        response: 'ACCEPTED',
        notes: 'Arriving at Ruby Hall blood bank reception within 30 minutes.',
      }),
    });
    if (res.status !== 200 || !res.data?.success) {
      throw new Error(`Failed to respond to request: ${JSON.stringify(res.data)}`);
    }
    if (!res.data.disclaimer) {
      throw new Error(`Response missing mandatory non-medical disclaimer`);
    }
    return `Willingness recorded. Status disclaimer present: "${res.data.disclaimer}"`;
  });

  // Check that duplicate response doesn't create duplicate records
  await runTest('FLOW-07', 'End-to-End Workflow', 'Duplicate Donor Response Prevention', async () => {
    const res = await api(`/donors/requests/${testRequestId}/respond`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${donorToken}` },
      body: JSON.stringify({
        response: 'ACCEPTED',
        notes: 'Updated note: On the way, ETA 20 mins.',
      }),
    });
    if (res.status !== 200 || !res.data?.success) {
      throw new Error(`Failed second response: ${JSON.stringify(res.data)}`);
    }
    // Verify match count on requester end is exactly 1 for this donor
    const reqRes = await api(`/requests/${testRequestId}`, {
      headers: { Authorization: `Bearer ${requesterToken}` },
    });
    const donorMatches = reqRes.data?.matches?.filter((m: any) => m.full_name?.includes('Arjun'));
    if (donorMatches.length > 1) {
      throw new Error(`Duplicate match records created! Count: ${donorMatches.length}`);
    }
    return `Response idempotently updated without creating duplicate match records (count: 1).`;
  });

  // Requester views donor response
  await runTest('FLOW-08', 'End-to-End Workflow', 'Requester Views Donor Response & Contact', async () => {
    const res = await api(`/requests/${testRequestId}`, {
      headers: { Authorization: `Bearer ${requesterToken}` },
    });
    if (res.status !== 200 || !res.data?.request) {
      throw new Error(`Failed to load request: ${JSON.stringify(res.data)}`);
    }
    const willing = res.data.matches?.find((m: any) => m.status === 'ACCEPTED');
    if (!willing) {
      throw new Error(`No accepted donor match found in requester view`);
    }
    return `Requester sees willing donor: ${willing.full_name} (${willing.blood_group}) located ${willing.distance_km} km away. Status: ${res.data.request.status}`;
  });

  // Requester cancels request
  await runTest('FLOW-09', 'End-to-End Workflow', 'Requester Cancels Request', async () => {
    const res = await api(`/requests/${testRequestId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${requesterToken}` },
    });
    if (res.status !== 200 || !res.data?.success) {
      throw new Error(`Cancel request failed: ${JSON.stringify(res.data)}`);
    }
    const check = await api(`/requests/${testRequestId}`, {
      headers: { Authorization: `Bearer ${requesterToken}` },
    });
    if (check.data?.request?.status !== 'CANCELLED') {
      throw new Error(`Expected status CANCELLED, got ${check.data?.request?.status}`);
    }
    return `Request #${testRequestId.slice(0, 8)} status updated to CANCELLED.`;
  });

  // Confirm cancelled request halts matching
  await runTest('FLOW-10', 'End-to-End Workflow', 'Cancelled Request Halts Matching & New Notifications', async () => {
    const res = await api(`/requests/${testRequestId}/matches`, {
      headers: { Authorization: `Bearer ${requesterToken}` },
    });
    if (res.status !== 200 || res.data?.candidates?.length !== 0) {
      throw new Error(`Cancelled request did not halt matching: returned ${res.data?.candidates?.length} candidates`);
    }
    return `Matching engine verified: returned 0 candidates for cancelled request.`;
  });

  // -------------------------------------------------------------------------
  // 4. AUTHORIZATION & CLINICAL SAFETY VERIFICATION
  // -------------------------------------------------------------------------

  await runTest('AUTHZ-01', 'Authorization Guards', 'Reject Unauthenticated Request to Protected Route', async () => {
    const res = await api('/donors/profile');
    if (res.status !== 401) {
      throw new Error(`Expected HTTP 401 Unauthorized, got ${res.status}`);
    }
    return `HTTP 401 correctly returned for missing Bearer token.`;
  });

  await runTest('AUTHZ-02', 'Authorization Guards', 'Reject Requester Token on Donor-Only Endpoint', async () => {
    const res = await api('/donors/profile', {
      headers: { Authorization: `Bearer ${requesterToken}` },
    });
    if (res.status !== 403) {
      throw new Error(`Expected HTTP 403 Forbidden, got ${res.status}`);
    }
    return `HTTP 403 correctly returned when requester attempts donor-only route.`;
  });

  await runTest('AUTHZ-03', 'Authorization Guards', 'Reject Donor Token on Admin-Only Endpoint', async () => {
    const res = await api('/admin/dashboard', {
      headers: { Authorization: `Bearer ${donorToken}` },
    });
    if (res.status !== 403) {
      throw new Error(`Expected HTTP 403 Forbidden, got ${res.status}`);
    }
    return `HTTP 403 correctly returned when donor attempts admin route.`;
  });

  await runTest('AUTHZ-04', 'Authorization Guards', 'Prevent Requester from Modifying Other Requester Request', async () => {
    const res = await api(`/requests/${testRequestId}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${otherRequesterToken}` },
    });
    if (res.status !== 403) {
      throw new Error(`Expected HTTP 403 Forbidden for cross-user modification, got ${res.status}`);
    }
    return `HTTP 403 correctly returned when unauthorized requester tries to cancel another user request.`;
  });

  // Underage donor registration rejection (< 18 years old)
  await runTest('SAFE-01', 'Clinical Safety', 'Reject Underage Donor Registration (< 18 Years)', async () => {
    const today = new Date();
    const sixteenYearsAgo = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate()).toISOString().split('T')[0];

    const res = await api('/auth/register/donor', {
      method: 'POST',
      body: JSON.stringify({
        fullName: 'Minor Teenager',
        email: 'minor@example.com',
        password: 'Password@123',
        mobile: '+91-9999900000',
        dateOfBirth: sixteenYearsAgo,
        bloodGroup: 'O+',
        state: 'Maharashtra',
        district: 'Pune',
        taluka: 'Haveli',
        locality: 'Camp',
        latitude: 18.5204,
        longitude: 73.8567,
        consentGiven: true,
      }),
    });

    if (res.status !== 400 || !res.data?.message?.toLowerCase().includes('18')) {
      throw new Error(`Expected HTTP 400 with 18-year age message, got ${res.status}: ${JSON.stringify(res.data)}`);
    }
    return `HTTP 400 rejected: "${res.data.message}"`;
  });

  // Invalid Blood Group rejection
  await runTest('SAFE-02', 'Clinical Safety', 'Reject Invalid Blood Group (e.g. X+)', async () => {
    const res = await api('/requests', {
      method: 'POST',
      headers: { Authorization: `Bearer ${requesterToken}` },
      body: JSON.stringify({
        patientName: 'Test Patient',
        patientAge: 30,
        bloodGroup: 'X+',
        unitsRequired: 1,
        hospitalName: 'Ruby Hall Clinic',
        hospitalAddress: 'Pune',
        latitude: 18.53,
        longitude: 73.87,
        requiredDate: '2026-11-05',
        requiredTime: '12:00',
        priority: 'CRITICAL',
      }),
    });

    if (res.status !== 400) {
      throw new Error(`Expected HTTP 400 for invalid blood group, got ${res.status}`);
    }
    return `HTTP 400 rejected invalid blood group X+.`;
  });

  // Invalid Units Required rejection
  await runTest('SAFE-03', 'Clinical Safety', 'Reject Invalid Units Required (e.g. 0 or negative)', async () => {
    const res = await api('/requests', {
      method: 'POST',
      headers: { Authorization: `Bearer ${requesterToken}` },
      body: JSON.stringify({
        patientName: 'Test Patient',
        patientAge: 30,
        bloodGroup: 'A+',
        unitsRequired: 0,
        hospitalName: 'Ruby Hall Clinic',
        hospitalAddress: 'Pune',
        latitude: 18.53,
        longitude: 73.87,
        requiredDate: '2026-11-05',
        requiredTime: '12:00',
        priority: 'CRITICAL',
      }),
    });

    if (res.status !== 400) {
      throw new Error(`Expected HTTP 400 for 0 units required, got ${res.status}`);
    }
    return `HTTP 400 rejected 0 units required.`;
  });

  // Geographical Distance Formula Accuracy test
  await runTest('SAFE-04', 'Mathematical Accuracy', 'Verify Haversine Distance Calculation Accuracy', async () => {
    // Known distance: Pune Railway Station (18.5289, 73.8744) to Swargate (18.5018, 73.8586) is approx 3.4 km
    const dist = calculateHaversineDistanceKm(18.5289, 73.8744, 18.5018, 73.8586);
    if (dist < 3.0 || dist > 3.8) {
      throw new Error(`Haversine formula inaccuracy: expected ~3.4km, got ${dist}km`);
    }
    return `Pune Stn to Swargate calculated as ${dist} km (accurately within expected range).`;
  });

  // -------------------------------------------------------------------------
  // FINAL RESULTS SUMMARY
  // -------------------------------------------------------------------------
  console.log('\n======================================================');
  console.log('📊 QA AUDIT RESULTS SUMMARY');
  console.log('======================================================');
  const passed = results.filter((r) => r.status === 'PASSED').length;
  const failed = results.filter((r) => r.status === 'FAILED').length;
  console.log(`Total Tests Executed: ${results.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Success Rate: ${Math.round((passed / results.length) * 100)}%\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
