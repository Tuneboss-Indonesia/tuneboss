import { Component, type ReactNode } from "react";
import { Text, View } from "react-native";
import { styles } from "../styles";

export class ErrorBoundary extends Component<{ children: ReactNode }, { message: string }> {
  state = { message: "" };

  static getDerivedStateFromError(error: Error) {
    return { message: error.message };
  }

  render() {
    if (this.state.message) {
      return (
        <View style={styles.loading}>
          <Text style={styles.loadingText}>TuneBoss error</Text>
          <Text style={styles.errorText}>{this.state.message}</Text>
        </View>
      );
    }

    return this.props.children;
  }
}
