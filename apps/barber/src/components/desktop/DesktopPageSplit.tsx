type Props = {
  mobile: React.ReactNode;
  desktop: React.ReactNode;
};

/** Mobil va desktop UI daraxtlarini ajratadi — breakpoint: lg (1024px). */
export function DesktopPageSplit({ mobile, desktop }: Props) {
  return (
    <>
      <div className="lg:hidden">{mobile}</div>
      <div className="hidden lg:block">{desktop}</div>
    </>
  );
}
