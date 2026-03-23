export function HealthBar({ health, maxHealth, player }) {
  const percentage = (health / maxHealth) * 100;
  const isLow = health < 5;
  
  return (
    <div className="w-full">
      <div className="flex justify-between text-white mb-1">
        <span className="font-bold">{player === 'p1' ? 'PLAYER 1' : 'PLAYER 2'}</span>
        <span className={`font-mono ${isLow ? 'text-red-500 animate-pulse' : ''}`}>
          {health.toFixed(1)}s
        </span>
      </div>
      <div className="h-6 bg-gray-800 rounded-full overflow-hidden border-2 border-gray-700">
        <div
          className={`h-full transition-all duration-100 ${
            isLow ? 'bg-red-500 animate-pulse' : 'bg-green-500'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}