import type { ReactNode } from "react";

type MushroomAnatomyIconProps = {
  className?: string;
  size?: number;
};

type IconFrameProps = MushroomAnatomyIconProps & {
  children: ReactNode;
  name: string;
};

function IconFrame({ children, className, name, size = 30 }: IconFrameProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      data-mushroom-icon={name}
      fill="none"
      focusable="false"
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.6"
      viewBox="0 0 24 24"
      width={size}
    >
      {children}
    </svg>
  );
}

export function MushroomCapIcon(props: MushroomAnatomyIconProps) {
  return (
    <IconFrame name="cap" {...props}>
      <path d="M4 12.5C4.9 8.2 8 5.7 12 5.7s7.1 2.5 8 6.8" />
      <path d="M4 12.5c2.2 1.1 4.9 1.7 8 1.7s5.8-.6 8-1.7" />
      <path d="m10.5 14.1-.4 4.4h3.8l-.4-4.4" />
    </IconFrame>
  );
}

export function MushroomHymeniumIcon(props: MushroomAnatomyIconProps) {
  return (
    <IconFrame name="hymenium" {...props}>
      <path d="M4 10.7C5.8 7.3 8.6 5.6 12 5.6s6.2 1.7 8 5.1" />
      <path d="M4 10.7c2.3 2 5 3 8 3s5.7-1 8-3" />
      <path d="M12 6v7.7M9.6 6.4l.8 7M14.4 6.4l-.8 7M7.4 7.6l1.4 4.9M16.6 7.6l-1.4 4.9" />
      <path d="m10.8 13.7-.3 4.7h3l-.3-4.7" />
    </IconFrame>
  );
}

export function MushroomStemIcon(props: MushroomAnatomyIconProps) {
  return (
    <IconFrame name="stem" {...props}>
      <path d="M6 7.8C7.4 5.3 9.4 4 12 4s4.6 1.3 6 3.8" />
      <path d="M6 7.8c1.8.8 3.8 1.2 6 1.2s4.2-.4 6-1.2" />
      <path d="M10.2 8.9 9.4 20h5.2l-.8-11.1" />
      <path d="m11.2 11.3-.2 3.1M13.1 15.2l.2 2.6" />
    </IconFrame>
  );
}

export function MushroomRingVolvaIcon(props: MushroomAnatomyIconProps) {
  return (
    <IconFrame name="ring-volva" {...props}>
      <path d="M7.3 7.1C8.4 5.2 10 4.2 12 4.2s3.6 1 4.7 2.9" />
      <path d="M7.3 7.1c1.4.7 3 1 4.7 1s3.3-.3 4.7-1" />
      <path d="M10.5 8.1 10.1 17M13.5 8.1l.4 8.9" />
      <path d="M8.3 10.7c1.1.8 2.3 1.2 3.7 1.2s2.6-.4 3.7-1.2l-1 2.6H9.3Z" />
      <path d="M7.6 17c.9 2 2.4 3 4.4 3s3.5-1 4.4-3c-1.4.5-2.9.7-4.4.7s-3-.2-4.4-.7Z" />
    </IconFrame>
  );
}

export function MushroomFleshIcon(props: MushroomAnatomyIconProps) {
  return (
    <IconFrame name="flesh-reaction" {...props}>
      <path d="M4 13c1-4.7 4.1-7.2 8-7.2 2.7 0 5 1.2 6.6 3.5" />
      <path d="M4 13c2.3 1 4.9 1.5 8 1.5 2.4 0 4.5-.4 6.3-1.1" />
      <path d="M12 5.8v8.7l6.6-5.2" />
      <path d="m15.2 8.4 2.1.5-1.2 1.8 2.1.5" />
      <path d="m10.6 14.5-.4 4h3.6l-.4-4" />
    </IconFrame>
  );
}

export function MushroomSporesIcon(props: MushroomAnatomyIconProps) {
  return (
    <IconFrame name="spores" {...props}>
      <path d="M4.2 9.5C5.7 6.8 8 5.4 10.8 5.4s5.1 1.4 6.6 4.1" />
      <path d="M4.2 9.5c1.9 1.4 4.1 2.1 6.6 2.1s4.7-.7 6.6-2.1" />
      <path d="M7.1 8.3 8 11M10.8 6v5.6M14.5 7.2l-.9 3.9" />
      <circle cx="8" cy="15" r=".7" fill="currentColor" stroke="none" />
      <circle cx="12" cy="17" r=".7" fill="currentColor" stroke="none" />
      <circle cx="16" cy="14.5" r=".7" fill="currentColor" stroke="none" />
      <circle cx="16.5" cy="19" r=".7" fill="currentColor" stroke="none" />
      <path d="M5.5 20c2.4-.7 4.7-1 7-1" />
    </IconFrame>
  );
}

export function MushroomMyceliumIcon(props: MushroomAnatomyIconProps) {
  return (
    <IconFrame name="mycelium" {...props}>
      <path d="M8.2 7.3C9 5.6 10.3 4.8 12 4.8s3 .8 3.8 2.5" />
      <path d="M8.2 7.3c1.1.5 2.4.8 3.8.8s2.7-.3 3.8-.8M11.1 8l-.2 2.5h2.2L12.9 8M3.5 10.8h17" />
      <path d="M12 10.8v8.8M12 13.2 8.6 16M12 14.6l3.7 2.8M8.6 16 6 14.5M8.6 16l-.8 3M15.7 17.4l2.6-2M15.7 17.4l.6 2.4M12 17.1l-2.2 2.4M12 18.2l1.4 1.6" />
    </IconFrame>
  );
}

export function MushroomContextIcon(props: MushroomAnatomyIconProps) {
  return (
    <IconFrame name="context" {...props}>
      <path d="M3.5 19.5h17" />
      <path d="M4.8 15.5c.6-1.5 1.7-2.3 3.2-2.3s2.6.8 3.2 2.3c-1 .5-2.1.7-3.2.7s-2.2-.2-3.2-.7Z" />
      <path d="m7.4 16.2-.3 3.3h1.8l-.3-3.3M16.3 10.5v9" />
      <path d="M16.4 5.1c-2.6.4-4 1.8-4.1 4.2 2.4.3 4.1-1.1 4.1-4.2ZM16.5 7.8c2.3.2 3.6 1.4 3.8 3.5-2.1.4-3.6-.8-3.8-3.5Z" />
      <path d="M4.3 10c1.1-.5 1.5-1.3 1.2-2.4M7 10.4c1.2-.6 1.7-1.6 1.3-3" />
    </IconFrame>
  );
}
