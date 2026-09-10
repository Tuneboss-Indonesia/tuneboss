import { Text, View, type StyleProp, type ViewStyle } from "react-native";
import { styles } from "../styles";

export function BrandFooter({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.brandFooter, style]}>
      <Text style={styles.brandFooterText}>© 2026 tuneboss.id</Text>
    </View>
  );
}
