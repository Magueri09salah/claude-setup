import { Tabs } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Icon, type IconName } from "@/components/Icon";
import { colors, font, space } from "@/theme/tokens";

// Persistent bottom navigation for the four root screens. Pushed screens
// (quiz, results, payment, lesson…) live in the parent Stack so they render
// full-screen WITHOUT the bar.
function TabIcon({
  icon,
  label,
  focused,
}: {
  icon: IconName;
  label: string;
  focused: boolean;
}) {
  return (
    <View style={styles.item}>
      <View style={[styles.indicator, focused && styles.indicatorOn]} />
      <Icon
        name={icon}
        size={22}
        color={focused ? colors.lessons : colors.textDim}
      />
      <Text style={[styles.label, focused && styles.labelOn]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: styles.bar,
        tabBarItemStyle: styles.barItem,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="home" label="الرئيسية" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="lessons"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="lessons" label="الدروس" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="progress" label="تقدّمي" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="settings" label="الإعدادات" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: 68,
    paddingTop: 0,
    paddingBottom: space.sm,
  },
  barItem: { paddingTop: 0 },
  item: { alignItems: "center", gap: 2, width: 76, paddingTop: space.xs },
  // Lane-paint indicator on the active tab (Night Drive identity).
  indicator: {
    width: 26,
    height: 3,
    borderRadius: 2,
    backgroundColor: "transparent",
    marginBottom: space.xs,
  },
  indicatorOn: { backgroundColor: colors.lessons },
  label: { fontFamily: font.medium, fontSize: 11, color: colors.textDim },
  labelOn: { fontFamily: font.bold, color: colors.lessons },
});
