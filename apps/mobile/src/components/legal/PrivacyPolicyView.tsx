import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { NativeHeader } from "../ui/NativeHeader";
import { getPrivacyPolicy } from "../../content/privacy-policy";
import { colors } from "../../theme/colors";
import { fontSize, moderateScale, scale, verticalScale } from "../../utils/responsive";

type Props = { onBack: () => void };

export function PrivacyPolicyView({ onBack }: Props) {
  const { i18n } = useTranslation();
  const doc = getPrivacyPolicy(i18n.language);

  return (
    <View style={styles.root}>
      <NativeHeader title={doc.title} onBack={onBack} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.updated}>{doc.updated}</Text>
        <View style={styles.card}>
          <Text style={styles.body}>{doc.intro}</Text>
        </View>
        {doc.sections.map((section) => (
          <View key={section.title} style={styles.card}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.body ? <Text style={styles.body}>{section.body}</Text> : null}
            {section.bullets?.map((item) => (
              <Text key={item} style={styles.bullet}>
                {item}
              </Text>
            ))}
            {section.link ? (
              <Pressable onPress={() => void Linking.openURL(section.link)}>
                <Text style={styles.link}>{section.link}</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
        <Pressable
          style={styles.card}
          onPress={() => void Linking.openURL(`mailto:${doc.contactEmail}`)}
        >
          <Text style={styles.email}>{doc.contactEmail}</Text>
        </Pressable>
        {doc.externalLink ? (
          <Pressable
            style={styles.card}
            onPress={() => void Linking.openURL(doc.externalLink)}
          >
            <Text style={styles.link}>{doc.externalLink}</Text>
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: moderateScale(20),
    paddingBottom: verticalScale(40),
    gap: verticalScale(16),
  },
  updated: {
    fontSize: fontSize(13),
    color: colors.muted,
    paddingHorizontal: scale(4),
    marginBottom: verticalScale(4),
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: moderateScale(24),
    borderWidth: 1,
    borderColor: colors.border,
    padding: moderateScale(20),
    gap: verticalScale(12),
  },
  sectionTitle: {
    fontSize: fontSize(18),
    fontWeight: "800",
    letterSpacing: -0.4,
    color: colors.fg,
    marginBottom: verticalScale(4),
  },
  body: {
    fontSize: fontSize(15),
    lineHeight: fontSize(23),
    color: colors.muted,
  },
  bullet: {
    fontSize: fontSize(15),
    lineHeight: fontSize(23),
    color: colors.fg,
    paddingLeft: scale(8),
  },
  email: {
    fontSize: fontSize(16),
    fontWeight: "700",
    color: colors.fg,
    textDecorationLine: "underline",
  },
  link: {
    fontSize: fontSize(15),
    color: colors.fg,
    textDecorationLine: "underline",
  },
});
