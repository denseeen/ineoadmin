"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Menu, Users, CheckCircle, DollarSign } from 'lucide-react';

const Sidebar = () => {
  const [isOpen, setIsOpen] = useState(false);
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

  const handleNavigation = (href) => {
    router.push(href);
    setIsOpen(false); // auto-close sidebar
  };

  return (
    <aside className={`bg-[#03acff] text-white w-${isOpen ? '52' : '20'} transition-all duration-300 flex flex-col h-screen`}>
      <div className="relative p-4 border-b border-gray-700 flex items-center justify-end">
        {isOpen && (
          <div className="absolute left-16 transform -translate-x-1/2">
            <img
              src="/images/final-logo.png"
              alt="Dashboard Logo"
              className="h-20 w-32"
            />
          </div>
        )}
        <button onClick={() => setIsOpen(!isOpen)}>
          <Menu className="w-6 h-6" />
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.name}
            onClick={() => handleNavigation(item.href)}
            className="flex items-center w-full text-left p-2 text-sm font-medium rounded hover:bg-blue-400 transition-colors"
          >
            <item.icon className="w-5 h-5 mr-3" />
            {isOpen && <span>{item.name}</span>}
          </button>
        ))}
      </nav>

      <div className="p-2 border-t border-gray-700">
        <button
          onClick={handleLogout}
          className="flex items-center p-2 w-full text-sm font-medium text-left hover:bg-blue-400 rounded transition-colors"
        >
          <LogOut className="w-5 h-5 mr-3" />
          {isOpen && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
