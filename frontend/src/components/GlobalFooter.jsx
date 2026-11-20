import React from 'react';
import { Heart, Activity, MessageCircle, ShieldCheck } from 'lucide-react';

export default function GlobalFooter() {
  return (
    <footer className="w-full bg-black text-white mt-16 py-12 px-6 border-t border-white/10 select-none">
      <div className="max-w-[1024px] mx-auto space-y-10">
        {/* 4 Columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-sm">
          {/* Col 1: Platform */}
          <div className="space-y-3">
            <h4 className="text-white font-medium tracking-tight text-base">Platform</h4>
            <ul className="space-y-2 text-[#8a8a8e]">
              <li className="hover:text-white transition-colors cursor-pointer">WhatsApp Flow Cloud</li>
              <li className="hover:text-white transition-colors cursor-pointer">Live Booking Engine</li>
              <li className="hover:text-white transition-colors cursor-pointer">Doctor Roster & Shifts</li>
              <li className="hover:text-white transition-colors cursor-pointer">Google Sheets Real-time Sync</li>
            </ul>
          </div>

          {/* Col 2: Clinical Services */}
          <div className="space-y-3">
            <h4 className="text-white font-medium tracking-tight text-base">Clinical Suite</h4>
            <ul className="space-y-2 text-[#8a8a8e]">
              <li className="hover:text-white transition-colors cursor-pointer">OPD Appointments</li>
              <li className="hover:text-white transition-colors cursor-pointer">Emergency Triage</li>
              <li className="hover:text-white transition-colors cursor-pointer">Bilingual Flow (EN / TE)</li>
              <li className="hover:text-white transition-colors cursor-pointer">Automated Postponements</li>
            </ul>
          </div>

          {/* Col 3: Compliance & Security */}
          <div className="space-y-3">
            <h4 className="text-white font-medium tracking-tight text-base">Security & Health</h4>
            <ul className="space-y-2 text-[#8a8a8e]">
              <li className="hover:text-white transition-colors cursor-pointer">In-memory PDF Security</li>
              <li className="hover:text-white transition-colors cursor-pointer">End-to-End Meta Cloud</li>
              <li className="hover:text-white transition-colors cursor-pointer">Role-Based Access (RBAC)</li>
              <li className="hover:text-white transition-colors cursor-pointer">Audit Trail & Receipts</li>
            </ul>
          </div>

          {/* Col 4: Support */}
          <div className="space-y-3">
            <h4 className="text-white font-medium tracking-tight text-base">Hospital Care</h4>
            <ul className="space-y-2 text-[#8a8a8e]">
              <li className="hover:text-white transition-colors cursor-pointer flex items-center gap-1.5">
                <MessageCircle size={14} className="text-brand-blue" />
                <span>WhatsApp Helpline</span>
              </li>
              <li className="hover:text-white transition-colors cursor-pointer flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>HIPAA-aligned Practices</span>
              </li>
              <li className="hover:text-white transition-colors cursor-pointer flex items-center gap-1.5">
                <Activity size={14} className="text-brand-yellow" />
                <span>System Operational: 99.98%</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8a8a8e]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-brand-blue text-white flex items-center justify-center font-bold text-xs">
              +
            </div>
            <span className="text-white font-medium text-sm">Vijya Hospital Console</span>
            <span className="hidden sm:inline text-white/30">|</span>
            <span>Colorful App Theatre Edition</span>
          </div>

          <div className="flex items-center gap-4">
            <span>© {new Date().getFullYear()} Vijya Hospital. All rights reserved.</span>
            <div className="flex items-center gap-1.5 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Live Engine</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

