import React from 'react'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'default' | 'ghost'
}

export const Button: React.FC<ButtonProps> = ({ variant = 'default', className, ...props }) => {
  const base = 'inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium'
  const variantCls = variant === 'ghost' ? 'bg-transparent' : 'bg-slate-900 text-white'
  return <button className={[base, variantCls, className].filter(Boolean).join(' ')} {...props} />
}

export default Button
