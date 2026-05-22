/**
 * Shared UI primitives — layout and form building blocks used across pages.
 */
import React from 'react'
import { cn } from '../../lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

export function Button({
  children,
  className,
  variant = 'secondary',
  type = 'button',
  ...props
}: ButtonProps) {
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-primary text-primary-foreground shadow-soft hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
    outline: 'border border-border bg-background hover:bg-accent hover:text-accent-foreground',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  }

  return (
    <button
      type={type}
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-lg px-4 text-sm font-medium transition',
        'focus:outline-none focus:ring-2 focus:ring-primary/40',
        'disabled:pointer-events-none disabled:opacity-60',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

interface ChildrenProps {
  children: React.ReactNode
  className?: string
}

// ── Layout ────────────────────────────────────────────────────────────────────

export function PageShell({ children, className }: ChildrenProps) {
  return (
    <div className={cn('mx-auto max-w-6xl space-y-6 py-2', className)}>
      {children}
    </div>
  )
}

export function Surface({ children, className }: ChildrenProps) {
  return (
    <div className={cn('rounded-2xl border border-border bg-background/60 backdrop-blur-sm', className)}>
      {children}
    </div>
  )
}

// ── PageHeader ────────────────────────────────────────────────────────────────

interface PageHeaderProps {
  title: string
  description?: string
  actions?: React.ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

// ── Select ────────────────────────────────────────────────────────────────────

export function Select({
  children,
  className,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        'rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground',
        'focus:outline-none focus:ring-2 focus:ring-primary/40',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  )
}
