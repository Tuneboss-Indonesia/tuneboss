import { Image, Pressable, SafeAreaView, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { LogOut } from "lucide-react-native";
import { colors } from "../../../theme/tokens";
import { mainMenu, stockMenu } from "../data";
import type { MenuItem, PageKey, PressState } from "../types";
import { styles } from "../styles";

const sidebarLogo = require("../../../../assets/logo.png");

function SideItem({ active, item, onNavigate }: { active: boolean; item: MenuItem; onNavigate: (page: PageKey) => void }) {
  const [id, Icon, label] = item;
  return (
    <Pressable onPress={() => onNavigate(id)} style={({ hovered, pressed }: PressState) => [styles.sideItem, active && styles.sideItemActive, hovered && !active && styles.sideItemHover, pressed && styles.pressed]}>
      <Icon color={active ? colors.white : colors.primary} size={22} strokeWidth={2.4} />
      <Text style={[styles.sideText, active && styles.sideTextActive]}>{label}</Text>
    </Pressable>
  );
}

function Sidebar({ active, onLogout, onNavigate }: { active: PageKey; onLogout: () => void; onNavigate: (page: PageKey) => void }) {
  return (
    <View style={styles.sidebar}>
      <View style={styles.sidebarBrand}><Image source={sidebarLogo} style={styles.logo} resizeMode="contain" /></View>
      {mainMenu.map((item) => <SideItem key={item[0]} active={active === item[0]} item={item} onNavigate={onNavigate} />)}
      {stockMenu.map((item) => <SideItem key={item[0]} active={active === item[0]} item={item} onNavigate={onNavigate} />)}
      <View style={styles.sidebarFooter}><Pressable onPress={onLogout} style={({ hovered, pressed }: PressState) => [styles.logoutButton, hovered && styles.logoutButtonHover, pressed && styles.pressed]}><LogOut color={colors.white} size={18} /><Text style={styles.logoutText}>Keluar</Text></Pressable></View>
    </View>
  );
}

function MobileNav({ active, onNavigate }: { active: PageKey; onNavigate: (page: PageKey) => void }) {
  const items = [...mainMenu, ...stockMenu];
  return <View style={styles.mobileNav}><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mobileNavContent}>{items.map(([id, Icon, label]) => <Pressable key={id} onPress={() => onNavigate(id)} style={({ hovered, pressed }: PressState) => [styles.mobileItem, hovered && active !== id && styles.sideItemHover, pressed && styles.pressed]}><Icon color={active === id ? colors.primary : colors.muted} size={20} /><Text style={[styles.mobileText, active === id && styles.mobileTextActive]}>{label}</Text></Pressable>)}</ScrollView></View>;
}

export function Layout({ active, onLogout, onNavigate, children }: { active: PageKey; onLogout: () => void; onNavigate: (page: PageKey) => void; children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  return (
    <SafeAreaView style={styles.shell}>
      <View style={styles.appFrame}>
        {isDesktop ? <Sidebar active={active} onLogout={onLogout} onNavigate={onNavigate} /> : null}
        <View style={styles.mainArea}><ScrollView contentContainerStyle={[styles.content, !isDesktop && styles.mobileContent]}>{children}</ScrollView></View>
      </View>
      {!isDesktop ? <MobileNav active={active} onNavigate={onNavigate} /> : null}
    </SafeAreaView>
  );
}
