import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { SalonStory } from "@/lib/stories-mock";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function StoryRingButton({
  story,
  linkTo,
}: {
  story: SalonStory;
  linkTo: "viewer" | "hub";
}) {
  const ring = (
    <>
      <span
        className={cn(
          "grid h-[62px] w-[62px] place-items-center rounded-full p-[3px]",
          story.unseen
            ? "bg-gradient-to-tr from-foreground via-foreground/70 to-foreground/40"
            : "bg-muted-foreground/25",
        )}
      >
        <span
          className="grid h-full w-full place-items-center rounded-full bg-background text-xs font-bold"
          style={{
            background: `linear-gradient(135deg, oklch(0.88 0.03 ${(Number(story.salonId) * 70) % 360}), oklch(0.72 0.04 ${(Number(story.salonId) * 70 + 40) % 360}))`,
          }}
        >
          {initials(story.salonName)}
        </span>
      </span>
      <span className="max-w-[68px] truncate text-[10px] font-bold">{story.salonName.split(" ")[0]}</span>
    </>
  );

  if (linkTo === "hub") {
    return (
      <Link
        to="/stories"
        search={{ start: story.salonId }}
        className="flex w-[68px] shrink-0 flex-col items-center gap-1.5 active:scale-95"
      >
        {ring}
      </Link>
    );
  }

  return (
    <Link
      to="/stories/$salonId"
      params={{ salonId: story.salonId }}
      className="flex w-[68px] shrink-0 flex-col items-center gap-1.5 active:scale-95"
    >
      {ring}
    </Link>
  );
}

export function StoryRings({
  stories,
  className,
  linkTo = "viewer",
}: {
  stories: SalonStory[];
  className?: string;
  linkTo?: "viewer" | "hub";
}) {
  return (
    <div className={cn("no-scrollbar flex gap-3 overflow-x-auto", className)}>
      <Link to="/stories" className="flex w-[68px] shrink-0 flex-col items-center gap-1.5">
        <span className="grid h-[62px] w-[62px] place-items-center rounded-full border-2 border-dashed border-foreground/30 bg-surface text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          +
        </span>
        <span className="max-w-[68px] truncate text-[10px] font-bold">Barchasi</span>
      </Link>
      {stories.map((story) => (
        <StoryRingButton key={story.salonId} story={story} linkTo={linkTo} />
      ))}
    </div>
  );
}
