import { useEffect, useRef, useState } from "react";
import { Image, Platform, Pressable, SafeAreaView, ScrollView, Text, useWindowDimensions, View } from "react-native";
import { ChevronUp, LogOut, WifiOff } from "lucide-react-native";
import { colors } from "../../../theme/tokens";
import { mainMenu, stockMenu } from "../data";
import type { MenuItem, PageKey, PressState, UserRole } from "../types";
import { styles } from "../styles";
import { BrandFooter } from "./BrandFooter";

const sidebarLogo = require("../../../../assets/logo.png");

function SideItem({ active, item, onNavigate }: { active: PageKey; item: MenuItem; onNavigate: (page: PageKey) => void }) {
  const [id, Icon, label] = item;
  const isActiveItem = active === id || active.startsWith(id + "-");
  return (
    <Pressable onPress={() => onNavigate(id)} style={({ hovered, pressed }: PressState) => [styles.sideItem, isActiveItem && styles.sideItemActive, hovered && !isActiveItem && styles.sideItemHover, pressed && styles.pressed]}>
      <Icon color={isActiveItem ? colors.white : colors.primary} size={22} strokeWidth={2.4} />
      <Text style={[styles.sideText, isActiveItem && styles.sideTextActive]}>{label}</Text>
    </Pressable>
  );
}

function visibleStockMenu(role: UserRole) {
  return role === "admin" ? stockMenu : stockMenu.filter(([id]) => id !== "admin");
}

function Sidebar({ active, onLogout, onNavigate, role }: { active: PageKey; onLogout: () => void; onNavigate: (page: PageKey) => void; role: UserRole }) {
  return (
    <View style={styles.sidebar}>
      <View style={styles.sidebarBrand}>
        <View style={styles.sidebarLogoMask}>
          <Image source={sidebarLogo} style={styles.logo} resizeMode="cover" />
        </View>
      </View>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.sidebarMenu} contentContainerStyle={styles.sidebarMenuContent}>
        {mainMenu.map((item) => <SideItem key={item[0]} active={active} item={item} onNavigate={onNavigate} />)}
        {visibleStockMenu(role).map((item) => <SideItem key={item[0]} active={active} item={item} onNavigate={onNavigate} />)}
      </ScrollView>
      <View style={styles.sidebarFooter}><Pressable onPress={onLogout} style={({ hovered, pressed }: PressState) => [styles.logoutButton, hovered && styles.logoutButtonHover, pressed && styles.pressed]}><LogOut color={colors.white} size={18} /><Text style={styles.logoutText}>Keluar</Text></Pressable></View>
    </View>
  );
}

function MobileNav({ active, onNavigate, role }: { active: PageKey; onNavigate: (page: PageKey) => void; role: UserRole }) {
  const items = [...mainMenu, ...visibleStockMenu(role)];
  return <View style={styles.mobileNav}><View style={styles.mobileNavContent}>{items.map(([id, Icon, label]) => { const activeItem = active === id || active.startsWith(id + "-"); return <Pressable key={id} onPress={() => onNavigate(id)} style={({ hovered, pressed }: PressState) => [styles.mobileItem, hovered && !activeItem && styles.sideItemHover, pressed && styles.pressed]}><Icon color={activeItem ? colors.primary : colors.muted} size={18} /><Text numberOfLines={1} adjustsFontSizeToFit style={[styles.mobileText, activeItem && styles.mobileTextActive]}>{label}</Text></Pressable>; })}</View></View>;
}

function MobileHeader({ onLogout }: { onLogout: () => void }) {
  return (
    <View style={styles.mobileHeader}>
      <View style={styles.mobileHeaderLogoMask}>
        <Image source={sidebarLogo} style={styles.mobileHeaderLogo} resizeMode="cover" />
      </View>
      <Pressable accessibilityLabel="Keluar" onPress={onLogout} style={({ hovered, pressed }: PressState) => [styles.mobileHeaderLogout, hovered && styles.mobileHeaderLogoutHover, pressed && styles.pressed]}>
        <LogOut color={colors.primary} size={24} strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

export function Layout({ active, onLogout, onNavigate, role, children }: { active: PageKey; onLogout: () => void; onNavigate: (page: PageKey) => void; role: UserRole; children: React.ReactNode }) {
  const { height, width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const mobileContentMinHeight = Math.max(height - 152, 0);
  const scrollRef = useRef<any>(null);
  const [scrollY, setScrollY] = useState(0);
  const [offline, setOffline] = useState(Platform.OS === "web" ? !navigator.onLine : false);
  const showBackToTop = scrollY > 400;

  useEffect(() => {
    if (Platform.OS !== "web" || typeof window === "undefined") return;
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const scrollToTop = () => {
    const node = scrollRef.current;
    if (!node) return;

    try {
      if (typeof node.scrollTo === "function") {
        node.scrollTo({ x: 0, y: 0, animated: true });
        return;
      }
    } catch {}

    try {
      const el = typeof node.getScrollableNode === "function" ? node.getScrollableNode() : node.scrollableNode;
      if (el) { el.scrollTop = 0; return; }
    } catch {}
  };

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={styles.shell}>
        {offline ? <View style={[styles.offlineBanner, !isDesktop && styles.offlineBannerMobile]}><WifiOff color="white" size={16} /><Text style={styles.offlineText}>Tidak ada koneksi internet</Text><View style={styles.offlineDot} /></View> : null}
        {!isDesktop ? <MobileHeader onLogout={onLogout} /> : null}
        <View style={styles.appFrame}>
          {isDesktop ? <Sidebar active={active} onLogout={onLogout} onNavigate={onNavigate} role={role} /> : null}
          <View style={styles.mainArea}>
            <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false} onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)} scrollEventThrottle={100} contentContainerStyle={[styles.content, !isDesktop && styles.mobileContent, !isDesktop && { minHeight: mobileContentMinHeight }]}>{children}<BrandFooter style={isDesktop ? styles.brandFooterDesktopFullBleed : styles.brandFooterMobileFullBleed} /></ScrollView>
          </View>
        </View>
        {!isDesktop ? <MobileNav active={active} onNavigate={onNavigate} role={role} /> : null}
      </SafeAreaView>
      <Pressable onPress={scrollToTop} style={[styles.backToTop, { bottom: isDesktop ? 28 : 100, opacity: showBackToTop ? 1 : 0, elevation: 10, zIndex: 9999, position: "absolute" }, !showBackToTop && { pointerEvents: "none" }]}><ChevronUp color="white" size={28} strokeWidth={2.5} /></Pressable>
    </View>
  );
}
