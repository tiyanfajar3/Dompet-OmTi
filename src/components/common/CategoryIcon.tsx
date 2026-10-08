import React from 'react';
import { 
  Utensils, 
  Car, 
  ShoppingBag, 
  Receipt, 
  Wifi, 
  Film, 
  HeartPulse, 
  GraduationCap, 
  CreditCard, 
  Home, 
  Briefcase, 
  Gift, 
  Store, 
  ArrowDownLeft, 
  TrendingUp, 
  MoreHorizontal, 
  Coffee, 
  Plane, 
  Smartphone, 
  Banknote, 
  Send, 
  Building2, 
  Wallet,
  Pizza,
  Beer,
  Apple,
  Cookie,
  Bike,
  Bus,
  Train,
  Fuel,
  ShoppingCart,
  Shirt,
  Package,
  Tag,
  Zap,
  Droplet,
  Tv,
  Wrench,
  PiggyBank,
  Coins,
  Pill,
  Dumbbell,
  Gamepad2,
  Music,
  BookOpen,
  Baby,
  PawPrint,
  Heart,
  Sparkles
} from 'lucide-react';

export interface CategoryIconMeta {
  id: string;
  label: string;
  emoji: string;
  group: 'makanan' | 'transportasi' | 'belanja' | 'rumah' | 'keuangan' | 'kesehatan' | 'hiburan' | 'lainnya';
}

export const AVAILABLE_CATEGORY_ICONS: CategoryIconMeta[] = [
  // Makanan & Minuman
  { id: 'Utensils', label: 'Makanan / Resto', emoji: '🍽️', group: 'makanan' },
  { id: 'Coffee', label: 'Kopi / Kafe', emoji: '☕', group: 'makanan' },
  { id: 'Pizza', label: 'Cepat Saji', emoji: '🍕', group: 'makanan' },
  { id: 'Beer', label: 'Minuman', emoji: '🥤', group: 'makanan' },
  { id: 'Apple', label: 'Buah & Sayur', emoji: '🍎', group: 'makanan' },
  { id: 'Cookie', label: 'Camilan / Snack', emoji: '🍪', group: 'makanan' },

  // Transportasi
  { id: 'Car', label: 'Mobil', emoji: '🚗', group: 'transportasi' },
  { id: 'Bike', label: 'Motor / Sepeda', emoji: '🏍️', group: 'transportasi' },
  { id: 'Bus', label: 'Bus / Angkutan', emoji: '🚌', group: 'transportasi' },
  { id: 'Train', label: 'Kereta Api', emoji: '🚆', group: 'transportasi' },
  { id: 'Plane', label: 'Pesawat / Travel', emoji: '✈️', group: 'transportasi' },
  { id: 'Fuel', label: 'BBM / Bensin', emoji: '⛽', group: 'transportasi' },

  // Belanja
  { id: 'ShoppingBag', label: 'Belanja', emoji: '🛍️', group: 'belanja' },
  { id: 'ShoppingCart', label: 'Supermarket', emoji: '🛒', group: 'belanja' },
  { id: 'Shirt', label: 'Pakaian / Fashion', emoji: '👕', group: 'belanja' },
  { id: 'Package', label: 'Paket / Kurir', emoji: '📦', group: 'belanja' },
  { id: 'Gift', label: 'Hadiah / Kado', emoji: '🎁', group: 'belanja' },
  { id: 'Tag', label: 'Diskon / Barang', emoji: '🏷️', group: 'belanja' },

  // Rumah & Tagihan
  { id: 'Home', label: 'Rumah / Kos', emoji: '🏠', group: 'rumah' },
  { id: 'Wifi', label: 'Internet & WiFi', emoji: '📶', group: 'rumah' },
  { id: 'Zap', label: 'Listrik / PLN', emoji: '⚡', group: 'rumah' },
  { id: 'Droplet', label: 'Air / PDAM', emoji: '💧', group: 'rumah' },
  { id: 'Smartphone', label: 'Pulsa & Kuota', emoji: '📱', group: 'rumah' },
  { id: 'Tv', label: 'TV / Langganan', emoji: '📺', group: 'rumah' },
  { id: 'Wrench', label: 'Perbaikan / Perkakas', emoji: '🔧', group: 'rumah' },

  // Keuangan
  { id: 'Briefcase', label: 'Gaji / Pekerjaan', emoji: '💼', group: 'keuangan' },
  { id: 'Wallet', label: 'Dompet / Kas', emoji: '👛', group: 'keuangan' },
  { id: 'Banknote', label: 'Uang Tunai', emoji: '💵', group: 'keuangan' },
  { id: 'CreditCard', label: 'Kartu Kredit / ATM', emoji: '💳', group: 'keuangan' },
  { id: 'Building2', label: 'Bank', emoji: '🏦', group: 'keuangan' },
  { id: 'Store', label: 'Toko / Usaha', emoji: '🏪', group: 'keuangan' },
  { id: 'TrendingUp', label: 'Investasi / Saham', emoji: '📈', group: 'keuangan' },
  { id: 'PiggyBank', label: 'Tabungan / Celengan', emoji: '🐷', group: 'keuangan' },
  { id: 'Coins', label: 'Koin / Receh', emoji: '🪙', group: 'keuangan' },
  { id: 'Receipt', label: 'Tagihan / Pajak', emoji: '🧾', group: 'keuangan' },
  { id: 'ArrowDownLeft', label: 'Transfer Masuk', emoji: '↙️', group: 'keuangan' },
  { id: 'Send', label: 'Transfer Keluar', emoji: '↗️', group: 'keuangan' },

  // Kesehatan & Kebugaran
  { id: 'HeartPulse', label: 'Kesehatan / Medis', emoji: '🏥', group: 'kesehatan' },
  { id: 'Pill', label: 'Obat & Vitamin', emoji: '💊', group: 'kesehatan' },
  { id: 'Dumbbell', label: 'Olahraga / Gym', emoji: '🏋️', group: 'kesehatan' },

  // Pendidikan & Hiburan
  { id: 'Film', label: 'Bioskop / Film', emoji: '🎬', group: 'hiburan' },
  { id: 'Gamepad2', label: 'Game / Hiburan', emoji: '🎮', group: 'hiburan' },
  { id: 'Music', label: 'Musik', emoji: '🎵', group: 'hiburan' },
  { id: 'GraduationCap', label: 'Pendidikan / Kuliah', emoji: '🎓', group: 'hiburan' },
  { id: 'BookOpen', label: 'Buku / Membaca', emoji: '📖', group: 'hiburan' },

  // Lainnya
  { id: 'Baby', label: 'Keluarga / Anak', emoji: '👶', group: 'lainnya' },
  { id: 'PawPrint', label: 'Hewan Peliharaan', emoji: '🐾', group: 'lainnya' },
  { id: 'Heart', label: 'Donasi / Amal', emoji: '❤️', group: 'lainnya' },
  { id: 'Sparkles', label: 'Spesial / Bonus', emoji: '✨', group: 'lainnya' },
  { id: 'MoreHorizontal', label: 'Lainnya', emoji: '⋯', group: 'lainnya' },
];

