import React, { useState } from 'react';
import {
  BRAND,
  SAFETY_COPY,
  computeCostCap,
  type VehicleType,
} from '@campusride/shared';
import type { UserProfile, TravelCategory } from './types/auth';
import { AuthModal } from './components/AuthModal';
import { DriverRegisterModal } from './components/DriverRegisterModal';
import { DriverDashboard } from './components/DriverDashboard';
import { AdminSafetyDeskModal } from './components/AdminSafetyDeskModal';

// Dehradun Campuses and Key Transit Hubs
const DEHRADUN_CAMPUSES = [
  {
    id: 'bidholi',
    name: 'Bidholi Campus (Energy Acres)',
    area: 'P.O. Bidholi, via Prem Nagar',
    lat: 30.4159,
    lng: 77.967,
    icon: '⚡',
    tag: 'Energy Acres',
  },
  {
    id: 'kandoli',
    name: 'Kandoli Campus (Knowledge Acres)',
    area: 'P.O. Kandoli, via Prem Nagar',
    lat: 30.385,
    lng: 77.947,
    icon: '📚',
    tag: 'Knowledge Acres',
  },
];

const DEHRADUN_HUBS = [
  {
    id: 'isbt-dehradun',
    name: 'ISBT Dehradun',
    subtitle: 'Inter-State Bus Terminal',
    area: 'Haridwar Bypass Road / Transport Nagar',
    lat: 30.2874,
    lng: 77.9979,
    icon: '🚌',
    distanceFromBidholiKm: 23,
    distanceFromKandoliKm: 20,
  },
  {
    id: 'dehradun-railway-station',
    name: 'Dehradun Railway Station (DDN)',
    subtitle: 'Northern Railway Main Terminal',
    area: 'Lakkhi Bagh / Paltan Bazaar',
    lat: 30.3155,
    lng: 78.0322,
    icon: '🚆',
    distanceFromBidholiKm: 18,
    distanceFromKandoliKm: 16,
  },
  {
    id: 'jolly-grant-airport',
    name: 'Jolly Grant Airport (DED)',
    subtitle: 'Dehradun Domestic Airport',
    area: 'Rishikesh Road, Jauligrant',
    lat: 30.1897,
    lng: 78.1803,
    icon: '✈️',
    distanceFromBidholiKm: 48,
    distanceFromKandoliKm: 45,
  },
  {
    id: 'prem-nagar',
    name: 'Prem Nagar (Nanda Ki Chowki)',
    subtitle: 'Campus Corridor Junction',
    area: 'Chakrata Road',
    lat: 30.334,
    lng: 77.962,
    icon: '📍',
    distanceFromBidholiKm: 10,
    distanceFromKandoliKm: 7,
  },
  {
    id: 'clock-tower-dehradun',
    name: 'Clock Tower / Rajpur Road',
    subtitle: 'City Center & Pacific Mall',
    area: 'Ghanta Ghar / Rajpur Road',
    lat: 30.3244,
    lng: 78.0416,
    icon: '🏛️',
    distanceFromBidholiKm: 17,
    distanceFromKandoliKm: 15,
  },
];

// TravelCategory is imported from ./types/auth

export interface CategoryOption {
  id: TravelCategory;
  name: string;
  badge: string;
  icon: string;
  capacityText: string;
}

const TRAVEL_CATEGORIES: CategoryOption[] = [
  {
    id: 'moto',
    name: 'Moto (Bike)',
    badge: 'Rapido style',
    icon: '🏍️',
    capacityText: '1 Seat Max (Helmet included)',
  },
  {
    id: 'auto',
    name: 'Shared Auto',
    badge: 'Campus Auto',
    icon: '🛺',
    capacityText: 'Up to 3 Seats',
  },
  {
    id: 'hatchback',
    name: 'Hatchback',
    badge: 'Uber Go / Mini',
    icon: '🚗',
    capacityText: '3-4 Seats · AC',
  },
  {
    id: 'sedan',
    name: 'Prime Sedan',
    badge: 'Premier / Prime',
    icon: '🚘',
    capacityText: '4 Seats · Big Boot · AC',
  },
  {
    id: 'suv',
    name: 'SUV / XL',
    badge: 'Uber XL / SUV',
    icon: '🚙',
    capacityText: '4-6 Seats · Hill Ready · AC',
  },
];

interface RideCard {
  id: string;
  driver: {
    name: string;
    avatar: string;
    college: string;
    rating: number;
    tripsCount: number;
    isWomenVerified: boolean;
    isCollegeVerified: boolean;
  };
  departureTime: string;
  arrivalTime: string;
  duration: string;
  origin: string;
  originArea: string;
  destination: string;
  destArea: string;
  vehicle: {
    type: 'car' | 'bike' | 'auto';
    category: TravelCategory;
    categoryLabel: string;
    model: string;
    color: string;
    features: string[];
  };
  contributionInr: number;
  commercialEstInr: number;
  seatsLeft: number;
  totalSeats: number;
  isWomenOnly: boolean;
  notes?: string;
}

