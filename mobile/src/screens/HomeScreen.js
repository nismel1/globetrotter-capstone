import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  RefreshControl,
  Image,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import LinearGradient from 'react-native-linear-gradient';
import { destinationsAPI, favoritesAPI } from '../services/api';
import DestinationCard from '../components/DestinationCard';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../config/theme';

const HomeScreen = ({ navigation }) => {
  const [destinations, setDestinations] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [destinationsData, favoritesData] = await Promise.all([
        destinationsAPI.getAll(),
        favoritesAPI.getAll(),
      ]);
      setDestinations(destinationsData);
      setFavorites(favoritesData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const handleToggleFavorite = async (destinationName) => {
    try {
      const isFav = favorites.includes(destinationName);
      const newFavorites = isFav
        ? await favoritesAPI.remove(destinationName)
        : await favoritesAPI.add(destinationName);
      setFavorites(newFavorites);
    } catch (error) {
      console.error('Error toggling favorite:', error);
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      navigation.navigate('Explorer', { searchQuery });
    }
  };

  const popularDestinations = destinations.slice(0, 4);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={loadData} />
      }
    >
      {/* Hero Section */}
      <View style={styles.hero}>
        <Image
          source={require('../assets/hero.jpg')}
          style={styles.heroImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={[
            'rgba(93, 107, 107, 0.7)',
            'rgba(93, 107, 107, 0.4)',
            'rgba(247, 203, 202, 0.2)',
          ]}
          style={styles.heroGradient}
        />

        <View style={styles.heroContent}>
          {/* Logo */}
          <Image
            source={require('../assets/logo.png')}
            style={styles.heroLogo}
            resizeMode="contain"
          />

          {/* Eyebrow */}
          <View style={styles.eyebrow}>
            <Text style={styles.eyebrowText}>DISCOVER WITH INTENTION</Text>
          </View>

          {/* Title */}
          <Text style={styles.heroTitle}>Globetrotter</Text>

          {/* Description */}
          <Text style={styles.heroDescription}>
            Un carnet de voyage vivant pour explorer les lieux qui donnent envie
            de partir maintenant.
          </Text>

          {/* Search Card */}
          <View style={styles.searchCard}>
            <Icon name="search" size={22} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Rechercher une destination..."
              placeholderTextColor={COLORS.textMuted}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            <TouchableOpacity onPress={handleSearch}>
              <Icon name="arrow-right" size={22} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {/* Category Pills */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categories}
          >
            {[
              { label: 'Nature', icon: 'compass', tag: 'nature' },
              { label: 'Culture', icon: 'map', tag: 'culture' },
              { label: 'Restaurants', icon: 'coffee', tag: 'food' },
              { label: 'Activités', icon: 'activity', tag: 'adventure' },
            ].map((category) => (
              <TouchableOpacity
                key={category.tag}
                style={styles.categoryPill}
                onPress={() =>
                  navigation.navigate('Explorer', { tag: category.tag })
                }
              >
                <Icon
                  name={category.icon}
                  size={18}
                  color={COLORS.textPrimary}
                />
                <Text style={styles.categoryText}>{category.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {/* Popular Destinations Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View>
            <View style={styles.sectionEyebrow}>
              <Text style={styles.sectionEyebrowText}>POPULAIRE</Text>
            </View>
            <Text style={styles.sectionTitle}>Destinations qui donnent le ton</Text>
          </View>
        </View>

        {popularDestinations.map((destination) => (
          <DestinationCard
            key={destination.name}
            destination={destination}
            isFavorite={favorites.includes(destination.name)}
            onPress={(dest) =>
              navigation.navigate('DestinationDetail', { destination: dest })
            }
            onToggleFavorite={handleToggleFavorite}
          />
        ))}

        <TouchableOpacity
          style={styles.viewAllButton}
          onPress={() => navigation.navigate('Explorer')}
        >
          <Text style={styles.viewAllText}>Voir toutes les destinations</Text>
          <Icon name="arrow-right" size={20} color={COLORS.primary} />
        </TouchableOpacity>
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
    height: 600,
    position: 'relative',
  },
  heroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: SPACING.xl,
  },
  heroLogo: {
    width: 96,
    height: 96,
    marginBottom: SPACING.lg,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  eyebrow: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: 'rgba(247, 203, 202, 0.9)',
    borderRadius: RADIUS.full,
    marginBottom: SPACING.sm,
  },
  eyebrowText: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS.surface,
  },
  heroTitle: {
    ...TYPOGRAPHY.displayLarge,
    color: COLORS.surface,
    marginBottom: SPACING.md,
  },
  heroDescription: {
    ...TYPOGRAPHY.bodyLarge,
    color: 'rgba(255, 255, 255, 0.95)',
    marginBottom: SPACING.xl,
    maxWidth: '90%',
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: 'rgba(255, 255, 255, 0.98)',
    borderRadius: RADIUS.lg,
    marginBottom: SPACING.xl,
    ...SHADOWS.lg,
  },
  searchInput: {
    flex: 1,
    ...TYPOGRAPHY.bodyMedium,
    color: COLORS.textPrimary,
  },
  categories: {
    gap: SPACING.sm,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: RADIUS.full,
    ...SHADOWS.sm,
  },
  categoryText: {
    ...TYPOGRAPHY.labelMedium,
    color: COLORS.textPrimary,
  },
  section: {
    padding: SPACING.xl,
  },
  sectionHeader: {
    marginBottom: SPACING.xl,
  },
  sectionEyebrow: {
    alignSelf: 'flex-start',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.rosePoudre,
    borderRadius: RADIUS.full,
    marginBottom: SPACING.sm,
  },
  sectionEyebrowText: {
    ...TYPOGRAPHY.labelSmall,
    color: COLORS.primary,
  },
  sectionTitle: {
    ...TYPOGRAPHY.displaySmall,
    color: COLORS.textPrimary,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
  },
  viewAllText: {
    ...TYPOGRAPHY.labelLarge,
    color: COLORS.primary,
  },
});

export default HomeScreen;