export function getCategoryEmoji(iconOrName?: string): string {
  if (!iconOrName) return '🏷️';
  const clean = iconOrName.trim().toLowerCase();
  
  // Direct match with icon id
  const matched = AVAILABLE_CATEGORY_ICONS.find(i => 
    i.id.toLowerCase() === clean || 
    i.label.toLowerCase() === clean || 
    i.label.toLowerCase().includes(clean) ||
    clean.includes(i.id.toLowerCase())
  );
  if (matched) return matched.emoji;

  // Keyword fallbacks
  if (clean.includes('makan') || clean.includes('resto') || clean.includes('food')) return '🍽️';
  if (clean.includes('kopi') || clean.includes('coffee')) return '☕';
  if (clean.includes('mobil') || clean.includes('trans')) return '🚗';
  if (clean.includes('motor') || clean.includes('bensin') || clean.includes('bbm')) return '⛽';
  if (clean.includes('belanja') || clean.includes('shop')) return '🛍️';
  if (clean.includes('gaji') || clean.includes('salary') || clean.includes('kerja')) return '💼';
  if (clean.includes('invest') || clean.includes('saham') || clean.includes('cuan')) return '📈';
  if (clean.includes('listrik') || clean.includes('pln')) return '⚡';
  if (clean.includes('air') || clean.includes('pdam')) return '💧';
  if (clean.includes('internet') || clean.includes('wifi') || clean.includes('pulsa')) return '📶';
  if (clean.includes('sehat') || clean.includes('obat') || clean.includes('dokter')) return '🏥';
  if (clean.includes('hiburan') || clean.includes('game') || clean.includes('film')) return '🎬';
  if (clean.includes('sekolah') || clean.includes('kuliah') || clean.includes('buku')) return '🎓';
  if (clean.includes('rumah') || clean.includes('kos') || clean.includes('kost')) return '🏠';
  if (clean.includes('usaha') || clean.includes('bisnis') || clean.includes('toko')) return '🏪';
  if (clean.includes('transfer')) return '💸';
  if (clean.includes('bonus') || clean.includes('hadiah')) return '🎁';
  if (clean.includes('sedekah') || clean.includes('zakat') || clean.includes('amal')) return '❤️';

  return '🏷️';
}

