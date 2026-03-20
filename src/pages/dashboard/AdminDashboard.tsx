export default function AdminDashboard() {
  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white">
      <h1 className="text-2xl font-bold mb-8">System Root Administration</h1>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <p className="text-gray-400 text-sm">Всього користувачів</p>
          <p className="text-2xl font-mono">1,024</p>
        </div>
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <p className="text-gray-400 text-sm">Запитів до API/хв</p>
          <p className="text-2xl font-mono">156</p>
        </div>
      </div>
    </div>
  );
}
