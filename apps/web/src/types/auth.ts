export type TravelCategory = 'moto' | 'auto' | 'hatchback' | 'sedan' | 'suv';

export interface DriverDetails {
  licenseNumber: string;
  vehicleModel: string;
  vehiclePlate: string;
  vehicleCategory: TravelCategory;
  vehicleColor: string;
  seatingCapacity: number;
  hasAc: boolean;
  verifiedAt: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  gender: 'female' | 'male' | 'other';
  memberType: 'student' | 'staff' | 'community';
  campus: 'bidholi' | 'kandoli';
  department?: string;
  avatar: string;
  trustTier: 'T0' | 'T1' | 'T2';
  collegeVerified: boolean;
  driverVerified: boolean;
  driverDetails?: DriverDetails;
  totalRidesTaken: number;
  totalRidesOffered: number;
  rating: number;
}

export interface PassengerBookingRequest {
  id: string;
  rideId: string;
  passengerId: string;
  passengerName: string;
  passengerAvatar: string;
  passengerGender: 'female' | 'male' | 'other';
  passengerCampus: 'bidholi' | 'kandoli';
  passengerPhone: string;
  seats: number;
  totalPaise: number;
  status: 'pending' | 'accepted' | 'declined';
  requestedAt: string;
  origin: string;
  destination: string;
  pickupNote?: string;
}

export interface DriverRideCard {
  id: string;
  departureTime: string;
  origin: string;
  destination: string;
  isWomenOnly: boolean;
  contributionInr: number;
  seatsLeft: number;
  totalSeats: number;
  vehicle: {
    category: TravelCategory;
    categoryLabel?: string;
    model: string;
  };
}

export const DEMO_USERS: UserProfile[] = [
  {
    id: 'user-kavya',
    name: 'Kavya Negi',
    email: 'kavya.negi@stu.upes.ac.in',
    phone: '+91 98765 43210',
    gender: 'female',
    memberType: 'student',
    campus: 'bidholi',
    department: 'School of Computer Science',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    trustTier: 'T2',
    collegeVerified: true,
    driverVerified: true,
    driverDetails: {
      licenseNumber: 'UK07-20220019842',
      vehicleModel: 'Tata Nexon',
      vehiclePlate: 'UK 07 AB 4589',
      vehicleCategory: 'suv',
      vehicleColor: 'Foliage Green',
      seatingCapacity: 4,
      hasAc: true,
      verifiedAt: '2024-08-15',
    },
    totalRidesTaken: 12,
    totalRidesOffered: 38,
    rating: 4.96,
  },
  {
    id: 'user-aditya',
    name: 'Aditya Rawat',
    email: 'aditya.rawat@stu.upes.ac.in',
    phone: '+91 98123 45678',
    gender: 'male',
    memberType: 'student',
    campus: 'kandoli',
    department: 'School of Law',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    trustTier: 'T2',
    collegeVerified: true,
    driverVerified: true,
    driverDetails: {
      licenseNumber: 'UK07-20230044192',
      vehicleModel: 'Honda City',
      vehiclePlate: 'UK 07 CD 7821',
      vehicleCategory: 'sedan',
      vehicleColor: 'Platinum White Pearl',
      seatingCapacity: 4,
      hasAc: true,
      verifiedAt: '2024-09-02',
    },
    totalRidesTaken: 9,
    totalRidesOffered: 27,
    rating: 4.89,
  },
  {
    id: 'user-priya',
    name: 'Priya Sharma',
    email: 'priya.sharma@stu.upes.ac.in',
    phone: '+91 97654 32109',
    gender: 'female',
    memberType: 'student',
    campus: 'bidholi',
    department: 'School of Engineering',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    trustTier: 'T1',
    collegeVerified: true,
    driverVerified: false,
    totalRidesTaken: 14,
    totalRidesOffered: 0,
    rating: 4.92,
  },
];
