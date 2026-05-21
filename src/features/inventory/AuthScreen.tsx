import { useState } from "react";
import { Eye, EyeOff } from "lucide-react-native";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import { colors } from "../../theme/tokens";
import { apiRequest } from "./api";
import { styles } from "./styles";
import type { PressState } from "./types";

const loginLogo = require("../../../assets/logo.png");

type LoginResponse = {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: "admin" | "staff";
  };
};

export function AuthScreen({ onLogin }: { onLogin: (payload: LoginResponse) => void }) {
  const [email, setEmail] = useState("admin@tuneboss.id");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const login = async () => {
    setLoading(true);
    setError("");

    try {
      const payload = await apiRequest<LoginResponse>("/auth/login", {
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
        method: "POST",
      });
      onLogin(payload);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Login gagal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.loginShell}>
      <View style={styles.loginCard}>
        <Image source={loginLogo} style={styles.loginLogo} resizeMode="contain" />
        <Text style={[styles.modalTitle, styles.loginTitle]}>Inventory Login</Text>
        <View style={styles.modalFieldGroup}>
          <Text style={styles.modalLabel}>Email</Text>
          <TextInput autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail} placeholder="admin@tuneboss.id" placeholderTextColor={colors.muted} style={styles.modalInput} value={email} />
        </View>
        <View style={styles.modalFieldGroup}>
          <Text style={styles.modalLabel}>Password</Text>
          <View style={styles.passwordInputWrap}>
            <TextInput onChangeText={setPassword} placeholder="password" placeholderTextColor={colors.muted} secureTextEntry={!passwordVisible} style={[styles.modalInput, styles.passwordInput]} value={password} />
            <Pressable accessibilityLabel={passwordVisible ? "Samarkan password" : "Lihat password"} onPress={() => setPasswordVisible((visible) => !visible)} style={({ pressed }: PressState) => [styles.passwordToggle, pressed && styles.pressed]}>
              {({ hovered }: PressState) => passwordVisible ? <EyeOff color={hovered ? colors.primary : colors.muted} size={21} /> : <Eye color={hovered ? colors.primary : colors.muted} size={21} />}
            </Pressable>
          </View>
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Pressable disabled={loading} onPress={login} style={({ hovered, pressed }: PressState) => [styles.saveButton, styles.loginButton, hovered && !loading && styles.saveButtonHover, pressed && styles.pressed]}>
          <Text style={[styles.saveText, styles.loginButtonText]}>{loading ? "Memproses..." : "Login"}</Text>
        </Pressable>
      </View>
    </View>
  );
}
