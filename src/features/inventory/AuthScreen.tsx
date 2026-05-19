import { useState } from "react";
import { Image, Pressable, Text, TextInput, View } from "react-native";
import { colors } from "../../theme/tokens";
import { apiBaseUrl, apiRequest } from "./api";
import { logoUri } from "./data";
import { styles } from "./styles";

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

  const login = async () => {
    setLoading(true);
    setError("");

    try {
      const payload = await apiRequest<LoginResponse>("/auth/login", {
        body: JSON.stringify({ email, password }),
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
        <Image source={{ uri: logoUri }} style={styles.loginLogo} resizeMode="contain" />
        <Text style={styles.modalTitle}>Inventory Login</Text>
        <Text style={styles.pageSubheading}>Masuk ke API TuneBoss di {apiBaseUrl}</Text>
        <View style={styles.modalFieldGroup}>
          <Text style={styles.modalLabel}>Email</Text>
          <TextInput autoCapitalize="none" keyboardType="email-address" onChangeText={setEmail} placeholder="admin@tuneboss.id" placeholderTextColor={colors.muted} style={styles.modalInput} value={email} />
        </View>
        <View style={styles.modalFieldGroup}>
          <Text style={styles.modalLabel}>Password</Text>
          <TextInput onChangeText={setPassword} placeholder="password" placeholderTextColor={colors.muted} secureTextEntry style={styles.modalInput} value={password} />
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Pressable disabled={loading} onPress={login} style={styles.saveButton}>
          <Text style={styles.saveText}>{loading ? "Memproses..." : "Login"}</Text>
        </Pressable>
      </View>
    </View>
  );
}
