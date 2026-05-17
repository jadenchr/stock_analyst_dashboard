"use client";

import * as Tabs from "@radix-ui/react-tabs";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export interface SectionTabItem {
  value: string;
  label: string;
  content: React.ReactNode;
}

interface Props {
  items: SectionTabItem[];
  defaultValue?: string;
  className?: string;
  layoutId?: string;
}

/**
 * Animated tab switcher built on Radix Tabs. The active indicator uses
 * Framer Motion's shared layout for a smooth bar transition.
 */
export function SectionTabs({ items, defaultValue, className, layoutId = "section-tabs" }: Props) {
  return (
    <Tabs.Root defaultValue={defaultValue ?? items[0]?.value} className={cn("flex flex-col gap-4", className)}>
      <Tabs.List
        className="flex items-center gap-0.5 overflow-x-auto rounded-lg border border-border/70 bg-card/40 p-1"
        aria-label="Sections"
      >
        {items.map((item) => (
          <Tabs.Trigger
            key={item.value}
            value={item.value}
            className={cn(
              "group relative cursor-pointer rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-200",
              "data-[state=active]:text-foreground",
              "hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            )}
          >
            <ActivePill layoutId={layoutId} />
            <span className="relative z-10">{item.label}</span>
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      {items.map((item) => (
        <Tabs.Content
          key={item.value}
          value={item.value}
          className="focus-visible:outline-none data-[state=active]:animate-fade-in-up"
        >
          {item.content}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}

/**
 * Active state pill rendered behind the trigger; uses a Tailwind data-attr
 * selector to fade in only on the active trigger. Framer's layoutId would
 * be ideal but Radix manages mount/unmount via data-state, not conditional
 * rendering, so a plain CSS approach is simpler and just as smooth.
 */
function ActivePill({ layoutId }: { layoutId: string }) {
  return (
    <motion.span
      layoutId={layoutId}
      transition={{ type: "spring", stiffness: 380, damping: 32 }}
      className="absolute inset-0 rounded-md bg-muted opacity-0 transition-opacity group-data-[state=active]:opacity-100"
      aria-hidden
    />
  );
}
