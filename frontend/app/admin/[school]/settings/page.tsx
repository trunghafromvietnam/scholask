export default function AdminSettings({ params }: { params: { school: string } }) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-2">Settings</h1>
        <ul className="list-disc pl-6 text-sm text-gray-700 space-y-1">
          <li>Model: Claude 3.5 Sonnet</li>
          <li>Embedding: Titan V2 (1024-dim)</li>
          <li>Offline mode toggle</li>
          <li>Allowed origins & subdomains</li>
        </ul>
      </div>
    );
  }
  