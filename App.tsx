import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";
import { DashboardScreen } from "./src/screens/DashboardScreen";

export default function App() {
  return (
    <View style={styles.root}>
      <StatusBar style="light" backgroundColor="#070707" />
      <DashboardScreen />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: "100%",
    backgroundColor: "#070707",
  },
});
