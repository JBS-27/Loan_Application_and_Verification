import { formatDateTime } from "@/lib/format";

export function ActivityTimeline({
  events,
}: {
  events: { _id?: string; action: string; details?: string; actorName?: string; createdAt: string }[];
}) {
  if (!events.length) {
    return <p className="text-sm text-muted-foreground">No activity recorded yet.</p>;
  }

  return (
    <ol className="space-y-4">
      {events.map((event, index) => (
        <li key={event._id || index} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span className="mt-1 size-2.5 rounded-full bg-primary" />
            {index < events.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
          </div>
          <div className="pb-2">
            <p className="text-sm font-medium">{event.action}</p>
            {event.details ? <p className="text-sm text-muted-foreground">{event.details}</p> : null}
            <p className="mt-1 text-xs text-muted-foreground">
              {event.actorName || "System"} · {formatDateTime(event.createdAt)}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
