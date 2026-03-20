import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Input: React.FC<InputProps> = ({ label, ...props }) => (
  <div className="flex flex-col gap-1 mb-4">
    <label className="text-sm font-medium text-gray-700">{label}</label>
    <input
      {...props}
      className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:outline-none transition-all"
    />
  </div>
);