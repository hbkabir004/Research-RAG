'use client';

import { ROLES } from '@/lib/prompts/systemPrompts';
import { Role } from '@/types';
import { useAppStore } from '@/store/appStore';

export default function RoleSelector() {
  const { selectedRole, setSelectedRole } = useAppStore();

  return (
    <div className="px-3 py-2">
      <p className="text-xs uppercase tracking-widest text-[#5a5448] mb-2 px-1">Research Mode</p>
      <div className="grid grid-cols-2 gap-1">
        {(Object.values(ROLES) as ReturnType<typeof Object.values<typeof ROLES[Role]>>[number][]).map((role) => {
          const isActive = selectedRole === role.id;
          return (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id as Role)}
              className={`relative flex flex-col items-start gap-0.5 px-3 py-2 rounded-md text-left transition-all duration-150 ${
                isActive
                  ? 'bg-[#1e2535] border border-[#c8962a]/40 text-[#e8b040]'
                  : 'border border-transparent text-[#9a9080] hover:bg-[#141820] hover:text-[#e8e0d4]'
              }`}
            >
              <span className="text-base leading-none">{role.emoji}</span>
              <span className="text-xs font-medium leading-tight">{role.label.split(' ')[0]}</span>
              {isActive && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#c8962a]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
