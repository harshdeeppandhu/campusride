import React, { useState } from 'react';
import { UserProfile, PassengerBookingRequest } from '../types/auth';

interface DriverDashboardProps {
  currentUser: UserProfile;
  onPublishRideClick: () => void;
  onSwitchToPassengerView: () => void;
  driverRides: any[];
  onCancelRide: (rideId: string) => void;
}

export const DriverDashboard: React.FC<DriverDashboardProps> = ({
  currentUser,
  onPublishRideClick,
  onSwitchToPassengerView,
  driverRides,
  onCancelRide,
}) => {
  // Sample/interactive booking requests from passengers
  const [requests, setRequests] = useState<PassengerBookingRequest[]>([
    {
      id: 'req-1',
      rideId: 'ride-1',
      passengerId: 'p-1',
      passengerName: 'Ananya Verma',
      passengerAvatar:
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      passengerGender: 'female',
      passengerCampus: 'bidholi',
      passengerPhone: '+91 98765 11223',
      seats: 1,
      totalPaise: 18000,
      status: 'pending',
      requestedAt: '10 mins ago',
      origin: 'Bidholi Campus Gate 2',
      destination: 'Jolly Grant Airport',
      pickupNote: 'Have 1 medium cabin trolley. Standing near Nescafe.',
    },
    {
      id: 'req-2',
      rideId: 'ride-1',
      passengerId: 'p-2',
      passengerName: 'Rohit Joshi',
      passengerAvatar:
        'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
      passengerGender: 'male',
      passengerCampus: 'bidholi',
      passengerPhone: '+91 98112 33445',
      seats: 1,
      totalPaise: 18000,
      status: 'pending',
      requestedAt: '25 mins ago',
      origin: 'Bidholi Campus Gate 1',
      destination: 'Jolly Grant Airport',
      pickupNote: 'Going for evening Indigo flight. Will wait outside gate.',
    },
  ]);

  const [activeTab, setActiveTab] = useState<'rides' | 'requests'>('rides');

  const handleAcceptRequest = (requestId: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'accepted' as const } : r))
    );
  };

  const handleDeclineRequest = (requestId: string) => {
    setRequests((prev) =>
      prev.map((r) => (r.id === requestId ? { ...r, status: 'declined' as const } : r))
    );
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Driver Identity Card & Vehicle Profile */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-slate-700">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-5">
            <div className="relative">
              <img
                src={currentUser.avatar}
                alt={currentUser.name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover ring-4 ring-emerald-500/30 shadow-lg"
              />
              <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-1 rounded-lg text-xs shadow-xs">
                🛡️
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">{currentUser.name}</h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span>✓</span>
                  <span>Verified Campus Driver</span>
                </span>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-700 text-slate-300">
                  Tier 2
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                {currentUser.department ?? 'UPES Community'} ·{' '}
                <span className="text-emerald-400 capitalize">{currentUser.campus} Campus</span>
              </p>

              {/* Verified Vehicle Badge */}
              {currentUser.driverDetails && (
                <div className="mt-3 flex items-center gap-2 flex-wrap text-xs bg-slate-800/80 border border-slate-700/60 px-3 py-1.5 rounded-xl w-fit">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span>🚗</span>
                    <span>{currentUser.driverDetails.vehicleModel}</span>
                  </span>
                  <span className="text-slate-500">|</span>
                  <span className="font-mono text-emerald-400 font-bold">
                    {currentUser.driverDetails.vehiclePlate}
                  </span>
                  <span className="text-slate-500">|</span>
                  <span className="text-slate-400">
                    {currentUser.driverDetails.seatingCapacity} Passenger Seats
                  </span>
                  {currentUser.driverDetails.hasAc && (
                    <span className="px-1.5 py-0.5 rounded bg-blue-900/50 text-blue-300 text-[10px] font-semibold">
                      AC
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onPublishRideClick}
              className="flex-1 sm:flex-none px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 hover:-translate-y-0.5"
            >
              <span>+</span>
              <span>Publish New Dehradun Ride</span>
            </button>
            <button
              type="button"
              onClick={onSwitchToPassengerView}
              className="px-4 py-3 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl text-xs sm:text-sm transition border border-white/10 flex items-center gap-1.5"
            >
              <span>🎒</span>
              <span>View as Passenger</span>
            </button>
          </div>
        </div>

        {/* Driver Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800">
          <div>
            <p className="text-xs text-slate-400">Rides Offered</p>
            <p className="text-xl font-black text-white mt-0.5">
              {currentUser.totalRidesOffered > 0 ? currentUser.totalRidesOffered : driverRides.length}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Safety & Trust Rating</p>
            <p className="text-xl font-black text-amber-400 mt-0.5 flex items-center gap-1">
              <span>★</span>
              <span>{currentUser.rating.toFixed(2)}</span>
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Pending Requests</p>
            <p className="text-xl font-black text-emerald-400 mt-0.5">{pendingCount} Waiting</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Statutory Compliance</p>
            <p className="text-xs font-bold text-slate-300 mt-1">Non-Profit Cost Share (MVA §66)</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-6">
          <button
            type="button"
            onClick={() => setActiveTab('rides')}
            className={`pb-3 text-sm font-black transition relative ${
              activeTab === 'rides'
                ? 'text-emerald-700 border-b-2 border-emerald-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            My Published Rides ({driverRides.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('requests')}
            className={`pb-3 text-sm font-black transition relative flex items-center gap-2 ${
              activeTab === 'requests'
                ? 'text-emerald-700 border-b-2 border-emerald-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Passenger Requests</span>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-black bg-emerald-600 text-white">
                {pendingCount}
              </span>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={onPublishRideClick}
          className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
        >
          <span>+</span>
          <span>Offer Another Trip</span>
        </button>
      </div>

      {/* Tab 1: Published Rides */}
      {activeTab === 'rides' && (
        <div className="space-y-4">
          {driverRides.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-200/80 p-6">
              <span className="text-4xl block mb-2">🚗</span>
              <h3 className="text-base font-bold text-slate-800">You haven't offered any rides yet</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                Share your daily commute between Kandoli/Bidholi and Dehradun hubs to split fuel costs and help fellow students.
              </p>
              <button
                type="button"
                onClick={onPublishRideClick}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-600/20"
              >
                Publish Your First Ride
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {driverRides.map((ride) => (
                <div
                  key={ride.id}
                  className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs hover:shadow-md transition space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {ride.vehicle.categoryLabel ?? ride.vehicle.category}
                        </span>
                        {ride.isWomenOnly && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            👩 Women Only
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 mt-2">
                        {ride.origin} → {ride.destination}
                      </h4>
                      <p className="text-xs text-slate-500">Departure: {ride.departureTime}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-black text-slate-900">₹{ride.contributionInr}</span>
                      <p className="text-[10px] text-slate-400">per seat</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <span>💺</span>
                      <span className="font-bold">{ride.seatsLeft}</span> of {ride.totalSeats} seats open
                    </span>
                    <button
                      type="button"
                      onClick={() => onCancelRide(ride.id)}
                      className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline"
                    >
                      Cancel Ride
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Passenger Requests */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {requests.map((req) => (
            <div
              key={req.id}
              className={`p-5 rounded-2xl border transition ${
                req.status === 'accepted'
                  ? 'bg-emerald-50/50 border-emerald-200'
                  : req.status === 'declined'
                  ? 'bg-slate-50 border-slate-200 opacity-60'
                  : 'bg-white border-slate-200/80 shadow-xs'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  <img
                    src={req.passengerAvatar}
                    alt={req.passengerName}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-500/20"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{req.passengerName}</h4>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                        Verified Student ({req.passengerCampus})
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Requested {req.seats} Seat · Requested {req.requestedAt}
                    </p>
                    {req.pickupNote && (
                      <p className="text-xs text-slate-600 italic mt-1.5 bg-slate-50 p-2 rounded-lg border border-slate-100">
                        "{req.pickupNote}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Status or Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center">
                  {req.status === 'pending' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDeclineRequest(req.id)}
                        className="px-3.5 py-2 border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold text-xs rounded-xl transition"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAcceptRequest(req.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5"
                      >
                        <span>✓</span>
                        <span>Accept Passenger</span>
                      </button>
                    </>
                  ) : req.status === 'accepted' ? (
                    <div className="flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                        <span>✓</span>
                        <span>Booking Confirmed</span>
                      </span>
                      <span className="text-xs font-mono text-slate-500">{req.passengerPhone}</span>
                    </div>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-600">
                      Declined
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
