export default function RoutineTable({ routine }) {

  const days = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

  return (
    <div className="overflow-x-auto mt-6">
      <table className="border w-full text-center">
        <thead>
          <tr className="bg-gray-200">
            <th className="border p-2">Day</th>
            <th className="border p-2">Time</th>
            <th className="border p-2">Activity</th>
          </tr>
        </thead>

        <tbody>
          {days.map(day => (
            <tr key={day}>
              <td className="border p-2 font-medium">{day}</td>

              <td className="border p-2">
                {routine[day]?.time || "-"}
              </td>

              <td className="border p-2">
                {routine[day]?.activity || "-"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
