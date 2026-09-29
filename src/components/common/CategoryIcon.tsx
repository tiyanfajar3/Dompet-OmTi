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
  HelpCircle,
  Coffee,
  Plane,
  Smartphone,
  Banknote,
  Send,
  Building2,
  Wallet
} from 'lucide-react';

interface CategoryIconProps {
  name: string;
  className?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({ name, className = 'w-5 h-5' }) => {
  switch (name?.toLowerCase()) {
    case 'utensils':
    case 'makanan':
    case 'food':
      return <Utensils className={className} />;
    case 'car':
    case 'transportasi':
    case 'transport':
      return <Car className={className} />;
    case 'shoppingbag':
    case 'belanja':
    case 'shopping':
      return <ShoppingBag className={className} />;
    case 'receipt':
    case 'tagihan':
    case 'bills':
      return <Receipt className={className} />;
    case 'wifi':
    case 'pulsa & internet':
    case 'internet':
      return <Wifi className={className} />;
    case 'film':
    case 'hiburan':
    case 'entertainment':
      return <Film className={className} />;
    case 'heartpulse':
    case 'kesehatan':
    case 'health':
      return <HeartPulse className={className} />;
    case 'graduationcap':
    case 'pendidikan':
    case 'education':
      return <GraduationCap className={className} />;
    case 'creditcard':
    case 'cicilan':
    case 'debit':
    case 'kredit':
      return <CreditCard className={className} />;
    case 'home':
    case 'kebutuhan rumah':
    case 'household':
      return <Home className={className} />;
    case 'briefcase':
    case 'gaji':
    case 'salary':
      return <Briefcase className={className} />;
    case 'gift':
    case 'bonus':
      return <Gift className={className} />;
    case 'store':
    case 'usaha':
    case 'business':
      return <Store className={className} />;
    case 'arrowdownleft':
    case 'transfer':
      return <ArrowDownLeft className={className} />;
    case 'trendingup':
    case 'pendapatan lain':
    case 'investment':
      return <TrendingUp className={className} />;
    case 'coffee':
      return <Coffee className={className} />;
    case 'plane':
      return <Plane className={className} />;
    case 'smartphone':
    case 'e-wallet':
      return <Smartphone className={className} />;
    case 'banknote':
    case 'cash':
      return <Banknote className={className} />;
    case 'send':
      return <Send className={className} />;
    case 'building2':
    case 'bank':
      return <Building2 className={className} />;
    case 'wallet':
      return <Wallet className={className} />;
    default:
      return <MoreHorizontal className={className} />;
  }
};
