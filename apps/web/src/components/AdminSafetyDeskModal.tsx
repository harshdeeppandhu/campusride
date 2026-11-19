import React, { useState } from 'react';

export interface PendingDriverRequest {
  id: string;
  userId: string;
  name: string;
  email: string;
  gender: 'female' | 'male' | 'other';
  campus: 'bidholi' | 'kandoli';
  department: string;
  licenseNumber: string;
  vehicleModel: string;
  vehiclePlate: string;
  vehicleCategory: string;
  seatingCapacity: number;
  hasAc: boolean;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
}

interface AdminSafetyDeskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApproveDriver: (requestId: string, driverUserId: string) => void;
}

export const AdminSafetyDeskModal: React.FC<AdminSafetyDeskModalProps> = ({
  isOpen,
  onClose,
  onApproveDriver,
}) => {
  const [requests, setRequests] = useState<PendingDriverRequest[]>([
    {
      id: 'req-dl-101',
      userId: 'user-priya',
      name: 'Priya Sharma',
      email: 'priya.sharma@stu.upes.ac.in',
      gender: 'female',
      campus: 'bidholi',
      department: 'School of Engineering',
      licenseNumber: 'UK07-20230091823',
      vehicleModel: 'Hyundai i20 Sportz',
      vehiclePlate: 'UK 07 AF 3311',
      vehicleCategory: 'Hatchback (Uber Go style)',
      seatingCapacity: 4,
      hasAc: true,
      submittedAt: 'Today, 2:15 PM',
      status: 'pending',
    },
    {
      id: 'req-dl-102',
      userId: 'user-rohit',
      name: 'Rohit Negi',
      email: 'rohit.negi@stu.upes.ac.in',
      gender: 'male',
      campus: 'kandoli',
      department: 'School of Law',
      licenseNumber: 'UK07-20220044129',
      vehicleModel: 'Royal Enfield Hunter 350',
      vehiclePlate: 'UK 07 BK 8820',
      vehicleCategory: 'Moto / Bike (Rapido style)',
      seatingCapacity: 1,
      hasAc: false,
      submittedAt: 'Today, 11:40 AM',
      status: 'pending',
    },
  ]);

  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  if (!isOpen) return null;

  const handleApprove = (req: PendingDriverRequest) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === req.id ? { ...r, status: 'approved' as const } : r))
    );
    onApproveDriver(req.id, req.userId);
  };

  const handleReject = (reqId: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === reqId ? { ...r, status: 'rejected' as const } : r))
    );
  };

  const displayed = filter === 'pending' ? requests.filter((r) => r.status === 'pending') : requests;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-xl">
              🛡️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">Campus Safety & Verification Desk</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950 uppercase">
                  Zero-Fee Campus Model
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Peer & Admin review of Driving Licenses (DL), Vehicle RC, and Women-Safety privileges
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition text-lg"
          >
            ×
          </button>
        </div>

        {/* Filter bar */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setFilter('pending')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                filter === 'pending'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Pending Reviews ({requests.filter((r) => r.status === 'pending').length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                filter === 'all'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              All Submissions ({requests.length})
            </button>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Compliant with Motor Vehicles Act §66 & Campus Safety Policy
          </span>
        </div>

        {/* Submissions list */}
        <div className="p-6 overflow-y-auto space-y-4">
          {displayed.length === 0 ? (
            <div className="text-center py-12 text-slate-400 space-y-2">
              <span className="text-3xl block">✨</span>
              <p className="text-sm font-bold text-slate-700">Verification Queue is Clear!</p>
              <p className="text-xs text-slate-500">All submitted student driving documents have been processed.</p>
            </div>
          ) : (
            displayed.map((req) => (
              <div
                key={req.id}
                className={`p-5 rounded-2xl border transition ${
                  req.status === 'approved'
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : req.status === 'rejected'
                    ? 'bg-rose-50/40 border-rose-200 opacity-60'
                    : 'bg-white border-slate-200/90 shadow-xs'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left: Driver details */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-black text-slate-900">{req.name}</h4>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-800">
                        {req.email}
                      </span>
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 capitalize">
                        {req.campus} Campus ({req.department})
                      </span>
                      {req.gender === 'female' && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-800">
                          👩 Female Driver Eligible
                        </span>
                      )}
                    </div>

                    {/* Driving License & RC details */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          Driving License (RTO Dehradun)
                        </span>
                        <span className="font-mono font-bold text-slate-800">{req.licenseNumber}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold">
                          Vehicle Registration (RC Plate)
                        </span>
                        <span className="font-mono font-bold text-emerald-700">{req.vehiclePlate}</span>
                      </div>
                      <div className="sm:col-span-2 flex items-center gap-2 text-slate-600 mt-1 pt-1 border-t border-slate-200/60">
                        <span className="font-semibold text-slate-800">🚗 {req.vehicleModel}</span>
                        <span>·</span>
                        <span>{req.vehicleCategory}</span>
                        <span>·</span>
                        <span>{req.seatingCapacity} Passenger Seats</span>
                        {req.hasAc && (
                          <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 text-[10px] font-bold rounded">
                            AC
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400">Submitted: {req.submittedAt}</p>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                    {req.status === 'pending' ? (
                      <>
                        <button
                          type="button"
                          onClick={() => handleApprove(req)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                        >
                          <span>✓</span>
                          <span>Approve Tier 2</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(req.id)}
                          className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-xs rounded-xl transition"
                        >
                          Request Re-upload
                        </button>
                      </>
                    ) : req.status === 'approved' ? (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <span>✓</span>
                        <span>Approved & Verified (Tier 2)</span>
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                        Rejected / Re-upload Required
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-500">
          Peer-reviewed by designated UPES Campus Safety Admins · Zero third-party fees · DPDP Act Compliant (30-day retention)
        </div>
      </div>
    </div>
  );
};
