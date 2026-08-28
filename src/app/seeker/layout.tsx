import BottomTabBar from "@/components/seeker/BottomTabBar";

// Every /seeker/* page renders inside a real phone-shaped frame on wide
// screens (so it reads as "a mobile screen" even in a desktop demo) and
// edge-to-edge full-bleed on an actual phone. -mx-4/-mt-6 cancels the
// generic page padding from the root layout's <main> on mobile only.
export default function SeekerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-4 -mt-6 lg:mx-0 lg:mt-0 lg:flex lg:min-h-[calc(100vh-64px)] lg:items-center lg:justify-center lg:bg-slate-100 lg:py-10">
      <div className="relative flex w-full flex-col bg-slate-50 lg:h-[844px] lg:w-[390px] lg:overflow-hidden lg:rounded-[2.75rem] lg:border-[10px] lg:border-slate-900 lg:bg-white lg:shadow-2xl">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 hidden h-6 items-center justify-center lg:flex">
          <div className="h-5 w-28 rounded-b-2xl bg-slate-900" />
        </div>
        <div className="flex-1 overflow-y-auto pb-24">{children}</div>
        <BottomTabBar />
      </div>
    </div>
  );
}
