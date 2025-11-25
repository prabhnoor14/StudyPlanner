import Link from 'next/link';

export default function Home() {
  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Welcome to StudyPlan AI</h2>
        <p className="text-sm text-gray-600">Generate personalized, adaptive study schedules with AI-powered topic summaries and progress tracking.</p>
      </div>
      <div className="flex gap-3">
        <Link href="/register" className="btn">Get Started</Link>
        <Link href="/login" className="btn btn-secondary">Login</Link>
      </div>
      <div className="card space-y-2">
        <h3 className="font-semibold">Features</h3>
        <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
          <li>Daily study breakdown</li>
          <li>Auto-generated topic summaries</li>
          <li>Progress dashboards</li>
          <li>Regenerate plans any time</li>
        </ul>
      </div>
    </div>
  );
}
