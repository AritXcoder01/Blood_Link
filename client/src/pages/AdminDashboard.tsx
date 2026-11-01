import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  Users,
  Droplet,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Activity,
  Search,
  Filter,
  FileCheck2,
  Building2,
  Calendar,
  Clock,
  Send,
  Eye,
  BarChart3,
  UserX,
  UserCheck,
} from 'lucide-react';
import { PriorityBadge } from '../components/PriorityBadge';
import { StatusBadge } from '../components/StatusBadge';
import { MedicalDisclaimer } from '../components/MedicalDisclaimer';

export const AdminDashboard: React.FC = () => {
  const { token } = useAuth();

  const [stats, setStats] = useState<any | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'verification' | 'users' | 'requests' | 'analytics' | 'logs'>('verification');
  const [isLoading, setIsLoading] = useState(true);

  // Rejection modal
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isVerifying, setIsVerifying] = useState<string | null>(null);
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null);

  // User search/filter
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userSearchQuery, setUserSearchQuery] = useState('');

  const fetchAdminData = async () => {
    if (!token) return;
    try {
      const [dashRes, reqsRes, usersRes, logsRes] = await Promise.all([
        fetch('/api/v1/admin/dashboard', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/requests', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/admin/users', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/v1/admin/audit-logs', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      const [dashData, reqsData, usersData, logsData] = await Promise.all([
        dashRes.json(),
        reqsRes.json(),
        usersRes.json(),
        logsRes.json(),
      ]);

      if (dashData.success) setStats(dashData.stats);
      if (reqsData.success) setRequests(reqsData.requests || []);
      if (usersData.success) setUsers(usersData.users || []);
      if (logsData.success) setAuditLogs(logsData.logs || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [token]);

  const handleVerifyRequest = async (id: string) => {
    if (!token) return;
    setIsVerifying(id);
    setVerificationFeedback(null);

    try {
      const res = await fetch(`/api/v1/admin/requests/${id}/verify`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setVerificationFeedback(data.message);
        await fetchAdminData();
      }
    } catch (err) {
      console.error('Error verifying request:', err);
    } finally {
      setIsVerifying(null);
    }
  };

  const handleRejectRequest = async () => {
    if (!token || !rejectingId) return;

    try {
      const res = await fetch(`/api/v1/admin/requests/${rejectingId}/reject`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const data = await res.json();
      if (data.success) {
        setRejectingId(null);
        setRejectReason('');
        await fetchAdminData();
      }
    } catch (err) {
      console.error('Error rejecting request:', err);
    }
  };

  const handleToggleUserStatus = async (userId: string, currentStatus: string) => {
    if (!token) return;
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    if (!window.confirm(`Are you sure you want to change user status to ${newStatus}?`)) return;

    try {
      const res = await fetch(`/api/v1/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchAdminData();
      }
    } catch (err) {
      console.error('Error toggling user status:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-xs text-gray-500">
        Loading administrative portal...
      </div>
    );
  }

  const pendingRequests = requests.filter((r) => r.status === 'PENDING_VERIFICATION');

  const filteredUsers = users.filter((u) => {
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    const matchesSearch =
      u.full_name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.mobile?.includes(userSearchQuery) ||
      u.blood_group?.toLowerCase().includes(userSearchQuery.toLowerCase());
    return matchesRole && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* 1. ADMIN HEADER */}
      <div className="rounded-3xl bg-charcoal-900 text-white p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-charcoal-800">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blood-900 text-blood-200 text-xs font-semibold border border-blood-700/60">
            <Shield className="w-3.5 h-3.5 text-blood-400" />
            Central Medical Desk & Operations
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Administrator Portal
          </h1>
          <p className="text-xs text-gray-400">
            Verify emergency requests, supervise matching tiers, and manage verified donor registry.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-xs font-bold text-emerald-400">Core Matching Engine Active</span>
        </div>
      </div>

      {/* 2. HIGH-LEVEL KPI METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-gray-500">Total Donors</span>
          <p className="text-2xl font-black text-charcoal-900">{stats?.totalDonors || 0}</p>
          <span className="text-[10px] text-emerald-600 font-medium">Voluntary registered</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-gray-500">Total Requesters</span>
          <p className="text-2xl font-black text-charcoal-900">{stats?.totalRequesters || 0}</p>
          <span className="text-[10px] text-gray-500">Patients & attendants</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-gray-500">Total Requests</span>
          <p className="text-2xl font-black text-charcoal-900">{stats?.totalRequests || 0}</p>
          <span className="text-[10px] text-gray-500">All recorded</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-gray-500">Active Requests</span>
          <p className="text-2xl font-black text-blood-700">{stats?.activeRequests || 0}</p>
          <span className="text-[10px] text-blood-700 font-medium">Matching/Coord</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-gray-500">Pending Review</span>
          <p className="text-2xl font-black text-amber-600">{stats?.pendingVerification || 0}</p>
          <span className="text-[10px] text-amber-700 font-medium">Requires verification</span>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-1">
          <span className="text-[11px] font-semibold text-gray-500">Fulfilled Safe</span>
          <p className="text-2xl font-black text-emerald-600">{stats?.fulfilledRequests || 0}</p>
          <span className="text-[10px] text-gray-500">Transfused</span>
        </div>
      </div>

      {verificationFeedback && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{verificationFeedback}</span>
          </div>
          <button
            onClick={() => setVerificationFeedback(null)}
            className="text-xs font-bold text-emerald-800 underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3. NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto text-xs font-bold">
        {[
          { id: 'verification', label: `Pending Verification (${pendingRequests.length})`, icon: FileCheck2 },
          { id: 'requests', label: `All Requests (${requests.length})`, icon: Droplet },
          { id: 'users', label: `User Management (${users.length})`, icon: Users },
          { id: 'analytics', label: 'Analytics & Blood Matrix', icon: BarChart3 },
          { id: 'logs', label: `Audit Trail (${auditLogs.length})`, icon: Activity },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2.5 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-blood-700 text-white shadow-sm'
                : 'text-charcoal-700 hover:bg-gray-100'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT 1: PENDING VERIFICATION QUEUE */}
      {activeTab === 'verification' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-charcoal-900 tracking-tight flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-amber-600" />
              Emergency Request Clinical Verification Queue
            </h2>
            <p className="text-xs text-gray-500">
              To prevent false alarms, requests must be verified before the core matching engine dispatches notifications to nearby donors.
            </p>
          </div>

          {pendingRequests.length === 0 ? (
            <div className="p-12 rounded-2xl bg-white border border-gray-200 text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <h3 className="text-sm font-bold text-charcoal-900">Queue Clear!</h3>
              <p className="text-xs text-gray-500">All registered blood requests have been verified or addressed.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingRequests.map((req) => (
                <div
                  key={req.id}
                  className="p-6 rounded-2xl bg-white border border-amber-200 shadow-sm space-y-4 text-xs text-charcoal-800"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <PriorityBadge priority={req.priority} />
                      <span className="font-bold text-base text-charcoal-900">
                        {req.patient_name} (Age: {req.patient_age})
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blood-50 text-blood-700 border border-blood-200">
                        {req.blood_group}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleVerifyRequest(req.id)}
                        disabled={isVerifying === req.id}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm transition flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        {isVerifying === req.id ? 'Running Match Engine...' : 'Verify & Dispatch Matches'}
                      </button>

                      <button
                        onClick={() => {
                          setRejectingId(req.id);
                          setRejectReason('');
                        }}
                        className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl font-semibold border border-red-200 transition"
                      >
                        Reject
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <span className="text-gray-500 text-[11px] block">Hospital Details:</span>
                      <strong className="text-charcoal-900">{req.hospital_name}</strong>
                      <p className="text-[11px] text-gray-600">{req.hospital_address}</p>
                    </div>

                    <div>
                      <span className="text-gray-500 text-[11px] block">Component & Units:</span>
                      <strong className="text-charcoal-900">{req.blood_component}</strong>
                      <p className="text-[11px] text-gray-600">Requirement: {req.units_required} unit(s)</p>
                    </div>

                    <div>
                      <span className="text-gray-500 text-[11px] block">Requester Contact:</span>
                      <strong className="text-charcoal-900">{req.requester_name}</strong>
                      <p className="text-[11px] text-blood-700 font-bold">{req.requester_mobile}</p>
                    </div>
                  </div>

                  {req.additional_details && (
                    <div className="p-3 bg-gray-50 rounded-xl text-gray-700 text-[11px] italic">
                      &quot;{req.additional_details}&quot;
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT 2: ALL REQUESTS */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-xs text-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left divide-y divide-gray-200">
                <thead className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Patient</th>
                    <th className="py-3 px-4">Group</th>
                    <th className="py-3 px-4">Component</th>
                    <th className="py-3 px-4">Hospital</th>
                    <th className="py-3 px-4">Priority</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Matches</th>
                    <th className="py-3 px-4">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {requests.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50/60">
                      <td className="py-3 px-4 font-bold text-charcoal-900">{r.patient_name}</td>
                      <td className="py-3 px-4 font-black text-blood-700">{r.blood_group}</td>
                      <td className="py-3 px-4">{r.blood_component}</td>
                      <td className="py-3 px-4 text-gray-600">{r.hospital_name}</td>
                      <td className="py-3 px-4">
                        <PriorityBadge priority={r.priority} />
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={r.status} size="sm" />
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-700">
                        {r.accepted_count || 0} / {r.matches_count || 0}
                      </td>
                      <td className="py-3 px-4 text-gray-500">{r.required_date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative max-w-sm w-full">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search by name, email, phone, blood group..."
                value={userSearchQuery}
                onChange={(e) => setUserSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-gray-300 text-xs focus:ring-2 focus:ring-blood-700 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl text-xs font-semibold">
              {['all', 'donor', 'requester', 'admin'].map((role) => (
                <button
                  key={role}
                  onClick={() => setUserRoleFilter(role)}
                  className={`px-3 py-1.5 rounded-lg capitalize transition ${
                    userRoleFilter === role ? 'bg-white shadow-xs text-charcoal-900 font-bold' : 'text-gray-600'
                  }`}
                >
                  {role}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-xs text-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left divide-y divide-gray-200">
                <thead className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Email & Phone</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Blood Group</th>
                    <th className="py-3 px-4">Locality</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map((u) => {
                    const isSuspended = u.status === 'suspended';
                    return (
                      <tr key={u.id} className="hover:bg-gray-50/60">
                        <td className="py-3 px-4 font-bold text-charcoal-900">{u.full_name}</td>
                        <td className="py-3 px-4">
                          <p>{u.email}</p>
                          <span className="text-[10px] text-gray-500">{u.mobile}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-gray-100 text-charcoal-700">
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-black text-blood-700">{u.blood_group || '-'}</td>
                        <td className="py-3 px-4 text-gray-600">{u.locality || u.district || '-'}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              isSuspended ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {u.role !== 'admin' && (
                            <button
                              onClick={() => handleToggleUserStatus(u.id, u.status)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                                isSuspended
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : 'bg-red-50 text-red-700 hover:bg-red-100'
                              }`}
                            >
                              {isSuspended ? 'Activate' : 'Suspend'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: ANALYTICS & BLOOD MATRIX */}
      {activeTab === 'analytics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-xs text-charcoal-800">
          <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-4">
            <h3 className="font-bold text-charcoal-900 text-sm">
              Registered Voluntary Donors by Blood Group
            </h3>
            <div className="space-y-3">
              {stats?.donorsByBloodGroup?.map((d: any) => (
                <div key={d.blood_group} className="space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span className="text-blood-700 font-bold">{d.blood_group}</span>
                    <span>{d.count} donors</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-blood-700 h-2 rounded-full"
                      style={{ width: `${Math.min(100, (Number(d.count) / 10) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-white border border-gray-200 shadow-xs space-y-4">
            <h3 className="font-bold text-charcoal-900 text-sm">Emergency Requests by Urgency Level</h3>
            <div className="space-y-3">
              {stats?.requestsByPriority?.map((p: any) => (
                <div key={p.priority} className="space-y-1">
                  <div className="flex justify-between font-semibold">
                    <span>{p.priority}</span>
                    <span>{p.count} requests</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        p.priority === 'CRITICAL'
                          ? 'bg-red-600'
                          : p.priority === 'URGENT'
                          ? 'bg-amber-500'
                          : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(100, (Number(p.count) / 5) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 5: AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden shadow-xs text-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left divide-y divide-gray-200">
                <thead className="bg-gray-50 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Timestamp</th>
                    <th className="py-3 px-4">Admin</th>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Target Type</th>
                    <th className="py-3 px-4">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/60">
                      <td className="py-3 px-4 text-gray-500 font-mono text-[10px]">{log.created_at}</td>
                      <td className="py-3 px-4 font-semibold text-charcoal-900">{log.admin_name}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-[11px] font-bold text-blood-700">{log.action}</span>
                      </td>
                      <td className="py-3 px-4 capitalize">{log.target_type}</td>
                      <td className="py-3 px-4 text-gray-600">{log.details}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <MedicalDisclaimer />

      {/* REJECT MODAL */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-gray-200 text-xs text-charcoal-800">
            <h3 className="text-base font-bold text-charcoal-900">Reject Emergency Request</h3>
            <p className="text-gray-500">
              Provide an official clinical or administrative reason for rejecting this blood request.
            </p>

            <textarea
              rows={3}
              required
              placeholder="e.g. Hospital admission could not be verified with blood bank desk."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blood-700 focus:outline-none"
            />

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectingId(null)}
                className="px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRejectRequest}
                className="px-5 py-2.5 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold shadow"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
