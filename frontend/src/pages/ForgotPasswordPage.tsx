import { Link } from 'react-router-dom'

export function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-sm space-y-6 p-8 rounded-lg border border-border">
        <h1 className="text-2xl font-bold text-foreground">Reset password</h1>
        <p className="text-sm text-muted-foreground">
          Password reset is not yet implemented. Contact your administrator.
        </p>
        <Link to="/login" className="block text-sm text-primary hover:underline">
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
