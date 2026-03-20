import React from 'react';
import { appInputClass } from '../station-admin/formStyles';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export const Input: React.FC<InputProps> = ({ label, ...props }) => (
  <div className="mb-4 flex flex-col gap-1.5">
    <label className="text-sm font-medium text-gray-700">{label}</label>
    <input {...props} className={appInputClass} />
  </div>
);
