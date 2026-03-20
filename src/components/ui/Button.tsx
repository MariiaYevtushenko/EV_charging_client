import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
}

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', children, ...props }) => {
  const styles = {
    primary: "bg-green-600 hover:bg-green-700 text-white",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800",
    danger: "bg-red-500 hover:bg-red-600 text-white",
  };

  return (
    <button
      {...props}
      className={`w-full py-2 px-4 rounded-lg font-semibold transition-colors disabled:opacity-50 ${styles[variant]}`}
    >
      {children}
    </button>
  );
};