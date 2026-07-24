import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import { authAPI, favoritesAPI } from '../services/api';
import Button from '../components/Button';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../config/theme';

const ProfileScreen = ({ navigation }) => {
  const [username, setUsername] = useState('');
  const [favoritesCount, setFavoritesCount] = useState(0);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const storedUsername = await AsyncStorage.getItem('username');
      const favorites = await favoritesAPI.getAll();
      setUsername(storedUsername || 'Voyageur');
      setFavoritesCount(favorites.length);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await authAPI.logout();
            navigation.replace('Login');
          },
        },
      ]
    );
  };

  const preferences = [
    'Nature',
    'Culture',
    'Gastronomie',
    'Hotels calmes',
    'Activités',
    'Architecture',
  ];

  const menuItems = [
    {
      icon: 'settings',
      label: 'Paramètres',
      onPress: () => Alert.alert('Info', 'Fonctionnalité à venir'),
    },
    {
      icon: 'bell',
      label: 'Notifications',
      onPress: () => Alert.alert('Info', 'Fonctionnalité à venir'),
    },
    {
      icon: 'help-circle',
      label: 'Aide & Support',
      onPress: () => Alert.alert('Info', 'Fonctionnalité à venir'),
    },
    {
      icon: 'info',
      label: 'À propos',
      onPress: () =>
        Alert.alert(
          'Globetrotter',
          'Version 1.0.0\n\nApplication premium de découverte de destinations'
        ),
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero Section */}
      <View style={styles.hero}>
        <Image
          source={require('../assets/profile-hero.jpg')}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={[
            'rgba(93, 107, 107, 0.6)',
            'rgba(247, 203, 202, 0.3)',
          ]}
          style={styles.heroGradient}
        />

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Image
            source={require('../assets/logo.png')}
            style={styles.avatar}
            resizeMode="contain"
          />

          <View style={styles.eyebrow}>
            <Text style={styles.eyebrowText}>PROFIL</Text>
          </View>

          <Text style={styles.username}>{username}</Text>

          {/* Stats */}
          <View style={styles.stats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{favoritesCount}</Text>
              <Text style={styles.statLabel}>favoris</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>7</Text>
              <Text style={styles.statLabel}>badges</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>Sage</Text>
              <Text style={styles.statLabel}>style</Text>
            </View>
          </View>

          <Button
            title="Modifier le profil"
            variant="secondary"
            onPress={() => Alert.alert('Info', 'Fonctionnalité à venir')}
            icon={<Icon name="edit-2" size={18} color={COLORS.textPrimary} />}
          />
        </View>
      </View>

      {/* Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Vos préférences</Text>
        <View style={styles.preferencesGrid}>
          {preferences.map((pref, index) => (
            <View key={index} style={styles.preferenceChip}>
              <Text style={styles.preferenceText}>{pref}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Menu */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Compte</Text>
        <View style={styles.menuCard}>
          {menuItems.map((item, index) => (
            <React.Fragment key={index}>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                <View style={styles.menuItemLeft}>
                  <View style={styles.menuIconContainer}>
                    <Icon
                      name={item.icon}
                      size={20}
                      color={COLORS.textPrimary}
                    />
                  </View>
                  <Text style={styles.menuItemText}>{item.label}</Text>
                </View>
                <Icon
                  name="chevron-right"
                  size={20}
                  color={COLORS.textMuted}
                />
              </TouchableOpacity>
              {index < menuItems.length - 1 && <View style={styles.menuDivider} />}
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* Logout Button */}
      <View style={styles.section}>
        <Button
          title="Se déconnecter"
          variant="ghost"
          onPress={handleLogout}
          icon={<Icon name="log-out" size={18} color={COLORS.textPrimary} />}
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Globetrotter © 2024 - Version 1.0.0
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingBottom: SPACING.xxxl,
  },
  hero: {
    height: 400,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  profileCard: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    ...SHADOWS.lg,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    marginBottom: SPACING.md,
    borderWidth: 4,
    borderColor: COLORS.surface,
  },
  eyebrow: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.rosePoudre,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.sm,
  },
  eyebrowText: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS.primary,
  },
  username: {
    ...TYPOGRAPHY.displaySmall,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    marginBottom: SPACING.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.bleuGlacier,
    width: '100%',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS.textSecondary,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.bleuGlacier,
  },
  section: {
    padding: SPACING.xl,
  },
  sectionTitle: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  preferencesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    justifyContent: 'center',
  },
  preferenceChip: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.bleuClair,
    borderRadius: RADIUS.full,
  },
  preferenceText: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textPrimary,
  },
  menuCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    ...SHADOWS.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.lg,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.bleuClair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    ...TYPOGRAPHY.bodyLarge,
    color: COLORS.textPrimary,
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.bleuClair,
    marginHorizontal: SPACING.lg,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  footerText: {
    ...TYPOGRAPHY.bodySmall,
    color: COLORS.textMuted,
  },
});

export default ProfileScreen;