const DEHRADUN_RIDES: RideCard[] = [
  {
    id: 'ride-1',
    driver: {
      name: 'Kavya Negi',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      college: 'UPES School of Computer Science (Bidholi)',
      rating: 4.96,
      tripsCount: 38,
      isWomenVerified: true,
      isCollegeVerified: true,
    },
    departureTime: '13:30',
    arrivalTime: '15:15',
    duration: '1h 45m',
    origin: 'Bidholi Campus (Energy Acres)',
    originArea: 'Gate 2 (Opp. Food Court)',
    destination: 'Jolly Grant Airport (DED)',
    destArea: 'Departures Drop-off, Terminal',
    vehicle: {
      type: 'car',
      category: 'suv',
      categoryLabel: 'SUV / XL (Uber XL style)',
      model: 'Tata Nexon',
      color: 'Foliage Green',
      features: ['Air Conditioned', 'Spacious boot for bags', 'Max 2 in rear'],
    },
    contributionInr: 180,
    commercialEstInr: 650,
    seatsLeft: 2,
    totalSeats: 3,
    isWomenOnly: true,
    notes: 'Heading for Delhi 6 PM flight. Ample space for trolley bags.',
  },
  {
    id: 'ride-2',
    driver: {
      name: 'Aditya Rawat',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      college: 'UPES School of Law (Kandoli)',
      rating: 4.89,
      tripsCount: 27,
      isWomenVerified: false,
      isCollegeVerified: true,
    },
    departureTime: '17:15',
    arrivalTime: '18:10',
    duration: '55 mins',
    origin: 'Kandoli Campus (Knowledge Acres)',
    originArea: 'Main Academic Block Gate',
    destination: 'ISBT Dehradun',
    destArea: 'Platform 4 (Delhi/Chandigarh Volvo)',
    vehicle: {
      type: 'car',
      category: 'hatchback',
      categoryLabel: 'Hatchback (Uber Go style)',
      model: 'Hyundai i20',
      color: 'Polar White',
      features: ['Air Conditioned', 'Weekend playlist'],
    },
    contributionInr: 80,
    commercialEstInr: 320,
    seatsLeft: 3,
    totalSeats: 3,
    isWomenOnly: false,
    notes: 'Going to ISBT for the 7 PM Volvo. Can pick up from Prem Nagar.',
  },
  {
    id: 'ride-3',
    driver: {
      name: 'Sneha Sharma',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      college: 'UPES School of Advanced Engineering (Bidholi)',
      rating: 4.98,
      tripsCount: 52,
      isWomenVerified: true,
      isCollegeVerified: true,
    },
    departureTime: '05:30',
    arrivalTime: '06:15',
    duration: '45 mins',
    origin: 'Bidholi Campus (Energy Acres)',
    originArea: 'Hostel Block A Entrance',
    destination: 'Dehradun Railway Station (DDN)',
    destArea: 'Main Porch, Platform 1',
    vehicle: {
      type: 'car',
      category: 'sedan',
      categoryLabel: 'Prime Sedan (Premier style)',
      model: 'Honda City',
      color: 'Silver Metallic',
      features: ['AC', 'Smooth driving', 'Early morning connection'],
    },
    contributionInr: 75,
    commercialEstInr: 340,
    seatsLeft: 2,
    totalSeats: 3,
    isWomenOnly: true,
    notes: 'Connecting with Vande Bharat Express (departs 07:00 AM). On-time guaranteed.',
  },
  {
    id: 'ride-4',
    driver: {
      name: 'Rohit Chauhan',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
      college: 'UPES School of Business (Kandoli)',
      rating: 4.92,
      tripsCount: 44,
      isWomenVerified: false,
      isCollegeVerified: true,
    },
    departureTime: '08:45',
    arrivalTime: '09:15',
    duration: '30 mins',
    origin: 'Prem Nagar (Nanda Ki Chowki)',
    originArea: 'Chowki SBI ATM Junction',
    destination: 'Bidholi Campus (Energy Acres)',
    destArea: 'Campus Parking Area',
    vehicle: {
      type: 'car',
      category: 'suv',
      categoryLabel: 'Compact SUV (Uber XL style)',
      model: 'Maruti Brezza',
      color: 'Magma Grey',
      features: ['AC', 'Daily morning campus commute'],
    },
    contributionInr: 35,
    commercialEstInr: 150,
    seatsLeft: 3,
    totalSeats: 4,
    isWomenOnly: false,
    notes: 'Daily lecture commute. Stops at Kandoli gate along the way if requested.',
  },
  {
    id: 'ride-5',
    driver: {
      name: 'Ananya Joshi',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80',
      college: 'UPES School of Design (Bidholi)',
      rating: 4.95,
      tripsCount: 31,
      isWomenVerified: true,
      isCollegeVerified: true,
    },
    departureTime: '18:00',
    arrivalTime: '18:50',
    duration: '50 mins',
    origin: 'Kandoli Campus (Knowledge Acres)',
    originArea: 'Main Gate Parking',
    destination: 'Clock Tower / Rajpur Road',
    destArea: 'Near Pacific Mall / Jakhan',
    vehicle: {
      type: 'car',
      category: 'hatchback',
      categoryLabel: 'Hatchback (Uber Go style)',
      model: 'Maruti Baleno',
      color: 'Nexa Blue',
      features: ['AC', 'Weekend city run'],
    },
    contributionInr: 70,
    commercialEstInr: 280,
    seatsLeft: 2,
    totalSeats: 3,
    isWomenOnly: true,
    notes: 'Evening city trip for shopping / dinner in Jakhan.',
  },
  {
    id: 'ride-6',
    driver: {
      name: 'Vikramaditya Pant',
      avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80',
      college: 'UPES School of Computer Science (Bidholi)',
      rating: 4.87,
      tripsCount: 22,
      isWomenVerified: false,
      isCollegeVerified: true,
    },
    departureTime: '14:00',
    arrivalTime: '14:55',
    duration: '55 mins',
    origin: 'Dehradun Railway Station (DDN)',
    originArea: 'Station Main Exit Porch',
    destination: 'Bidholi Campus (Energy Acres)',
    destArea: 'Energy Acres Gate 1',
    vehicle: {
      type: 'car',
      category: 'suv',
      categoryLabel: 'SUV / XL (Uber XL style)',
      model: 'Kia Seltos',
      color: 'Gravity Grey',
      features: ['AC', 'Spacious boot', 'Fastag enabled'],
    },
    contributionInr: 75,
    commercialEstInr: 350,
    seatsLeft: 3,
    totalSeats: 4,
    isWomenOnly: false,
    notes: 'Picking up passengers after Shatabdi arrival. Direct run to Bidholi.',
  },
  {
    id: 'ride-7',
    driver: {
      name: 'Meera Sen',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
      college: 'UPES School of Law (Kandoli)',
      rating: 4.99,
      tripsCount: 64,
      isWomenVerified: true,
      isCollegeVerified: true,
    },
    departureTime: '17:00',
    arrivalTime: '18:45',
    duration: '1h 45m',
    origin: 'Jolly Grant Airport (DED)',
    originArea: 'Terminal Arrivals Pick-up Pillar 3',
    destination: 'Kandoli Campus (Knowledge Acres)',
    destArea: 'Girls Hostel Complex',
    vehicle: {
      type: 'car',
      category: 'suv',
      categoryLabel: 'Compact SUV (Uber XL style)',
      model: 'Hyundai Venue',
      color: 'Denim Blue',
      features: ['AC', 'Safe night travel', 'Luggage room'],
    },
    contributionInr: 175,
    commercialEstInr: 620,
    seatsLeft: 2,
    totalSeats: 3,
    isWomenOnly: true,
    notes: 'Returning from Mumbai flight. Direct cab split to Kandoli via Balliwala flyover.',
  },
  {
    id: 'ride-8',
    driver: {
      name: 'Aman Bisht',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80',
      college: 'UPES School of Advanced Engineering (Bidholi)',
      rating: 4.85,
      tripsCount: 18,
      isWomenVerified: false,
      isCollegeVerified: true,
    },
    departureTime: '06:45',
    arrivalTime: '07:35',
    duration: '50 mins',
    origin: 'ISBT Dehradun',
    originArea: 'ISBT Main Gate / Auto Stand',
    destination: 'Bidholi Campus (Energy Acres)',
    destArea: 'Campus Main Entrance',
    vehicle: {
      type: 'bike',
      category: 'moto',
      categoryLabel: 'Moto (Rapido style Bike)',
      model: 'Royal Enfield Classic 350',
      color: 'Stealth Black',
      features: ['Helmet provided', 'Quick hill transit'],
    },
    contributionInr: 45,
    commercialEstInr: 140,
    seatsLeft: 1,
    totalSeats: 1,
    isWomenOnly: false,
    notes: 'Two-wheeler ride with spare ISI helmet. Bypasses Ballupur traffic.',
  },
  {
    id: 'ride-9',
    driver: {
      name: 'Pooja Chhetri',
      avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
      college: 'UPES School of Health Sciences (Bidholi)',
      rating: 4.93,
      tripsCount: 36,
      isWomenVerified: true,
      isCollegeVerified: true,
    },
    departureTime: '16:30',
    arrivalTime: '17:30',
    duration: '1h 00m',
    origin: 'Bidholi Campus (Energy Acres)',
    originArea: 'Gate 2 Visitors Parking',
    destination: 'ISBT Dehradun',
    destArea: 'Platform 1 (Haridwar Bypass Entrance)',
    vehicle: {
      type: 'car',
      category: 'hatchback',
      categoryLabel: 'Hatchback (Uber Go style)',
      model: 'Maruti Swift',
      color: 'Fire Red',
      features: ['AC', 'Smooth driving'],
    },
    contributionInr: 85,
    commercialEstInr: 330,
    seatsLeft: 3,
    totalSeats: 3,
    isWomenOnly: true,
    notes: 'Heading home for long weekend. Dropping near ISBT main ticket counter.',
  },
  {
    id: 'ride-10',
    driver: {
      name: 'Dhruv Kapoor',
      avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80',
      college: 'UPES School of Business (Kandoli)',
      rating: 4.91,
      tripsCount: 29,
      isWomenVerified: false,
      isCollegeVerified: true,
    },
    departureTime: '10:30',
    arrivalTime: '12:15',
    duration: '1h 45m',
    origin: 'Kandoli Campus (Knowledge Acres)',
    originArea: 'Main Academic Porch',
    destination: 'Jolly Grant Airport (DED)',
    destArea: 'Departures Level Drop-off',
    vehicle: {
      type: 'car',
      category: 'sedan',
      categoryLabel: 'Prime Sedan (Premier style)',
      model: 'Skoda Slavia',
      color: 'Carbon Steel',
      features: ['AC', 'Extra boot capacity', 'Quiet ride'],
    },
    contributionInr: 170,
    commercialEstInr: 650,
    seatsLeft: 3,
    totalSeats: 3,
    isWomenOnly: false,
    notes: 'Heading for afternoon flight. Big boot with space for 3 suitcases.',
  },
  {
    id: 'ride-11',
    driver: {
      name: 'Rhea Mathur',
      avatar: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&auto=format&fit=crop&q=80',
      college: 'UPES School of Law (Kandoli)',
      rating: 4.97,
      tripsCount: 41,
      isWomenVerified: true,
      isCollegeVerified: true,
    },
    departureTime: '21:00',
    arrivalTime: '21:45',
    duration: '45 mins',
    origin: 'Clock Tower / Rajpur Road',
    originArea: 'Astley Hall / Cross Road Mall',
    destination: 'Kandoli Campus (Knowledge Acres)',
    destArea: 'Campus Girls Gate',
    vehicle: {
      type: 'car',
      category: 'hatchback',
      categoryLabel: 'Hatchback (Uber Go style)',
      model: 'Honda Jazz',
      color: 'Urban Titanium',
      features: ['AC', 'Verified female passengers only'],
    },
    contributionInr: 65,
    commercialEstInr: 260,
    seatsLeft: 2,
    totalSeats: 3,
    isWomenOnly: true,
    notes: 'Late night safe return to hostel after study session in town.',
  },
  {
    id: 'ride-12',
    driver: {
      name: 'Karan Malhotra',
      avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
      college: 'UPES School of Computer Science (Bidholi)',
      rating: 4.88,
      tripsCount: 15,
      isWomenVerified: false,
      isCollegeVerified: true,
    },
    departureTime: '17:30',
    arrivalTime: '17:55',
    duration: '25 mins',
    origin: 'Bidholi Campus (Energy Acres)',
    originArea: 'Central Library Circle',
    destination: 'Prem Nagar (Nanda Ki Chowki)',
    destArea: 'Prem Nagar Main Market Chowk',
    vehicle: {
      type: 'bike',
      category: 'moto',
      categoryLabel: 'Moto (Scooter)',
      model: 'TVS Jupiter 125',
      color: 'Matte Blue',
      features: ['Helmet included', 'Quick market run'],
    },
    contributionInr: 25,
    commercialEstInr: 80,
    seatsLeft: 1,
    totalSeats: 1,
    isWomenOnly: false,
    notes: 'Evening run to Prem Nagar market. 1 passenger seat only.',
  },
  {
    id: 'ride-13',
    driver: {
      name: 'Simran Kaur',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
      college: 'UPES School of Law (Kandoli)',
      rating: 4.94,
      tripsCount: 33,
      isWomenVerified: true,
      isCollegeVerified: true,
    },
    departureTime: '19:30',
    arrivalTime: '20:25',
    duration: '55 mins',
    origin: 'ISBT Dehradun',
    originArea: 'ISBT Petrol Pump Exit',
    destination: 'Kandoli Campus (Knowledge Acres)',
    destArea: 'Kandoli Main Entrance',
    vehicle: {
      type: 'car',
      category: 'sedan',
      categoryLabel: 'Prime Sedan (Premier style)',
      model: 'Maruti Ciaz',
      color: 'Pearl White',
      features: ['AC', 'Spacious executive sedan'],
    },
    contributionInr: 80,
    commercialEstInr: 330,
    seatsLeft: 3,
    totalSeats: 3,
    isWomenOnly: true,
    notes: 'Arriving by Chandigarh bus. Safe evening travel for female hostelers.',
  },
  {
    id: 'ride-14',
    driver: {
      name: 'Harshvardhan Singh',
      avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&auto=format&fit=crop&q=80',
      college: 'UPES School of Advanced Engineering (Bidholi)',
      rating: 4.86,
      tripsCount: 20,
      isWomenVerified: false,
      isCollegeVerified: true,
    },
    departureTime: '11:30',
    arrivalTime: '12:20',
    duration: '50 mins',
    origin: 'Dehradun Railway Station (DDN)',
    originArea: 'Station Road Exit Parking',
    destination: 'Kandoli Campus (Knowledge Acres)',
    destArea: 'Knowledge Acres Gate 1',
    vehicle: {
      type: 'car',
      category: 'suv',
      categoryLabel: 'SUV / XL (Uber XL style)',
      model: 'Mahindra XUV300',
      color: 'Red Rage',
      features: ['AC', 'Comfortable ride'],
    },
    contributionInr: 70,
    commercialEstInr: 310,
    seatsLeft: 3,
    totalSeats: 3,
    isWomenOnly: false,
    notes: 'Picking up friends arriving on Jan Shatabdi. Leaving right from parking.',
  },
  {
    id: 'ride-15',
    driver: {
      name: 'Surender Pal',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      college: 'Registered Campus Commute Partner',
      rating: 4.88,
      tripsCount: 78,
      isWomenVerified: false,
      isCollegeVerified: true,
    },
    departureTime: '08:15',
    arrivalTime: '08:45',
    duration: '30 mins',
    origin: 'Prem Nagar (Nanda Ki Chowki)',
    originArea: 'Prem Nagar Auto Stand (Front of Gurudwara)',
    destination: 'Bidholi Campus (Energy Acres)',
    destArea: 'Bidholi Main Gate Drop',
    vehicle: {
      type: 'auto',
      category: 'auto',
      categoryLabel: 'Campus Auto Share',
      model: 'Bajaj RE Auto',
      color: 'Green & Yellow',
      features: ['Direct route', 'Stops at Kandoli', 'Luggage space'],
    },
    contributionInr: 30,
    commercialEstInr: 120,
    seatsLeft: 3,
    totalSeats: 3,
    isWomenOnly: false,
    notes: 'Morning shared auto between Prem Nagar and Bidholi/Kandoli. Fixed split.',
  },
];

