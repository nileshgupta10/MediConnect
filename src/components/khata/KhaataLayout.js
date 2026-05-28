import React, { useState } from 'react';
import { DailyDashboard } from './DailyDashboard';
import { SupplierLedger } from './SupplierLedger';
import { PDCChequeLedger } from './PDCChequeLedger';
import { MasterLedger } from './MasterLedger';
import { CustomerCreditManager } from './CustomerCreditManager';
import { MediClanLogo } from './MediClanLogo';
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
    <div 
      className="flex flex-col lg:flex-row min-h-[calc(100vh-48px)] transition-colors duration-300 bg-[#f0fdfd]"
      style={{ fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}
    >
      
      {/* Premium Sidebar Nav (Sticky below the top navbar) */}
      <aside className="w-full lg:w-64 bg-white dark:bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-200/60 dark:border-slate-800/60 px-5 pt-7 pb-5 flex flex-col justify-between shrink-0 lg:sticky lg:top-[48px] lg:h-[calc(100vh-48px)] z-20 select-none">
        
        <div className="flex flex-col gap-8">
          {/* Branded Logo & Header */}
          <div className="flex flex-col gap-4">
            <div className="p-2 bg-white border border-slate-200 rounded-xl shadow-xs inline-flex items-center justify-center h-14 w-20">
              <img src="/mediclan-logo-emblem.png" className="max-h-11 max-w-full object-contain select-none" alt="MediCLan Logo" />
            </div>
            <div className="flex flex-col gap-1.5">
              <h1 className="text-[22px] font-black tracking-tight text-[#0f3460] dark:text-white leading-none">
                MediCLan Khaata
              </h1>
              <p className="text-[10px] text-[#0e9090] font-extrabold uppercase tracking-wider leading-relaxed">
                RELATIONS, OVER THE COUNTER.
              </p>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider leading-none">
                Accounts Handling &amp; Daily Ledger
              </p>
            </div>
            
            <div className="inline-flex items-center gap-1.5 bg-brand-soft-teal dark:bg-brand-teal/10 px-3 py-1.5 rounded-lg border border-brand-light-teal/50 dark:border-brand-teal/20">
              <span className="h-1.5 w-1.5 rounded-full bg-[#0e9090] animate-pulse" />
              <span className="text-[9px] uppercase font-extrabold tracking-wider text-[#0e9090]">
                Live DB Connected
              </span>
            </div>
          </div>
 
          {/* Vertical Tab Navigation list */}
          <nav className="flex flex-col gap-1">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400 dark:text-slate-550 block px-3 mb-2">OPERATIONS MENU</span>
            <div className="flex flex-col gap-1.5 w-full">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-start gap-3 py-2.5 px-4 rounded-lg text-[13px] font-bold transition-all border-0 text-left cursor-pointer outline-none ${
                      isActive 
                        ? 'bg-[#0e9090] text-white shadow-sm shadow-teal-700/20' 
                        : 'text-slate-600 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4.5 h-4.5 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-450 dark:text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Sidebar Footer Brand Sign-off */}
        <div className="pt-5 border-t border-slate-100 dark:border-slate-850 flex flex-col gap-3 mt-6">
          <div className="flex items-center gap-2.5 px-1">
            <div className="h-6 w-6 bg-brand-soft-teal dark:bg-brand-teal/10 rounded-full flex items-center justify-center text-[10px] font-black text-[#0e9090]">
              M
            </div>
            <div>
              <p className="text-[10px] font-extrabold text-[#0f3460] dark:text-slate-350">MediCLan Systems</p>
              <p className="text-[8px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">v2.2.0 • Reconciled</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Spacious Main Contents Container */}
      <div className="flex-1 p-4 md:p-6 lg:p-8">
        <main className="max-w-[1360px] mx-auto space-y-6 px-2 md:px-4">
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
