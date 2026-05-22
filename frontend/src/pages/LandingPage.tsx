import { Link } from 'react-router-dom'

export function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <h1 className="text-4xl font-bold text-foreground">Enterprise RAG System</h1>
      <p className="text-muted-foreground max-w-md">
        Upload PDFs, ask questions, get answers with source citations — powered by local AI.
      </p>
      <div className="flex gap-3">
        <Link to="/login" className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
          Sign in
        </Link>
        <Link to="/register" className="px-5 py-2.5 rounded-lg border border-border text-sm font-medium hover:bg-accent">
          Create account
        </Link>
      </div>
    </div>
  )
}
