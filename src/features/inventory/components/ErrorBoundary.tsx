import { Component, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { colors } from "../../../theme/tokens";
import { styles } from "../styles";
import type { PressState } from "../types";

export class ErrorBoundary extends Component<{ children: ReactNode }, { message: string }> {
  state = { message: "" };

  static getDerivedStateFromError(error: Error) {
    return { message: error.message };
  }

  handleRetry = () => this.setState({ message: "" });

  render() {
    if (this.state.message) {
      return (
        <View style={styles.errorScreen}>
          <View style={styles.errorIcon}>
            <AlertTriangle color={colors.accent} size={40} />
          </View>
          <Text style={styles.errorTitle}>Terjadi Kesalahan</Text>
          <Text style={styles.errorDesc}>{this.state.message}</Text>
          <Pressable onPress={this.handleRetry} style={({ hovered, pressed }: PressState) => [styles.primaryButton, hovered && styles.primaryButtonHover, pressed && styles.pressed]}><Text style={styles.primaryButtonText}>Coba Lagi</Text></Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}
