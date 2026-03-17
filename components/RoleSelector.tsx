'use client';
import { ROLES } from '@/lib/prompts/systemPrompts';
import { Role } from '@/types';
import { useAppStore } from '@/store/appStore';

const roles = ['phd','reviewer','mentor','writer'] as Role[];

export default function RoleSelector() {
  const { selectedRole, setSelectedRole } = useAppStore();
  return (
    <div className="sidebar-section">
      <p className="section-label">Research Mode</p>
      <div className="role-grid">
        {roles.map(id => {
          const r = ROLES[id];
          return (
            <button key={id} onClick={() => setSelectedRole(id)}
              className={`role-card ${selectedRole === id ? 'active' : ''}`}>
              <span className="role-emoji">{r.emoji}</span>
              <span className="role-name">{r.label.split(' ')[0]}<br/>{r.label.split(' ').slice(1).join(' ')}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
