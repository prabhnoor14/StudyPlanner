"use client";
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

export default function DayTaskCheckbox({ id, completed }: { id: string; completed: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const onChange = async () => {
    try {
      await fetch(`/api/day-task/${id}/complete`, { method: 'POST' });
    } catch (e) {
      // noop
    } finally {
      startTransition(() => router.refresh());
    }
  };
  return (
    <input
      type="checkbox"
      defaultChecked={completed}
      onChange={onChange}
      disabled={isPending}
      className="h-4 w-4 accent-brand-600"
      aria-label={completed ? 'Mark incomplete' : 'Mark complete'}
    />
  );
}
