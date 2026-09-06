import React from 'react';

interface AdminHeaderProps {
  title: string;
  description?: string;
  userEmail?: string;
  onLogout?: () => void;
  action?: React.ReactNode;
}

export default function AdminHeader({ title, description, userEmail, onLogout, action }: AdminHeaderProps) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 mb-6 border-b border-stone-200 gap-4">
      <div>
        <h1 className="text-3xl font-serif font-medium text-stone-900">{title}</h1>
        {description && <p className="text-sm text-stone-500 mt-1">{description}</p>}
      </div>

      <div className="flex items-center gap-4">
        {/* Render custom action if provided */}
        {action}

        {/* Account Identifier & Logout */}
        {(userEmail || onLogout) && (
          <div className="flex items-center gap-3 pl-4 border-l border-stone-200">
            {userEmail && <span className="text-sm text-stone-600 font-medium">{userEmail}</span>}
            {onLogout && (
              <button
                onClick={onLogout}
                className="px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors"
              >
                Logout
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
