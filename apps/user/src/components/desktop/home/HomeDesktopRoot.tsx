import { useEffect, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import type { HomeData } from "@/components/home/useHomeData";
import {
  HOME_GI_LAYOUT_COMPONENTS,
  parseHomeGiLayout,
  persistHomeGiLayout,
  readPersistedHomeGiLayout,
  type HomeGiLayoutId,
} from "@/lib/home-gi-layouts";
import { HomeGiLayoutPicker } from "./HomeGiLayoutPicker";

type Props = { data: HomeData };

type HomeSearch = { gi?: HomeGiLayoutId };

export function HomeDesktopRoot({ data }: Props) {
  const navigate = useNavigate();
  const search = useSearch({ strict: false }) as HomeSearch;
  const [storedGi, setStoredGi] = useState<HomeGiLayoutId>("1");

  useEffect(() => {
    setStoredGi(readPersistedHomeGiLayout() ?? "1");
  }, []);

  useEffect(() => {
    if (search.gi) {
      persistHomeGiLayout(search.gi);
      return;
    }
    const saved = readPersistedHomeGiLayout();
    if (saved) {
      void navigate({ to: "/", search: { gi: saved }, replace: true });
    }
  }, [search.gi, navigate]);

  const gi = search.gi ?? storedGi;
  const Layout = HOME_GI_LAYOUT_COMPONENTS[gi];

  return (
    <div className="relative pb-24">
      <Layout data={data} />
      <HomeGiLayoutPicker active={gi} variant="fixed" />
    </div>
  );
}

export { HomeGiLayoutPreviewStrip } from "./HomeGiLayoutPicker";
