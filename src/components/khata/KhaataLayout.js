import React, { useState } from 'react';
import { DailyDashboard } from './DailyDashboard';
import { SupplierLedger } from './SupplierLedger';
import { PDCChequeLedger } from './PDCChequeLedger';
import { MasterLedger } from './MasterLedger';
import { CustomerCreditManager } from './CustomerCreditManager';
import { 
  ShoppingBag, 
  CreditCard, 
  LayoutDashboard, 
  CalendarDays, 
  Layers, 
  Users
} from 'lucide-react';

export function KhaataLayout({ user }) {
  const [activeTab, setActiveTab] = useState('purchases');

  const navItems = [
    { id: 'purchases', label: 'Purchases', icon: ShoppingBag },
    { id: 'ledger', label: 'Payments', icon: CreditCard },
    { id: 'daily', label: 'Counter Khata', icon: LayoutDashboard },
    { id: 'pdc', label: 'Cheque Flow', icon: CalendarDays },
    { id: 'master-ledger', label: 'Accounts Hub', icon: Layers },
    { id: 'customer-credit', label: 'Customers', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-[#f0fdfd] flex flex-col font-sans">
      
      {/* Replicated Page Banner matching the Store Owner Portal */}
      <div className="relative h-[160px] overflow-hidden w-full select-none shrink-0">
        <img 
          src="https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=1200&q=80" 
          alt="" 
          className="w-full h-full object-cover" 
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0f3460]/90 to-[#0e9090]/70" />
        <div className="absolute inset-0 flex items-center px-6 md:px-12">
          <div>
            <h2 className="text-white text-2xl font-black m-0 leading-tight">
              {user?.email ? `Welcome, Store Owner! 🏪` : 'My Accounts Dashboard 🏪'}
            </h2>
            <p className="text-white/80 text-sm mt-1 mb-0 font-medium">
              MediCLan Khaata · Accounts Handling &amp; Daily Ledger
            </p>
          </div>
        </div>
      </div>

      {/* Replicated Tab Navigation matching the applicants/profile page style */}
      <div className="max-w-[1360px] w-full mx-auto px-4 md:px-8 mt-6 select-none shrink-0">
        <div className="flex gap-2 border-b-2 border-slate-200 overflow-x-auto scrollbar-none pb-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-4.5 py-2.5 bg-transparent border-0 border-b-3 cursor-pointer text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap outline-none ${
                  isActive 
                    ? 'border-[#0e9090] text-[#0e9090] font-extrabold' 
                    : 'border-transparent text-slate-500 hover:text-[#0e9090]'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#0e9090]' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Contents Panel (Full Screen Width for Spacious Sheets) */}
      <div className="flex-1 max-w-[1360px] w-full mx-auto px-4 md:px-8 py-6 overflow-y-auto scrollbar-thin">
        <main className="space-y-6">
          <div className="animate-fadeIn duration-300">
            {activeTab === 'purchases' && <DailyDashboard mode="purchases" />}
            {activeTab === 'ledger' && <SupplierLedger />}
            {activeTab === 'daily' && <DailyDashboard mode="dashboard" />}
            {activeTab === 'pdc' && <PDCChequeLedger />}
            {activeTab === 'master-ledger' && <MasterLedger />}
            {activeTab === 'customer-credit' && <CustomerCreditManager />}
          </div>
        </main>
      </div>

    </div>
  );
}
