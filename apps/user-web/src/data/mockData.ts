import { Salon, Barber, Service, Booking, Review, UserProfile, Notification, BarberApplication, ClientRecord } from '@/types';

const barbers: Barber[] = [
  { id: 'b1', name: 'Aziz Karimov', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', rating: 4.9, experience: 8, specialties: ['Klassik soch turmak', 'Soqol parvarish'], salonId: 's1', isOwner: true },
  { id: 'b2', name: 'Jasur Toshmatov', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face', rating: 4.7, experience: 5, specialties: ['Zamonaviy uslub', 'Rang berish'], salonId: 's1', isOwner: false },
  { id: 'b3', name: 'Sardor Alimov', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', rating: 4.8, experience: 10, specialties: ['Premium soch turmak', 'Yuz parvarish'], salonId: 's2', isOwner: true },
  { id: 'b4', name: 'Bobur Raximov', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face', rating: 4.6, experience: 3, specialties: ['Soch turmak', 'Soqol olish'], salonId: 's2', isOwner: false },
  { id: 'b5', name: 'Ulugbek Nazarov', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&h=150&fit=crop&crop=face', rating: 4.9, experience: 12, specialties: ['VIP xizmat', 'Klassik uslub'], salonId: 's3', isOwner: true },
  { id: 'b6', name: 'Sherzod Qodirov', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&h=150&fit=crop&crop=face', rating: 4.5, experience: 4, specialties: ['Zamonaviy turmak'], salonId: 's3', isOwner: false },
];

const services: Service[] = [
  { id: 'sv1', name: 'Klassik soch turmak', price: 40000, duration: 30, salonId: 's1' },
  { id: 'sv2', name: 'Soqol parvarish', price: 25000, duration: 20, salonId: 's1' },
  { id: 'sv3', name: 'Soch + soqol', price: 55000, duration: 45, salonId: 's1' },
  { id: 'sv4', name: 'Bosh massaj', price: 15000, duration: 15, salonId: 's1' },
  { id: 'sv5', name: 'Premium soch turmak', price: 60000, duration: 40, salonId: 's2' },
  { id: 'sv6', name: 'Yuz parvarish', price: 35000, duration: 30, salonId: 's2' },
  { id: 'sv7', name: 'Rang berish', price: 80000, duration: 60, salonId: 's2' },
  { id: 'sv8', name: 'VIP soch turmak', price: 100000, duration: 60, salonId: 's3' },
  { id: 'sv9', name: 'Royal soqol', price: 50000, duration: 30, salonId: 's3' },
  { id: 'sv10', name: 'To\'liq kompleks', price: 150000, duration: 90, salonId: 's3' },
];

const reviews: Review[] = [
  { id: 'r1', userId: 'u1', userName: 'Nodir M.', userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face', rating: 5, comment: 'Juda zo\'r xizmat! Albatta yana kelaman.', createdAt: '2024-01-15', salonId: 's1' },
  { id: 'r2', userId: 'u2', userName: 'Dilshod K.', userAvatar: 'https://images.unsplash.com/photo-1599566150163-29194dcabd9c?w=100&h=100&fit=crop&crop=face', rating: 4, comment: 'Yaxshi soch turmak, lekin biroz kutish kerak bo\'ldi.', createdAt: '2024-01-20', salonId: 's1' },
  { id: 'r3', userId: 'u3', userName: 'Shaxboz A.', userAvatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop&crop=face', rating: 5, comment: 'Eng yaxshi barbershop! Premium xizmat.', createdAt: '2024-02-01', salonId: 's2' },
  { id: 'r4', userId: 'u4', userName: 'Otabek R.', userAvatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop&crop=face', rating: 5, comment: 'VIP xizmat haqiqatan ham zo\'r!', createdAt: '2024-02-10', salonId: 's3' },
  { id: 'r5', userId: 'u1', userName: 'Nodir M.', userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face', rating: 4, comment: 'Yaxshi xizmat, tavsiya qilaman.', createdAt: '2024-02-15', salonId: 's3' },
];

export const salons: Salon[] = [
  {
    id: 's1', name: 'Barber House', description: 'Zamonaviy va klassik soch turmak xizmatlari', coverImage: 'https://images.unsplash.com/photo-1585747860019-8b15d7e2b3e0?w=800&h=400&fit=crop',
    gallery: ['https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=400&h=300&fit=crop', 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=400&h=300&fit=crop', 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&h=300&fit=crop'],
    rating: 4.8, reviewCount: 124, distance: 0.8, lat: 41.3111, lng: 69.2797, city: 'Toshkent', address: 'Amir Temur ko\'chasi 45', phone: '+998 90 123 45 67', languages: ['O\'zbek', 'Rus'], isPremium: false, workingDays: ['Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha'], workingHours: { open: '09:00', close: '21:00' },
    barbers: barbers.filter(b => b.salonId === 's1'), services: services.filter(s => s.salonId === 's1'), reviews: reviews.filter(r => r.salonId === 's1'),
  },
  {
    id: 's2', name: 'Elite Barbershop', description: 'Premium soch turmak va yuz parvarish markazi', coverImage: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=800&h=400&fit=crop',
    gallery: ['https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=400&h=300&fit=crop', 'https://images.unsplash.com/photo-1582095133179-bfd08e2fc6b3?w=400&h=300&fit=crop'],
    rating: 4.9, reviewCount: 89, distance: 1.2, lat: 41.3150, lng: 69.2850, city: 'Toshkent', address: 'Navoiy ko\'chasi 12', phone: '+998 91 234 56 78', languages: ['O\'zbek', 'Rus', 'Ingliz'], isPremium: true, workingDays: ['Du', 'Se', 'Cho', 'Pa', 'Ju', 'Sha', 'Ya'], workingHours: { open: '08:00', close: '22:00' },
    barbers: barbers.filter(b => b.salonId === 's2'), services: services.filter(s => s.salonId === 's2'), reviews: reviews.filter(r => r.salonId === 's2'),
  },
  {
    id: 's3', name: 'Royal Barber', description: 'VIP xizmat va eksklyuziv tajriba', coverImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=400&fit=crop',
    gallery: ['https://images.unsplash.com/photo-1599351431202-1e0f0137899a?w=400&h=300&fit=crop'],
    rating: 4.9, reviewCount: 67, distance: 2.5, lat: 41.3200, lng: 69.2700, city: 'Toshkent', address: 'Mustaqillik maydoni 8', phone: '+998 93 345 67 89', languages: ['O\'zbek', 'Rus'], isPremium: true, workingDays: ['Du', 'Se', 'Cho', 'Pa', 'Ju'], workingHours: { open: '10:00', close: '20:00' },
    barbers: barbers.filter(b => b.salonId === 's3'), services: services.filter(s => s.salonId === 's3'), reviews: reviews.filter(r => r.salonId === 's3'),
  },
];

export const mockBookings: Booking[] = [
  { id: 'bk1', salonId: 's1', salonName: 'Barber House', barberId: 'b1', barberName: 'Aziz Karimov', services: [{ name: 'Klassik soch turmak', price: 40000, duration: 30 }], totalPrice: 40000, totalDuration: 30, date: '2024-03-20', time: '14:00', status: 'confirmed', createdAt: '2024-03-18' },
  { id: 'bk2', salonId: 's2', salonName: 'Elite Barbershop', barberId: 'b3', barberName: 'Sardor Alimov', services: [{ name: 'Premium soch turmak', price: 60000, duration: 40 }, { name: 'Yuz parvarish', price: 35000, duration: 30 }], totalPrice: 95000, totalDuration: 70, date: '2024-03-15', time: '10:00', status: 'completed', createdAt: '2024-03-13' },
  { id: 'bk3', salonId: 's3', salonName: 'Royal Barber', barberId: 'b5', barberName: 'Ulugbek Nazarov', services: [{ name: 'VIP soch turmak', price: 100000, duration: 60 }], totalPrice: 100000, totalDuration: 60, date: '2024-03-25', time: '16:00', status: 'pending', createdAt: '2024-03-22' },
];

export const mockUser: UserProfile = {
  id: 'u1', name: 'Nodir Mahmudov', phone: '+998 90 987 65 43', email: 'nodir@mail.uz', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face',
  bookings: mockBookings, reviews: reviews.filter(r => r.userId === 'u1'),
};

export const mockNotifications: Notification[] = [
  { id: 'n1', type: 'confirmed', title: 'Band tasdiqlandi', message: 'Barber House — 20-mart, 14:00', read: false, createdAt: '2024-03-18' },
  { id: 'n2', type: 'reminder', title: 'Eslatma', message: 'Sizning bandingiz 1 soatdan keyin — Barber House', read: false, createdAt: '2024-03-20' },
  { id: 'n3', type: 'review_request', title: 'Fikr bildiring', message: 'Elite Barbershop tashrifi haqida fikringizni qoldiring', read: true, createdAt: '2024-03-15' },
];

export const mockApplications: BarberApplication[] = [
  { id: 'a1', name: 'Farhod Sobirov', age: 28, phone: '+998 94 111 22 33', email: 'farhod@mail.uz', shopName: 'Fresh Cut', city: 'Samarqand', lat: 39.6542, lng: 66.9597, status: 'pending', createdAt: '2024-03-10' },
  { id: 'a2', name: 'Timur Xolmatov', age: 32, phone: '+998 95 222 33 44', email: 'timur@mail.uz', shopName: 'Gentleman\'s Club', city: 'Buxoro', lat: 39.7747, lng: 64.4286, status: 'pending', createdAt: '2024-03-12' },
];

export const mockClients: ClientRecord[] = [
  { id: 'c1', name: 'Nodir Mahmudov', phone: '+998 90 987 65 43', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face', bookingCount: 5, lastVisit: '2024-03-15', totalSpent: 275000 },
  { id: 'c2', name: 'Dilshod Karimov', phone: '+998 91 111 22 33', avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcabd9c?w=100&h=100&fit=crop&crop=face', bookingCount: 1, lastVisit: '2024-03-10', totalSpent: 40000 },
  { id: 'c3', name: 'Shaxboz Axmedov', phone: '+998 93 333 44 55', avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=100&h=100&fit=crop&crop=face', bookingCount: 3, lastVisit: '2024-03-18', totalSpent: 180000 },
  { id: 'c4', name: 'Otabek Raximov', phone: '+998 94 444 55 66', avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop&crop=face', bookingCount: 8, lastVisit: '2024-03-20', totalSpent: 520000 },
];

export const timeSlots = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00',
];

export const uzbekistanCities = [
  'Toshkent', 'Samarqand', 'Buxoro', 'Namangan', 'Andijon',
  'Farg\'ona', 'Nukus', 'Qarshi', 'Guliston', 'Jizzax',
  'Navoiy', 'Termiz', 'Urganch', 'Xiva',
];
