import Svg, { Path } from "react-native-svg";

type Props = {
  color: string;
  size?: number;
};

/** Qalamcha. Ionicons "pencil" badge o'lchamida galochkaga o'xshab qoladi. */
export function AvatarEditPencil({ color, size = 13 }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M15 6l3 3"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
