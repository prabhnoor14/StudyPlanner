import React from 'react';
// Use loose typing until Prisma client regenerated with new allocatedMinutes field
interface StudyDayTaskLite { id: string; description: string; completed: boolean; studyDayId: string; allocatedMinutes?: number }
interface StudyDayLite { id: string; date: Date; studyPlanId: string; tasks: StudyDayTaskLite[] }
interface StudyPlanLite { id: string; taskId: string; days: StudyDayLite[] }

interface PlanWithDays extends StudyPlanLite {}

export default function PlanTimeline({ plan }: { plan: PlanWithDays }) {
  const daysSorted = [...plan.days].sort((a,b)=>a.date.getTime()-b.date.getTime());
  const totalMinutes = daysSorted.reduce((acc,d)=>acc + d.tasks.reduce((a,t)=>a+(t.allocatedMinutes||0),0),0);
  return (
    <div className="space-y-6">
      <div className="card space-y-2">
        <h3 className="font-medium">Time Distribution</h3>
        <div className="flex gap-1 w-full">
          {daysSorted.map(d => {
            const dayMinutes = d.tasks.reduce((a,t)=>a+(t.allocatedMinutes||0),0);
            const pct = totalMinutes ? (dayMinutes/totalMinutes)*100 : 0;
            return (
              <div key={d.id} className="flex-1 min-w-8 flex flex-col items-center">
                <div className="h-24 w-full bg-brand-100 rounded relative overflow-hidden">
                  <div className="absolute bottom-0 left-0 right-0 bg-brand-500" style={{ height: `${pct}%` }} />
                </div>
                <span className="text-[10px] mt-1 text-gray-600">{d.date.toISOString().split('T')[0]}</span>
                <span className="text-[10px] text-gray-500">{dayMinutes}m</span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-gray-600">Total Allocated: {totalMinutes} minutes</p>
      </div>
      <div className="space-y-4">
        {daysSorted.map(d => (
          <div key={d.id} className="card space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">{d.date.toISOString().split('T')[0]}</h4>
              <span className="text-xs text-gray-500">{d.tasks.reduce((a,t)=>a+(t.allocatedMinutes||0),0)}m</span>
            </div>
            <ul className="space-y-1 text-xs">
              {d.tasks.map(t => (
                <li key={t.id} className="flex justify-between">
                  <span>{t.description}</span>
                  <span className="text-gray-500">{(t.allocatedMinutes||0)}m</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="card space-y-2">
        <h3 className="font-medium">Pie Chart (Approx)</h3>
        <div className="mx-auto w-40 h-40 rounded-full" style={{
          background: `conic-gradient(${daysSorted.map(d => {
            const dayMinutes = d.tasks.reduce((a,t)=>a+(t.allocatedMinutes||0),0);
            const deg = totalMinutes ? (dayMinutes/totalMinutes)*360 : 0;
            return `var(--slice-color, #3d7dff) 0 ${deg}deg`; // repeated color for simplicity
          }).join(',')})`
        }} />
        <p className="text-[11px] text-gray-500">Each slice proportional to daily allocated minutes.</p>
      </div>
    </div>
  );
}
