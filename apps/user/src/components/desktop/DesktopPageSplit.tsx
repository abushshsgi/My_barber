import { useIsLgUp } from "@/hooks/use-mobile";

type Props = {
  mobile: React.ReactNode;
  desktop: React.ReactNode;
};

/**
 * Faqat aktiv breakpoint UI daraxtini mount qiladi.
 * Ikkalasini birga CSS bilan yashirish (lg:hidden) map/WebGL ni ikki marta yaratib buzardi.
 */
export function DesktopPageSplit({ mobile, desktop }: Props) {
  const isLgUp = useIsLgUp();
  return isLgUp ? <>{desktop}</> : <>{mobile}</>;
}
