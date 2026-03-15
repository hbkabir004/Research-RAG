'use client';

import { ROLES } from '@/lib/prompts/systemPrompts';
import { Role } from '@/types';
import { useAppStore } from '@/store/appStore';

export default function RoleSelector() {
  const { selectedRole, setSelectedRole } = useAppStore();

  return (
    <div className="px-4 py-3">
      <p className="text-xs uppercase tracking-widest text-[#6b6460] mb-3 px-1 font-semibold">Research Mode</p>
      <div className="grid grid-cols-2 gap-1.5">
        {(Object.values(ROLES) as ReturnType<typeof Object.values<typeof ROLES[Role]>>[number][]).map((role) => {
          const isActive = selectedRole === role.id;
          return (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id as Role)}
              className={`relative flex flex-col items-start gap-1 px-3 py-3 rounded-lg text-left transition-all duration-200 group ${
                isActive
                  ? 'bg-[#252d3d]/60 border border-[#d4a847]/50 text-[#f0c840] shadow-sm shadow-[#d4a847]/10'
                  : 'border border-[#252d3d] text-[#a8a098] hover:border-[#252d3d]/80 hover:bg-[#151a24] hover:text-[#f0ede8]'
              }`}
            >
              <span className="text-lg leading-none">{role.emoji}</span>
              <span className="text-xs font-semibold leading-tight">{role.label.split(' ')[0]}</span>
              {isActive && (
                <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-[#d4a847] shadow-sm shadow-[#d4a847]/50" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