export default function App() {
  // Initialize rides from localStorage if available, or use seeded DEHRADUN_RIDES
  const [rides, setRides] = useState<RideCard[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('campusride_dehradun_rides');
        if (saved) {
          const parsed = JSON.parse(saved) as RideCard[];
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      } catch {
        // Fall back to default
      }
    }
    return DEHRADUN_RIDES;
  });

  const [selectedCampus, setSelectedCampus] = useState<'bidholi' | 'kandoli'>('bidholi');
  const [selectedHub, setSelectedHub] = useState<string>('all');
  const [direction, setDirection] = useState<'all' | 'from_campus' | 'to_campus'>('all');
  const [selectedCategory, setSelectedCategory] = useState<TravelCategory | 'all'>('all');
  const [womenOnlyFilter, setWomenOnlyFilter] = useState(false);
  const [viewerGender, setViewerGender] = useState<'female' | 'male'>('female');

  // User Authentication & Role State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('campusride_current_user');
        if (saved) return JSON.parse(saved) as UserProfile;
      } catch {
        // Fall back
      }
    }
    return null;
  });

  const [viewMode, setViewMode] = useState<'passenger' | 'driver'>('passenger');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authPromptRole, setAuthPromptRole] = useState<'passenger' | 'driver'>('passenger');
  const [isDriverRegisterOpen, setIsDriverRegisterOpen] = useState(false);
  const [isAdminDeskOpen, setIsAdminDeskOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Modals
  const [activeModal, setActiveModal] = useState<'none' | 'offer' | 'safety' | 'booking'>('none');
  const [bookingRide, setBookingRide] = useState<RideCard | null>(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [publishedToast, setPublishedToast] = useState<string | null>(null);

  // Offer Ride Form
  const [offerOrigin, setOfferOrigin] = useState('Bidholi Campus (Energy Acres)');
  const [offerOriginArea, setOfferOriginArea] = useState('Gate 2 (Opp. Food Court)');
  const [offerDest, setOfferDest] = useState('ISBT Dehradun');
  const [offerDestArea, setOfferDestArea] = useState('Platform 4 (Volvo Departure)');
  const [offerTime, setOfferTime] = useState('18:30');
  const [offerVehicleCategory, setOfferVehicleCategory] = useState<TravelCategory>('hatchback');
  const [offerModel, setOfferModel] = useState('');
  const [offerSeats, setOfferSeats] = useState(3);
  const [offerPrice, setOfferPrice] = useState(80);
  const [offerNotes, setOfferNotes] = useState('Direct campus ride. Space for luggage.');
  const [offerIsWomenOnly, setOfferIsWomenOnly] = useState(false);
  const [offerSuccess, setOfferSuccess] = useState(false);
  const [lastPublishedRide, setLastPublishedRide] = useState<RideCard | null>(null);

  // Filter rides based on search and gender visibility rule (docs/05 §2)
  const currentCampusName = selectedCampus === 'bidholi' ? 'Bidholi' : 'Kandoli';

  const filteredRides = rides.filter((ride) => {
    // Campus filter
    const matchesCampus =
      ride.origin.includes(currentCampusName) || ride.destination.includes(currentCampusName);
    if (!matchesCampus) return false;

    // Direction filter
    if (direction === 'from_campus' && !ride.origin.includes('Campus')) return false;
    if (direction === 'to_campus' && !ride.destination.includes('Campus')) return false;

    // Vehicle Category filter (Ola / Uber / Rapido travel options)
    if (selectedCategory !== 'all' && ride.vehicle.category !== selectedCategory) return false;

    // Hub filter
    if (selectedHub !== 'all') {
      const hubObj = DEHRADUN_HUBS.find((h) => h.id === selectedHub);
      if (hubObj) {
        const hubFirstWord = hubObj.name.split(' ')[0] ?? '';
        const matchesHub =
          ride.origin.includes(hubFirstWord) ||
          ride.destination.includes(hubFirstWord);
        if (!matchesHub) return false;
      }
    }

    // Women-only filter
    if (womenOnlyFilter && !ride.isWomenOnly) return false;

    // Safety Invariant: Women-only rides are hidden from male searchers
    if (ride.isWomenOnly && viewerGender === 'male') return false;

    return true;
  });

  // Calculate live statutory cost cap for offer modal
  const vehicleTypeForCost: VehicleType =
    offerVehicleCategory === 'moto'
      ? 'bike'
      : offerVehicleCategory === 'auto'
      ? 'auto'
      : 'car';

  const costCapResult = computeCostCap({
    distanceM: 22000, // 22km avg dehradun corridor
    vehicleType: vehicleTypeForCost,
    seatsTotal: offerSeats,
    tollPaise: 0,
  });
  const maxPriceInr = Math.floor(costCapResult.capPerSeatPaise / 100);

  // Helper to get count per travel option
  const getCategoryCount = (cat: TravelCategory | 'all') => {
    return rides.filter((ride) => {
      const matchesCampus =
        ride.origin.includes(currentCampusName) || ride.destination.includes(currentCampusName);
      if (!matchesCampus) return false;
      if (direction === 'from_campus' && !ride.origin.includes('Campus')) return false;
      if (direction === 'to_campus' && !ride.destination.includes('Campus')) return false;
      if (womenOnlyFilter && !ride.isWomenOnly) return false;
      if (ride.isWomenOnly && viewerGender === 'male') return false;
      if (cat !== 'all' && ride.vehicle.category !== cat) return false;
      return true;
    }).length;
  };

  // Handler to publish a new ride and update the live feed
  const handlePublishRide = () => {
    const defaultModels: Record<TravelCategory, string> = {
      moto: 'Royal Enfield Classic 350',
      auto: 'Bajaj RE Auto',
      hatchback: 'Hyundai i20',
      sedan: 'Honda City',
      suv: 'Tata Nexon',
    };

    const defaultLabels: Record<TravelCategory, string> = {
      moto: 'Moto (Bike)',
      auto: 'Campus Auto Share',
      hatchback: 'Hatchback (Uber Go style)',
      sedan: 'Prime Sedan (Premier style)',
      suv: 'SUV / XL (Uber XL style)',
    };

    const driverName =
      currentUser?.name ??
      (viewerGender === 'female' ? 'You (Verified Female Driver)' : 'You (Verified Student Driver)');
    const driverAvatar =
      currentUser?.avatar ??
      (viewerGender === 'female'
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80');
    const driverCollege = currentUser?.department
      ? `UPES ${currentUser.department} (${currentUser.campus})`
      : offerOrigin.includes('Bidholi')
      ? 'UPES School of Computer Science (Bidholi)'
      : 'UPES School of Law (Kandoli)';

    const newRide: RideCard = {
      id: 'ride-user-' + Date.now(),
      driver: {
        name: driverName,
        avatar: driverAvatar,
        college: driverCollege,
        rating: 5.0,
        tripsCount: (currentUser?.totalRidesOffered ?? 0) + 1,
        isWomenVerified: offerIsWomenOnly || (currentUser?.gender === 'female'),
        isCollegeVerified: currentUser?.collegeVerified ?? true,
      },
      departureTime: offerTime || '18:30',
      arrivalTime: 'Estimated ~50m later',
      duration: '50 mins',
      origin: offerOrigin,
      originArea: offerOriginArea.trim() || 'Campus Main Entrance',
      destination: offerDest,
      destArea: offerDestArea.trim() || 'Main Drop-off Point',
      vehicle: {
        type: offerVehicleCategory === 'moto' ? 'bike' : offerVehicleCategory === 'auto' ? 'auto' : 'car',
        category: offerVehicleCategory,
        categoryLabel: defaultLabels[offerVehicleCategory],
        model: offerModel.trim() || currentUser?.driverDetails?.vehicleModel || defaultModels[offerVehicleCategory],
        color: currentUser?.driverDetails?.vehicleColor || 'White',
        features: ['Air Conditioned', 'Student Fuel Share', 'Safe Verified Ride'],
      },
      contributionInr: offerPrice,
      commercialEstInr: Math.round(offerPrice * 3.5),
      seatsLeft: offerSeats,
      totalSeats: offerSeats,
      isWomenOnly: offerIsWomenOnly,
      notes: offerNotes.trim() || 'Direct campus ride offered by you.',
    };

    const updated = [newRide, ...rides];
    setRides(updated);
    try {
      localStorage.setItem('campusride_dehradun_rides', JSON.stringify(updated));
    } catch {
      // Ignore
    }

    // Automatically align campus tab to show the new ride
    if (offerOrigin.includes('Bidholi') || offerDest.includes('Bidholi')) {
      setSelectedCampus('bidholi');
    } else if (offerOrigin.includes('Kandoli') || offerDest.includes('Kandoli')) {
      setSelectedCampus('kandoli');
    }
    setDirection('all');
    setSelectedCategory('all');
    setLastPublishedRide(newRide);
    setOfferSuccess(true);
    setPublishedToast(`🎉 Your ride from ${newRide.origin} to ${newRide.destination} is now live!`);
  };

  const handleOfferRideClick = () => {
    if (!currentUser) {
      setAuthPromptRole('driver');
      setIsAuthModalOpen(true);
      return;
    }
    if (!currentUser.driverVerified) {
      setIsDriverRegisterOpen(true);
      return;
    }
    if (currentUser.driverDetails) {
      setOfferVehicleCategory(currentUser.driverDetails.vehicleCategory);
      setOfferModel(currentUser.driverDetails.vehicleModel);
      setOfferSeats(currentUser.driverDetails.seatingCapacity);
    }
    setActiveModal('offer');
  };

  const handleRequestSeatClick = (ride: RideCard) => {
    if (!currentUser) {
      setAuthPromptRole('passenger');
      setIsAuthModalOpen(true);
      return;
    }
    setBookingRide(ride);
    setActiveModal('booking');
  };

  const handleCancelRide = (rideId: string) => {
    const updated = rides.filter((r) => r.id !== rideId);
    setRides(updated);
    try {
      localStorage.setItem('campusride_dehradun_rides', JSON.stringify(updated));
    } catch {
      // Ignore
    }
    setPublishedToast('Ride removed from your offered trips.');
  };

  const driverRides = rides.filter(
    (r) => r.driver.name === currentUser?.name || r.id.startsWith('ride-user-')
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased">
      {/* ── Top Navigation Bar ─────────────────────────────────────────── */}
      <nav className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo with Dehradun location tag */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-700 flex items-center justify-center text-white shadow-md shadow-emerald-600/25">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-slate-900">{BRAND.name}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 tracking-wide uppercase">
                  Dehradun
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">Kandoli & Bidholi Campus Rides</p>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
            {currentUser && (
              <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setViewMode('passenger')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                    viewMode === 'passenger'
                      ? 'bg-white text-emerald-800 shadow-xs ring-1 ring-slate-200'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>🎒</span>
                  <span>Passenger View</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!currentUser.driverVerified) {
                      setIsDriverRegisterOpen(true);
                    } else {
                      setViewMode('driver');
                    }
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black transition flex items-center gap-1.5 ${
                    viewMode === 'driver'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>🚗</span>
                  <span>Driver Dashboard</span>
                  {!currentUser.driverVerified && (
                    <span className="px-1.5 py-0.5 rounded-full text-[9px] bg-amber-400 text-amber-950 font-black">
                      Verify
                    </span>
                  )}
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={handleOfferRideClick}
              className="hover:text-emerald-700 transition font-bold"
            >
              Offer a Ride
            </button>
            <button
              type="button"
              onClick={() => setActiveModal('safety')}
              className="hover:text-emerald-700 transition flex items-center gap-1.5 text-xs font-semibold"
            >
              <span>🛡️</span>
              <span>Safety & Trust</span>
            </button>
            <button
              type="button"
              onClick={() => setIsAdminDeskOpen(true)}
              className="hover:text-emerald-700 transition flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              <span>🏛️</span>
              <span>Campus Safety Desk</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </button>
          </div>

          {/* Right Action: Profile & Auth Section */}
          <div className="flex items-center gap-3">
            {/* Quick Gender Test Switcher (when logged out) */}
            {!currentUser && (
              <div className="hidden lg:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full text-xs text-slate-600">
                <span className="text-[11px] font-medium text-slate-500">Preview:</span>
                <button
                  type="button"
                  onClick={() => setViewerGender('female')}
                  className={`px-2 py-0.5 rounded-full font-bold transition text-[11px] ${
                    viewerGender === 'female'
                      ? 'bg-purple-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  👩 Female
                </button>
                <button
                  type="button"
                  onClick={() => setViewerGender('male')}
                  className={`px-2 py-0.5 rounded-full font-bold transition text-[11px] ${
                    viewerGender === 'male' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  👨 Male
                </button>
              </div>
            )}

            {currentUser ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                  className="flex items-center gap-2 p-1 sm:px-3 sm:py-1.5 rounded-2xl hover:bg-slate-100 transition border border-transparent hover:border-slate-200"
                >
                  <div className="relative">
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-500/30"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                  </div>
                  <div className="text-left hidden md:block">
                    <p className="text-xs font-bold text-slate-800 leading-tight flex items-center gap-1">
                      <span>{currentUser.name.split(' ')[0]}</span>
                      {currentUser.trustTier === 'T2' && <span className="text-emerald-600 text-[10px]">🛡️</span>}
                    </p>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      {currentUser.trustTier === 'T2' ? 'Verified Driver' : 'Verified Student'}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 hidden sm:inline">▾</span>
                </button>

                {/* Dropdown Menu */}
                {isProfileMenuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-black text-slate-900">{currentUser.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{currentUser.email}</p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-800">
                          {currentUser.trustTier}: {currentUser.trustTier === 'T2' ? 'Verified Driver' : 'Verified Student'}
                        </span>
                        <span className="text-[10px] text-slate-500 capitalize">{currentUser.campus}</span>
                      </div>
                    </div>

                    <div className="py-1 text-xs">
                      {currentUser.driverVerified ? (
                        <button
                          type="button"
                          onClick={() => {
                            setViewMode(viewMode === 'driver' ? 'passenger' : 'driver');
                            setIsProfileMenuOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 font-semibold flex items-center gap-2"
                        >
                          <span>{viewMode === 'driver' ? '🎒 Switch to Passenger View' : '🚗 Switch to Driver Dashboard'}</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setIsDriverRegisterOpen(true);
                            setIsProfileMenuOpen(false);
                          }}
                          className="w-full px-4 py-2 text-left text-emerald-700 hover:bg-emerald-50 font-bold flex items-center gap-2"
                        >
                          <span>🚗 Register Vehicle & Drive (Tier 2)</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setActiveModal('safety');
                          setIsProfileMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-slate-700 hover:bg-slate-50 font-semibold flex items-center gap-2"
                      >
                        <span>🛡️ Campus Safety Guidelines</span>
                      </button>
                    </div>

                    <div className="pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          localStorage.removeItem('campusride_current_user');
                          setCurrentUser(null);
                          setViewMode('passenger');
                          setIsProfileMenuOpen(false);
                        }}
                        className="w-full px-4 py-2 text-left text-rose-600 hover:bg-rose-50 text-xs font-bold flex items-center gap-2"
                      >
                        <span>🚪 Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthPromptRole('passenger');
                  setIsAuthModalOpen(true);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-600/20 transition flex items-center gap-1.5"
              >
                <span>🎓</span>
                <span>Sign In</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleOfferRideClick}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-xl shadow-md transition hover:-translate-y-0.5 active:translate-y-0"
            >
              <span>+</span>
              <span>Publish Ride</span>
            </button>
          </div>
        </div>
      </nav>

      {viewMode === 'driver' && currentUser?.driverVerified ? (
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <DriverDashboard
            currentUser={currentUser}
            onPublishRideClick={handleOfferRideClick}
            onSwitchToPassengerView={() => setViewMode('passenger')}
            driverRides={driverRides}
            onCancelRide={handleCancelRide}
          />
        </main>
      ) : (
        <>
          {/* ── Dehradun Hero & Search Hubs ───────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-emerald-50/70 via-teal-50/30 to-slate-50 pt-10 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/90 border border-emerald-200 shadow-xs text-xs font-bold text-emerald-800 mb-5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Dehradun College Carpool · Kandoli & Bidholi to Airport, ISBT, DDN Station
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight leading-tight mb-4">
            Smart, safe rides for the{' '}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Dehradun Campus
            </span>{' '}
            community.
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-600 font-medium mb-8">
            Connect directly with verified students and faculty travelling between <strong>Kandoli</strong>,{' '}
            <strong>Bidholi</strong>, and major transit hubs across Dehradun.
          </p>

          {/* ── Campus Selector Tabs (Kandoli vs Bidholi) ────────────────── */}
          <div className="flex items-center justify-center gap-3 mb-6">
            {DEHRADUN_CAMPUSES.map((campus) => (
              <button
                key={campus.id}
                type="button"
                onClick={() => setSelectedCampus(campus.id as 'bidholi' | 'kandoli')}
                className={`px-6 py-3.5 rounded-2xl text-xs sm:text-sm font-black flex items-center gap-2.5 transition-all shadow-sm ${
                  selectedCampus === campus.id
                    ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-500 scale-105'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                <span className="text-lg">{campus.icon}</span>
                <span>{campus.name}</span>
              </button>
            ))}
          </div>

          {/* ── Main Dehradun Route Search Bar ──────────────────────────── */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-xl shadow-slate-200/80 border border-slate-200 max-w-4xl mx-auto text-left">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              {/* Direction Toggle */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Trip Direction
                </label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setDirection('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      direction === 'all'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200/60'
                    }`}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('from_campus')}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                      direction === 'from_campus'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200/60'
                    }`}
                  >
                    Leaving →
                  </button>
                  <button
                    type="button"
                    onClick={() => setDirection('to_campus')}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold transition ${
                      direction === 'to_campus'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:bg-slate-200/60'
                    }`}
                  >
                    ← Arriving
                  </button>
                </div>
              </div>

              {/* Transit Hub Filter */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Dehradun Destination / Pickup
                </label>
                <select
                  value={selectedHub}
                  onChange={(e) => setSelectedHub(e.target.value)}
                  className="w-full text-xs font-bold text-slate-900 bg-transparent outline-none cursor-pointer mt-1"
                >
                  <option value="all">All Dehradun Hubs</option>
                  {DEHRADUN_HUBS.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.subtitle})
                    </option>
                  ))}
                </select>
              </div>

              {/* Date & Quick Action */}
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                    When
                  </label>
                  <span className="text-xs font-bold text-slate-900">Today & Tomorrow</span>
                </div>
                <a
                  href="#browse-rides"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md transition"
                >
                  View Rides ({filteredRides.length})
                </a>
              </div>
            </div>

            {/* Quick Hub Distance Badges */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-slate-400 font-semibold">Popular Dehradun Hubs:</span>
              {DEHRADUN_HUBS.map((hub) => (
                <button
                  key={hub.id}
                  type="button"
                  onClick={() => setSelectedHub(hub.id)}
                  className={`px-3 py-1.5 rounded-full font-bold transition flex items-center gap-1.5 ${
                    selectedHub === hub.id
                      ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  <span>{hub.icon}</span>
                  <span>{hub.name}</span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    (
                    {selectedCampus === 'bidholi'
                      ? `${hub.distanceFromBidholiKm} km`
                      : `${hub.distanceFromKandoliKm} km`}
                    )
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Active Dehradun Rides Listings ─────────────────────────────── */}
      <section id="browse-rides" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header & Women-Only Filter Switch */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              {direction === 'from_campus'
                ? 'Departing from '
                : direction === 'to_campus'
                ? 'Arriving at '
                : 'All rides connecting '}
              <span className="text-emerald-700">
                {selectedCampus === 'bidholi' ? 'Bidholi Campus' : 'Kandoli Campus'}
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Verified university drivers · Split fuel costs · Safety verified
            </p>
          </div>

          {/* Filters: Women-Only Toggle */}
          <div className="flex items-center gap-3">
            <label className="relative inline-flex items-center cursor-pointer bg-white px-4 py-2 rounded-2xl border border-purple-200 shadow-xs">
              <input
                type="checkbox"
                checked={womenOnlyFilter}
                onChange={(e) => setWomenOnlyFilter(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[10px] after:left-[18px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              <span className="ml-3 text-xs font-black text-purple-900 flex items-center gap-1.5">
                <span>👩</span>
                <span>Women-Only Rides</span>
              </span>
            </label>

            {viewerGender === 'male' && (
              <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                🔒 Filter active: Women-only rides hidden for male accounts.
              </span>
            )}
          </div>
        </div>

        {/* ── Ola / Uber / Rapido Style Travel Options Carousel ─────────── */}
        <div className="mb-8 bg-white p-3 sm:p-4 rounded-3xl border border-slate-200/90 shadow-sm overflow-x-auto">
          <div className="flex items-center gap-2.5 min-w-max">
            {/* All Options button */}
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-3 rounded-2xl text-xs font-black transition flex items-center gap-2.5 border ${
                selectedCategory === 'all'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-md shadow-slate-900/20'
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              <span className="text-base">⚡</span>
              <div className="text-left">
                <div className="font-extrabold">All Travel Options</div>
                <div className={`text-[10px] font-medium ${selectedCategory === 'all' ? 'text-slate-300' : 'text-slate-500'}`}>
                  Sedan, SUV, Hatchback, Moto
                </div>
              </div>
              <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${selectedCategory === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                {getCategoryCount('all')}
              </span>
            </button>

            {/* Travel Category options */}
            {TRAVEL_CATEGORIES.map((cat) => {
              const count = getCategoryCount(cat.id);
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-4 py-3 rounded-2xl text-xs font-black transition flex items-center gap-3 border ${
                    isSelected
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-600/30 ring-2 ring-emerald-500 scale-102'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-xl">{cat.icon}</span>
                  <div className="text-left">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold">{cat.name}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {cat.badge}
                      </span>
                    </div>
                    <div className={`text-[10px] font-medium ${isSelected ? 'text-emerald-100' : 'text-slate-400'}`}>
                      {cat.capacityText}
                    </div>
                  </div>
                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Booking Notification Banner */}
        {bookingSuccess && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🎉</span>
              <div>
                <h4 className="font-bold text-sm">Seat Request Sent to {bookingRide?.driver.name}!</h4>
                <p className="text-xs text-emerald-800">
                  Pickup point: {bookingRide?.origin} ({bookingRide?.originArea}). Co-passenger chat opens on
                  confirmation.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setBookingSuccess(false)}
              className="text-xs font-bold text-emerald-700 hover:underline px-3 py-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Newly Published Ride Alert Banner */}
        {publishedToast && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-950 flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🚗</span>
              <div>
                <h4 className="font-bold text-sm">Ride Live on CampusRide!</h4>
                <p className="text-xs text-emerald-800">{publishedToast}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPublishedToast(null)}
              className="text-xs font-bold text-emerald-700 hover:underline px-3 py-1"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Ride Cards List */}
        <div className="space-y-4">
          {filteredRides.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs">
              <div className="text-4xl mb-3">🏔️</div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">No rides found in this category right now</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-4">
                Try selecting "All Travel Options" above, or publish your own ride on this route!
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory('all');
                }}
                className="bg-emerald-600 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md"
              >
                Show All Vehicle Types
              </button>
            </div>
          ) : (
            filteredRides.map((ride) => (
              <div
                key={ride.id}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 hover:border-emerald-500 hover:shadow-xl hover:shadow-emerald-600/5 transition-all flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              >
                {/* Left: Journey Timeline */}
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {ride.isWomenOnly && (
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200 flex items-center gap-1">
                        <span>👩</span>
                        <span>Women-Only Ride</span>
                      </span>
                    )}
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-200 flex items-center gap-1.5">
                      <span>{ride.vehicle.category === 'moto' ? '🏍️' : ride.vehicle.category === 'auto' ? '🛺' : ride.vehicle.category === 'sedan' ? '🚘' : '🚙'}</span>
                      <span>{ride.vehicle.categoryLabel} · {ride.vehicle.model}</span>
                    </span>
                    <span className="text-xs font-semibold text-slate-400">· {ride.duration} direct</span>
                  </div>

                  {/* Route points */}
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {/* Origin */}
                    <div className="relative">
                      <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-emerald-600 ring-4 ring-emerald-100" />
                      <div className="flex items-baseline gap-2">
                        <span className="font-black text-slate-900 text-base">{ride.departureTime}</span>
                        <span className="font-bold text-slate-900 text-sm">{ride.origin}</span>
                        <span className="text-xs text-slate-400">({ride.originArea})</span>
                      </div>
                    </div>

                    {/* Destination */}
                    <div className="relative">
                      <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-teal-600 ring-4 ring-teal-100" />
                      <div className="flex items-baseline gap-2">
                        <span className="font-black text-slate-900 text-base">{ride.arrivalTime}</span>
                        <span className="font-bold text-slate-900 text-sm">{ride.destination}</span>
                        <span className="text-xs text-slate-400">({ride.destArea})</span>
                      </div>
                    </div>
                  </div>

                  {ride.notes && (
                    <div className="mt-3 text-xs text-slate-500 bg-slate-50 p-2 rounded-xl border border-slate-100">
                      💬 <span className="font-medium">{ride.notes}</span>
                    </div>
                  )}
                </div>

                {/* Middle: Verified Driver Info */}
                <div className="flex items-center gap-3 lg:border-l lg:border-r border-slate-100 lg:px-6">
                  <img
                    src={ride.driver.avatar}
                    alt={ride.driver.name}
                    className="w-12 h-12 rounded-full object-cover ring-2 ring-slate-100 shadow-xs"
                  />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-900 text-sm">{ride.driver.name}</span>
                      {ride.driver.isCollegeVerified && (
                        <span className="text-emerald-600 text-xs font-bold" title="College Verified Student">
                          ✓
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">{ride.driver.college}</div>
                    <div className="flex items-center gap-2 text-xs mt-0.5">
                      <span className="font-bold text-amber-500 flex items-center gap-0.5">
                        ★ {ride.driver.rating}
                      </span>
                      <span className="text-slate-400">({ride.driver.tripsCount} trips)</span>
                    </div>
                  </div>
                </div>

                {/* Right: Price & CTA */}
                <div className="flex items-center lg:flex-col lg:items-end justify-between border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100 gap-3">
                  <div className="text-left lg:text-right">
                    <div className="flex items-baseline gap-1 lg:justify-end">
                      <span className="text-2xl font-black text-slate-900">₹{ride.contributionInr}</span>
                      <span className="text-xs text-slate-400 font-medium">/ seat</span>
                    </div>
                    <div className="text-[11px] font-bold text-emerald-600">
                      {ride.seatsLeft} of {ride.totalSeats} seats remaining
                    </div>
                    <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-800">
                      <span>Save ~₹{ride.commercialEstInr - ride.contributionInr}</span>
                      <span className="text-slate-400 font-normal">vs cab</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRequestSeatClick(ride)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm px-6 py-3 rounded-2xl shadow-md shadow-emerald-600/20 transition hover:-translate-y-0.5 active:translate-y-0"
                  >
                    Request Seat →
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* ── Dehradun Highway & Safety Advisory ─────────────────────────── */}
      <section className="bg-white border-t border-slate-200/80 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200">
              <div className="text-2xl mb-2">🏔️</div>
              <h3 className="font-bold text-slate-900 text-sm mb-1">Foothills & Weather Safety</h3>
              <p className="text-xs text-slate-600">
                Bidholi and Kandoli routes experience mountain terrain and rain. Drivers must be verified with active
                licenses and insurance.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-purple-50/70 border border-purple-200">
              <div className="text-2xl mb-2">👩</div>
              <h3 className="font-bold text-purple-950 text-sm mb-1">Women-Only Foothills Rides</h3>
              <p className="text-xs text-purple-800">
                Verified female drivers can offer rides exclusively for female co-passengers. Fully masked from male
                accounts.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-emerald-50/70 border border-emerald-200">
              <div className="text-2xl mb-2">⚖️</div>
              <h3 className="font-bold text-emerald-950 text-sm mb-1">Non-Profit Fuel Splitting</h3>
              <p className="text-xs text-emerald-800">
                Statutory cost-caps are calculated strictly per km. No taxi fares, no surge pricing, no commercial
                take-rates.
              </p>
            </div>
          </div>

          <div className="mt-8 p-4 rounded-2xl bg-red-50/60 border border-red-200 text-xs text-red-900 flex items-center gap-3">
            <span className="text-xl">⚠️</span>
            <div>
              <strong>Emergency & SOS Advisory (docs/05 §SOS): </strong>
              "{SAFETY_COPY.SOS_DISCLAIMER}"
            </div>
          </div>
        </div>
      </section>
        </>
      )}

      {/* ── Modal: Publish Ride Wizard ─────────────────────────────────── */}
      {activeModal === 'offer' && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-slate-900">Publish a Dehradun Ride</h3>
              <button
                type="button"
                onClick={() => {
                  setActiveModal('none');
                  setOfferSuccess(false);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl"
              >
                ✕
              </button>
            </div>

            {offerSuccess && lastPublishedRide ? (
              <div className="text-center py-6">
                <div className="text-5xl mb-3">🎉</div>
                <h4 className="text-xl font-black text-slate-900 mb-1">Ride Published Successfully!</h4>
                <p className="text-xs text-slate-500 mb-5">
                  Your ride has been added and is now live on the CampusRide feed for verified university members.
                </p>

                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-left mb-6 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center border-b border-emerald-200/60 pb-2">
                    <span className="text-slate-500 font-semibold">Route:</span>
                    <span className="font-extrabold text-slate-900">{lastPublishedRide.origin} → {lastPublishedRide.destination}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-emerald-200/60 pb-2">
                    <span className="text-slate-500 font-semibold">Pickup:</span>
                    <span className="font-bold text-slate-900">{lastPublishedRide.departureTime} · {lastPublishedRide.originArea}</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-emerald-200/60 pb-2">
                    <span className="text-slate-500 font-semibold">Vehicle:</span>
                    <span className="font-bold text-slate-900">{lastPublishedRide.vehicle.categoryLabel} ({lastPublishedRide.vehicle.model})</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500 font-semibold">Contribution:</span>
                    <span className="font-extrabold text-emerald-800 text-sm">₹{lastPublishedRide.contributionInr} / seat ({lastPublishedRide.seatsLeft} seat(s) available)</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setActiveModal('none');
                    setOfferSuccess(false);
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3.5 rounded-2xl shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 active:translate-y-0"
                >
                  View in Ride Feed →
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">From</label>
                    <select
                      value={offerOrigin}
                      onChange={(e) => setOfferOrigin(e.target.value)}
                      className="w-full text-xs font-semibold p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none"
                    >
                      <optgroup label="University Campuses">
                        {DEHRADUN_CAMPUSES.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="Dehradun Hubs">
                        {DEHRADUN_HUBS.map((h) => (
                          <option key={h.id} value={h.name}>
                            {h.name}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Pickup Landmark / Area</label>
                    <input
                      type="text"
                      placeholder="e.g. Gate 2 Opp. Food Court"
                      value={offerOriginArea}
                      onChange={(e) => setOfferOriginArea(e.target.value)}
                      className="w-full text-xs font-semibold p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">To</label>
                    <select
                      value={offerDest}
                      onChange={(e) => setOfferDest(e.target.value)}
                      className="w-full text-xs font-semibold p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none"
                    >
                      <optgroup label="Dehradun Hubs">
                        {DEHRADUN_HUBS.map((h) => (
                          <option key={h.id} value={h.name}>
                            {h.name}
                          </option>
                        ))}
                      </optgroup>
                      <optgroup label="University Campuses">
                        {DEHRADUN_CAMPUSES.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Drop-off Landmark / Area</label>
                    <input
                      type="text"
                      placeholder="e.g. Platform 4 / Gate 1"
                      value={offerDestArea}
                      onChange={(e) => setOfferDestArea(e.target.value)}
                      className="w-full text-xs font-semibold p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none"
                    />
                  </div>
                </div>

                {/* Departure Time & Vehicle Model */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Departure Time</label>
                    <input
                      type="text"
                      placeholder="e.g. 18:30 or Tomorrow 08:00 AM"
                      value={offerTime}
                      onChange={(e) => setOfferTime(e.target.value)}
                      className="w-full text-xs font-semibold p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle Model (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Honda City, Nexon, Classic 350"
                      value={offerModel}
                      onChange={(e) => setOfferModel(e.target.value)}
                      className="w-full text-xs font-semibold p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Vehicle Category</label>
                    <select
                      value={offerVehicleCategory}
                      onChange={(e) => {
                        const cat = e.target.value as TravelCategory;
                        setOfferVehicleCategory(cat);
                        if (cat === 'moto') {
                          setOfferSeats(1);
                        } else if (cat === 'auto') {
                          setOfferSeats(Math.min(offerSeats, 3));
                        } else if (cat === 'hatchback' || cat === 'sedan') {
                          setOfferSeats(Math.min(offerSeats, 4));
                        }
                      }}
                      className="w-full text-xs font-semibold p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none"
                    >
                      <option value="hatchback">🚗 Hatchback / Mini (Uber Go)</option>
                      <option value="sedan">🚘 Prime Sedan (City, Slavia)</option>
                      <option value="suv">🚙 SUV / XL (Nexon, Seltos)</option>
                      <option value="moto">🏍️ Moto / Bike (1 seat max)</option>
                      <option value="auto">🛺 Campus Auto Share (3 seats)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Seats Available</label>
                    <select
                      value={offerSeats}
                      disabled={offerVehicleCategory === 'moto'}
                      onChange={(e) => setOfferSeats(Number(e.target.value))}
                      className="w-full text-xs font-semibold p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none disabled:bg-slate-100"
                    >
                      {offerVehicleCategory === 'moto' ? (
                        <option value={1}>1 Seat (Safety Limit)</option>
                      ) : offerVehicleCategory === 'auto' ? (
                        <>
                          <option value={1}>1 Seat</option>
                          <option value={2}>2 Seats</option>
                          <option value={3}>3 Seats (Auto Max)</option>
                        </>
                      ) : offerVehicleCategory === 'suv' ? (
                        <>
                          <option value={1}>1 Seat</option>
                          <option value={2}>2 Seats</option>
                          <option value={3}>3 Seats</option>
                          <option value={4}>4 Seats</option>
                          <option value={5}>5 Seats</option>
                          <option value={6}>6 Seats (XL Max)</option>
                        </>
                      ) : (
                        <>
                          <option value={1}>1 Seat</option>
                          <option value={2}>2 Seats</option>
                          <option value={3}>3 Seats</option>
                          <option value={4}>4 Seats (Sedan/Hatchback)</option>
                        </>
                      )}
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">Cost-Share Contribution per Seat</label>
                    <span className="text-[11px] font-bold text-emerald-600">Legal Max Cap: ₹{maxPriceInr}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      value={offerPrice}
                      onChange={(e) => setOfferPrice(Number(e.target.value))}
                      className="w-full text-xs font-semibold p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none"
                    />
                  </div>
                </div>

                {/* Ride Notes */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Trip Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. AC on, ample luggage space, stops at Prem Nagar"
                    value={offerNotes}
                    onChange={(e) => setOfferNotes(e.target.value)}
                    className="w-full text-xs font-semibold p-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 outline-none"
                  />
                </div>

                {/* Women-Only Gating Switch */}
                <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <span className="text-xs font-bold text-purple-900 block">Offer as Women-Only Ride</span>
                      <span className="text-[11px] text-purple-700">
                        Restricts passengers strictly to verified female members
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={offerIsWomenOnly}
                      onChange={(e) => setOfferIsWomenOnly(e.target.checked)}
                      className="w-4 h-4 rounded text-purple-600"
                    />
                  </label>
                </div>

                <button
                  type="button"
                  onClick={handlePublishRide}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm py-3.5 rounded-2xl shadow-lg shadow-emerald-600/20 transition hover:-translate-y-0.5 active:translate-y-0 mt-2"
                >
                  Publish Ride →
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Booking Confirmation ─────────────────────────────────── */}
      {activeModal === 'booking' && bookingRide && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-black text-slate-900 mb-1">Confirm Seat Request</h3>
            <p className="text-xs text-slate-500 mb-4">
              Ride with {bookingRide.driver.name} · {bookingRide.origin} to {bookingRide.destination}
            </p>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 mb-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Departure</span>
                <span className="font-bold text-slate-900">
                  {bookingRide.departureTime} ({bookingRide.duration})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Vehicle</span>
                <span className="font-bold text-slate-900">{bookingRide.vehicle.model}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pickup Area</span>
                <span className="font-bold text-slate-900">{bookingRide.originArea}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Fuel Contribution</span>
                <span className="font-bold text-emerald-700 text-sm">₹{bookingRide.contributionInr}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
              * Non-commercial ride share. Settle fuel contribution directly with {bookingRide.driver.name}.
            </p>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  if (bookingRide) {
                    const updated = rides.map((r) =>
                      r.id === bookingRide.id ? { ...r, seatsLeft: Math.max(0, r.seatsLeft - 1) } : r
                    );
                    setRides(updated);
                    try {
                      localStorage.setItem('campusride_dehradun_rides', JSON.stringify(updated));
                    } catch {
                      // Ignore
                    }
                  }
                  setActiveModal('none');
                  setBookingSuccess(true);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20"
              >
                Confirm Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Safety Information ───────────────────────────────────── */}
      {activeModal === 'safety' && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <span>🛡️</span>
                <span>Dehradun Campus Safety Rules</span>
              </h3>
              <button
                type="button"
                onClick={() => setActiveModal('none')}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs text-slate-600">
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <strong className="text-emerald-900 block mb-1">Campus Verification:</strong>
                All drivers and riders belong to the verified college ecosystem. Drivers must have approved DL and
                vehicle RC.
              </div>
              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                <strong className="text-purple-900 block mb-1">Women-Only Protection (docs/05 §2):</strong>
                Women-only rides are verified by admin review and never surfaced to male members in search or direct
                links.
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <strong className="text-slate-900 block mb-1">No Commercial Surge:</strong>
                Legal maximum cost cap is enforced on every trip according to the Motor Vehicles Act.
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveModal('none')}
              className="mt-6 w-full bg-slate-900 text-white font-bold text-xs py-3 rounded-xl"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Modal: Authentication & Sign In ────────────────────────────── */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialRolePrompt={authPromptRole}
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          try {
            localStorage.setItem('campusride_current_user', JSON.stringify(user));
          } catch {
            // Ignore
          }
          setIsAuthModalOpen(false);
          if (user.gender === 'female' || user.gender === 'male') {
            setViewerGender(user.gender);
          }
          if (authPromptRole === 'driver') {
            if (user.driverVerified) {
              setViewMode('driver');
              handleOfferRideClick();
            } else {
              setIsDriverRegisterOpen(true);
            }
          }
          setPublishedToast(`Welcome, ${user.name}! You are signed in as a verified ${user.memberType}.`);
        }}
      />

      {/* ── Modal: Driver Verification & Vehicle Registration ─────────── */}
      {currentUser && (
        <DriverRegisterModal
          isOpen={isDriverRegisterOpen}
          onClose={() => setIsDriverRegisterOpen(false)}
          currentUser={currentUser}
          onRegisteredSuccess={(updatedUser) => {
            setCurrentUser(updatedUser);
            try {
              localStorage.setItem('campusride_current_user', JSON.stringify(updatedUser));
            } catch {
              // Ignore
            }
            setIsDriverRegisterOpen(false);
            setViewMode('driver');
            setPublishedToast('🎉 Driver verification approved! Welcome to CampusRide Driver Partner.');
          }}
        />
      )}

      {/* ── Modal: Campus Safety & Verification Desk ──────────────────── */}
      <AdminSafetyDeskModal
        isOpen={isAdminDeskOpen}
        onClose={() => setIsAdminDeskOpen(false)}
        onApproveDriver={(reqId, driverUserId) => {
          if (currentUser && currentUser.id === driverUserId) {
            const upgraded: UserProfile = {
              ...currentUser,
              trustTier: 'T2',
              driverVerified: true,
            };
            setCurrentUser(upgraded);
            try {
              localStorage.setItem('campusride_current_user', JSON.stringify(upgraded));
            } catch {
              // Ignore
            }
          }
          setPublishedToast('✓ Driver & Vehicle verified successfully. Granted Tier 2 status.');
        }}
      />

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-slate-200 bg-white py-8 px-4 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-900">{BRAND.name}</span>
            <span>· Dehradun (Kandoli & Bidholi Campuses)</span>
          </div>
          <div>Strictly voluntary cost-sharing · Compliant with the Motor Vehicles Act</div>
        </div>
      </footer>
    </div>
  );
}
