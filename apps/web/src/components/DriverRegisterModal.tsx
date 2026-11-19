import React, { useState } from 'react';
import { UserProfile, DriverDetails, TravelCategory } from '../types/auth';

interface DriverRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onRegisteredSuccess: (updatedUser: UserProfile) => void;
}

export const DriverRegisterModal: React.FC<DriverRegisterModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onRegisteredSuccess,
}) => {
  const [licenseNumber, setLicenseNumber] = useState('UK07-20240058291');
  const [vehicleModel, setVehicleModel] = useState('Maruti Swift VXi');
  const [vehiclePlate, setVehiclePlate] = useState('UK 07 AB 9182');
  const [vehicleCategory, setVehicleCategory] = useState<TravelCategory>('hatchback');
  const [vehicleColor, setVehicleColor] = useState('Pearl Arctic White');
  const [seatingCapacity, setSeatingCapacity] = useState(4);
  const [hasAc, setHasAc] = useState(true);
  const [agreedGuidelines, setAgreedGuidelines] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedGuidelines) {
      alert('Please agree to the CampusRide safety code and cost-sharing compliance.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);

      const driverDetails: DriverDetails = {
        licenseNumber: licenseNumber.trim().toUpperCase(),
        vehicleModel: vehicleModel.trim(),
        vehiclePlate: vehiclePlate.trim().toUpperCase(),
        vehicleCategory,
        vehicleColor: vehicleColor.trim(),
        seatingCapacity,
        hasAc,
        verifiedAt: new Date().toISOString().split('T')[0] ?? '2026-11-19',
      };

      const updatedUser: UserProfile = {
        ...currentUser,
        trustTier: 'T2',
        driverVerified: true,
        driverDetails,
      };

      onRegisteredSuccess(updatedUser);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 px-6 py-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner">
              🚗
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight">Driver & Vehicle Registration</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-400 text-amber-950 uppercase">
                  Trust Tier 2
                </span>
              </div>
              <p className="text-xs text-emerald-100 font-medium">
                Mandatory document & safety verification to offer rides on UPES campuses
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

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {/* Safety Notice Banner */}
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-start gap-3">
            <span className="text-xl">🛡️</span>
            <div className="text-xs text-emerald-900 leading-relaxed">
              <span className="font-bold">Campus Trust Guarantee:</span> Only verified UPES students and staff with a valid Driving License and registered vehicle can offer rides. This protects both drivers and co-passengers.
            </div>
          </div>

          {/* Section 1: Driving License */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span>1. Official Driving License</span>
              <span className="text-[10px] font-bold text-slate-400">(RTO Verified)</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Indian Driving License (DL) Number
              </label>
              <input
                type="text"
                required
                placeholder="e.g. UK07-20230018942"
                value={licenseNumber}
                onChange={(e) => setLicenseNumber(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Format: State code (UK07 for Dehradun) + Issue Year + 7-digit ID.
              </p>
            </div>
          </div>

          {/* Section 2: Vehicle Details */}
          <div className="space-y-3 pt-2 border-t border-slate-100">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span>2. Vehicle Information</span>
              <span className="text-[10px] font-bold text-slate-400">(RC Details)</span>
            </h3>

            {/* Travel Category Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Vehicle Type / Travel Category
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  { id: 'moto', label: 'Moto (Bike/Scooter)', icon: '🏍️', cap: 1 },
                  { id: 'auto', label: 'Shared Auto', icon: '🛺', cap: 3 },
                  { id: 'hatchback', label: 'Hatchback (Swift, i20)', icon: '🚗', cap: 4 },
                  { id: 'sedan', label: 'Sedan (City, Dzire)', icon: '🚘', cap: 4 },
                  { id: 'suv', label: 'SUV (Nexon, Brezza)', icon: '🚙', cap: 6 },
                ].map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setVehicleCategory(cat.id as TravelCategory);
                      setSeatingCapacity(cat.cap);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition flex items-center gap-2 ${
                      vehicleCategory === cat.id
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 text-slate-700 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <span className="text-lg">{cat.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">{cat.label.split(' ')[0]}</p>
                      <p className="text-[10px] text-slate-500">Max {cat.cap} seats</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Vehicle Model & Registration Number */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Vehicle Make & Model
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tata Nexon or Activa 6G"
                  value={vehicleModel}
                  onChange={(e) => setVehicleModel(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Vehicle Registration Plate (RC)
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UK 07 AB 1234"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
                />
              </div>
            </div>

            {/* Color & Seating Capacity */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Color</label>
                <input
                  type="text"
                  placeholder="e.g. White, Grey, Red"
                  value={vehicleColor}
                  onChange={(e) => setVehicleColor(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Max Passenger Seats</label>
                <select
                  value={seatingCapacity}
                  onChange={(e) => setSeatingCapacity(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
                >
                  <option value={1}>1 Seat (Bike/Scooter)</option>
                  <option value={2}>2 Seats</option>
                  <option value={3}>3 Seats (Auto / Compact)</option>
                  <option value={4}>4 Seats (Hatchback/Sedan)</option>
                  <option value={6}>6 Seats (SUV / XL)</option>
                </select>
              </div>

              <div className="col-span-2 sm:col-span-1 flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={hasAc}
                    onChange={(e) => setHasAc(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <span>❄️ Air Conditioned</span>
                </label>
              </div>
            </div>
          </div>

          {/* Section 3: Statutory Code of Conduct & Consent */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={agreedGuidelines}
                onChange={(e) => setAgreedGuidelines(e.target.checked)}
                className="w-4 h-4 mt-0.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
              />
              <span className="text-[11px] text-slate-700 leading-snug">
                I certify that I hold a valid Indian driving license, valid vehicle insurance, and pollution certificate. I agree to the <span className="font-bold">strict voluntary cost-sharing policy under Section 66 of the Motor Vehicles Act</span> (no commercial profit, zero commission).
              </span>
            </label>
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-bold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <span>Submitting & Verifying...</span>
              ) : (
                <>
                  <span>Complete Verification & Unlock Driver Mode</span>
                  <span>🛡️</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
