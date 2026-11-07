import { Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { updateHairCareProfile } from "../../../api/care";
import { HairConditionQuiz, type HairQuizAnswers } from "../HairConditionQuiz";
import { saveCareQuiz } from "../../../lib/morf-ai-care";
import { useMorphAppearance } from "../../../lib/MorphAppearanceContext";
import { morphFont } from "../../../theme/morph-font";
import { fontSize, moderateScale, scale, verticalScale } from "../../../utils/responsive";

type Props = {
  draft: string;
  onSaved: () => void | Promise<void>;
};

export function ChatHairAsk({ draft, onSaved }: Props) {
  const { t } = useTranslation();
  const { colors: pal } = useMorphAppearance();

  const save = async (answers: HairQuizAnswers) => {
    await updateHairCareProfile({
      condition: answers.condition,
      texture: answers.texture,
      color_status: answers.colorStatus,
      scalp:
        answers.condition === "oily"
          ? "oily"
          : answers.condition === "dry" || answers.condition === "damaged"
            ? "dry"
            : "normal",
    });
    await saveCareQuiz(answers);
    await onSaved();
  };

  return (
    <View>
      <View style={styles.userRow}>
        <View style={[styles.userBubble, { backgroundColor: pal.card, borderColor: pal.line }]}>
          <Text style={[styles.userText, { color: pal.fg }]}>{draft}</Text>
        </View>
      </View>
      <HairConditionQuiz lead={t("chat.hairAsk.lead")} onDone={save} />
    </View>
  );
}

const styles = StyleSheet.create({
  userRow: { alignItems: "flex-end", paddingHorizontal: scale(16), marginBottom: verticalScale(16) },
  userBubble: {
    maxWidth: "82%",
    borderRadius: moderateScale(22),
    borderBottomRightRadius: moderateScale(6),
    borderWidth: 1,
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
  },
  userText: { ...morphFont, fontSize: fontSize(14), lineHeight: fontSize(20) },
});
