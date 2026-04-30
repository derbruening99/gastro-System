export default function TenantNotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="text-center max-w-sm">
        <p className="text-6xl mb-4">🍽️</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Restaurant nicht gefunden</h1>
        <p className="text-gray-500 text-sm">
          Dieser Link ist ungültig oder das Restaurant ist nicht mehr aktiv.
          Bitte prüfe den QR-Code oder wende dich an das Personal.
        </p>
      </div>
    </div>
  )
}
