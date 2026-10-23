"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  Home as HomeIcon,
  LayoutGrid,
  BarChart3,
  Columns3,
  FolderKanban,
  Settings,
  UsersRound,
} from "lucide-react";
import { Dock, DockIcon, DockItem, DockLabel } from "@/components/ui/dock";
import { useTactileAudio } from "./useTactileAudio";

export interface DockItemData {
  id: string;
  title: string;
  icon: React.ElementType;
  href: string;
}

export const CANONICAL_DOCK_ITEMS: DockItemData[] = [
  { id: "home", title: "Home", icon: HomeIcon, href: "/home" },
  { id: "workspace", title: "Workspace", icon: LayoutGrid, href: "/studio" },
  { id: "team", title: "Team", icon: UsersRound, href: "/team" },
  { id: "metrics", title: "Metrics Dashboard", icon: BarChart3, href: "/activity" },
  { id: "kanban", title: "Kanban Board", icon: Columns3, href: "/kanban" },
  { id: "assets", title: "Assets", icon: FolderKanban, href: "/assets" },
  { id: "settings", title: "Settings", icon: Settings, href: "/settings" },
];

export function HomeVerticalDock({
  items = CANONICAL_DOCK_ITEMS,
  onItemClick,
}: {
  items?: DockItemData[];
  onItemClick?: (id: string, href: string) => void;
}) {
  const router = useRouter();
  const { playDockHoverSound, playFocusSound } = useTactileAudio();

  return (
    <aside
      className="fixed left-5 top-1/2 -translate-y-1/2 z-40 flex items-center pointer-events-auto"
      aria-label="Application Dock"
    >
      <Dock
        orientation="vertical"
        magnification={52}
        distance={140}
        spring={{ mass: 0.1, stiffness: 160, damping: 14 }}
        className="bg-transparent border-none shadow-none p-0 flex flex-col gap-2.5 items-start"
      >
        {items.map((item) => {
          const IconComp = item.icon;
          return (
            <DockItem
              key={item.id}
              label={item.title}
              onClick={() => {
                playFocusSound();
                if (onItemClick) {
                  onItemClick(item.id, item.href);
                } else {
                  router.push(item.href);
                }
              }}
              onMouseEnter={playDockHoverSound}
              className="rounded-full aspect-square bg-[#dce4dc] hover:bg-white text-[#0f1419] border border-[#cbd6cb] hover:border-white shadow-sm hover:shadow-md flex items-center justify-center transition-colors duration-150 group"
            >
              <DockLabel>{item.title}</DockLabel>
              <DockIcon>
                <IconComp className="w-full h-full text-current transition-transform group-hover:scale-105" />
              </DockIcon>
            </DockItem>
          );
        })}
      </Dock>
    </aside>
  );
}

