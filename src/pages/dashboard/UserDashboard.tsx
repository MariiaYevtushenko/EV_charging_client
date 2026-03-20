export default function UserDashboard() {
  return (
    <div className="p-6">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-gray-800">Мій кабінет</h1>
        <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg font-bold">Баланс: 450.00 грн</div>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border h-64 flex items-center justify-center">
          Карта станцій (Тут буде Leaflet/Google Maps)
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border h-64">
          <h3 className="font-bold mb-4">Останні сесії</h3>
          <p className="text-gray-400">У вас поки немає завершених сесій</p>
        </div>
      </div>
    </div>
  );
}