interface CategoryIconProps {
  name: string;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, className = 'w-5 h-5' }) => {
  if (!name) return <MoreHorizontal className={className} />;

  // If name is an emoji
  if (/^\p{Extended_Pictographic}/u.test(name.trim())) {
    return <span className={`${className} inline-flex items-center justify-center leading-none text-base`}>{name.trim()}</span>;
  }

  const clean = name.trim().toLowerCase();

  switch (clean) {
    case 'utensils':
    case 'makanan':
    case 'food':
      return <Utensils className={className} />;
    case 'coffee':
    case 'kopi':
      return <Coffee className={className} />;
    case 'pizza':
    case 'fastfood':
      return <Pizza className={className} />;
    case 'beer':
    case 'minuman':
      return <Beer className={className} />;
    case 'apple':
    case 'buah':
    case 'sayur':
      return <Apple className={className} />;
    case 'cookie':
    case 'snack':
      return <Cookie className={className} />;

    case 'car':
    case 'transportasi':
    case 'transport':
    case 'mobil':
      return <Car className={className} />;
    case 'bike':
    case 'motor':
    case 'sepeda':
      return <Bike className={className} />;
    case 'bus':
    case 'angkutan':
      return <Bus className={className} />;
    case 'train':
    case 'kereta':
      return <Train className={className} />;
    case 'plane':
    case 'pesawat':
    case 'travel':
      return <Plane className={className} />;
    case 'fuel':
    case 'bensin':
    case 'bbm':
      return <Fuel className={className} />;

    case 'shoppingbag':
    case 'belanja':
    case 'shopping':
      return <ShoppingBag className={className} />;
    case 'shoppingcart':
    case 'supermarket':
      return <ShoppingCart className={className} />;
    case 'shirt':
    case 'pakaian':
    case 'fashion':
      return <Shirt className={className} />;
    case 'package':
    case 'paket':
    case 'kurir':
      return <Package className={className} />;
    case 'gift':
    case 'bonus':
    case 'hadiah':
      return <Gift className={className} />;
    case 'tag':
    case 'diskon':
      return <Tag className={className} />;

    case 'home':
    case 'kebutuhan rumah':
    case 'household':
    case 'rumah':
    case 'kos':
      return <Home className={className} />;
    case 'wifi':
    case 'pulsa & internet':
    case 'internet':
      return <Wifi className={className} />;
    case 'zap':
    case 'listrik':
    case 'pln':
      return <Zap className={className} />;
    case 'droplet':
    case 'air':
    case 'pdam':
      return <Droplet className={className} />;
    case 'smartphone':
    case 'pulsa':
    case 'kuota':
    case 'e-wallet':
      return <Smartphone className={className} />;
    case 'tv':
    case 'televisi':
      return <Tv className={className} />;
    case 'wrench':
    case 'reparasi':
    case 'servis':
    case 'perkakas':
      return <Wrench className={className} />;

    case 'briefcase':
    case 'gaji':
    case 'salary':
    case 'kerja':
      return <Briefcase className={className} />;
    case 'wallet':
    case 'dompet':
      return <Wallet className={className} />;
    case 'banknote':
    case 'cash':
    case 'tunai':
      return <Banknote className={className} />;
    case 'creditcard':
    case 'cicilan':
    case 'debit':
    case 'kredit':
    case 'atm':
      return <CreditCard className={className} />;
    case 'building2':
    case 'bank':
      return <Building2 className={className} />;
    case 'store':
    case 'usaha':
    case 'business':
    case 'toko':
      return <Store className={className} />;
    case 'trendingup':
    case 'pendapatan lain':
    case 'investment':
    case 'investasi':
    case 'saham':
      return <TrendingUp className={className} />;
    case 'piggybank':
    case 'tabungan':
    case 'celengan':
      return <PiggyBank className={className} />;
    case 'coins':
    case 'koin':
    case 'receh':
      return <Coins className={className} />;
    case 'receipt':
    case 'tagihan':
    case 'bills':
    case 'pajak':
      return <Receipt className={className} />;
    case 'arrowdownleft':
    case 'transfer':
      return <ArrowDownLeft className={className} />;
    case 'send':
      return <Send className={className} />;

    case 'heartpulse':
    case 'kesehatan':
    case 'health':
    case 'medis':
      return <HeartPulse className={className} />;
    case 'pill':
    case 'obat':
    case 'vitamin':
      return <Pill className={className} />;
    case 'dumbbell':
    case 'olahraga':
    case 'gym':
      return <Dumbbell className={className} />;

    case 'film':
    case 'hiburan':
    case 'entertainment':
    case 'bioskop':
      return <Film className={className} />;
    case 'gamepad2':
    case 'game':
      return <Gamepad2 className={className} />;
    case 'music':
    case 'musik':
      return <Music className={className} />;
    case 'graduationcap':
    case 'pendidikan':
    case 'education':
    case 'kuliah':
    case 'sekolah':
      return <GraduationCap className={className} />;
    case 'bookopen':
    case 'buku':
      return <BookOpen className={className} />;

    case 'baby':
    case 'anak':
    case 'bayi':
      return <Baby className={className} />;
    case 'pawprint':
    case 'hewan':
    case 'pet':
      return <PawPrint className={className} />;
    case 'heart':
    case 'sedekah':
    case 'zakat':
    case 'donasi':
      return <Heart className={className} />;
    case 'sparkles':
      return <Sparkles className={className} />;

    default:
      return <MoreHorizontal className={className} />;
  }
};
