import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', children, ...props }) => {
  const styles = {
    primary:
      'bg-green-600 text-white shadow-sm hover:bg-green-700 active:scale-[0.99] motion-reduce:active:scale-100',
    secondary:
      'border border-emerald-200/90 bg-white/90 text-gray-800 shadow-sm hover:bg-emerald-50/80 hover:border-emerald-300',
    danger:
      'bg-red-500 text-white shadow-sm hover:bg-red-600 active:scale-[0.99] motion-reduce:active:scale-100',
  };

  return (
    <button
      {...props}
      className={`w-full rounded-xl py-3 px-4 text-sm font-semibold transition disabled:pointer-events-none disabled:opacity-50 ${styles[variant]}`}
    >
      {children}
    </button>
  );
};
