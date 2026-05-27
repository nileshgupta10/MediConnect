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
  Users,
  LogOut,
  User
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'next/router';

export function KhaataLayout({ user }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('purchases');

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/simple-login');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  const navItems = [
    { id: 'purchases', label: 'Purchases', icon: ShoppingBag },
    { id: 'ledger', label: 'Payments', icon: CreditCard },
    { id: 'daily', label: 'Counter Khata', icon: LayoutDashboard },
    { id: 'pdc', label: 'Cheque Flow', icon: CalendarDays },
    { id: 'master-ledger', label: 'Accounts Hub', icon: Layers },
    { id: 'customer-credit', label: 'Customers', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 flex flex-col lg:flex-row transition-colors duration-300">
      
      {/* Unified Premium Sidebar Nav */}
      <aside className="w-full lg:w-72 bg-white dark:bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-200/60 dark:border-slate-800/60 p-6 flex flex-col justify-between shrink-0 lg:sticky lg:top-0 lg:h-screen z-20">
        
        <div className="space-y-8">
          {/* Branded Logo & Header */}
          <div className="space-y-4">
            <div className="p-1.5 bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs inline-flex items-center justify-center h-12 w-16">
              <MediClanLogo className="h-10 w-12 object-contain select-none" />
            </div>
            <div className="space-y-1">
              <h1 className="text-xl font-black tracking-tight text-brand-navy dark:text-white">
                MediCLan Khaata
              </h1>
              <p className="text-[9px] text-slate-500 dark:text-slate-400 font-extrabold uppercase tracking-wider leading-relaxed">
                RELATIONS, OVER THE COUNTER.
              </p>
              <p className="text-[8px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider leading-none">
                Accounts Handling &amp; Daily Ledger
              </p>
            </div>
            
            <div className="inline-flex items-center gap-1.5 bg-brand-soft-teal dark:bg-brand-teal/10 px-3 py-1 rounded-full border border-brand-light-teal/50 dark:border-brand-teal/20">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-teal animate-pulse" />
              <span className="text-[8px] uppercase font-extrabold tracking-wider text-brand-teal dark:text-brand-mint">
                Live DB Connected
              </span>
            </div>
          </div>

          {/* Vertical Tab Navigation list */}
          <nav className="space-y-1">
            <span className="text-[9px] uppercase font-bold tracking-widest text-slate-450 dark:text-slate-500 block px-3 mb-2">OPERATIONS MENU</span>
            <div className="flex flex-col gap-1 w-full">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center justify-start gap-3 py-2.5 px-4 rounded-full text-xs font-extrabold transition-all border-0 text-left cursor-pointer outline-none ${
                      isActive 
                        ? 'bg-brand-teal text-white shadow-md shadow-brand-teal/25 dark:bg-brand-teal dark:text-white' 
                        : 'text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-600'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>
        </div>

        {/* Sidebar Footer Brand Sign-off & Active User Profile */}
        <div className="pt-6 border-t border-slate-100 dark:border-slate-850 flex flex-col gap-4 mt-6">
          
          {/* Active Store Owner User Info */}
          {user && (
            <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-850/50 p-3 rounded-2xl border border-slate-150/40 dark:border-slate-800/40">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-8 w-8 bg-brand-soft-teal dark:bg-brand-teal/20 border border-brand-light-teal/30 dark:border-brand-teal/30 rounded-full flex items-center justify-center text-xs font-black text-brand-teal dark:text-brand-mint shrink-0">
                  {user.email ? user.email.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-brand-navy dark:text-white truncate">
                    Store Owner
                  </p>
                  <p className="text-[8px] font-semibold text-slate-450 dark:text-slate-500 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
              
              <button 
                onClick={handleSignOut}
                title="Sign Out"
                className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-450 dark:text-slate-500 hover:text-rose-650 dark:hover:text-rose-450 rounded-lg transition-colors border-0 bg-transparent cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2 px-1 hidden lg:flex">
            <div className="h-5 w-5 bg-brand-soft-teal dark:bg-brand-teal/10 rounded-full flex items-center justify-center text-[9px] font-black text-brand-teal dark:text-brand-mint">
              M
            </div>
            <div>
              <p className="text-[9px] font-extrabold text-brand-navy dark:text-slate-350">MediCLan Systems</p>
              <p className="text-[7.5px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">v2.2.0 • Reconciled</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Unified Main Contents Container */}
      <div className="flex-1 bg-slate-50/30 dark:bg-slate-950 p-4 md:p-8 overflow-y-auto lg:h-screen scrollbar-thin">
        <main className="max-w-6xl mx-auto space-y-6">
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
