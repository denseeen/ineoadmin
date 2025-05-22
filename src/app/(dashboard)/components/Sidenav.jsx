// src/app/(dashboard)/components/Sidenav.jsx
"use client";

import { useState } from 'react';
import Link from 'next/link';
import { LogOut, Menu, Users, CheckCircle, DollarSign } from 'lucide-react';
import { useRouter } from 'next/navigation';

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(true);
  const router = useRouter();

  const navItems = [
    { name: 'Trial Registration', href: '/trial-registration', icon: Users },
    { name: 'On-Trial', href: '/on-trial', icon: CheckCircle },
    { name: 'Subscribers', href: '/subscribers', icon: Users },
    { name: 'Billing', href: '/billing', icon: DollarSign },
  ];

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  return (
    <aside className={`bg-[#03acff] text-white w-${isOpen ? '64' : '20'} transition-all duration-300 flex flex-col h-screen`}>
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <span className="text-xl font-bold">{isOpen ? 'Dashboard' : ''}</span>
        <button onClick={() => setIsOpen(!isOpen)}>
          <Menu className="w-6 h-6" />
        </button>
      </div>
      <nav className="flex-1 p-2 space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.name}
            href={item.href}
            className="flex items-center p-2 text-sm font-medium rounded hover:bg-gray-700 transition-colors"
          >
            <item.icon className="w-5 h-5 mr-3" />
            {isOpen && <span>{item.name}</span>}
          </Link>
        ))}
      </nav>
      <div className="p-2 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="flex items-center p-2 w-full text-sm font-medium text-left hover:bg-gray-700 rounded transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3" />
          {isOpen && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
