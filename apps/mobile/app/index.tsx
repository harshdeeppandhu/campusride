import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { BRAND, MemberType, TrustTier, SAFETY_COPY } from '@campusride/shared';
import { StatusBar } from 'expo-status-bar';

/**
 * M0 Mobile screen — Styled with GlassUI aesthetic.
 * Showcases shared schema resolution, tier definitions, and safety copy.
 */
export default function HomeScreen() {
  const memberTypes = Object.values(MemberType);
  const tiers = Object.entries(TrustTier);

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.container}>
        {/* Glass Header Pill */}
        <View style={styles.pill}>
          <Text style={styles.pillText}>✨ GlassUI · M0 Foundation</Text>
        </View>

        <Text style={styles.title}>{BRAND.name}</Text>
        <Text style={styles.tagline}>{BRAND.tagline}</Text>

        {/* Glass Card: Trust Tiers */}
        <View style={styles.glassCard}>
          <Text style={styles.cardHeader}>🛡️ Trust Tiers (docs/05)</Text>
          <Text style={styles.cardSubtext}>Server-enforced authorization levels:</Text>
          <View style={styles.badgeRow}>
            {tiers.map(([name, level]) => (
              <View key={name} style={styles.tierBadge}>
                <Text style={styles.badgeText}>
                  {name} (T{level})
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Glass Card: Members */}
        <View style={styles.glassCard}>
          <Text style={styles.cardHeader}>👥 Member Personas</Text>
          <Text style={styles.cardSubtext}>Unified passenger & driver accounts:</Text>
          <View style={styles.badgeRow}>
            {memberTypes.map((type) => (
              <View key={type} style={styles.memberBadge}>
                <Text style={styles.memberBadgeText}>{type}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Safety Card */}
        <View style={[styles.glassCard, styles.safetyCard]}>
          <Text style={styles.safetyHeader}>⚠️ Mandatory Safety Notice</Text>
          <Text style={styles.safetyText}>"{SAFETY_COPY.SOS_DISCLAIMER}"</Text>
        </View>

        <Text style={styles.footnote}>Strict TypeScript · Expo SDK 52 · Zod Shared</Text>
        <StatusBar style="dark" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    backgroundColor: '#f1f5f9',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 24,
    paddingTop: 48,
  },
  pill: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(59, 107, 255, 0.25)',
    marginBottom: 16,
  },
  pillText: {
    color: '#254ce0',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  tagline: {
    fontSize: 15,
    color: '#475569',
    marginBottom: 24,
    textAlign: 'center',
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
    borderRadius: 20,
    padding: 18,
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.9)',
    shadowColor: '#1e293b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  cardSubtext: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tierBadge: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1e293b',
  },
  memberBadge: {
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  memberBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1d4ed8',
    textTransform: 'capitalize',
  },
  safetyCard: {
    backgroundColor: 'rgba(254, 242, 242, 0.75)',
    borderColor: 'rgba(254, 202, 202, 0.9)',
  },
  safetyHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#b91c1c',
    marginBottom: 6,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  safetyText: {
    fontSize: 12,
    color: '#334155',
    lineHeight: 18,
    fontStyle: 'italic',
  },
  footnote: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 12,
  },
});
