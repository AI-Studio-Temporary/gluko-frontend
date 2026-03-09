export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Gluko</h1>
        <p className="text-xl text-gray-600">AI-powered diabetes assistant</p>
        <p className="mt-2 text-sm text-gray-400">
          API: {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api'}
        </p>
      </div>
    </main>
  )
}
